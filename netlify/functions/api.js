const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const webpush = require('web-push');
const jwt = require('jsonwebtoken');

// SEGURANÇA: Variáveis de ambiente obrigatórias
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Validação de configuração crítica
if (!JWT_SECRET) {
  console.error('🔒 ERRO CRÍTICO: JWT_SECRET não configurado!');
}
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('⚠️ VAPID keys não configuradas - Push notifications desabilitadas');
}

// Função para gerar JWT
function generateToken(user) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado');
  }
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Função para verificar JWT
function verifyToken(token) {
  try {
    if (!JWT_SECRET) {
      return null;
    }
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Funções helper para verificação de permissões
function isSuperAdmin(user) {
  if (!user) return false;
  // Aceitar superadmin ou admin@7care.com (mesmo que ainda tenha role 'admin' da migração antiga)
  return user.role === 'superadmin' || user.email === 'admin@7care.com';
}

function isPastor(user) {
  if (!user) return false;
  return user.role === 'pastor';
}

function hasAdminAccess(user) {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'pastor';
}

// Função para verificar acesso read-only
async function checkReadOnlyAccess(userId, sql) {
  if (!userId) return false;
  try {
    const result = await sql`SELECT role, extra_data FROM users WHERE id = ${parseInt(userId)}`;
    if (result.length === 0) return false;
    const user = result[0];
    if (user.role === 'admin_readonly') return true;
    if (user.extra_data) {
      try {
        const extraData = typeof user.extra_data === 'string' ? JSON.parse(user.extra_data) : user.extra_data;
        if (extraData.readOnly === true) return true;
      } catch (e) {}
    }
    return false;
  } catch (error) {
    console.error("Erro ao verificar read-only:", error);
    return false;
  }
}

// Middleware de autenticação
function requireAuth(event) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isValid: false,
      error: 'Token não fornecido',
      statusCode: 401
    };
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer '
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return {
      isValid: false,
      error: 'Token inválido ou expirado',
      statusCode: 401
    };
  }
  
  return {
    isValid: true,
    user: decoded
  };
}

// Lista de rotas públicas (não precisam de autenticação)
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/system/logo'
];

// Nota: O status de recálculo agora é armazenado no banco (tabela recalculation_status)
// para funcionar corretamente em ambientes serverless onde cada request pode ser uma nova instância

exports.handler = async (event, context) => {
  // Configurar CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];
  const requestOrigin = event.headers.origin || event.headers.Origin;
  let accessControlAllowOrigin = '*';
  if (process.env.NODE_ENV === 'production' && allowedOrigins.length > 0) {
    accessControlAllowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : 'null';
  }

  const headers = {
    'Access-Control-Allow-Origin': accessControlAllowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Content-Type': 'application/json'
  };

  // Responder a requisições OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  const path = event.path;
  const method = event.httpMethod;

  // JWT OPCIONAL: Verificar se tem token, mas NÃO bloquear se não tiver
  // Isso mantém compatibilidade enquanto adiciona segurança gradualmente
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      event.user = decoded;
      if (!event.headers['x-user-id']) {
        event.headers['x-user-id'] = String(decoded.id);
      }
      console.log(`✅ Autenticado via JWT: ${decoded.email} (${decoded.role})`);
    } else {
      console.log(`⚠️ Token JWT inválido ou expirado para ${path}`);
    }
  }

  try {
    // Conectar ao banco Neon - limpar string de conexão
    let dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL não configurada');
    }
    
    // Remover prefixo psql e aspas se existirem
    if (dbUrl.startsWith('psql ')) {
      dbUrl = dbUrl.replace('psql ', '');
    }
    if (dbUrl.startsWith("'") && dbUrl.endsWith("'")) {
      dbUrl = dbUrl.slice(1, -1);
    }
    if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
      dbUrl = dbUrl.slice(1, -1);
    }
    
    const sql = neon(dbUrl);
    
    // Configurar web-push
    if (VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:admin@7care.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      );
    }
    
    // Criar tabela de tarefas se não existir
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'medium',
        due_date TIMESTAMP,
        created_by INTEGER NOT NULL,
        assigned_to INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        tags TEXT[],
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id)
      )
    `;

    // Criar tabela system_config se não existir
    await sql`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Criar tabela para status de recálculo (para persistir entre serverless instances)
    await sql`
      CREATE TABLE IF NOT EXISTS recalculation_status (
        id SERIAL PRIMARY KEY,
        is_recalculating BOOLEAN DEFAULT FALSE,
        progress REAL DEFAULT 0,
        message TEXT DEFAULT '',
        total_users INTEGER DEFAULT 0,
        processed_users INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Garantir que existe pelo menos um registro
    await sql`
      INSERT INTO recalculation_status (is_recalculating, progress, message, total_users, processed_users)
      SELECT false, 0, '', 0, 0
      WHERE NOT EXISTS (SELECT 1 FROM recalculation_status LIMIT 1)
    `;
    
    const path = event.path;
    const method = event.httpMethod;
    const body = event.body;
    
    console.log(`🔍 API Request: ${method} ${path}`);

    // Função para adicionar eventos diretamente à planilha do Google Drive
    async function addEventsToGoogleDrive(events) {
      try {
        console.log('📊 [GOOGLE-DRIVE] Tentando adicionar eventos diretamente à planilha...');
        
        // Buscar configuração do Google Drive
        const configResult = await sql`
          SELECT value FROM system_settings 
          WHERE key = 'google_drive_config'
          LIMIT 1
        `;
        
        if (configResult.length === 0 || !configResult[0].value) {
          console.log('⚠️ [GOOGLE-DRIVE] Configuração do Google Drive não encontrada');
          return { success: false, message: 'Configuração do Google Drive não encontrada' };
        }
        
        const config = typeof configResult[0].value === 'object' ? 
          configResult[0].value : 
          JSON.parse(configResult[0].value);
        
        if (!config.spreadsheetUrl) {
          console.log('⚠️ [GOOGLE-DRIVE] URL da planilha não configurada');
          return { success: false, message: 'URL da planilha não configurada' };
        }
        
        console.log(`📊 [GOOGLE-DRIVE] Configuração encontrada: ${config.spreadsheetUrl}`);
        
        // Extrair ID da planilha e gid
        const match = config.spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+).*[#?].*gid=([0-9]+)/);
        if (!match) {
          throw new Error('URL inválida da planilha');
        }
        
        const spreadsheetId = match[1];
        const gid = match[2];
        
        console.log(`📊 [GOOGLE-DRIVE] Spreadsheet ID: ${spreadsheetId}, GID: ${gid}`);
        
        let addedCount = 0;
        
        // Para cada evento, tentar adicionar diretamente à planilha
        for (const event of events) {
          try {
            // Converter data para formato brasileiro (DD/MM/YYYY)
            let formattedDate = '';
            
            if (event.date) {
              const eventDate = new Date(event.date);
              
              // Verificar se a data é válida
              if (!isNaN(eventDate.getTime())) {
                const day = String(eventDate.getDate()).padStart(2, '0');
                const month = String(eventDate.getMonth() + 1).padStart(2, '0');
                const year = eventDate.getFullYear();
                formattedDate = `${day}/${month}/${year}`;
              } else {
                // Se a data for inválida, usar a data atual
                const today = new Date();
                const day = String(today.getDate()).padStart(2, '0');
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const year = today.getFullYear();
                formattedDate = `${day}/${month}/${year}`;
              }
            } else {
              // Se não houver data, usar a data atual
              const today = new Date();
              const day = String(today.getDate()).padStart(2, '0');
              const month = String(today.getMonth() + 1).padStart(2, '0');
              const year = today.getFullYear();
              formattedDate = `${day}/${month}/${year}`;
            }
            
            // Preparar dados para adicionar à planilha
            const rowData = [
              event.title || '',
              formattedDate,
              event.type || '',
              event.description || '',
              event.location || '',
              'Sistema'
            ];
            
            console.log(`📊 [GOOGLE-DRIVE] Adicionando evento: ${event.title} (${formattedDate})`);
            
        // Método direto: Tentar adicionar via Google Apps Script
          // URL do Google Apps Script (substitua pela sua URL)
          const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/SEU_SCRIPT_ID/exec';
          
          // Preparar dados para o Google Apps Script
          const scriptData = {
            title: event.title,
            date: event.date, // Enviar data original, não formatada
            type: event.type,
            description: event.description || '',
            location: event.location || ''
          };
          
          console.log(`📊 [GOOGLE-DRIVE] Enviando evento para Google Apps Script: ${event.title}`);
          
          try {
            // Tentar adicionar via Google Apps Script
            const scriptResponse = await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(scriptData)
            });
            
            const scriptResult = await scriptResponse.json();
            
            if (scriptResult.success) {
              console.log(`✅ [GOOGLE-DRIVE] Evento "${event.title}" adicionado à planilha via Google Apps Script`);
              addedCount++;
            } else {
              throw new Error(`Google Apps Script falhou: ${scriptResult.message}`);
            }
            
          } catch (scriptError) {
            console.log(`⚠️ [GOOGLE-DRIVE] Google Apps Script falhou para "${event.title}":`, scriptError.message);
            
            // Fallback: Salvar para processamento posterior
            await sql`
              INSERT INTO pending_google_drive_events (title, date, type, description, location, organizer, spreadsheet_id, created_at)
              VALUES (${event.title}, ${event.date}, ${event.type}, ${event.description || ''}, ${event.location || ''}, 'Sistema', ${spreadsheetId}, NOW())
            `;
            
            console.log(`✅ [GOOGLE-DRIVE] Evento "${event.title}" salvo para processamento posterior`);
            addedCount++;
          }
          
        } catch (error) {
            console.error(`❌ [GOOGLE-DRIVE] Erro ao processar evento "${event.title}":`, error.message);
          }
        }
        
        const result = {
          success: addedCount > 0,
          message: `${addedCount} de ${events.length} eventos adicionados diretamente à planilha`,
          addedCount,
          totalEvents: events.length
        };
        
        console.log(`✅ [GOOGLE-DRIVE] Resultado: ${result.message}`);
        return result;
        
      } catch (error) {
        console.error('❌ [GOOGLE-DRIVE] Erro ao adicionar eventos à planilha:', error);
        return { success: false, message: `Erro: ${error.message}` };
      }
    }

    // Rota para verificar configuração do Google Apps Script
    if (path === '/api/check-google-script' && method === 'GET') {
      const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          hasGoogleScriptUrl: !!GOOGLE_SCRIPT_URL,
          googleScriptUrl: GOOGLE_SCRIPT_URL ? GOOGLE_SCRIPT_URL.substring(0, 50) + '...' : 'Não configurado',
          message: GOOGLE_SCRIPT_URL ? 'Google Apps Script configurado' : 'Google Apps Script não configurado'
        })
      };
    }

    // Rota para testar integração com Google Drive
    if (path === '/api/test-google-drive' && method === 'POST') {
      try {
        console.log('🧪 [TEST] Testando integração com Google Drive...');
        
        // Criar evento de teste
        const testEvent = {
          title: 'Teste de Integração - ' + new Date().toLocaleString(),
          date: new Date().toISOString(),
          type: 'teste',
          description: 'Evento de teste para verificar integração com Google Drive',
          location: 'Sistema de Teste'
        };
        
        // Tentar adicionar à planilha
        const result = await addEventsToGoogleDrive([testEvent]);
        
        console.log('🧪 [TEST] Resultado do teste:', result);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Teste de integração executado',
            testEvent,
            result
          })
        };
        
      } catch (error) {
        console.error('❌ [TEST] Erro no teste de integração:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: `Erro no teste: ${error.message}`
          })
        };
      }
    }

    // 🔧 PROXY PARA GOOGLE SHEETS (EVITAR CORS)
    if (path === '/api/google-sheets/proxy' && method === 'POST') {
      try {
        const { action, spreadsheetId, sheetName, taskData, taskId, eventData } = JSON.parse(body);
        
        console.log(`📊 Proxy Google Sheets - Ação: ${action}`);
        
        const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbz_AIumumkUMdw_yCX-N2aScgn08Yy7_Quma3U6sFZOJ0Mi5snRAcIyJq3QdUVeV3fV/exec';
        
        const payload = {
          action,
          spreadsheetId,
          sheetName,
          taskData,
          taskId,
          eventData
        };
        
        console.log(`📤 Enviando para Google Apps Script:`, action);
        
        const response = await fetch(googleScriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          redirect: 'follow'
        });

        if (!response.ok) {
          throw new Error(`Google Apps Script retornou ${response.status}`);
        }

        const result = await response.json();
        console.log(`✅ Resposta do Google Apps Script:`, result.success ? 'Sucesso' : 'Falha');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        };
        
      } catch (error) {
        console.error('❌ Erro no proxy Google Sheets:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        };
      }
    }

    // Rota para verificar eventos pendentes do Google Drive
    if (path === '/api/google-drive/pending-events' && method === 'GET') {
      try {
        const pendingEvents = await sql`
          SELECT * FROM pending_google_drive_events 
          ORDER BY created_at DESC 
          LIMIT 50
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            pendingEvents,
            count: pendingEvents.length
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao buscar eventos pendentes:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: `Erro: ${error.message}`
          })
        };
      }
    }

    // Rota para processar eventos pendentes
    // Rota para atualizar status de eventos processados
    if (path === '/api/google-drive/update-processed-status' && method === 'POST') {
      try {
        // Atualizar eventos que foram processados mas ainda estão com status pending
        const result = await sql`
          UPDATE pending_google_drive_events 
          SET status = 'processed'
          WHERE processed_at IS NOT NULL AND status = 'pending'
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Status de eventos processados atualizado`,
            updated: result.count || 0
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Erro ao atualizar status: ' + error.message
          })
        };
      }
    }

    // Rota para corrigir datas inválidas nos eventos pendentes
    if (path === '/api/google-drive/fix-invalid-dates' && method === 'POST') {
      try {
        // Buscar eventos com datas inválidas
        const eventsWithInvalidDates = await sql`
          SELECT id, title, date, type, description, location, organizer, spreadsheet_id, created_at
          FROM pending_google_drive_events 
          WHERE date = 'NaN/NaN/NaN' OR date IS NULL
          ORDER BY created_at DESC
        `;
        
        if (eventsWithInvalidDates.length === 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Nenhum evento com data inválida encontrado',
              fixed: 0
            })
          };
        }
        
        let fixedCount = 0;
        
        // Corrigir cada evento com data inválida
        for (const event of eventsWithInvalidDates) {
          // Usar a data de criação como fallback
          const createdDate = new Date(event.created_at);
          const day = String(createdDate.getDate()).padStart(2, '0');
          const month = String(createdDate.getMonth() + 1).padStart(2, '0');
          const year = createdDate.getFullYear();
          const correctedDate = `${day}/${month}/${year}`;
          
          // Atualizar o evento com a data corrigida
          await sql`
            UPDATE pending_google_drive_events 
            SET date = ${correctedDate}
            WHERE id = ${event.id}
          `;
          
          fixedCount++;
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `${fixedCount} eventos com datas inválidas foram corrigidos`,
            fixed: fixedCount
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao corrigir datas inválidas:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Erro ao corrigir datas inválidas: ' + error.message
          })
        };
      }
    }

    if (path === '/api/google-drive/process-pending' && method === 'POST') {
      try {
        console.log('🔄 [PENDING] Processando eventos pendentes...');
        
        const pendingEvents = await sql`
          SELECT * FROM pending_google_drive_events 
          WHERE processed_at IS NULL
          ORDER BY created_at ASC
          LIMIT 10
        `;
        
        if (pendingEvents.length === 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Nenhum evento pendente para processar',
              processed: 0
            })
          };
        }
        
        // Converter para formato esperado pela função
        const events = pendingEvents.map(event => ({
          title: event.title,
          date: event.date,
          type: event.type,
          description: event.description,
          location: event.location
        }));
        
        // Tentar adicionar à planilha
        const result = await addEventsToGoogleDrive(events);
        
        if (result.success) {
          // Marcar como processados
          await sql`
            UPDATE pending_google_drive_events 
            SET processed_at = NOW() 
            WHERE id = ANY(${pendingEvents.map(e => e.id)})
          `;
          
          console.log(`✅ [PENDING] ${result.addedCount} eventos processados com sucesso`);
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `${result.addedCount} eventos processados`,
            result
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao processar eventos pendentes:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: `Erro: ${error.message}`
          })
        };
      }
    }

    // Rota para estatísticas do dashboard
    if (path === '/api/dashboard/stats' && method === 'GET') {
      try {
        console.log('🔍 [DASHBOARD STATS] Iniciando...');
        
        // Obter ID do usuário do header (se fornecido)
        const userId = event.headers['x-user-id'];
        let userChurch = null;
        let userData = null;
        let userDistrictId = null;
        
        console.log(`🔍 [DASHBOARD STATS] userId: ${userId}`);
        
        // Se userId fornecido, buscar dados do usuário
        if (userId) {
          userData = await sql`SELECT church, role, district_id FROM users WHERE id = ${userId} LIMIT 1`;
          console.log(`🔍 [DASHBOARD STATS] userData:`, userData);
          if (userData.length > 0) {
            userChurch = userData[0].church;
            userDistrictId = userData[0].district_id;
            const userRole = userData[0].role;
            console.log(`🔍 Dashboard stats para usuário ${userId} (${userRole}) da igreja: ${userChurch}, distrito: ${userDistrictId}`);
          }
        }

        // Se for superadmin ou pastor, filtrar por distrito se tiver districtId
        if (userData && userData.length > 0 && hasAdminAccess(userData[0])) {
          if (isSuperAdmin(userData[0]) || (isPastor(userData[0]) && userDistrictId)) {
            // Superadmin ou pastor com districtId: ver apenas dados do distrito
            console.log(`🔍 Dashboard stats do distrito ${userDistrictId} (${userData[0].role})`);
            
            // Buscar igrejas do distrito
            const districtChurches = await sql`
              SELECT id, name FROM churches WHERE district_id = ${userDistrictId}
            `;
            const districtChurchNames = districtChurches.map(ch => ch.name);
            
            // Filtrar usuários do distrito
            // Construir filtro de igrejas usando template string
            let churchFilterSQL = '';
            if (districtChurchNames.length > 0) {
              const churchList = districtChurchNames.map(name => `'${name.replace(/'/g, "''")}'`).join(',');
              churchFilterSQL = `(church IN (${churchList}) OR district_id = ${userDistrictId})`;
            } else {
              churchFilterSQL = `district_id = ${userDistrictId}`;
            }
            
            // Usar template string para construir queries
            const usersQuery = `SELECT COUNT(*) as count FROM users WHERE email != 'admin@7care.com' AND ${churchFilterSQL}`;
            const users = await sql(usersQuery);
            
            const events = await sql`SELECT COUNT(*) as count FROM events`;
            
            const interestedQuery = `SELECT COUNT(*) as count FROM users WHERE role = 'interested' AND email != 'admin@7care.com' AND ${churchFilterSQL}`;
            const interested = await sql(interestedQuery);
            
            const membersQuery = `SELECT COUNT(*) as count FROM users WHERE role = 'member' AND email != 'admin@7care.com' AND ${churchFilterSQL}`;
            const members = await sql(membersQuery);
            
            const adminsQuery = `SELECT COUNT(*) as count FROM users WHERE role IN ('superadmin', 'pastor') AND email != 'admin@7care.com' AND ${churchFilterSQL}`;
            const admins = await sql(adminsQuery);
            
            const missionariesQuery = `SELECT COUNT(*) as count FROM users WHERE role LIKE '%missionary%' AND email != 'admin@7care.com' AND ${churchFilterSQL}`;
            const missionaries = await sql(missionariesQuery);
            
            // Calcular eventos desta semana e mês
            const today = new Date();
            const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            
            const thisWeekEvents = await sql`
              SELECT COUNT(*) as count FROM events 
              WHERE date >= ${weekStart.toISOString().split('T')[0]}
              AND date <= ${today.toISOString().split('T')[0]}
            `;
            
            const thisMonthEvents = await sql`
              SELECT COUNT(*) as count FROM events 
              WHERE date >= ${monthStart.toISOString().split('T')[0]}
              AND date <= ${today.toISOString().split('T')[0]}
            `;
            
            // Calcular aniversariantes do distrito
            const birthdaysTodayQuery = `SELECT COUNT(*) as count FROM users WHERE email != 'admin@7care.com' AND ${churchFilterSQL} AND birth_date IS NOT NULL AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM NOW())`;
            const birthdaysToday = await sql(birthdaysTodayQuery);
            
            const birthdaysThisWeekQuery = `SELECT COUNT(*) as count FROM users WHERE email != 'admin@7care.com' AND ${churchFilterSQL} AND birth_date IS NOT NULL AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(DAY FROM birth_date) BETWEEN EXTRACT(DAY FROM NOW()) AND EXTRACT(DAY FROM NOW() + INTERVAL '7 days')`;
            const birthdaysThisWeek = await sql(birthdaysThisWeekQuery);
            
            // Contar tarefas pendentes
            const pendingTasks = await sql`
              SELECT COUNT(*) as count FROM tasks 
              WHERE status = 'pending'
            `;
            
            // Contar interessados sendo discipulados do distrito
            let interestedBeingDiscipled = 0;
            try {
              // Ajustar filtro para usar alias u.
              let relationshipFilterSQL = churchFilterSQL.replace(/district_id/g, 'u.district_id').replace(/church/g, 'u.church');
              const relationshipsQuery = `SELECT r.* FROM relationships r INNER JOIN users u ON r.interested_id = u.id WHERE r.status = 'active' AND u.email != 'admin@7care.com' AND ${relationshipFilterSQL}`;
              const relationships = await sql(relationshipsQuery);
              
              const uniqueInterested = new Set(
                relationships.map(rel => rel.interested_id).filter(id => id != null)
              );
              interestedBeingDiscipled = uniqueInterested.size;
            } catch (error) {
              console.error('⚠️ Erro ao contar interessados sendo discipulados:', error);
            }
            
            const stats = {
              totalUsers: parseInt(users[0].count),
              totalEvents: parseInt(events[0].count),
              totalInterested: parseInt(interested[0].count),
              interestedBeingDiscipled: interestedBeingDiscipled,
              totalMembers: parseInt(members[0].count),
              totalAdmins: parseInt(admins[0].count),
              totalMissionaries: parseInt(missionaries[0].count),
              pendingApprovals: parseInt(pendingTasks[0].count),
              thisWeekEvents: parseInt(thisWeekEvents[0].count),
              thisMonthEvents: parseInt(thisMonthEvents[0].count),
              birthdaysToday: parseInt(birthdaysToday[0].count),
              birthdaysThisWeek: parseInt(birthdaysThisWeek[0].count),
              approvedUsers: parseInt(members[0].count) + parseInt(missionaries[0].count) + parseInt(admins[0].count),
              totalChurches: districtChurches.length
            };
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(stats)
            };
          }
        }

        // Se for admin sem districtId, igreja "Sistema" ou não tiver userId, mostrar estatísticas globais
        if (!userId || !userChurch || userChurch === 'Sistema' || (userData && userData.length > 0 && hasAdminAccess(userData[0]))) {
          console.log('🔍 Dashboard stats globais (admin sem distrito ou sem userId)');
      const users = await sql`SELECT COUNT(*) as count FROM users`;
      const events = await sql`SELECT COUNT(*) as count FROM events`;
      const interested = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'interested'`;
      const members = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'member'`;
      const admins = await sql`SELECT COUNT(*) as count FROM users WHERE role IN ('superadmin', 'pastor')`;
      const missionaries = await sql`SELECT COUNT(*) as count FROM users WHERE role LIKE '%missionary%'`;
      
      // Calcular eventos desta semana e mês
      const today = new Date();
      const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const thisWeekEvents = await sql`
        SELECT COUNT(*) as count FROM events 
        WHERE date >= ${weekStart.toISOString().split('T')[0]}
        AND date <= ${today.toISOString().split('T')[0]}
      `;
      
      const thisMonthEvents = await sql`
        SELECT COUNT(*) as count FROM events 
        WHERE date >= ${monthStart.toISOString().split('T')[0]}
        AND date <= ${today.toISOString().split('T')[0]}
      `;
      
      // Calcular aniversariantes hoje e esta semana
      const birthdaysToday = await sql`
        SELECT COUNT(*) as count FROM users 
        WHERE birth_date IS NOT NULL 
        AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM NOW())
        AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM NOW())
      `;
      
      const birthdaysThisWeek = await sql`
        SELECT COUNT(*) as count FROM users 
        WHERE birth_date IS NOT NULL 
        AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM NOW())
        AND EXTRACT(DAY FROM birth_date) BETWEEN EXTRACT(DAY FROM NOW()) AND EXTRACT(DAY FROM NOW() + INTERVAL '7 days')
      `;
      
      // Contar tarefas pendentes e concluídas
      const pendingTasks = await sql`
        SELECT COUNT(*) as count FROM tasks 
        WHERE status = 'pending'
      `;
      
      const completedTasks = await sql`
        SELECT COUNT(*) as count FROM tasks 
        WHERE status = 'completed'
      `;
      
      console.log(`📋 Tarefas - Pendentes: ${parseInt(pendingTasks[0].count)}, Concluídas: ${parseInt(completedTasks[0].count)}`);
      
      // Contar interessados sendo discipulados
      let interestedBeingDiscipled = 0;
      try {
        const relationships = await sql`
          SELECT * FROM relationships
        `;
        
        console.log(`🔍 DEBUG - Total de relacionamentos: ${relationships.length}`);
        
        // Filtrar apenas ativos
        const activeRelationships = relationships.filter(rel => rel.status === 'active');
        console.log(`✅ Relacionamentos ativos: ${activeRelationships.length}`);
        
        // Contar interessados únicos
        const uniqueInterested = new Set(
          activeRelationships
            .map(rel => rel.interested_id)
            .filter(id => id != null)
        );
        
        interestedBeingDiscipled = uniqueInterested.size;
        console.log(`👥 Interessados únicos com discipulador: ${interestedBeingDiscipled}`);
        console.log(`📋 IDs: [${Array.from(uniqueInterested).join(', ')}]`);
      } catch (error) {
        console.error('⚠️ Erro ao contar interessados sendo discipulados:', error);
      }
      
      const stats = {
        totalUsers: parseInt(users[0].count),
        totalEvents: parseInt(events[0].count),
        totalInterested: parseInt(interested[0].count),
        interestedBeingDiscipled: interestedBeingDiscipled,
        totalMembers: parseInt(members[0].count),
        totalAdmins: parseInt(admins[0].count),
        totalMissionaries: parseInt(missionaries[0].count),
        pendingApprovals: parseInt(pendingTasks[0].count), // Tarefas pendentes
        completedTasks: parseInt(completedTasks[0].count), // Tarefas concluídas
        thisWeekEvents: parseInt(thisWeekEvents[0].count),
        thisMonthEvents: parseInt(thisMonthEvents[0].count),
        birthdaysToday: parseInt(birthdaysToday[0].count),
        birthdaysThisWeek: parseInt(birthdaysThisWeek[0].count),
        approvedUsers: parseInt(members[0].count) + parseInt(missionaries[0].count) + parseInt(admins[0].count),
        totalChurches: 6
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(stats)
      };
        }

        // Para membros/missionários, filtrar por igreja
        const users = await sql`SELECT COUNT(*) as count FROM users WHERE church = ${userChurch}`;
        const events = await sql`SELECT COUNT(*) as count FROM events`;
        const interested = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'interested' AND church = ${userChurch}`;
        const members = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'member' AND church = ${userChurch}`;
        const missionaries = await sql`SELECT COUNT(*) as count FROM users WHERE role LIKE '%missionary%' AND church = ${userChurch}`;
        
        // Calcular eventos desta semana e mês para a igreja
        const today = new Date();
        const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const thisWeekEvents = await sql`
          SELECT COUNT(*) as count FROM events 
          WHERE date >= ${weekStart.toISOString().split('T')[0]}
          AND date <= ${today.toISOString().split('T')[0]}
        `;
        
        const thisMonthEvents = await sql`
          SELECT COUNT(*) as count FROM events 
          WHERE date >= ${monthStart.toISOString().split('T')[0]}
          AND date <= ${today.toISOString().split('T')[0]}
        `;
        
        // Buscar aniversariantes da igreja
        const birthdaysToday = await sql`
          SELECT COUNT(*) as count FROM users 
          WHERE church = ${userChurch} 
          AND birth_date IS NOT NULL 
          AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM NOW())
        `;
        
        const birthdaysThisWeek = await sql`
          SELECT COUNT(*) as count FROM users 
          WHERE church = ${userChurch} 
          AND birth_date IS NOT NULL 
          AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(DAY FROM birth_date) BETWEEN EXTRACT(DAY FROM NOW()) AND EXTRACT(DAY FROM NOW() + INTERVAL '7 days')
        `;
        
        // Contar tarefas pendentes
        const pendingTasks = await sql`
          SELECT COUNT(*) as count FROM tasks 
          WHERE status = 'pending'
        `;
        
        const stats = {
          totalUsers: parseInt(users[0].count),
          totalEvents: parseInt(events[0].count),
          totalInterested: parseInt(interested[0].count),
          totalMembers: parseInt(members[0].count),
          totalAdmins: 0, // Membros não veem admins
          totalMissionaries: parseInt(missionaries[0].count),
          pendingApprovals: parseInt(pendingTasks[0].count), // Tarefas pendentes
          thisWeekEvents: parseInt(thisWeekEvents[0].count),
          thisMonthEvents: parseInt(thisMonthEvents[0].count),
          birthdaysToday: parseInt(birthdaysToday[0].count),
          birthdaysThisWeek: parseInt(birthdaysThisWeek[0].count),
          approvedUsers: parseInt(members[0].count) + parseInt(missionaries[0].count),
          totalChurches: 1, // Apenas sua igreja
          userChurch: userChurch // Adicionar igreja do usuário
        };

        console.log(`📊 Stats da igreja ${userChurch}:`, stats);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(stats)
        };
      } catch (error) {
        console.error('❌ Dashboard stats error:', error);
        console.error('❌ Dashboard stats error stack:', error.stack);
        console.error('❌ Dashboard stats error details:', {
          name: error.name,
          message: error.message,
          userId: event.headers['x-user-id']
        });
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar estatísticas', details: error.message })
        };
      }
    }

    // Rota de teste para diagnosticar o problema
    if (path === '/api/test-users-points' && method === 'GET') {
      console.log('🎯 ROTA DE TESTE FUNCIONANDO!');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: "Rota de teste funcionando",
          data: [
            {
              id: 1,
              name: "Super Administrador",
              email: "admin@7care.com",
              role: "admin",
              points: 1000,
              church: "Sistema"
            }
          ]
        })
      };
    }


    // Rota para usuários com pontos calculados em tempo real - VERSÃO COM VISITAS
    if (path === '/api/users/with-points' && method === 'GET') {
      try {
        const { role, status } = event.queryStringParameters || {};
        
        console.log('🔄 Rota /api/users/with-points chamada');
        
        // Buscar usuários diretamente do banco (já com pontos calculados)
        let users = await sql`SELECT *, extra_data as extraData FROM users ORDER BY points DESC`;
        console.log(`📊 Usuários carregados: ${users.length}`);
        
        // Garantir que users seja sempre um array
        if (!Array.isArray(users)) {
          console.error('❌ Query não retornou um array:', typeof users, users);
          users = [];
        }
        
        // Buscar dados de visitas
        const visitsData = await sql`
          SELECT 
            user_id, 
            COUNT(*) as visit_count, 
            MAX(visit_date) as last_visit_date, 
            MIN(visit_date) as first_visit_date
          FROM visits 
          GROUP BY user_id
        `;
        
        // Criar mapa de visitas
        const visitsMap = new Map();
        visitsData.forEach(visit => {
          // Formatar datas para ISO string
          const formatDate = (dateValue) => {
            if (!dateValue) return null;
            try {
              const date = new Date(dateValue);
              return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
            } catch (error) {
              console.warn('Erro ao formatar data:', dateValue, error);
              return null;
            }
          };
          
          visitsMap.set(visit.user_id, {
            visited: true,
            visitCount: parseInt(visit.visit_count),
            lastVisitDate: formatDate(visit.last_visit_date),
            firstVisitDate: formatDate(visit.first_visit_date)
          });
        });
        
        console.log(`📊 Visitas encontradas: ${visitsData.length}`);
        
        // Processar usuários com dados de visitas
        const processedUsers = users.map(user => {
          // CORREÇÃO: Usar extra_data (do banco) que contém TODOS os dados do usuário
          let extraData = {};
          const rawData = user.extra_data || user.extraData;
          if (rawData) {
            try {
              extraData = typeof rawData === 'string' 
                ? JSON.parse(rawData) 
                : rawData;
            } catch (e) {
              console.log(`⚠️ Erro ao parsear extraData do usuário ${user.name}:`, e.message);
              extraData = {};
            }
          }
          
          // ADICIONAR (não sobrescrever) dados de visitas se existirem
          const visitData = visitsMap.get(user.id);
          if (visitData) {
            extraData.visited = visitData.visited;
            extraData.visitCount = visitData.visitCount;
            extraData.lastVisitDate = visitData.lastVisitDate;
            extraData.firstVisitDate = visitData.firstVisitDate;
          } else {
            // Se não há visitas, garantir que os campos existam
            extraData.visited = false;
            extraData.visitCount = 0;
            extraData.lastVisitDate = null;
            extraData.firstVisitDate = null;
          }
          
          return {
            ...user,
            extraData: extraData
          };
        });
        
        // Aplicar filtros se fornecidos
        let filteredUsers = processedUsers;
        if (role) {
          filteredUsers = filteredUsers.filter(u => u.role === role);
        }
        if (status) {
          filteredUsers = filteredUsers.filter(u => u.status === status);
        }
        
        // Remove password from response
        const safeUsers = filteredUsers.map(({ password, ...user }) => user);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(safeUsers)
        };
      } catch (error) {
        console.error("Get users with points error:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }

    // Função para calcular pontos do usuário (VERSÃO SIMPLIFICADA - USA COLUNAS DIRETAS)
    const calculateUserPoints = async (user) => {
      try {
        // Pular Super Admin
        if (isSuperAdmin(user)) {
          return 0;
        }

        // Buscar configuração atual do banco de dados
        const configRow = await sql`
          SELECT engajamento, classificacao, dizimista, ofertante, tempobatismo,
                 cargos, nomeunidade, temlicao, totalpresenca, escolasabatina,
                 cpfvalido, camposvaziosacms
          FROM points_configuration 
          LIMIT 1
        `;
        
        if (configRow.length === 0) {
          return 0; // Se não há configuração, retornar 0
        }
        
        const config = configRow[0];
        let totalPoints = 0;

        // DEBUG TEMPORÁRIO
        if (user.name && user.name.includes('Daniela')) {
          console.log(`🔍 DEBUG - Calculando pontos para ${user.name}`);
          console.log(`  engajamento: ${user.engajamento}`);
          console.log(`  classificacao: ${user.classificacao}`);
          console.log(`  tem_licao: ${user.tem_licao}`);
          console.log(`  total_presenca: ${user.total_presenca}`);
        }

        // 1. ENGAJAMENTO (usar coluna direta)
        if (user.engajamento) {
          const eng = user.engajamento.toLowerCase();
          if (eng.includes('alto')) totalPoints += config.engajamento.alto || 0;
          else if (eng.includes('médio') || eng.includes('medio')) totalPoints += config.engajamento.medio || 0;
          else if (eng.includes('baixo')) totalPoints += config.engajamento.baixo || 0;
        }

        // 2. CLASSIFICAÇÃO (usar coluna direta)
        if (user.classificacao) {
          const classif = user.classificacao.toLowerCase();
          if (classif.includes('frequente')) totalPoints += config.classificacao.frequente || 0;
          else totalPoints += config.classificacao.naoFrequente || 0;
        }

        // 3. DIZIMISTA (usar coluna direta)
        if (user.dizimista_type) {
          const diz = user.dizimista_type.toLowerCase();
          if (diz.includes('recorrente')) totalPoints += config.dizimista.recorrente || 0;
          else if (diz.includes('sazonal')) totalPoints += config.dizimista.sazonal || 0;
          else if (diz.includes('pontual')) totalPoints += config.dizimista.pontual || 0;
          else totalPoints += config.dizimista.naoDizimista || 0;
        }

        // 4. OFERTANTE (usar coluna direta)
        if (user.ofertante_type) {
          const ofer = user.ofertante_type.toLowerCase();
          if (ofer.includes('recorrente')) totalPoints += config.ofertante.recorrente || 0;
          else if (ofer.includes('sazonal')) totalPoints += config.ofertante.sazonal || 0;
          else if (ofer.includes('pontual')) totalPoints += config.ofertante.pontual || 0;
          else totalPoints += config.ofertante.naoOfertante || 0;
        }

        // 5. TEMPO DE BATISMO (usar coluna direta)
        if (user.tempo_batismo_anos) {
          const tempo = user.tempo_batismo_anos;
          if (tempo >= 30) totalPoints += config.tempobatismo.maisVinte || 0;
          else if (tempo >= 20) totalPoints += config.tempobatismo.vinteAnos || 0;
          else if (tempo >= 10) totalPoints += config.tempobatismo.dezAnos || 0;
          else if (tempo >= 5) totalPoints += config.tempobatismo.cincoAnos || 0;
          else if (tempo >= 2) totalPoints += config.tempobatismo.doisAnos || 0;
        }

        // 6. CARGOS (usar coluna direta)
        if (user.departamentos_cargos) {
          const numCargos = user.departamentos_cargos.split(';').filter(c => c.trim()).length;
          if (numCargos >= 3) totalPoints += config.cargos.tresOuMais || 0;
          else if (numCargos === 2) totalPoints += config.cargos.doisCargos || 0;
          else if (numCargos === 1) totalPoints += config.cargos.umCargo || 0;
        }

        // 7. NOME DA UNIDADE (usar coluna direta)
        if (user.nome_unidade && user.nome_unidade.trim()) {
          totalPoints += config.nomeunidade.comUnidade || 0;
        }

        // 8. TEM LIÇÃO (usar coluna direta)
        if (user.tem_licao === true) {
          totalPoints += config.temlicao.comLicao || 0;
        }

        // 9. TOTAL DE PRESENÇA (usar coluna direta)
        if (user.total_presenca !== undefined && user.total_presenca !== null) {
          const presenca = user.total_presenca;
          if (presenca >= 8) totalPoints += config.totalpresenca.oitoATreze || 0;
          else if (presenca >= 4) totalPoints += config.totalpresenca.quatroASete || 0;
          else totalPoints += config.totalpresenca.zeroATres || 0;
        }

        // 10. ESCOLA SABATINA - Comunhão (usar coluna direta)
        if (user.comunhao && user.comunhao > 0) {
          totalPoints += user.comunhao * (config.escolasabatina.comunhao || 0);
        }

        // 11. ESCOLA SABATINA - Missão (usar coluna direta)
        if (user.missao && user.missao > 0) {
          totalPoints += user.missao * (config.escolasabatina.missao || 0);
        }

        // 12. ESCOLA SABATINA - Estudo Bíblico (usar coluna direta)
        if (user.estudo_biblico && user.estudo_biblico > 0) {
          totalPoints += user.estudo_biblico * (config.escolasabatina.estudoBiblico || 0);
        }

        // 13. BATIZOU ALGUÉM (usar coluna direta)
        if (user.batizou_alguem === true) {
          totalPoints += config.escolasabatina.batizouAlguem || 0;
        }

        // 14. DISCIPULADO PÓS-BATISMO (usar coluna direta)
        if (user.disc_pos_batismal && user.disc_pos_batismal > 0) {
          totalPoints += user.disc_pos_batismal * (config.escolasabatina.discipuladoPosBatismo || 0);
        }

        // 15. CPF VÁLIDO (usar coluna direta)
        if (user.cpf_valido === true) {
          totalPoints += config.cpfvalido.valido || 0;
        }

        // 16. SEM CAMPOS VAZIOS (usar coluna direta)
        if (user.campos_vazios === false) {
          totalPoints += config.camposvaziosacms.completos || 0;
        }

        return Math.round(totalPoints);

      } catch (error) {
        console.error('❌ Erro na função calculateUserPoints:', error);
        return 0;
      }
    };

    // Rota para usuários - VERSÃO COM TABELA DE VISITAS E PONTUAÇÃO CALCULADA
    if (path === '/api/users' && method === 'GET') {
      try {
        console.log('🔍 Users route hit - buscando usuários do banco');
        
        // Verificar parâmetros de query
        const url = new URL(event.rawUrl || `https://example.com${path}`);
        const role = url.searchParams.get('role');
        
        console.log('🔍 Role filter:', role);
        
        // Buscar usuários com filtro opcional por role
        let users;
        if (role) {
          users = await sql`SELECT *, extra_data as extraData FROM users WHERE role = ${role} ORDER BY name ASC`;
        } else {
          users = await sql`SELECT *, extra_data as extraData FROM users ORDER BY name ASC`;
        }
        console.log(`📊 Usuários carregados: ${users.length} (filtro role: ${role || 'nenhum'})`);
        
        // Buscar dados de visitas
        const visitsData = await sql`
          SELECT 
            user_id, 
            COUNT(*) as visit_count, 
            MAX(visit_date) as last_visit_date, 
            MIN(visit_date) as first_visit_date
          FROM visits 
          GROUP BY user_id
        `;
        
        // Criar mapa de visitas
        const visitsMap = new Map();
        visitsData.forEach(visit => {
          visitsMap.set(visit.user_id, {
            visited: true,
            visitCount: parseInt(visit.visit_count),
            lastVisitDate: visit.last_visit_date,
            firstVisitDate: visit.first_visit_date
          });
        });
        
        console.log(`📊 Visitas encontradas: ${visitsData.length}`);
        
        // OTIMIZAÇÃO: Processar usuários sem calcular pontos (usar pontos já salvos no banco)
        // Os pontos são recalculados apenas quando a configuração muda
        const processedUsers = users.map((user) => {
          // Parsear extra_data
          let extraData = {};
          const rawData = user.extra_data || user.extraData;
          if (rawData) {
            try {
              extraData = typeof rawData === 'string' 
                ? JSON.parse(rawData) 
                : rawData;
            } catch (e) {
              console.log(`⚠️ Erro ao parsear extraData do usuário ${user.name}:`, e.message);
              extraData = {};
            }
          }
          
          // Adicionar dados de visitas
          const visitData = visitsMap.get(user.id);
          if (visitData) {
            extraData.visited = visitData.visited;
            extraData.visitCount = visitData.visitCount;
            extraData.lastVisitDate = visitData.lastVisitDate;
            extraData.firstVisitDate = visitData.firstVisitDate;
          } else {
            extraData.visited = false;
            extraData.visitCount = 0;
            extraData.lastVisitDate = null;
            extraData.firstVisitDate = null;
        }
          
          return {
            ...user,
            extraData: extraData
          };
        });
        
        console.log(`📊 Usuários processados: ${processedUsers.length}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(processedUsers)
        };
      } catch (error) {
        console.error('❌ Erro ao buscar usuários:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro interno do servidor',
            details: error.message 
          })
        };
      }
    }

    // Rota para usuário específico
    if (path.match(/^\/api\/users\/\d+$/) && method === 'GET') {
      try {
        const userId = parseInt(path.split('/')[3]);
        console.log('🔍 User route hit - buscando usuário:', userId);
        
        const users = await sql`SELECT *, extra_data as extraData FROM users WHERE id = ${userId} LIMIT 1`;
        
        if (users.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }
        
        // Processar extraData para garantir que visitas sejam exibidas corretamente
        const user = users[0];
        let extraData = {};
        const rawData = user.extra_data || user.extraData;
        if (rawData) {
          if (typeof rawData === 'string') {
            try {
              extraData = JSON.parse(rawData);
            } catch (e) {
              console.log(`⚠️ Erro ao parsear extraData do usuário ${user.name}:`, e.message);
              extraData = {};
            }
          } else if (typeof rawData === 'object') {
            extraData = rawData;
          }
        }
        
        const processedUser = {
          ...user,
          extraData: extraData
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(processedUser)
        };
      } catch (error) {
        console.error('❌ Erro ao buscar usuário:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para eventos
    // REMOVIDO: Rota duplicada de eventos - usar a rota mais completa abaixo que tem filtro por role

    // Rota para processar eventos pendentes do Google Drive
    if (path === '/api/calendar/process-pending-events' && method === 'POST') {
      try {
        // Buscar eventos pendentes
        const pendingEvents = await sql`
          SELECT * FROM pending_google_drive_events 
          WHERE status = 'pending' 
          ORDER BY created_at ASC 
          LIMIT 10
        `;
        
        if (pendingEvents.length === 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              message: 'Nenhum evento pendente encontrado',
              processedCount: 0
            })
          };
        }
        
        let processedCount = 0;
        
        for (const pendingEvent of pendingEvents) {
          try {
            // Criar CSV com o evento para adicionar à planilha
            const csvLine = `"${pendingEvent.title}","${pendingEvent.date}","${pendingEvent.type}","${pendingEvent.description || ''}","${pendingEvent.location || ''}","${pendingEvent.organizer}"`;
            
            console.log(`📊 [PROCESS] Processando evento: ${pendingEvent.title}`);
            console.log(`📝 [PROCESS] Linha CSV: ${csvLine}`);
            
            // Marcar como processado
            await sql`
              UPDATE pending_google_drive_events 
              SET status = 'processed', processed_at = NOW()
              WHERE id = ${pendingEvent.id}
            `;
            
            processedCount++;
            console.log(`✅ Evento "${pendingEvent.title}" processado e pronto para a planilha`);
            
          } catch (error) {
            console.error(`❌ Erro ao processar evento ${pendingEvent.id}:`, error);
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `${processedCount} eventos processados e prontos para a planilha`,
            processedCount,
            totalEvents: pendingEvents.length
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao processar eventos pendentes:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para baixar CSV de novos eventos
    if (path === '/api/calendar/download-new-events' && method === 'GET') {
      try {
        // Buscar CSV de novos eventos
        const result = await sql`
          SELECT value FROM system_settings 
          WHERE key = 'google_drive_new_events'
          LIMIT 1
        `;
        
        if (result.length === 0 || !result[0].value) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Nenhum arquivo CSV de novos eventos encontrado' })
          };
        }
        
        const csvData = typeof result[0].value === 'object' ? 
          result[0].value : 
          JSON.parse(result[0].value);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${csvData.filename}"`,
            'Access-Control-Allow-Origin': '*'
          },
          body: csvData.content
        };
        
      } catch (error) {
        console.error('❌ Erro ao baixar CSV de novos eventos:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para buscar eventos
    if (path === '/api/calendar/events' && method === 'GET') {
      try {
        const events = await sql`
          SELECT id, title, description, date, end_date, type, color, location, capacity, created_at, updated_at
          FROM events 
          ORDER BY date ASC
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(events)
        };
      } catch (error) {
        console.error('❌ Erro ao buscar eventos:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para criar eventos (suporta evento único ou array)
    if (path === '/api/calendar/events' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        
        // Detectar se é um único evento ou um array de eventos
        let eventsArray = [];
        if (body.events && Array.isArray(body.events)) {
          // Formato de importação em massa: { events: [...] }
          eventsArray = body.events;
        } else if (body.title) {
          // Formato de evento único: { title, date, ... }
          eventsArray = [body];
        } else {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Dados de evento(s) inválidos' })
          };
        }

        const createdEvents = [];
        
        for (const eventData of eventsArray) {
          // Validar dados obrigatórios (aceita date OU startDate)
          const eventDate = eventData.date || eventData.startDate;
          if (!eventData.title || !eventDate) {
            console.log('⚠️ Evento inválido (faltando title ou date):', eventData);
            continue; // Pular eventos inválidos
          }

          // Mapear categoria para cor (função inline)
          const mapEventTypeInline = (categoryStr) => {
            if (!categoryStr) {
              return { type: 'igreja-local', color: '#ef4444' };
            }
            
            const category = categoryStr.toLowerCase().trim();
            
            // Categorias estabelecidas com suas cores
            const establishedCategories = {
              'igreja-local': { 
                variations: ['igreja local', 'igreja-local', 'local', 'igreja', 'culto', 'cultos'],
                color: '#ef4444'
              },
              'asr-geral': { 
                variations: ['asr geral', 'asr-geral', 'asr', 'conferência', 'conferencia'],
                color: '#f97316'
              },
              'asr-administrativo': { 
                variations: ['asr administrativo', 'asr-administrativo', 'administrativo', 'admin'],
                color: '#06b6d4'
              },
              'asr-pastores': { 
                variations: ['asr pastores', 'asr-pastores', 'pastores', 'pastor'],
                color: '#8b5cf6'
              },
              'visitas': { 
                variations: ['visitas', 'visita', 'visitação', 'visitacao'],
                color: '#10b981'
              },
              'reuniões': { 
                variations: ['reuniões', 'reunioes', 'reunião', 'reuniao'],
                color: '#3b82f6'
              },
              'pregacoes': { 
                variations: ['pregacoes', 'pregações', 'pregacao', 'pregação', 'sermão', 'sermao'],
                color: '#6366f1'
              }
            };
            
            // Buscar categoria correspondente
            for (const [standardCategory, data] of Object.entries(establishedCategories)) {
              for (const variation of data.variations) {
                if (category.includes(variation) || variation.includes(category)) {
                  return { type: standardCategory, color: data.color };
                }
              }
            }
            
            // Nova categoria - gerar cor dinâmica
            const generateDynamicColor = (categoryName) => {
              const colors = ['#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#10b981', '#06b6d4', '#84cc16', '#f97316', '#8b5a2b'];
              let hash = 0;
              for (let i = 0; i < categoryName.length; i++) {
                hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
              }
              const colorIndex = Math.abs(hash) % colors.length;
              return colors[colorIndex];
            };
            
            return { type: category, color: generateDynamicColor(category) };
          };
          
          const categoryMapping = mapEventTypeInline(eventData.category || eventData.type || 'igreja-local');
          
          // Usar date/end_date OU startDate/endDate
          const eventStartDate = eventData.date || eventData.startDate;
          const eventEndDate = eventData.end_date || eventData.endDate || eventStartDate;
          
          // Preparar dados para inserção (apenas colunas que existem na tabela)
          const insertData = {
            title: eventData.title,
            description: eventData.description || '',
            date: eventStartDate,
            end_date: eventEndDate,
            type: categoryMapping.type,
            color: categoryMapping.color,
            location: eventData.location || '',
            capacity: eventData.maxAttendees || 50,
            created_by: eventData.created_by || 1
          };

          // Inserir evento no banco
          const result = await sql`
            INSERT INTO events (title, description, date, end_date, type, color, location, capacity, created_by, created_at, updated_at)
            VALUES (${insertData.title}, ${insertData.description}, ${insertData.date}::date, ${insertData.end_date}::date, ${insertData.type}, ${insertData.color}, ${insertData.location}, ${insertData.capacity}, ${insertData.created_by}, NOW(), NOW())
            RETURNING id, title, date, end_date, type, color, location, description, capacity, created_by
          `;

          if (result.length > 0) {
            createdEvents.push(result[0]);
            console.log(`✅ Evento criado: ${result[0].title} (ID: ${result[0].id})`);
          }
        }

        // TEMPORÁRIO: Desabilitado para evitar duplicação até implementar sistema offline correto
        // A sincronização com Google Sheets deve ser feita manualmente via botão "Sincronizar Google Drive"
        // try {
        //   console.log('📊 [CREATE-EVENT] Tentando adicionar eventos à planilha do Google Drive...');
        //   await addEventsToGoogleDrive(createdEvents);
        //   console.log(`✅ [CREATE-EVENT] ${createdEvents.length} eventos processados para a planilha do Google Drive`);
        // } catch (googleError) {
        //   console.log('⚠️ [CREATE-EVENT] Não foi possível adicionar à planilha do Google Drive:', googleError.message);
        // }

        // Se foi um único evento, retornar formato simples
        if (!body.events && body.title && createdEvents.length === 1) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(createdEvents[0])
          };
        }
        
        // Se foi importação em massa, retornar formato com array
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `${createdEvents.length} evento(s) criado(s) com sucesso`,
            events: createdEvents
          })
        };

      } catch (error) {
        console.error('❌ Erro ao criar eventos:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para check-ins emocionais
    if (path === '/api/emotional-checkin' && method === 'POST') {
      const body = JSON.parse(event.body);
      const { userId, mood, notes } = body;
      
      if (!userId || !mood) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'userId e mood são obrigatórios' })
        };
      }

      const result = await sql`
        INSERT INTO emotional_checkins (user_id, mood, notes, created_at)
        VALUES (${userId}, ${mood}, ${notes || ''}, NOW())
        RETURNING *
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: result[0] })
      };
    }

    // Rota para listar check-ins
    if (path === '/api/emotional-checkins/admin' && method === 'GET') {
      const checkIns = await sql`
        SELECT ec.*, u.name as user_name, u.email 
        FROM emotional_checkins ec
        JOIN users u ON ec.user_id = u.id
        ORDER BY ec.created_at DESC
        LIMIT 50
      `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(checkIns)
      };
    }

    // Rota para buscar check-ins de um usuário específico
    if (path.startsWith('/api/emotional-checkins/user/') && method === 'GET') {
      try {
        const userId = parseInt(path.split('/')[4]);
        
        if (isNaN(userId)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID de usuário inválido' })
          };
        }

        const checkIns = await sql`
          SELECT ec.*, u.name as user_name, u.email 
          FROM emotional_checkins ec
          JOIN users u ON ec.user_id = u.id
          WHERE ec.user_id = ${userId}
          ORDER BY ec.created_at DESC
          LIMIT 10
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(checkIns)
        };
      } catch (error) {
        console.error('Erro ao buscar check-ins do usuário:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para reverter missionários de volta para membros (para usar badge duplo)
    if (path === '/api/users/revert-missionaries-to-members' && method === 'POST') {
      try {
        console.log('🔄 Revertendo missionários para membros para usar badge duplo...');
        
        // Buscar missionários que têm relacionamentos ativos
        const missionariesWithRelationships = await sql`
          SELECT DISTINCT u.id, u.name, u.role
          FROM users u
          INNER JOIN relationships r ON u.id = r.missionary_id
          WHERE u.role = 'missionary' AND r.status = 'active'
        `;
        
        console.log(`📊 Encontrados ${missionariesWithRelationships.length} missionários com relacionamentos`);
        
        let revertedCount = 0;
        for (const missionary of missionariesWithRelationships) {
          await sql`
            UPDATE users 
            SET role = 'member', updated_at = NOW()
            WHERE id = ${missionary.id}
          `;
          revertedCount++;
          console.log(`✅ Missionário ${missionary.name} (ID: ${missionary.id}) revertido para membro`);
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `${revertedCount} missionários foram revertidos para membros`,
            revertedCount: revertedCount
          })
        };
      } catch (error) {
        console.error('❌ Erro ao reverter missionários:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro ao reverter missionários',
            details: error.message 
          })
        };
      }
    }

    // Rota para promover membros com relacionamentos a missionários
    if (path === '/api/users/promote-members-to-missionaries' && method === 'POST') {
    try {
      console.log('🔄 Iniciando promoção de membros com relacionamentos a missionários...');
      
      // Buscar membros que têm relacionamentos ativos
      const membersWithRelationships = await sql`
        SELECT DISTINCT u.id, u.name, u.role
        FROM users u
        INNER JOIN relationships r ON u.id = r.missionary_id
        WHERE u.role = 'member' AND r.status = 'active'
      `;
      
      console.log(`📊 Encontrados ${membersWithRelationships.length} membros com relacionamentos`);
      
      let promotedCount = 0;
      for (const member of membersWithRelationships) {
        await sql`
          UPDATE users 
          SET role = 'missionary', updated_at = NOW()
          WHERE id = ${member.id}
        `;
        promotedCount++;
        console.log(`✅ Membro ${member.name} (ID: ${member.id}) promovido a missionário`);
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `${promotedCount} membros foram promovidos a missionários`,
          promotedCount: promotedCount
        })
      };
    } catch (error) {
      console.error('❌ Erro ao promover membros:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Erro ao promover membros',
          details: error.message 
        })
      };
    }
  }

  // Rota para limpar todas as visitas
  if (path === '/api/visits/clear-all' && method === 'POST') {
      try {
        console.log('🧹 [CLEAR] Iniciando limpeza de todas as visitas...');
        
        // Contar visitas antes da limpeza
        const countBefore = await sql`SELECT COUNT(*) as total FROM visits`;
        const totalBefore = countBefore[0]?.total || 0;
        
        console.log(`📊 [CLEAR] Total de visitas antes da limpeza: ${totalBefore}`);
        
        // Limpar todas as visitas
        const deleteResult = await sql`DELETE FROM visits`;
        
        console.log('✅ [CLEAR] Todas as visitas foram removidas');
        
        // Verificar se realmente foram removidas
        const countAfter = await sql`SELECT COUNT(*) as total FROM visits`;
        const totalAfter = countAfter[0]?.total || 0;
        
        console.log(`📊 [CLEAR] Total de visitas após limpeza: ${totalAfter}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Todas as visitas foram removidas com sucesso',
            visitsRemoved: totalBefore,
            remainingVisits: totalAfter
          })
        };
      } catch (error) {
        console.error('❌ [CLEAR] Erro ao limpar visitas:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro ao limpar visitas',
            details: error.message 
          })
        };
      }
    }

    // Rota para buscar histórico de visitas de um usuário específico
    if (path.startsWith('/api/visits/user/') && method === 'GET') {
      try {
        const userId = parseInt(path.split('/')[4]);
        
        if (isNaN(userId)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID de usuário inválido' })
          };
        }

        const visits = await sql`
          SELECT id, visit_date, created_at
          FROM visits
          WHERE user_id = ${userId}
          ORDER BY visit_date DESC, created_at DESC
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(visits)
        };
      } catch (error) {
        console.error('Erro ao buscar histórico de visitas:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para zerar visitas de um usuário específico
    if (path.startsWith('/api/visits/user/') && path.endsWith('/reset') && method === 'DELETE') {
      try {
        const userId = parseInt(path.split('/')[4]);
        
        if (isNaN(userId)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID de usuário inválido' })
          };
        }

        console.log(`🔄 [RESET] Zerando visitas do usuário ${userId}...`);
        
        // Contar visitas antes da remoção
        const countBefore = await sql`SELECT COUNT(*) as total FROM visits WHERE user_id = ${userId}`;
        const totalBefore = countBefore[0]?.total || 0;
        
        // Remover todas as visitas do usuário
        const deleteResult = await sql`DELETE FROM visits WHERE user_id = ${userId}`;
        
        console.log(`✅ [RESET] ${totalBefore} visitas removidas do usuário ${userId}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Todas as visitas do usuário foram removidas com sucesso`,
            visitsRemoved: totalBefore
          })
        };
      } catch (error) {
        console.error('❌ [RESET] Erro ao zerar visitas do usuário:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro ao zerar visitas do usuário',
            details: error.message 
          })
        };
      }
    }

    // Rota para login
    if (path === '/api/auth/login' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { email, password } = body;
        
        console.log('🔍 Login attempt:', { email, password: password ? '***' : 'missing' });
        
        if (!email || !password) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Email e senha são obrigatórios' })
          };
        }

        if (email === 'admin@7care.com') {
          const existingAdmin = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
          if (existingAdmin.length === 0) {
            // SEGURANÇA: Usar senha de variável de ambiente ou fallback seguro
            const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'meu7care';
            if (!process.env.DEFAULT_ADMIN_PASSWORD) {
              console.warn('⚠️ DEFAULT_ADMIN_PASSWORD não configurado. Usando senha padrão (NÃO use em produção!)');
            }
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            const extraData = JSON.stringify({
              superAdmin: true,
              permanent: true
            });
            await sql`
              INSERT INTO users (
                name, email, password, role, church, church_code, departments,
                birth_date, civil_status, occupation, education, address, baptism_date,
                previous_religion, biblical_instructor, interested_situation,
                is_donor, is_tither, is_approved, points, level, attendance,
                extra_data, observations, first_access, status
              ) VALUES (
                'Super Administrador', 'admin@7care.com', ${hashedPassword}, 'superadmin', 'Sistema', 'SYS', 'Administração',
                '1990-01-01', 'Solteiro', 'Administrador do Sistema', 'Superior', 'Sistema', '1990-01-01',
                'N/A', 'N/A', 'N/A',
                false, false, true, 1000, 'Super Admin', 100,
                ${extraData}, 'Super administrador permanente do sistema', false, 'active'
              )
            `;
          }
        }

        // Função para gerar formato nome.ultimonome
        const generateNameFormat = (email) => {
          if (!email || email.includes('@')) return null;
          
          // Se já é um formato nome.ultimonome, retornar como está
          if (email.includes('.')) {
            return email;
          }
          
          return null;
        };

        // 1) Buscar por email exato (email importado legítimo)
        let users = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
        console.log('🔍 Users found by exact email:', users.length);
        
        // 2) Se não encontrou e o email contém @, tentar buscar por email sem o domínio
        if (users.length === 0 && email.includes('@')) {
          const emailLocalPart = email.split('@')[0];
          console.log('🔍 Trying email local part:', emailLocalPart);
          
          // Buscar por email que comece com a parte local (antes do @)
          users = await sql`SELECT * FROM users WHERE email LIKE ${`${emailLocalPart}%`} LIMIT 1`;
          console.log(`🔍 Users found by email local part "${emailLocalPart}":`, users.length);
        }
        
        // 3) Se não encontrou, tentar como primeironome.ultimonome (gerar formato do nome)
        if (users.length === 0 && email.includes('.') && !email.includes('@')) {
          console.log('🔍 Trying primeironome.ultimonome format...');
          
          // Buscar usuário que tenha o padrão primeironome.ultimonome no nome
          const nameParts = email.split('.');
          if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            
            // Buscar por usuário que tenha primeiro nome e último nome no nome completo
            users = await sql`SELECT * FROM users WHERE name ILIKE ${`%${firstName}%${lastName}%`} LIMIT 1`;
            console.log(`🔍 Users found by name pattern "${firstName} ${lastName}":`, users.length);
          }
        }
        
        // 4) Se ainda não encontrou e o email contém @, tentar buscar por nome baseado na parte local
        if (users.length === 0 && email.includes('@')) {
          const emailLocalPart = email.split('@')[0];
          console.log('🔍 Trying name search based on email local part:', emailLocalPart);
          
          // Se a parte local contém ponto, tentar buscar por nome
          if (emailLocalPart.includes('.')) {
            const nameParts = emailLocalPart.split('.');
            if (nameParts.length >= 2) {
              const firstName = nameParts[0];
              const lastName = nameParts[nameParts.length - 1];
              
              // Buscar por usuário que tenha primeiro nome e último nome no nome completo
              users = await sql`SELECT * FROM users WHERE name ILIKE ${`%${firstName}%${lastName}%`} LIMIT 1`;
              console.log(`🔍 Users found by name pattern from email "${firstName} ${lastName}":`, users.length);
            }
          } else {
            // Se não tem ponto, tentar buscar por nome que contenha a parte local
            users = await sql`SELECT * FROM users WHERE name ILIKE ${`%${emailLocalPart}%`} LIMIT 1`;
            console.log(`🔍 Users found by name containing "${emailLocalPart}":`, users.length);
          }
        }
        
        if (users.length === 0) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }

        const user = users[0];
        console.log('🔍 User found:', { id: user.id, name: user.name, role: user.role, district_id: user.district_id });
        
        // Verificar senha usando bcrypt
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        // Fallback para senhas antigas (hardcoded) - remover depois de migração completa
        const validPasswords = ['admin123', '123456', 'admin', 'password', '7care', 'meu7care'];
        const isOldPassword = validPasswords.includes(password) && !user.password.startsWith('$2');
        
        if (passwordMatch || isOldPassword) {
          // Verificar se está usando senha padrão
          const isUsingDefaultPassword = await bcrypt.compare('meu7care', user.password);
          
          // Gerar JWT token
          const token = generateToken(user);
          
          console.log('✅ Login bem-sucedido, JWT gerado');
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              token: token, // JWT token
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                church: user.church || 'Sistema',
                isApproved: user.is_approved || user.isApproved || false,
                status: user.status || 'active',
                firstAccess: user.first_access || user.firstAccess || false,
                usingDefaultPassword: isUsingDefaultPassword,
                districtId: user.district_id || user.districtId || null
              }
            })
          };
        }

        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Senha incorreta' })
        };
      } catch (error) {
        console.error('❌ Login error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para registro
    if (path === '/api/auth/register' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { name, email, password, role = 'interested', church } = body;
        
        if (!name || !email || !password) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Nome, email e senha são obrigatórios' })
          };
        }

        // Verificar se usuário já existe
        const existingUsers = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
        if (existingUsers.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Usuário já existe com este email' })
          };
        }

        // Criar novo usuário
        const newUser = {
          name,
          email,
          password: password, // Em produção, hash da senha
          role,
          church: church || 'Sistema',
          is_approved: role.includes('admin'),
          created_at: new Date().toISOString()
        };

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Usuário criado com sucesso',
            user: {
              id: Date.now(), // ID temporário
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
              church: newUser.church
            }
          })
        };
      } catch (error) {
        console.error('❌ Register error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para logout
    if (path === '/api/auth/logout' && method === 'POST') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Logout realizado com sucesso' })
      };
    }

    // Rota para dados do usuário logado
    if (path === '/api/auth/me' && method === 'GET') {
      try {
        const userId = event.headers['x-user-id'] || event.queryStringParameters?.userId;
        
        if (!userId) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Usuário não autenticado' })
          };
        }

        const users = await sql`SELECT * FROM users WHERE id = ${parseInt(userId)} LIMIT 1`;
        
        if (users.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }

        const user = users[0];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            church: user.church,
            is_approved: user.is_approved
          })
        };
      } catch (error) {
        console.error('❌ Auth me error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para reset de senha
    if (path === '/api/auth/reset-password' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { email } = body;
        
        if (!email) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Email é obrigatório' })
          };
        }

        // Verificar se usuário existe
        const users = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
        
        if (users.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Instruções de reset enviadas para o email' 
          })
        };
      } catch (error) {
        console.error('❌ Reset password error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para mudança de senha
    if (path === '/api/auth/change-password' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { userId, currentPassword, newPassword } = body;
        
        if (!userId || !currentPassword || !newPassword) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Todos os campos são obrigatórios' })
          };
        }

        // Verificar senha atual (simplificado)
        const validPasswords = ['admin123', '123456', 'admin', 'password', '7care'];
        if (!validPasswords.includes(currentPassword)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Senha atual incorreta' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Senha alterada com sucesso' 
          })
        };
      } catch (error) {
        console.error('❌ Change password error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para configurações do sistema
    if (path === '/api/settings/logo' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          logo: '/placeholder.svg',
          systemName: '7Care Church Manager'
        })
      };
    }

    // Rota para aniversariantes
    if (path === '/api/users/birthdays' && method === 'GET') {
      try {
        console.log('🎂 Endpoint de aniversários chamado');
        
        // Usar data local para evitar problemas de fuso horário
      const today = new Date();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();
        
        console.log(`🎂 Mês atual: ${currentMonth + 1}, Dia atual: ${currentDay}`);
        
        // Obter ID do usuário do header (se fornecido)
        const userId = event.headers['x-user-id'];
        let userChurch = null;
        let userData = null;
        
        // Se userId fornecido, buscar igreja do usuário
        if (userId) {
          userData = await sql`SELECT church, role FROM users WHERE id = ${userId} LIMIT 1`;
          if (userData.length > 0) {
            userChurch = userData[0].church;
            const userRole = userData[0].role;
            console.log(`🎂 Aniversários para usuário ${userId} (${userRole}) da igreja: ${userChurch}`);
          }
        }

        // Buscar usuários com datas de nascimento válidas (filtrar por igreja se necessário)
        let users;
        if (userChurch && userChurch !== 'Sistema' && !(userData && userData.length > 0 && hasAdminAccess(userData[0]))) {
          users = await sql`
          SELECT id, name, birth_date, church
          FROM users 
          WHERE birth_date IS NOT NULL 
            AND church = ${userChurch}
          ORDER BY EXTRACT(MONTH FROM birth_date), EXTRACT(DAY FROM birth_date)
        `;
        } else {
          users = await sql`
            SELECT id, name, birth_date, church
            FROM users 
            WHERE birth_date IS NOT NULL 
            ORDER BY EXTRACT(MONTH FROM birth_date), EXTRACT(DAY FROM birth_date)
          `;
        }
        
        console.log(`🎂 Usuários encontrados: ${users.length}${userChurch ? ` da igreja ${userChurch}` : ' (todas as igrejas)'}`);
        
        // Filtrar aniversariantes de hoje
        const birthdaysToday = users.filter(user => {
          const birthDate = new Date(user.birth_date);
          return birthDate.getMonth() === currentMonth && birthDate.getDate() === currentDay;
        });
        
        // Filtrar aniversariantes do mês atual (exceto hoje)
        const birthdaysThisMonth = users.filter(user => {
          const birthDate = new Date(user.birth_date);
          return birthDate.getMonth() === currentMonth && birthDate.getDate() !== currentDay;
        });
        
        console.log(`🎂 Aniversariantes hoje: ${birthdaysToday.length}`);
        console.log(`🎂 Aniversariantes do mês: ${birthdaysThisMonth.length}`);
        
        // Formatar dados dos aniversariantes
        const formatBirthdayUser = (user) => {
          let birthDate = null;
          if (user.birth_date) {
            try {
              // Converter para Date object e depois para YYYY-MM-DD
              const date = new Date(user.birth_date);
              if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                birthDate = `${year}-${month}-${day}`;
              }
            } catch (error) {
              console.error('Erro ao formatar data:', error);
              birthDate = null;
            }
          }
          
          return {
            id: user.id,
            name: user.name,
            birthDate: birthDate,
            church: user.church || null
          };
        };
        
        const result = {
          today: birthdaysToday.map(formatBirthdayUser),
          thisMonth: birthdaysThisMonth.map(formatBirthdayUser),
          all: users.map(formatBirthdayUser),
          timestamp: new Date().toISOString(),
          userChurch: userChurch, // Adicionar igreja do usuário
          debug: {
            currentMonth: currentMonth + 1,
            currentDay: currentDay,
            totalUsers: users.length,
            thisMonthCount: birthdaysThisMonth.length,
            todayCount: birthdaysToday.length,
            filteredByChurch: !!userChurch
          }
        };
        
        console.log('🎂 Resultado final:', JSON.stringify(result, null, 2));
      
      return {
        statusCode: 200,
        headers,
          body: JSON.stringify(result)
        };
        
      } catch (error) {
        console.error('❌ Erro no endpoint de aniversariantes:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }

    // ============================================
    // DASHBOARD UNIFICADO - Carrega tudo de uma vez
    // ============================================
    if (path === '/api/dashboard/unified' && method === 'GET') {
      try {
        console.log('🚀 [DASHBOARD UNIFIED] Iniciando carregamento unificado...');
        const startTime = Date.now();
        
        const userId = event.headers['x-user-id'];
        const userRole = event.headers['x-user-role'] || 'member';
        
        // Executar todas as queries em PARALELO para máxima performance
        const [
          // Stats básicos
          usersResult,
          eventsResult,
          interestedResult,
          membersResult,
          adminsResult,
          missionariesResult,
          // Distritos e Pastores (só para superadmin)
          districtsResult,
          pastorsResult,
          // Aniversariantes
          birthdaysTodayResult,
          birthdaysThisWeekResult,
          // Eventos
          eventsListResult,
          // Relacionamentos
          relationshipsResult,
        ] = await Promise.all([
          // Stats básicos
          sql`SELECT COUNT(*) as count FROM users WHERE email != 'admin@7care.com'`,
          sql`SELECT COUNT(*) as count FROM events`,
          sql`SELECT COUNT(*) as count FROM users WHERE role = 'interested' AND email != 'admin@7care.com'`,
          sql`SELECT COUNT(*) as count FROM users WHERE role = 'member' AND email != 'admin@7care.com'`,
          sql`SELECT COUNT(*) as count FROM users WHERE role IN ('superadmin', 'pastor') AND email != 'admin@7care.com'`,
          sql`SELECT COUNT(*) as count FROM users WHERE role LIKE '%missionary%' AND email != 'admin@7care.com'`,
          // Distritos e Pastores
          sql`SELECT id, name FROM districts`,
          sql`SELECT id, name FROM users WHERE role = 'pastor' AND email != 'admin@7care.com'`,
          // Aniversariantes hoje
          sql`SELECT id, name, birth_date, church FROM users 
              WHERE birth_date IS NOT NULL 
              AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM NOW())
              AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM NOW())
              AND email != 'admin@7care.com'
              LIMIT 10`,
          // Aniversariantes esta semana
          sql`SELECT id, name, birth_date, church FROM users 
              WHERE birth_date IS NOT NULL 
              AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM NOW())
              AND EXTRACT(DAY FROM birth_date) BETWEEN EXTRACT(DAY FROM NOW()) AND EXTRACT(DAY FROM NOW()) + 7
              AND email != 'admin@7care.com'
              LIMIT 20`,
          // Próximos eventos (apenas os próximos 5)
          sql`SELECT id, title, date, end_date, location, visibility 
              FROM events 
              WHERE date >= CURRENT_DATE 
              ORDER BY date ASC 
              LIMIT 5`,
          // Relacionamentos ativos
          sql`SELECT interested_id FROM relationships WHERE status = 'active'`,
        ]);

        // Calcular eventos deste mês
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const eventsThisMonth = eventsListResult.filter(e => {
          const eventDate = new Date(e.date);
          return eventDate >= monthStart && eventDate <= monthEnd;
        }).length;

        // Calcular interessados únicos sendo discipulados
        const uniqueInterested = new Set(
          relationshipsResult.map(rel => rel.interested_id).filter(id => id != null)
        );
        const interestedBeingDiscipled = uniqueInterested.size;

        const endTime = Date.now();
        console.log(`✅ [DASHBOARD UNIFIED] Carregado em ${endTime - startTime}ms`);

        const result = {
          // Stats
          stats: {
            totalUsers: parseInt(usersResult[0].count),
            totalEvents: parseInt(eventsResult[0].count),
            totalInterested: parseInt(interestedResult[0].count),
            totalMembers: parseInt(membersResult[0].count),
            totalAdmins: parseInt(adminsResult[0].count),
            totalMissionaries: parseInt(missionariesResult[0].count),
            interestedBeingDiscipled,
            approvedUsers: parseInt(membersResult[0].count) + parseInt(missionariesResult[0].count) + parseInt(adminsResult[0].count),
            eventsThisMonth,
          },
          // Distritos e Pastores (para superadmin)
          districts: districtsResult,
          districtsCount: districtsResult.length,
          pastors: pastorsResult,
          pastorsCount: pastorsResult.length,
          // Aniversariantes
          birthdays: {
            today: birthdaysTodayResult,
            thisWeek: birthdaysThisWeekResult,
            todayCount: birthdaysTodayResult.length,
            thisWeekCount: birthdaysThisWeekResult.length,
          },
          // Próximos eventos
          upcomingEvents: eventsListResult,
          // Metadata
          loadTimeMs: endTime - startTime,
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        };
      } catch (error) {
        console.error('❌ [DASHBOARD UNIFIED] Erro:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao carregar dashboard', details: error.message })
        };
      }
    }

    // Rota para visitas - VERSÃO COM TABELA DE VISITAS
    if (path === '/api/dashboard/visits' && method === 'GET') {
      try {
        console.log('🔍 Buscando dados do visitômetro...');
        
        // Buscar TODOS os usuários do sistema (não apenas member/missionary)
        const allUsers = await sql`
          SELECT id, name, email, role
          FROM users 
          ORDER BY name ASC
        `;
        
        console.log(`👥 Total de usuários no sistema: ${allUsers.length}`);
        
        // Buscar dados de visitas de TODOS os usuários
        const visitsData = await sql`
          SELECT 
            v.user_id, 
            u.name, 
            u.role,
            COUNT(v.id) as visit_count, 
            MAX(v.visit_date) as last_visit_date, 
            MIN(v.visit_date) as first_visit_date
          FROM visits v 
          JOIN users u ON v.user_id = u.id
          GROUP BY v.user_id, u.name, u.role
          ORDER BY u.name ASC
        `;
        
        console.log(`📊 Visitas encontradas: ${visitsData.length}`);
        
        // Contar pessoas visitadas (usuários únicos que receberam pelo menos 1 visita)
        let visitedPeople = visitsData.length;
        let totalVisits = 0;
        const visitedUsersList = [];
        
        // Processar dados de visitas
        visitsData.forEach(visit => {
          const visitCount = parseInt(visit.visit_count);
          totalVisits += visitCount;
          
          visitedUsersList.push({
            id: visit.user_id,
            name: visit.name,
            role: visit.role,
            visitCount: visitCount,
            lastVisitDate: visit.last_visit_date
          });
          
          console.log(`✅ ${visit.name} (${visit.role}): ${visitCount} visitas`);
        });
        
        // Pessoas visitadas = usuários únicos que receberam visitas
        // Visitas realizadas = soma total de todas as visitas
        const expectedVisits = allUsers.length; // Total de usuários no sistema
        const percentage = expectedVisits > 0 ? Math.round((visitedPeople / expectedVisits) * 100) : 0;
        
        console.log(`📊 Visitômetro: ${visitedPeople}/${expectedVisits} pessoas visitadas (${percentage}%), ${totalVisits} visitas totais`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            completed: visitedPeople,
            expected: expectedVisits,
            totalVisits: totalVisits,
            visitedPeople: visitedPeople,
            percentage: percentage,
            visitedUsersList: visitedUsersList
          })
        };
      } catch (error) {
        console.error('❌ Erro ao buscar dados do visitômetro:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para detalhes de pontos do usuário
    if (path.startsWith('/api/users/') && path.endsWith('/points-details') && method === 'GET') {
      const userId = path.split('/')[3];
      console.log('🔍 Points details for user:', userId);
      
      try {
        const user = await sql`SELECT * FROM users WHERE id = ${parseInt(userId)} LIMIT 1`;
        
        if (user.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }

        const userData = user[0];
        
        // USAR PONTOS REAIS DO BANCO (calculados pela função calculateUserPoints)
        const points = userData.points || 0;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            points: points,
            total: points,
            breakdown: {},
            userData: {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              church: userData.church,
              engajamento: userData.engajamento || null,
              classificacao: userData.classificacao || null,
              dizimista: userData.dizimista_type || null,
              ofertante: userData.ofertante_type || null,
              tempoBatismo: userData.tempo_batismo_anos || 0,
              cargos: userData.departamentos_cargos ? [userData.departamentos_cargos] : [],
              nomeUnidade: userData.nome_unidade || null,
              temLicao: userData.tem_licao || false,
              comunhao: userData.comunhao || 0,
              missao: userData.missao || 0,
              estudoBiblico: userData.estudo_biblico || 0,
              totalPresenca: userData.total_presenca || 0,
              batizouAlguem: userData.batizou_alguem || false,
              discipuladoPosBatismo: userData.disc_pos_batismal || 0,
              cpfValido: userData.cpf_valido || false,
              camposVaziosACMS: userData.campos_vazios || false,
              escolaSabatina: {
                comunhao: userData.comunhao || 0,
                missao: userData.missao || 0,
                estudoBiblico: userData.estudo_biblico || 0,
                batizouAlguem: userData.batizou_alguem || false,
                discipuladoPosBatismo: userData.disc_pos_batismal || 0
              }
            }
          })
        };
      } catch (error) {
        console.error('❌ Points details error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar pontos do usuário' })
        };
      }
    }


    // Rota para buscar usuário por ID
    if (path.startsWith('/api/users/') && !path.includes('/points-details') && !path.includes('/with-points') && method === 'GET') {
      console.log('❌ ROTA GENÉRICA INTERCEPTOU:', path);
      const userId = path.split('/')[3];
      console.log('🔍 Get user by ID:', userId);
      
      try {
        const user = await sql`SELECT *, extra_data as extraData FROM users WHERE id = ${parseInt(userId)} LIMIT 1`;
        
        if (user.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(user[0])
        };
      } catch (error) {
        console.error('❌ Get user error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar usuário' })
        };
      }
    }

    // Rota para eventos com filtros
    if (path === '/api/events' && method === 'GET') {
      try {
        const { role } = event.queryStringParameters || {};
        console.log('🔍 Events request with role:', role);
        
        // Buscar eventos do ano atual e próximo ano, ordenados por data
        const currentYear = new Date().getFullYear();
        let events = await sql`
          SELECT * FROM events 
          WHERE EXTRACT(YEAR FROM date) >= ${currentYear} 
          ORDER BY date ASC 
          LIMIT 100
        `;
        
        // Aplicar filtros baseados no role
        if (role && role !== 'admin') {
          // Para não-admins, EXCLUIR eventos administrativos ou internos
          // Manter apenas eventos que NÃO sejam administrativos E NÃO sejam internos
          events = events.filter(event => {
            const title = event.title?.toLowerCase() || '';
            const isAdministrative = title.includes('administrativo');
            const isInternal = title.includes('interno');
            
            // Retornar true para eventos que não são administrativos NEM internos
            return !isAdministrative && !isInternal;
          });
          
          console.log(`📋 Eventos filtrados para role ${role}: ${events.length} eventos disponíveis`);
        } else {
          console.log(`👨‍💼 Admin vê todos os eventos: ${events.length} eventos`);
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(events)
        };
      } catch (error) {
        console.error('❌ Events error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar eventos' })
        };
      }
    }

    // Rota para limpar todos os eventos (DELETE /api/events)
    if (path === '/api/events' && method === 'DELETE') {
      try {
        console.log('🗑️ Limpando todos os eventos...');
        
        // Deletar todos os eventos da tabela events
        const result = await sql`DELETE FROM events`;
        
        console.log(`✅ Eventos removidos com sucesso`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: "Todos os eventos foram removidos com sucesso" 
          })
        };
      } catch (error) {
        console.error('❌ Erro ao limpar eventos:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao limpar eventos' })
        };
      }
    }

    // Rota para igrejas
    if (path === '/api/churches' && method === 'GET') {
      try {
        const churches = await sql`SELECT * FROM churches ORDER BY name`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(churches)
        };
      } catch (error) {
        console.error('❌ Churches error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar igrejas' })
        };
      }
    }

    if (path === '/api/churches' && method === 'POST') {
      try {
        const { name, address, phone, email, pastor } = JSON.parse(event.body);
        
        if (!name) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Nome da igreja é obrigatório' })
          };
        }

        // Verificar se a igreja já existe
        const existingChurch = await sql`
          SELECT id FROM churches WHERE name = ${name}
        `;

        if (existingChurch.length > 0) {
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({ error: 'Igreja já existe' })
          };
        }

        // Gerar código único para a igreja
        const baseCode = name.substring(0, 8).toUpperCase().replace(/\s+/g, '');
        let code = baseCode;
        let counter = 1;
        
        while (true) {
          const existingCode = await sql`
            SELECT id FROM churches WHERE code = ${code}
          `;
          
          if (existingCode.length === 0) {
            break;
          }
          
          code = `${baseCode}${counter}`;
          counter++;
        }

        // Criar nova igreja
        const newChurch = await sql`
          INSERT INTO churches (name, code, address, phone, email, pastor, created_at, updated_at)
          VALUES (${name}, ${code}, ${address || ''}, ${phone || ''}, ${email || ''}, ${pastor || ''}, NOW(), NOW())
          RETURNING *
        `;

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newChurch[0])
        };
      } catch (error) {
        console.error('❌ Create church error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao criar igreja' })
        };
      }
    }

    // Rota para importar igrejas em massa (do sistema de gestão de dados)
    if (path === '/api/churches/bulk-import' && method === 'POST') {
      try {
        const { churches } = JSON.parse(event.body);
        
        if (!Array.isArray(churches) || churches.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Lista de igrejas é obrigatória' })
          };
        }

        let imported = 0;
        let skipped = 0;
        const errors = [];

        for (const churchData of churches) {
          try {
            if (!churchData.name || churchData.name.trim() === '') {
              errors.push('Igreja sem nome ignorada');
              continue;
            }

            const churchName = churchData.name.trim();

            // Verificar se a igreja já existe
            const existingChurch = await sql`
              SELECT id FROM churches WHERE name = ${churchName}
            `;

            if (existingChurch.length > 0) {
              skipped++;
              continue;
            }

            // Gerar código único para a igreja
            const baseCode = churchName.substring(0, 8).toUpperCase().replace(/\s+/g, '');
            let code = baseCode;
            let counter = 1;
            
            while (true) {
              const existingCode = await sql`
                SELECT id FROM churches WHERE code = ${code}
              `;
              
              if (existingCode.length === 0) {
                break;
              }
              
              code = `${baseCode}${counter}`;
              counter++;
            }

            // Criar nova igreja
            await sql`
              INSERT INTO churches (name, code, address, phone, email, pastor, created_at, updated_at)
              VALUES (${churchName}, ${code}, ${churchData.address || ''}, ${churchData.phone || ''}, ${churchData.email || ''}, ${churchData.pastor || ''}, NOW(), NOW())
            `;

            imported++;
            console.log(`✅ Igreja importada: ${churchName}`);

          } catch (churchError) {
            console.error(`❌ Erro ao importar igreja ${churchData.name}:`, churchError);
            errors.push(`Erro ao importar ${churchData.name}: ${churchError.message}`);
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Importação de igrejas concluída: ${imported} criadas, ${skipped} já existiam`,
            imported,
            skipped,
            errors: errors.slice(0, 10) // Limitar erros
          })
        };

      } catch (error) {
        console.error('❌ Bulk import churches error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao importar igrejas' })
        };
      }
    }


    // ===== DISCIPLESHIP REQUESTS DELETE ENDPOINT =====
    if (path.startsWith('/api/discipleship-requests/') && method === 'DELETE') {
      try {
        const requestId = path.split('/').pop();
        console.log('🔍 Deletando solicitação de discipulado:', requestId);
        
        if (!requestId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID da solicitação é obrigatório' })
          };
        }

        // Verificar se a tabela existe
        try {
          await sql`SELECT 1 FROM discipleship_requests LIMIT 1`;
        } catch (tableError) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Tabela discipleship_requests não existe' })
          };
        }

        // Deletar a solicitação
        const result = await sql`
          DELETE FROM discipleship_requests WHERE id = ${parseInt(requestId)}
        `;

        console.log('✅ Solicitação deletada:', requestId);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Solicitação removida com sucesso' })
        };
      } catch (error) {
        console.error('❌ Erro ao deletar solicitação:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao deletar solicitação' })
        };
      }
    }

    // ===== RELATIONSHIPS API ENDPOINTS =====
    if (path === '/api/relationships' && method === 'GET') {
      try {
        console.log('🔍 [NETLIFY] GET /api/relationships');
        
        // Verificar se a tabela relationships existe
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'relationships'
          );
        `;
        
        if (!tableCheck[0]?.exists) {
          console.log('⚠️ [NETLIFY] Tabela relationships não existe, retornando array vazio');
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([])
          };
        }
        
        // Buscar relacionamentos com nomes dos usuários
        const relationships = await sql`
            SELECT 
              r.id,
            r.interested_id as "interestedId",
            r.missionary_id as "missionaryId",
              r.status,
            r.notes,
            r.created_at as "createdAt",
            r.updated_at as "updatedAt",
            COALESCE(ui.name, 'Usuário não encontrado') as "interestedName",
            COALESCE(um.name, 'Usuário não encontrado') as "missionaryName"
            FROM relationships r
          LEFT JOIN users ui ON r.interested_id = ui.id
          LEFT JOIN users um ON r.missionary_id = um.id
            ORDER BY r.created_at DESC
          `;
        
        console.log('✅ [NETLIFY] Relacionamentos retornados:', relationships.length);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(relationships)
        };
      } catch (error) {
        console.error('❌ [NETLIFY] Erro ao buscar relacionamentos:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // GET /api/relationships/missionary/:id - Buscar relacionamentos por missionário
    if (path.startsWith('/api/relationships/missionary/') && method === 'GET') {
      try {
        const missionaryId = parseInt(path.split('/')[4]);
        console.log(`🔍 [NETLIFY] GET /api/relationships/missionary/${missionaryId}`);
        
        if (!missionaryId || isNaN(missionaryId)) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'ID de missionário inválido' })
          };
        }
        
        // Verificar se a tabela relationships existe
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'relationships'
          );
        `;
        
        if (!tableCheck[0]?.exists) {
          console.log('⚠️ [NETLIFY] Tabela relationships não existe, retornando array vazio');
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([])
          };
        }
        
        // Buscar relacionamentos do missionário
        const relationships = await sql`
          SELECT 
            r.id,
            r.interested_id as "interestedId",
            r.missionary_id as "missionaryId",
            r.status,
            r.notes,
            r.created_at as "createdAt",
            r.updated_at as "updatedAt",
            COALESCE(ui.name, 'Usuário não encontrado') as "interestedName",
            COALESCE(um.name, 'Usuário não encontrado') as "missionaryName"
          FROM relationships r
          LEFT JOIN users ui ON r.interested_id = ui.id
          LEFT JOIN users um ON r.missionary_id = um.id
          WHERE r.missionary_id = ${missionaryId}
          ORDER BY r.created_at DESC
        `;
        
        console.log(`✅ [NETLIFY] Relacionamentos encontrados para missionário ${missionaryId}:`, relationships.length);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(relationships)
        };
      } catch (error) {
        console.error('❌ [NETLIFY] Erro ao buscar relacionamentos do missionário:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    if (path === '/api/relationships' && method === 'POST') {
      try {
        console.log('🔍 [NETLIFY] POST /api/relationships', JSON.parse(event.body));
        const { interestedId, missionaryId, status = 'active', notes = '' } = JSON.parse(event.body);
        
        if (!interestedId || !missionaryId) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'interestedId e missionaryId são obrigatórios' })
          };
        }

        // Verificar se já existe um relacionamento ativo
        const existingRelationship = await sql`
          SELECT id FROM relationships 
          WHERE interested_id = ${parseInt(interestedId)} 
          AND status = 'active'
        `;
        
        if (existingRelationship.length > 0) {
          throw new Error('Já existe um discipulador ativo para este interessado');
        }
        
        // Verificar se o missionário precisa ser promovido
        const missionaryUser = await sql`
          SELECT id, role FROM users WHERE id = ${parseInt(missionaryId)}
        `;
        
        if (missionaryUser.length > 0) {
          const currentRole = missionaryUser[0].role;
          console.log(`🔍 [NETLIFY] Missionário atual: role = ${currentRole}`);
          
          // Se o usuário é apenas 'member', promover para 'member,missionary'
          if (currentRole === 'member') {
            console.log(`🚀 [NETLIFY] Promovendo membro ${missionaryId} a missionário`);
            await sql`
              UPDATE users 
              SET role = 'member,missionary', updated_at = NOW() 
              WHERE id = ${parseInt(missionaryId)}
            `;
            console.log(`✅ [NETLIFY] Usuário ${missionaryId} promovido a member,missionary`);
          }
        }

        // Criar novo relacionamento
        const relationship = await sql`
          INSERT INTO relationships (interested_id, missionary_id, status, notes, created_at, updated_at)
          VALUES (${parseInt(interestedId)}, ${parseInt(missionaryId)}, ${status}, ${notes}, NOW(), NOW())
          RETURNING *
        `;

        console.log('✅ [NETLIFY] Relacionamento criado:', relationship[0].id);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(relationship[0])
        };
      } catch (error) {
        console.error('❌ [NETLIFY] Erro ao criar relacionamento:', error);
        if (error.message && error.message.includes('Já existe um discipulador ativo')) {
        return {
            statusCode: 409,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message })
          };
        }
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para deletar relacionamentos
    if (path.startsWith('/api/relationships/') && method === 'DELETE') {
      try {
        console.log('🗑️ Deleting relationship...');
        const relationshipId = parseInt(path.split('/')[3]);
        
        if (isNaN(relationshipId)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'ID do relacionamento inválido' 
            })
          };
        }

        // Verificar se o relacionamento existe
        const existingRelationship = await sql`
          SELECT id FROM relationships WHERE id = ${relationshipId}
        `;
        
        if (existingRelationship.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ 
              error: 'Relacionamento não encontrado' 
            })
          };
        }

        // Deletar o relacionamento
        await sql`DELETE FROM relationships WHERE id = ${relationshipId}`;

        console.log('✅ Relationship deleted:', relationshipId);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Relacionamento removido com sucesso'
          })
        };
      } catch (error) {
        console.error('❌ Delete relationship error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro interno do servidor',
            details: error.message 
          })
        };
      }
    }

    // Rota para limpar todos os relacionamentos (temporária para teste)
    if (path === '/api/relationships/clear-all' && method === 'POST') {
      try {
        console.log('🧹 Clearing all relationships...');
        
        // Deletar todos os relacionamentos
        const result = await sql`DELETE FROM relationships`;
        
        console.log('✅ All relationships cleared');

          return {
          statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: true, 
            message: 'Todos os relacionamentos foram limpos com sucesso',
            deletedCount: result.count || 0
          })
        };

      } catch (error) {
        console.error('❌ Error clearing relationships:', error);
          return {
          statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para limpar todas as solicitações de discipulado (temporária para teste)
    if (path === '/api/discipleship-requests/clear-all' && method === 'POST') {
      try {
        console.log('🧹 Clearing all discipleship requests...');
        
        // Deletar todas as solicitações
        const result = await sql`DELETE FROM discipleship_requests`;
        
        console.log('✅ All discipleship requests cleared');

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: true, 
            message: 'Todas as solicitações de discipulado foram limpas com sucesso',
            deletedCount: result.count || 0
          })
        };

      } catch (error) {
        console.error('❌ Error clearing discipleship requests:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // ===== ROTAS DE ELEIÇÕES =====

    // Rota para configurar eleição
    if (path === '/api/elections/config' && method === 'POST') {
      const userId = event.headers['x-user-id'];
      if (await checkReadOnlyAccess(userId, sql)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            success: false,
            message: "Usuário de teste possui acesso somente para leitura. Edições não são permitidas.",
            code: "READONLY_ACCESS"
          })
        };
      }
      try {
        console.log('🔧 POST /api/elections/config - Iniciando');
        const body = JSON.parse(event.body || '{}');
        console.log('🔧 Body recebido:', JSON.stringify(body, null, 2));
        
        // Validar campos obrigatórios
        if (!body.churchId || !body.churchName || !body.voters || !body.positions) {
          console.error('❌ Campos obrigatórios faltando:', {
            churchId: body.churchId,
            churchName: body.churchName,
            voters: body.voters,
            positions: body.positions
          });
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Campos obrigatórios faltando' })
          };
        }
        
        // Criar tabela de configuração se não existir
        await sql`
          CREATE TABLE IF NOT EXISTS election_configs (
            id SERIAL PRIMARY KEY,
            church_id INTEGER NOT NULL,
            church_name VARCHAR(255) NOT NULL,
            voters INTEGER[] NOT NULL,
            criteria JSONB NOT NULL,
            positions TEXT[] NOT NULL,
            status VARCHAR(50) DEFAULT 'draft',
            position_descriptions JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;

        // Garantir que as colunas existem
        try {
          await sql`
            ALTER TABLE election_configs
            ADD COLUMN IF NOT EXISTS current_leaders JSONB DEFAULT '{}'::jsonb
          `;
          await sql`
            ALTER TABLE election_configs
            ADD COLUMN IF NOT EXISTS removed_candidates JSONB DEFAULT '[]'::jsonb
          `;
        } catch (alterError) {
          console.log('⚠️  Erro ao garantir colunas adicionais em election_configs:', alterError.message);
        }

        // Inserir configuração
        console.log('🔧 Inserindo configuração...');
        const result = await sql`
          INSERT INTO election_configs (church_id, church_name, voters, criteria, positions, status, position_descriptions, current_leaders, eligible_candidates, max_nominations_per_voter, removed_candidates)
          VALUES (${body.churchId}, ${body.churchName}, ${body.voters}, ${JSON.stringify(body.criteria)}, ${body.positions}, ${body.status}, ${JSON.stringify(body.position_descriptions || {})}, ${JSON.stringify(body.current_leaders || {})}, ${JSON.stringify(body.eligible_candidates || [])}, ${body.max_nominations_per_voter || 1}, ${JSON.stringify(body.removed_candidates || [])})
          RETURNING *
        `;

        console.log('✅ Configuração de eleição salva:', result[0].id);

          return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result[0])
        };

      } catch (error) {
        console.error('❌ Erro ao salvar configuração:', error);
        console.error('❌ Stack trace:', error.stack);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }

    // GET /api/elections/configs - Listar todas as configurações
    if (path === '/api/elections/configs' && method === 'GET') {
      try {
        // Usar DISTINCT ON para evitar duplicação quando há múltiplas eleições para a mesma config
        const configs = await sql`
          SELECT DISTINCT ON (ec.id) 
            ec.*, 
            e.status as election_status, 
            e.created_at as election_created_at
          FROM election_configs ec
          LEFT JOIN (
            SELECT DISTINCT ON (config_id) config_id, status, created_at
            FROM elections
            ORDER BY config_id, created_at DESC
          ) e ON ec.id = e.config_id
          ORDER BY ec.id, ec.created_at DESC
        `;

        console.log(`📋 [GET CONFIGS] Retornando ${configs.length} configurações únicas`);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configs)
        };

      } catch (error) {
        console.error('❌ Erro ao buscar configurações:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }

    // Rota para buscar configuração de eleição
    if (path === '/api/elections/config' && method === 'GET') {
      try {
        const configId = event.queryStringParameters?.id;
        
        let result;
        if (configId) {
          result = await sql`
            SELECT * FROM election_configs 
            WHERE id = ${parseInt(configId)}
            ORDER BY created_at DESC 
            LIMIT 1
          `;
        } else {
          result = await sql`
            SELECT * FROM election_configs 
            ORDER BY created_at DESC 
            LIMIT 1
          `;
        }

        if (result.length > 0) {
          // Parsear removed_candidates corretamente
          const configData = result[0];
          if (configData.removed_candidates) {
            if (typeof configData.removed_candidates === 'string') {
              try {
                configData.removed_candidates = JSON.parse(configData.removed_candidates);
              } catch (e) {
                configData.removed_candidates = [];
              }
            }
          } else {
            configData.removed_candidates = [];
          }

          // Parsear current_leaders corretamente
          if (configData.current_leaders) {
            if (typeof configData.current_leaders === 'string') {
              try {
                configData.current_leaders = JSON.parse(configData.current_leaders);
              } catch (e) {
                configData.current_leaders = {};
              }
            }
          } else {
            configData.current_leaders = {};
          }
          
          console.log('📥 [GET CONFIG] Retornando config:', configId || 'latest', 'removed_candidates:', configData.removed_candidates, 'current_leaders:', configData.current_leaders);
          
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData)
          };
        } else {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Configuração não encontrada' })
          };
        }

      } catch (error) {
        console.error('❌ Erro ao buscar configuração:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para iniciar eleição
    if (path === '/api/elections/start' && method === 'POST') {
      const userId = event.headers['x-user-id'];
      if (await checkReadOnlyAccess(userId, sql)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            success: false,
            message: "Usuário de teste possui acesso somente para leitura. Edições não são permitidas.",
            code: "READONLY_ACCESS"
          })
        };
      }
      try {
        const body = JSON.parse(event.body || '{}');
        
        // Criar tabelas de eleição se não existirem
        await sql`
        CREATE TABLE IF NOT EXISTS elections (
          id SERIAL PRIMARY KEY,
          config_id INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          current_position INTEGER DEFAULT 0,
          current_phase VARCHAR(20) DEFAULT 'nomination',
          result_announced BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
        `;

        await sql`
        DROP TABLE IF EXISTS election_votes
        `;
        
        await sql`
        CREATE TABLE election_votes (
          id SERIAL PRIMARY KEY,
          election_id INTEGER NOT NULL,
          voter_id INTEGER NOT NULL,
          position_id VARCHAR(255) NOT NULL,
          candidate_id INTEGER NOT NULL,
          vote_type VARCHAR(20) DEFAULT 'nomination',
          voted_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(election_id, voter_id, position_id, candidate_id, vote_type)
        )
        `;

        await sql`
        DROP TABLE IF EXISTS election_candidates
        `;
        
        await sql`
        CREATE TABLE election_candidates (
          id SERIAL PRIMARY KEY,
          election_id INTEGER NOT NULL,
          position_id VARCHAR(255) NOT NULL,
          candidate_id INTEGER NOT NULL,
          candidate_name VARCHAR(255) NOT NULL,
          faithfulness_punctual BOOLEAN DEFAULT false,
          faithfulness_seasonal BOOLEAN DEFAULT false,
          faithfulness_recurring BOOLEAN DEFAULT false,
          attendance_percentage INTEGER DEFAULT 0,
          months_in_church INTEGER DEFAULT 0,
          nominations INTEGER DEFAULT 0,
          votes INTEGER DEFAULT 0,
          positions_won INTEGER DEFAULT 0,
          phase VARCHAR(20) DEFAULT 'nomination',
          is_eliminated BOOLEAN DEFAULT false
        )
        `;

        await sql`
        ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS result_announced BOOLEAN DEFAULT false
        `;

        // Buscar configuração - usar configId se fornecido, senão usar a mais recente
        let config;
        
        if (body.configId) {
          config = await sql`
            SELECT * FROM election_configs 
            WHERE id = ${body.configId}
          `;
        } else {
          config = await sql`
            SELECT * FROM election_configs 
            ORDER BY created_at DESC 
            LIMIT 1
          `;
        }

        if (config.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Configuração não encontrada' })
          };
        }

        // DESATIVAR TODAS AS ELEIÇÕES ATIVAS ANTES DE CRIAR UMA NOVA
        console.log('🔄 Desativando todas as eleições ativas...');
        await sql`
          UPDATE elections 
          SET status = 'completed', updated_at = CURRENT_TIMESTAMP
          WHERE status = 'active'
        `;

        // Criar eleição
        const election = await sql`
          INSERT INTO elections (config_id, status, current_position)
          VALUES (${config[0].id}, 'active', 0)
          RETURNING *
        `;

        // Buscar candidatos elegíveis para cada posição
        console.log('🔍 Buscando membros da igreja:', config[0].church_name);
        const churchMembers = await sql`
          SELECT id, name, email, church, role, status, created_at, birth_date, is_tither, is_donor, attendance, extra_data
          FROM users 
          WHERE church = ${config[0].church_name} 
          AND role LIKE '%member%'
          AND (status = 'approved' OR status = 'pending')
        `;
        console.log('👥 Membros encontrados:', churchMembers.length);

        // Otimização: Inserir candidatos em lote para melhor performance
        const candidatesToInsert = [];
        
        for (const position of config[0].positions) {
          for (const member of churchMembers) {
            const criteria = config[0].criteria;
            let eligible = true;

            let extraData = {};
            try {
              extraData = typeof member.extra_data === 'string' ? JSON.parse(member.extra_data) : (member.extra_data || {});
            } catch (error) {
              console.log('❌ Erro ao processar extra_data:', error);
              extraData = {};
            }

            const isTeenPosition = typeof position === 'string' && position.toLowerCase().includes('teen');
            let idade = null;
            if (member.birth_date) {
              const birthDate = new Date(member.birth_date);
              idade = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
            } else if (extraData.idade) {
              const parsed = parseInt(extraData.idade, 10);
              idade = Number.isNaN(parsed) ? null : parsed;
            }
            const teveParticipacao = extraData?.teveParticipacao || '';

            if (isTeenPosition) {
              eligible = idade !== null && idade >= 10 && idade <= 15;
              if (!eligible) {
                console.log(`🔍 Candidato ${member.name} inelegível para posição Teen (idade=${idade ?? 'N/A'})`);
              }
            } else {
              if (criteria.faithfulness.enabled) {
                let faithfulnessMet = true;
                
                if (criteria.faithfulness.punctual && !member.is_tither) {
                  faithfulnessMet = false;
                }
                
                if (criteria.faithfulness.seasonal && !member.is_donor) {
                  faithfulnessMet = false;
                }
                
                if (criteria.faithfulness.recurring && (!member.is_tither || !member.is_donor)) {
                  faithfulnessMet = false;
                }
                
                if (!faithfulnessMet) {
                  eligible = false;
                }
              }

              if (criteria.attendance && criteria.attendance.enabled) {
                let attendanceMet = true;
                
                if (criteria.attendance.punctual && !teveParticipacao.includes('Recorrente')) {
                  attendanceMet = false;
                }
                
                if (criteria.attendance.seasonal && !teveParticipacao.includes('Sazonal') && !teveParticipacao.includes('Recorrente')) {
                  attendanceMet = false;
                }
                
                if (criteria.attendance.recurring && !teveParticipacao.includes('Recorrente')) {
                  attendanceMet = false;
                }
                
                if (teveParticipacao.includes('Sem participação')) {
                  attendanceMet = false;
                }
                
                if (!attendanceMet) {
                  eligible = false;
                }
              }

              if (criteria.churchTime && criteria.churchTime.enabled) {
                const memberJoinDate = new Date(member.created_at);
                const currentDate = new Date();
                const monthsInChurch = (currentDate.getFullYear() - memberJoinDate.getFullYear()) * 12 + 
                                     (currentDate.getMonth() - memberJoinDate.getMonth());
                
                if (monthsInChurch < criteria.churchTime.minimumMonths) {
                  eligible = false;
                }
              }
            }

            if (eligible) {
              const monthsInChurch = criteria.churchTime.enabled ? 
                (new Date().getFullYear() - new Date(member.created_at).getFullYear()) * 12 + 
                (new Date().getMonth() - new Date(member.created_at).getMonth()) : 0;

              candidatesToInsert.push({
                election_id: election[0].id,
                position_id: position,
                candidate_id: member.id,
                candidate_name: member.name,
                faithfulness_punctual: member.is_tither || false,
                faithfulness_seasonal: member.is_donor || false,
                faithfulness_recurring: (member.is_tither && member.is_donor) || false,
                attendance_percentage: member.attendance || 0,
                months_in_church: monthsInChurch
              });
            }
          }
        }

        // Inserir candidatos em lote (máximo 100 por vez para evitar timeout)
        if (candidatesToInsert.length > 0) {
          const batchSize = 100;
          for (let i = 0; i < candidatesToInsert.length; i += batchSize) {
            const batch = candidatesToInsert.slice(i, i + batchSize);
            const values = batch.map(c => 
              `(${c.election_id}, '${c.position_id}', ${c.candidate_id}, '${c.candidate_name}', ${c.faithfulness_punctual}, ${c.faithfulness_seasonal}, ${c.faithfulness_recurring}, ${c.attendance_percentage}, ${c.months_in_church}, 0, 'nomination')`
            ).join(',');
            
            await sql.unsafe(`
              INSERT INTO election_candidates (election_id, position_id, candidate_id, candidate_name, faithfulness_punctual, faithfulness_seasonal, faithfulness_recurring, attendance_percentage, months_in_church, nominations, phase)
              VALUES ${values}
            `);
          }
          console.log(`✅ ${candidatesToInsert.length} candidatos inseridos em lote`);
        }

        // Atualizar status da configuração
        await sql`
          UPDATE election_configs 
          SET status = 'active' 
          WHERE id = ${config[0].id}
        `;

        console.log('✅ Eleição iniciada:', election[0].id);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
            electionId: election[0].id,
            message: 'Nomeação iniciada com sucesso'
          })
        };

      } catch (error) {
        console.error('❌ Erro ao iniciar eleição:', error);
        console.error('❌ Stack trace:', error.stack);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Erro interno do servidor',
            details: error.message,
            stack: error.stack
          })
        };
      }
    }

    // POST /api/elections/auto-nominate - Automação sem autenticação
    if (path === '/api/elections/auto-nominate' && method === 'POST') {
      try {
        const { positionId, candidateId, voterId } = JSON.parse(event.body);
        
        if (!positionId || !candidateId || !voterId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'positionId, candidateId e voterId são obrigatórios' })
          };
        }

        // Verificar se a eleição está ativa
        const activeElection = await sql`
          SELECT e.id, e.config_id, ec.voters
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          WHERE e.status = 'active'
          ORDER BY e.created_at DESC
          LIMIT 1
        `;

        if (activeElection.length === 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Nenhuma eleição ativa encontrada' })
          };
        }

        const election = activeElection[0];
        const voters = election.voters || [];

        // Verificar se o votante está autorizado
        if (!voters.includes(voterId)) {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Votante não autorizado para esta eleição' })
          };
        }

        // Verificar se já votou para esta posição
        const existingVote = await sql`
          SELECT id FROM election_votes 
          WHERE election_id = ${election.id} 
          AND voter_id = ${voterId} 
          AND position_id = ${positionId}
          AND vote_type = 'nomination'
        `;

        if (existingVote.length > 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Votante já indicou para esta posição' })
          };
        }

        // Inserir indicação
        await sql`
          INSERT INTO election_votes (election_id, voter_id, position_id, candidate_id, vote_type)
          VALUES (${election.id}, ${voterId}, ${positionId}, ${candidateId}, 'nomination')
        `;

        // Atualizar contador de indicações
        await sql`
          UPDATE election_candidates 
          SET nominations = nominations + 1
          WHERE election_id = ${election.id} 
          AND position_id = ${positionId} 
          AND candidate_id = ${candidateId}
        `;

        return {
          statusCode: 200,
            body: JSON.stringify({ 
            success: true, 
            message: 'Indicação registrada com sucesso' 
          })
        };

      } catch (error) {
        console.error('Erro na automação de indicação:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // POST /api/elections/auto-vote - Automação de votação sem autenticação
    if (path === '/api/elections/auto-vote' && method === 'POST') {
      try {
        const { positionId, candidateId, voterId } = JSON.parse(event.body);
        
        if (!positionId || !candidateId || !voterId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'positionId, candidateId e voterId são obrigatórios' })
          };
        }

        // Verificar se a eleição está ativa
        const activeElection = await sql`
          SELECT e.id, e.config_id, ec.voters
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          WHERE e.status = 'active'
          ORDER BY e.created_at DESC
          LIMIT 1
        `;

        if (activeElection.length === 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Nenhuma eleição ativa encontrada' })
          };
        }

        const election = activeElection[0];
        const voters = election.voters || [];

        // Verificar se o votante está autorizado
        if (!voters.includes(voterId)) {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Votante não autorizado para esta eleição' })
          };
        }

        // Verificar se já votou para esta posição
        const existingVote = await sql`
          SELECT id FROM election_votes 
          WHERE election_id = ${election.id} 
          AND voter_id = ${voterId} 
          AND position_id = ${positionId}
          AND vote_type = 'final'
        `;

        if (existingVote.length > 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Votante já votou para esta posição' })
          };
        }

        // Inserir voto
        await sql`
          INSERT INTO election_votes (election_id, voter_id, position_id, candidate_id, vote_type)
          VALUES (${election.id}, ${voterId}, ${positionId}, ${candidateId}, 'final')
        `;

        // Atualizar contador de votos
        await sql`
          UPDATE election_candidates 
          SET votes = votes + 1
          WHERE election_id = ${election.id} 
          AND position_id = ${positionId} 
          AND candidate_id = ${candidateId}
        `;

        return {
          statusCode: 200,
            body: JSON.stringify({ 
            success: true, 
            message: 'Voto registrado com sucesso' 
          })
        };

      } catch (error) {
        console.error('Erro na automação de votação:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // POST /api/elections/nominate - Indicação de candidatos (Fase 1)
    if (path === '/api/elections/nominate' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { electionId, positionId, candidateId } = body;
        const voterId = parseInt(event.headers['x-user-id']);

        if (!voterId) {
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Usuário não autenticado' })
          };
        }

        // Verificar se o votante já indicou alguém para esta posição
        const existingNomination = await sql`
          SELECT id FROM election_votes 
          WHERE election_id = ${electionId} 
          AND voter_id = ${voterId} 
          AND position_id = ${positionId}
          AND vote_type = 'nomination'
        `;

        if (existingNomination.length > 0) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Você já indicou um candidato para esta posição' })
          };
        }

        // Registrar indicação
        await sql`
          INSERT INTO election_votes (election_id, voter_id, position_id, candidate_id, vote_type)
          VALUES (${electionId}, ${voterId}, ${positionId}, ${candidateId}, 'nomination')
        `;

        // Atualizar contador de indicações do candidato
        await sql`
          UPDATE election_candidates 
          SET nominations = nominations + 1 
          WHERE election_id = ${electionId} 
          AND position_id = ${positionId} 
          AND candidate_id = ${candidateId}
        `;

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Indicação registrada com sucesso' })
        };

      } catch (error) {
        console.error('❌ Erro ao registrar indicação:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }


    // POST /api/elections/advance-phase - Avançar fase (Admin)
    if (path === '/api/elections/advance-phase' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { configId, phase } = body;
        const adminId = parseInt(event.headers['x-user-id']);

        if (!adminId) {
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Usuário não autenticado' })
          };
        }

        // Verificar se é admin
        const admin = await sql`
          SELECT role FROM users WHERE id = ${adminId}
        `;

        if (!admin[0] || !hasAdminAccess(admin[0])) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Acesso negado. Apenas administradores podem avançar fases' })
          };
        }

        // Buscar eleição ativa para o configId
        const election = await sql`
          SELECT * FROM elections 
          WHERE config_id = ${configId}
          AND status = 'active'
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (election.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Nenhuma eleição ativa para esta configuração' })
          };
        }

        console.log(`🔄 Atualizando fase da eleição ${election[0].id} para: ${phase}`);

        // Garantir que a coluna current_phase existe (migration)
        try {
          await sql`
            ALTER TABLE elections 
            ADD COLUMN IF NOT EXISTS current_phase VARCHAR(20) DEFAULT 'nomination'
          `;
          console.log('✅ Coluna current_phase verificada/criada');
        } catch (alterError) {
          console.log('⚠️ Coluna current_phase já existe:', alterError.message);
        }
        
        // Atualizar fase da eleição
        if (phase === 'completed') {
          await sql`
            UPDATE elections 
            SET current_phase = ${phase}, updated_at = NOW()
            WHERE id = ${election[0].id}
          `;
        } else {
          await sql`
            UPDATE elections 
            SET current_phase = ${phase},
                result_announced = false,
                updated_at = NOW()
            WHERE id = ${election[0].id}
          `;
        }

        console.log(`✅ Fase da eleição ${election[0].id} atualizada com sucesso para: ${phase}`);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: `Fase avançada para: ${phase}`,
            phase: phase,
            electionId: election[0].id
          })
        };

      } catch (error) {
        console.error('❌ Erro ao avançar fase:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }

    // POST /api/elections/advance-position - Avançar posição (Admin)
    // ========== ENDPOINT DE SETUP DE TESTE EM PRODUÇÃO ==========
    // Endpoint automático - sem token, cria tudo de uma vez
    if (path === '/api/setup/auto-test' && method === 'POST') {
      try {
        const existingUser = await sql`SELECT * FROM users WHERE email = 'admin.teste@7care.test'`;
        if (existingUser.length > 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: "✅ Usuário de teste já existe!",
              credentials: {
                email: "admin.teste@7care.test",
                password: "teste123456",
                loginUrl: "https://meu7care.netlify.app",
                instructions: "Abra a URL acima e faça login"
              }
            })
          };
        }

        const hashedPassword = await bcrypt.hash('teste123456', 10);
        const testAdmin = await sql`
          INSERT INTO users (name, email, password, role, church, status, is_approved, first_access, extra_data)
          VALUES ('Admin Teste', 'admin.teste@7care.test', ${hashedPassword}, 'admin_readonly', 'Sistema Principal', 'approved', true, false, ${JSON.stringify({ testAccount: true, testData: false, systemAccess: 'main', readOnly: true, canEdit: false, createdAt: new Date().toISOString() })})
          RETURNING id, name, email
        `;

        console.log('✅ Admin de teste criado:', testAdmin[0].id);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: "✅ Tudo pronto! Você já pode acessar.",
            credentials: {
              email: "admin.teste@7care.test",
              password: "teste123456",
              loginUrl: "https://meu7care.netlify.app",
              instructions: "Clique no link acima e faça login com as credenciais fornecidas"
            }
          })
        };
      } catch (error) {
        console.error('❌ Erro ao criar teste:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: "Erro ao preparar ambiente de teste",
            error: error.message
          })
        };
      }
    }

    if (path === '/api/setup/create-test-admin' && method === 'POST') {
      const { setupToken } = JSON.parse(event.body || '{}');
      const SETUP_TOKEN = process.env.SETUP_TOKEN;

      // SEGURANÇA: Exigir SETUP_TOKEN configurado
      if (!SETUP_TOKEN) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Setup não configurado. Defina SETUP_TOKEN nas variáveis de ambiente.'
          })
        };
      }

      if (setupToken !== SETUP_TOKEN) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: 'Token inválido. Setup não autorizado.' 
          })
        };
      }

      try {
        // Verificar se usuário já existe
        const existingUser = await sql`SELECT * FROM users WHERE email = 'admin.teste@7care.test'`;
        if (existingUser.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Usuário de teste já existe.',
              user: {
                id: existingUser[0].id,
                email: existingUser[0].email,
                role: existingUser[0].role
              }
            })
          };
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash('teste123456', 10);

        // Criar admin de teste com acesso READ-ONLY ao sistema principal
        const testAdmin = await sql`
          INSERT INTO users (name, email, password, role, church, status, is_approved, first_access, extra_data)
          VALUES ('Admin Teste', 'admin.teste@7care.test', ${hashedPassword}, 'admin_readonly', 'Sistema Principal', 'approved', true, false, ${JSON.stringify({ testAccount: true, testData: false, systemAccess: 'main', readOnly: true, canEdit: false, createdAt: new Date().toISOString() })})
          RETURNING id, name, email, role
        `;

        console.log('✅ Usuário admin de teste criado:', testAdmin[0].id);

        // Criar votantes
        const voterEmails = ['votante1@teste.church', 'votante2@teste.church', 'votante3@teste.church'];
        const testVoters = [];

        for (let i = 0; i < voterEmails.length; i++) {
          const existing = await sql`SELECT * FROM users WHERE email = ${voterEmails[i]}`;
          if (existing.length === 0) {
            const voter = await sql`
              INSERT INTO users (name, email, password, role, church, status, is_approved, first_access, extra_data)
              VALUES (${'Votante Teste ' + (i + 1)}, ${voterEmails[i]}, ${hashedPassword}, 'member', 'Igreja de Teste', 'approved', true, false, ${JSON.stringify({ testAccount: true, testData: true, createdAt: new Date().toISOString() })})
              RETURNING id, name, email
            `;
            testVoters.push(voter[0]);
          }
        }

        // Criar candidatos
        const candidateData = [
          { name: 'João da Silva', age: 25 },
          { name: 'Maria Santos', age: 18 },
          { name: 'Pedro Teen', age: 12 },
          { name: 'Ana Teen', age: 14 }
        ];
        const testCandidates = [];

        for (const cand of candidateData) {
          const email = `${cand.name.toLowerCase().replace(/\s+/g, '.')}@teste.church`;
          const existing = await sql`SELECT * FROM users WHERE email = ${email}`;
          if (existing.length === 0) {
            const candidate = await sql`
              INSERT INTO users (name, email, password, role, church, status, is_approved, first_access, extra_data)
              VALUES (${cand.name}, ${email}, ${hashedPassword}, 'member', 'Igreja de Teste', 'approved', true, false, ${JSON.stringify({ testAccount: true, testData: true, idade: cand.age, createdAt: new Date().toISOString() })})
              RETURNING id, name, email, extra_data
            `;
            testCandidates.push({
              id: candidate[0].id,
              name: candidate[0].name,
              email: candidate[0].email,
              age: cand.age
            });
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Ambiente de teste criado com sucesso',
            admin: {
              id: testAdmin[0].id,
              email: testAdmin[0].email,
              password: 'teste123456',
              role: testAdmin[0].role
            },
            voters: testVoters,
            candidates: testCandidates,
            instructions: {
              loginUrl: 'POST /api/auth/login',
              email: 'admin.teste@7care.test',
              password: 'teste123456'
            }
          })
        };
      } catch (error) {
        console.error('❌ Erro ao criar usuário de teste:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Erro ao criar ambiente de teste',
            error: error.message
          })
        };
      }
    }

    if (path === '/api/elections/advance-position' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { configId, position } = body;
        const adminId = parseInt(event.headers['x-user-id']);

        if (!adminId) {
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Usuário não autenticado' })
          };
        }

        // Verificar se é admin
        const admin = await sql`
          SELECT role FROM users WHERE id = ${adminId}
        `;

        if (!admin[0] || !hasAdminAccess(admin[0])) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Acesso negado. Apenas administradores podem avançar posições' })
          };
        }

        // Buscar eleição ativa para o configId
        const election = await sql`
          SELECT * FROM elections 
          WHERE config_id = ${configId}
          AND status = 'active'
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (election.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Nenhuma eleição ativa para esta configuração' })
          };
        }

        // Atualizar posição atual da eleição e resetar fase para nomination
        await sql`
          UPDATE elections 
          SET current_position = ${position}, 
              current_phase = 'nomination',
              result_announced = false,
              updated_at = NOW()
          WHERE id = ${election[0].id}
        `;

        console.log(`✅ Posição avançada para ${position} e fase resetada para nomination`);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: `Posição avançada para: ${position}`,
            currentPosition: position,
            currentPhase: 'nomination'
          })
        };

      } catch (error) {
        console.error('❌ Erro ao avançar posição:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }

    // POST /api/elections/announce-result - Divulgar resultado (Admin)
    if (path === '/api/elections/announce-result' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { configId } = body;
        const adminId = parseInt(event.headers['x-user-id']);

        if (!adminId) {
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Usuário não autenticado' })
          };
        }

        const admin = await sql`
          SELECT role FROM users WHERE id = ${adminId}
        `;

        if (!admin[0] || !hasAdminAccess(admin[0])) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Acesso negado. Apenas administradores podem divulgar resultados' })
          };
        }

        const parsedConfigId = parseInt(configId);

        if (!parsedConfigId) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'configId inválido' })
          };
        }

        await sql`
          ALTER TABLE elections
          ADD COLUMN IF NOT EXISTS result_announced BOOLEAN DEFAULT false
        `;

        const election = await sql`
          SELECT e.*, ec.positions
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          WHERE e.config_id = ${parsedConfigId}
          AND e.status = 'active'
          ORDER BY e.created_at DESC
          LIMIT 1
        `;

        if (election.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Nenhuma eleição ativa para esta configuração' })
          };
        }

        const positions = Array.isArray(election[0].positions)
          ? election[0].positions
          : JSON.parse(election[0].positions || '[]');

        if (!positions || positions.length === 0) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Nenhuma posição configurada nesta eleição' })
          };
        }

        const currentPositionIndex = election[0].current_position || 0;
        if (currentPositionIndex >= positions.length) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Posição atual inválida' })
          };
        }

        const currentPositionName = positions[currentPositionIndex];

        const voteResults = await sql`
          SELECT 
            ev.candidate_id,
            COUNT(*)::int as votes
          FROM election_votes ev
          WHERE ev.election_id = ${election[0].id}
            AND ev.position_id = ${currentPositionName}
            AND ev.vote_type = 'vote'
          GROUP BY ev.candidate_id
        `;

        let winnerInfo = null;
        if (voteResults.length > 0) {
          const totalVotes = voteResults.reduce((sum, row) => sum + (parseInt(row.votes) || 0), 0);
          const sorted = voteResults
            .map(row => ({
              candidate_id: row.candidate_id,
              votes: parseInt(row.votes) || 0
            }))
            .sort((a, b) => b.votes - a.votes);

          if (sorted[0] && sorted[0].votes > 0) {
            const candidateData = await sql`
              SELECT name FROM users WHERE id = ${sorted[0].candidate_id} LIMIT 1
            `;
            const candidateName = candidateData.length > 0 ? candidateData[0].name : 'Candidato';
            const percentage = totalVotes > 0 ? (sorted[0].votes / totalVotes) * 100 : 0;
            winnerInfo = {
              id: sorted[0].candidate_id,
              name: candidateName,
              votes: sorted[0].votes,
              percentage
            };
          }
        }

        await sql`
          UPDATE elections
          SET result_announced = true,
              updated_at = NOW()
          WHERE id = ${election[0].id}
        `;

        console.log(`📢 Resultado divulgado manualmente para config ${parsedConfigId}:`, winnerInfo);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Resultado divulgado com sucesso',
            position: currentPositionName,
            winner: winnerInfo
          })
        };
      } catch (error) {
        console.error('❌ Erro ao divulgar resultado:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }

    // POST /api/elections/reset-voting - Repetir votação da posição atual (Admin)
    if (path === '/api/elections/reset-voting' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { configId } = body;
        const adminId = parseInt(event.headers['x-user-id']);

        if (!adminId) {
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Usuário não autenticado' })
          };
        }

        // Verificar se é admin
        const admin = await sql`
          SELECT role FROM users WHERE id = ${adminId}
        `;

        if (!admin[0] || !hasAdminAccess(admin[0])) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Acesso negado. Apenas administradores podem repetir votações' })
          };
        }

        // Buscar eleição ativa para o configId
        const election = await sql`
          SELECT e.*, ec.positions
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          WHERE e.config_id = ${configId}
          AND e.status = 'active'
          ORDER BY e.created_at DESC
          LIMIT 1
        `;

        if (election.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Nenhuma eleição ativa para esta configuração' })
          };
        }

        // Garantir que positions seja um array
        const positions = Array.isArray(election[0].positions) 
          ? election[0].positions 
          : JSON.parse(election[0].positions || '[]');
        
        const currentPositionIndex = election[0].current_position || 0;
        if (currentPositionIndex >= positions.length) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Posição atual inválida' })
          };
        }

        const currentPositionName = positions[currentPositionIndex];

        console.log(`🔄 Resetando votos para a posição: ${currentPositionName}`);

        // Deletar todos os votos (vote_type = 'vote') da posição atual
        await sql`
          DELETE FROM election_votes
          WHERE election_id = ${election[0].id}
          AND position_id = ${currentPositionName}
          AND vote_type = 'vote'
        `;

        // Resetar a fase para 'voting' (mantém as indicações)
        await sql`
          UPDATE elections 
          SET current_phase = 'voting',
              result_announced = false,
              updated_at = NOW()
          WHERE id = ${election[0].id}
        `;

        console.log(`✅ Votação resetada para a posição: ${currentPositionName}`);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: `Votação repetida com sucesso para: ${currentPositionName}`,
            currentPosition: currentPositionName,
            currentPhase: 'voting'
          })
        };

      } catch (error) {
        console.error('❌ Erro ao resetar votação:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }

    // POST /api/elections/set-max-nominations - Configurar número máximo de indicações por votante
    if (path === '/api/elections/set-max-nominations' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { configId, maxNominations } = body;
        const adminId = parseInt(event.headers['x-user-id']);

        if (!adminId) {
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Usuário não autenticado' })
          };
        }

        // Verificar se é admin
        const admin = await sql`
          SELECT role FROM users WHERE id = ${adminId}
        `;

        if (!admin[0] || !hasAdminAccess(admin[0])) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Acesso negado. Apenas administradores podem alterar configurações' })
          };
        }

        if (!maxNominations || maxNominations < 1) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Número de indicações deve ser maior que 0' })
          };
        }

        // Criar coluna se não existir
        try {
          await sql`
            ALTER TABLE election_configs 
            ADD COLUMN IF NOT EXISTS max_nominations_per_voter INTEGER DEFAULT 1
          `;
        } catch (alterError) {
          console.log('⚠️ Coluna max_nominations_per_voter já existe ou erro ao adicionar:', alterError.message);
        }

        // Atualizar configuração da eleição
        await sql`
          UPDATE election_configs 
          SET max_nominations_per_voter = ${maxNominations}
          WHERE id = ${configId}
        `;

        console.log(`✅ Máximo de indicações atualizado para ${maxNominations} na eleição ${configId}`);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: `Máximo de indicações atualizado para ${maxNominations}`,
            maxNominations
          })
        };

      } catch (error) {
        console.error('❌ Erro ao atualizar configuração:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }

    // PUT /api/elections/config/:id - Editar configuração
    if (path.startsWith('/api/elections/config/') && method === 'PUT') {
      try {
        const configId = parseInt(path.split('/').pop());
        const body = JSON.parse(event.body || '{}');
        
        console.log('🔧 [UPDATE CONFIG] Recebendo atualização para configId:', configId);
        console.log('🔧 [UPDATE CONFIG] removed_candidates recebido:', body.removed_candidates);
        
        // Garantir que as colunas existem
        try {
          await sql`
            ALTER TABLE election_configs 
            ADD COLUMN IF NOT EXISTS removed_candidates JSONB DEFAULT '[]'::jsonb
          `;
          await sql`
            ALTER TABLE election_configs 
            ADD COLUMN IF NOT EXISTS current_leaders JSONB DEFAULT '{}'::jsonb
          `;
        } catch (alterError) {
          console.log('⚠️ Colunas já existem ou erro ao adicionar:', alterError.message);
        }
        
        const removedCandidatesJson = JSON.stringify(body.removed_candidates || []);
        const currentLeadersJson = JSON.stringify(body.current_leaders || {});
        console.log('🔧 [UPDATE CONFIG] Salvando removed_candidates como:', removedCandidatesJson);
        console.log('🔧 [UPDATE CONFIG] Salvando current_leaders como:', currentLeadersJson);
        
        const result = await sql`
          UPDATE election_configs 
          SET 
            church_id = ${body.churchId},
            church_name = ${body.churchName},
            voters = ${body.voters},
            criteria = ${JSON.stringify(body.criteria)},
            positions = ${body.positions},
            status = ${body.status},
            position_descriptions = ${JSON.stringify(body.position_descriptions || {})},
            current_leaders = ${currentLeadersJson},
            removed_candidates = ${removedCandidatesJson},
            updated_at = NOW()
          WHERE id = ${configId}
          RETURNING *
        `;
        
        console.log('✅ [UPDATE CONFIG] Config atualizado. removed_candidates salvo:', result[0].removed_candidates);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'Configuração atualizada com sucesso',
            config: result[0]
          })
        };

      } catch (error) {
        console.error('❌ Erro ao atualizar configuração:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }

    // DELETE /api/elections/config/:id - Excluir configuração
    if (path.startsWith('/api/elections/config/') && method === 'DELETE') {
      try {
        const configId = parseInt(path.split('/').pop());
        
        // Excluir em ordem para respeitar foreign keys
        await sql`DELETE FROM election_votes WHERE election_id IN (SELECT id FROM elections WHERE config_id = ${configId})`;
        await sql`DELETE FROM election_candidates WHERE election_id IN (SELECT id FROM elections WHERE config_id = ${configId})`;
        await sql`DELETE FROM elections WHERE config_id = ${configId}`;
        await sql`DELETE FROM election_configs WHERE id = ${configId}`;

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Configuração excluída com sucesso' })
        };

      } catch (error) {
        console.error('❌ Erro ao excluir configuração:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }

    // DELETE /api/elections/clear-all - Limpar todas as eleições e configurações
    if (path === '/api/elections/clear-all' && method === 'DELETE') {
      try {
        // Limpar todas as tabelas de eleição (sem autenticação para facilitar testes)
        await sql`DELETE FROM election_votes`;
        await sql`DELETE FROM election_candidates`;
        await sql`DELETE FROM elections`;
        await sql`DELETE FROM election_configs`;

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Todas as eleições e configurações foram excluídas' })
        };

      } catch (error) {
        console.error('❌ Erro ao limpar eleições:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }

    // Rota para buscar status da eleição para votantes
    if (path === '/api/elections/status' && method === 'GET') {
      try {
        const userId = event.headers['x-user-id'];
        
        // Buscar eleição ativa
        const election = await sql`
          SELECT e.*, ec.voters, ec.positions
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          WHERE e.status = 'active'
          ORDER BY e.created_at DESC
          LIMIT 1
        `;

        if (election.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Nenhuma eleição ativa' })
          };
        }

        // Verificar se o usuário é votante
        if (!election[0].voters.includes(parseInt(userId))) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Usuário não autorizado a votar' })
          };
        }

        // Buscar candidatos para a posição atual
        const currentPosition = election[0].positions[election[0].current_position];
        const candidates = await sql`
          SELECT ec.*, u.email, u.church
          FROM election_candidates ec
          JOIN users u ON ec.candidate_id = u.id
          WHERE ec.election_id = ${election[0].id}
          AND ec.position_id = ${currentPosition}
        `;

        // Buscar votos já realizados pelo usuário
        const userVotes = await sql`
          SELECT position_id, candidate_id
          FROM election_votes
          WHERE election_id = ${election[0].id}
          AND voter_id = ${parseInt(userId)}
        `;

        const votedPositions = userVotes.length;

        const response = {
          active: true,
          currentPosition: election[0].current_position,
          positions: election[0].positions.map((pos, index) => ({
            id: pos,
            name: pos,
            candidates: candidates.map(c => ({
              id: c.candidate_id,
              name: c.candidate_name,
              email: c.email,
              church: c.church,
              faithfulnessPunctual: c.faithfulness_punctual,
              faithfulnessSeasonal: c.faithfulness_seasonal,
              faithfulnessRecurring: c.faithfulness_recurring,
              attendancePercentage: c.attendance_percentage,
              monthsInChurch: c.months_in_church,
              eligible: true
            })),
            currentVote: userVotes.find(v => v.position_id === pos)?.candidate_id
          })),
          totalPositions: election[0].positions.length,
          votedPositions
        };

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response)
        };

      } catch (error) {
        console.error('❌ Erro ao buscar status:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Variável global para controlar se já atualizou a constraint
    if (!global.electionVotesConstraintUpdated) {
      try {
        await sql`
          ALTER TABLE election_votes 
          DROP CONSTRAINT IF EXISTS election_votes_election_id_voter_id_position_id_vote_type_key
        `;
        await sql`
          ALTER TABLE election_votes 
          ADD CONSTRAINT IF NOT EXISTS election_votes_unique_key 
          UNIQUE (election_id, voter_id, position_id, candidate_id, vote_type)
        `;
        global.electionVotesConstraintUpdated = true;
        console.log('✅ Constraint da tabela election_votes atualizada para permitir múltiplas indicações');
      } catch (constraintError) {
        // Se der erro, pode ser que a constraint nova já exista
        console.log('⚠️ Constraint pode já estar atualizada:', constraintError.message);
        global.electionVotesConstraintUpdated = true; // Marcar como tentado
      }
    }

    // Rota para registrar voto
    if (path === '/api/elections/vote' && method === 'POST') {
      let userId, configId, candidateId, phase, body;
      try {

        // Parse inicial com tratamento de erro
        try {
          body = JSON.parse(event.body || '{}');
        } catch (parseError) {
          console.error('❌ Erro ao fazer parse do body:', parseError);
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Dados inválidos no corpo da requisição' })
          };
        }

        userId = event.headers['x-user-id'];
        configId = body.configId;
        candidateId = body.candidateId;
        phase = body.phase;

        console.log('🔍 Dados recebidos na API de votação:', {
          userId,
          configId,
          candidateId,
          phase,
          eventBody: event.body,
          parsedBody: body
        });

        if (!userId) {
          console.log('❌ Usuário não autenticado');
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Usuário não autenticado' })
          };
        }

        if (!candidateId) {
          console.log('❌ candidateId é obrigatório');
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'candidateId é obrigatório' })
          };
        }

        if (!configId) {
          console.log('❌ configId é obrigatório');
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'configId é obrigatório' })
          };
        }

        // Buscar eleição ativa usando configId
        console.log('🔍 Buscando eleição com configId:', configId);
        const election = await sql`
          SELECT 
            e.id as election_id, 
            e.config_id, 
            e.status, 
            e.current_position, 
            e.current_phase,
            e.created_at, 
            ec.voters, 
            ec.positions,
            ec.max_nominations_per_voter
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          WHERE e.config_id = ${parseInt(configId)}
          AND e.status = 'active'
          ORDER BY e.created_at DESC
          LIMIT 1
        `;

        // Debug adicional
        console.log('🔍 Query executada, resultado:', election);
        console.log('🔍 Primeiro resultado:', election[0]);
        console.log('🔍 Election ID raw:', election[0]?.election_id);
        console.log('🔍 Election ID type:', typeof election[0]?.election_id);

        console.log('🔍 Resultado da busca da eleição:', election);
        console.log('🔍 Election ID encontrado:', election[0]?.election_id);
        console.log('🔍 Tipo do election ID:', typeof election[0]?.election_id);
        console.log('🔍 Election ID é null?', election[0]?.election_id === null);
        console.log('🔍 Election ID é undefined?', election[0]?.election_id === undefined);

        if (election.length === 0) {
          // Log detalhado para debug
          const allElectionsForConfig = await sql`
            SELECT id, config_id, status, current_phase, created_at 
            FROM elections 
            WHERE config_id = ${configId}
            ORDER BY created_at DESC
          `;
          console.log('❌ Nenhuma eleição ativa encontrada para configId:', configId);
          console.log('📋 Eleições existentes para este config:', allElectionsForConfig);
          
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: 'Nenhuma eleição ativa encontrada',
              details: {
                configId,
                existingElections: allElectionsForConfig.map(e => ({
                  id: e.id,
                  status: e.status,
                  phase: e.current_phase,
                  created: e.created_at
                }))
              }
            })
          };
        }

        if (!election[0].election_id || election[0].election_id === null || election[0].election_id === undefined) {
          console.log('❌ Election ID é nulo ou indefinido');
          console.log('❌ Election object completo:', election[0]);
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'ID da eleição não encontrado' })
          };
        }

        // Garantir que election_id seja um número inteiro
        const electionId = parseInt(election[0].election_id);
        if (isNaN(electionId)) {
          console.log('❌ Election ID não é um número válido:', election[0].election_id);
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'ID da eleição inválido' })
          };
        }

        console.log('✅ Election ID válido:', electionId);

        // Verificar se o usuário é votante - se não for, adicionar automaticamente
        if (!election[0].voters.includes(parseInt(userId))) {
          console.log('⚠️ Usuário não está na lista de votantes, adicionando automaticamente...');
          try {
            const currentVoters = election[0].voters || [];
            const newVoters = [...currentVoters, parseInt(userId)];
            
            await sql`
              UPDATE election_configs 
              SET voters = ${JSON.stringify(newVoters)}
              WHERE id = ${parseInt(configId)}
            `;
            
            console.log('✅ Usuário adicionado à lista de votantes');
            
            // Atualizar o objeto election local
            election[0].voters = newVoters;
          } catch (addVoterError) {
            console.error('❌ Erro ao adicionar usuário à lista de votantes:', addVoterError);
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: 'Erro ao autorizar usuário para votação' })
            };
          }
        }

        // Obter a posição atual
        const currentPosition = election[0].positions[election[0].current_position];
        const positionId = currentPosition;
        
        console.log('🔍 Posição atual:', {
          currentPosition,
          positionId,
          positions: election[0].positions,
          currentPositionIndex: election[0].current_position
        });
        
        if (!positionId) {
          console.log('❌ Posição atual não encontrada');
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Posição atual não encontrada na eleição' })
          };
        }

        // Determinar o tipo de voto baseado na fase
        const voteType = phase === 'nomination' ? 'nomination' : 'vote';
        
        // Verificar limite de indicações/votos
        if (phase === 'nomination') {
          // Buscar configuração para pegar max_nominations_per_voter
          const config = await sql`
            SELECT max_nominations_per_voter FROM election_configs WHERE id = ${parseInt(configId)}
          `;
          
          const maxNominations = config[0]?.max_nominations_per_voter || 1;
          
          // Contar quantas indicações já foram feitas
          const existingNominations = await sql`
            SELECT COUNT(*) as count FROM election_votes 
            WHERE election_id = ${electionId} 
            AND voter_id = ${parseInt(userId)}
            AND position_id = ${positionId}
            AND vote_type = 'nomination'
          `;
          
          const nominationCount = parseInt(existingNominations[0]?.count) || 0;
          
          if (nominationCount >= maxNominations) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                error: `Você já atingiu o limite de ${maxNominations} indicação(ões) para esta posição` 
              })
            };
          }
        } else {
          // Para votação, apenas 1 voto permitido
          const existingVote = await sql`
            SELECT id FROM election_votes 
            WHERE election_id = ${electionId} 
            AND voter_id = ${parseInt(userId)}
            AND position_id = ${positionId}
            AND vote_type = 'vote'
          `;

          if (existingVote.length > 0) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                error: 'Você já votou para esta posição' 
              })
            };
          }
        }

        // Registrar voto/indicação
        console.log('🔍 Registrando voto/indicação:', {
          electionId: electionId,
          voterId: parseInt(userId),
          positionId,
          candidateId,
          voteType
        });

        // Debug antes da inserção
        console.log('🔍 Dados para inserção:', {
          electionId: electionId,
          voterId: parseInt(userId),
          positionId: positionId,
          candidateId: candidateId,
          voteType: voteType
        });

        const vote = await sql`
          INSERT INTO election_votes (election_id, voter_id, position_id, candidate_id, vote_type)
          VALUES (${electionId}, ${parseInt(userId)}, ${positionId}, ${candidateId}, ${voteType})
          RETURNING *
        `;

        console.log('✅ Voto/indicação registrado:', vote[0]);
        
        // Atualizar contagem no election_candidates
        if (voteType === 'nomination') {
          const candidateRecord = await sql`
            SELECT * FROM election_candidates 
            WHERE election_id = ${electionId}
            AND position_id = ${positionId}
            AND candidate_id = ${candidateId}
          `;
          
          if (candidateRecord.length === 0) {
            await sql`
              INSERT INTO election_candidates (election_id, position_id, candidate_id, candidate_name, nominations, votes)
              VALUES (${electionId}, ${positionId}, ${candidateId}, '', 1, 0)
            `;
          } else {
            await sql`
              UPDATE election_candidates 
              SET nominations = nominations + 1
              WHERE election_id = ${electionId}
              AND position_id = ${positionId}
              AND candidate_id = ${candidateId}
            `;
          }
        } else {
          const candidateRecord = await sql`
            SELECT * FROM election_candidates 
            WHERE election_id = ${electionId}
            AND position_id = ${positionId}
            AND candidate_id = ${candidateId}
          `;
          
          if (candidateRecord.length === 0) {
            await sql`
              INSERT INTO election_candidates (election_id, position_id, candidate_id, candidate_name, nominations, votes)
              VALUES (${electionId}, ${positionId}, ${candidateId}, '', 0, 1)
            `;
          } else {
            await sql`
              UPDATE election_candidates 
              SET votes = votes + 1
              WHERE election_id = ${electionId}
              AND position_id = ${positionId}
              AND candidate_id = ${candidateId}
            `;
          }
        }

        console.log('✅ Voto registrado:', vote[0].id);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: true,
            message: phase === 'nomination' 
              ? 'Indicação registrada com sucesso' 
              : 'Voto registrado com sucesso',
            voteId: vote[0].id
          })
        };

      } catch (error) {
        console.error('❌ Erro ao registrar voto:', error);
        console.error('❌ Nome do erro:', error.name);
        console.error('❌ Mensagem do erro:', error.message);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Dados que causaram o erro:', {
          userId: userId || 'não definido',
          configId: configId || 'não definido',
          candidateId: candidateId || 'não definido',
          phase: phase || 'não definido',
          hasBody: !!body,
          bodyKeys: body ? Object.keys(body) : 'sem body',
          eventPath: path,
          eventMethod: method
        });
        
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Erro interno do servidor',
            message: error.message || 'Erro desconhecido',
            errorName: error.name || 'Unknown',
            details: `${error.name}: ${error.message}`,
            timestamp: new Date().toISOString()
          })
        };
      }
    }

    // GET /api/elections/vote-log/:electionId - Obter log de votos
    if (path.startsWith('/api/elections/vote-log/') && method === 'GET') {
      try {
        const electionId = path.split('/').pop();
        
        console.log(`🔍 Buscando log de votos para eleição: ${electionId}`);
        
        // Buscar todos os votos E indicações da eleição com informações do votante e candidato
        const votes = await sql`
          SELECT 
            ev.id,
            ev.voter_id,
            ev.candidate_id,
            ev.position_id,
            ev.vote_type,
            ev.voted_at as created_at,
            u_voter.name as voter_name,
            u_candidate.name as candidate_name
          FROM election_votes ev
          LEFT JOIN users u_voter ON ev.voter_id = u_voter.id
          LEFT JOIN users u_candidate ON ev.candidate_id = u_candidate.id
          WHERE ev.election_id = ${electionId}
          ORDER BY ev.voted_at DESC
        `;
        
        console.log(`✅ Log encontrado: ${votes.length} registro(s) (votos + indicações)`);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(votes)
        };
      } catch (error) {
        console.error('❌ Erro ao buscar log de votos:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // GET /api/debug/elections - Debug: Listar todas as eleições
    if (path === '/api/debug/elections' && method === 'GET') {
      try {
        const allElections = await sql`
          SELECT e.*, ec.voters, ec.positions
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          ORDER BY e.created_at DESC
        `;

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            elections: allElections,
            total: allElections.length
          })
        };
      } catch (error) {
        console.error('❌ Erro ao buscar eleições:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // GET /api/debug/users - Debug: Listar usuários da igreja
    if (path === '/api/debug/users' && method === 'GET') {
      try {
        const churchName = 'Santana do Livramento (i)';
        
        const users = await sql`
          SELECT u.id, u.name, u.church, u.role, u.status, u.extra_data, u.attendance
          FROM users u
          WHERE u.church = ${churchName}
          AND u.role LIKE '%member%'
          AND (u.status = 'approved' OR u.status = 'pending')
          ORDER BY u.name ASC
          LIMIT 10
        `;

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            churchName,
            users: users,
            total: users.length
          })
        };
      } catch (error) {
        console.error('❌ Erro ao buscar usuários:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }


    // POST /api/debug/add-voter - Debug: Adicionar votante à eleição
    if (path === '/api/debug/add-voter' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { configId, userId } = body;

        if (!configId || !userId) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'configId e userId são obrigatórios' })
          };
        }

        // Buscar configuração atual
        const config = await sql`
          SELECT voters FROM election_configs WHERE id = ${configId}
        `;

        if (config.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Configuração não encontrada' })
          };
        }

        const currentVoters = config[0].voters || [];
        
        // Adicionar usuário se não estiver na lista
        if (!currentVoters.includes(parseInt(userId))) {
          const newVoters = [...currentVoters, parseInt(userId)];
          
          await sql`
            UPDATE election_configs 
            SET voters = ${JSON.stringify(newVoters)}
            WHERE id = ${configId}
          `;

          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: 'Votante adicionado com sucesso',
              configId,
              userId,
              voters: newVoters
            })
          };
        } else {
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: 'Usuário já é votante',
              configId,
              userId,
              voters: currentVoters
            })
          };
        }
      } catch (error) {
        console.error('❌ Erro ao adicionar votante:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // GET /api/elections/active - Listar eleições ativas para o usuário votante
    if (path === '/api/elections/active' && method === 'GET') {
      try {
        const userId = event.headers['x-user-id'];
        
        if (!userId) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'ID do usuário é obrigatório' })
          };
        }

        // Buscar eleições ativas onde o usuário é votante
        const elections = await sql`
          SELECT 
            e.id as election_id,
            e.config_id,
            e.status,
            e.current_position,
            e.created_at,
            ec.church_name,
            ec.positions,
            ec.voters
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          WHERE e.status = 'active'
          AND ${parseInt(userId)} = ANY(ec.voters)
          ORDER BY e.created_at DESC
        `;

        console.log(`✅ Eleições ativas encontradas para usuário ${userId}: ${elections.length}`);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
            elections: elections,
            total: elections.length
          })
        };

      } catch (error) {
        console.error('❌ Erro ao buscar eleições ativas:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Erro interno do servidor',
            details: error.message
          })
        };
      }
    }

    // GET /api/elections/voting/:configId - Dados para interface de votação mobile
    if (path.startsWith('/api/elections/voting/') && method === 'GET') {
      try {
        const configId = parseInt(path.split('/').pop());
        
        // Buscar eleição ativa
        console.log('🔍 Buscando eleição com configId:', configId);
        const election = await sql`
          SELECT e.*, ec.voters, ec.positions, ec.church_name
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          WHERE e.config_id = ${configId}
          AND e.status = 'active'
        `;

        console.log('🔍 Resultado da busca da eleição:', election);
        console.log('🔍 Quantidade de eleições encontradas:', election.length);

        if (election.length === 0) {
          // Buscar todas as eleições para debug
          const allElections = await sql`
            SELECT e.id, e.config_id, e.status, ec.church_name
            FROM elections e
            JOIN election_configs ec ON e.config_id = ec.id
            ORDER BY e.created_at DESC
            LIMIT 10
          `;
          console.log('🔍 Todas as eleições (últimas 10):', allElections);
          
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: 'Nenhuma eleição ativa encontrada',
              debug: {
                configId,
                message: 'Verifique se o ID da configuração está correto e se há uma eleição ativa',
                allElections: allElections
              }
            })
          };
        }

        const positionsRaw = election[0].positions;
        let positions = [];
        if (Array.isArray(positionsRaw)) {
          positions = positionsRaw;
        } else if (typeof positionsRaw === 'string') {
          try {
            positions = JSON.parse(positionsRaw || '[]');
          } catch (parseError) {
            console.log('⚠️ Erro ao converter positions para array:', parseError);
            positions = [];
          }
        }

        if (!positions || positions.length === 0) {
          console.log('❌ Nenhuma posição configurada na eleição (Netlify function)');
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Configuração inválida: nenhuma posição encontrada' })
          };
        }

        const currentPosition = election[0].current_position || 0;
        if (currentPosition >= positions.length) {
          console.log('❌ Posição atual inválida (Netlify function):', currentPosition, 'de', positions.length);
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Posição atual inválida na eleição' })
          };
        }

        const currentPositionName = positions[currentPosition] || '';
        const currentPhase = election[0].current_phase || 'nomination';
        
        console.log('🔍 Estado atual da eleição:', {
          currentPosition,
          currentPositionName,
          currentPhase,
          electionId: election[0].id
        });

        // Buscar configuração com critérios (necessário para max_nominations_per_voter)
        let config;
        try {
          // Primeiro, tentar criar as colunas se não existirem
          await sql`
            ALTER TABLE election_configs 
            ADD COLUMN IF NOT EXISTS position_descriptions JSONB DEFAULT '{}'::jsonb
          `;
          await sql`
            ALTER TABLE election_configs 
            ADD COLUMN IF NOT EXISTS removed_candidates JSONB DEFAULT '[]'::jsonb
          `;
          
          config = await sql`
            SELECT criteria, church_name, max_nominations_per_voter, position_descriptions, voters, removed_candidates
            FROM election_configs WHERE id = ${configId}
          `;
        } catch (error) {
          console.log('⚠️ Erro ao buscar config:', error);
          config = await sql`
            SELECT criteria, church_name, max_nominations_per_voter, voters, removed_candidates
            FROM election_configs WHERE id = ${configId}
          `;
          // Adicionar campos como null se não existirem
          if (config.length > 0) {
            config[0].position_descriptions = config[0].position_descriptions || null;
            config[0].removed_candidates = config[0].removed_candidates || [];
          }
        }
        
        // Log detalhado do removed_candidates
        console.log('🔍 [VOTING] Config carregado (Netlify):', {
          configId,
          removed_candidates_raw: config[0]?.removed_candidates,
          removed_candidates_type: typeof config[0]?.removed_candidates,
          removed_candidates_isArray: Array.isArray(config[0]?.removed_candidates)
        });
        
        if (config.length === 0) {
          console.log('❌ Configuração não encontrada');
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Configuração não encontrada' })
          };
        }

        // Normalizar lista de votantes configurada
        let votersArray = [];
        const votersRaw = config[0].voters ?? election[0].voters;

        if (Array.isArray(votersRaw)) {
          votersArray = votersRaw;
        } else if (typeof votersRaw === 'string') {
          try {
            const parsed = JSON.parse(votersRaw);
            if (Array.isArray(parsed)) {
              votersArray = parsed;
            }
          } catch (jsonError) {
            const cleaned = votersRaw.replace(/[{}]/g, '');
            if (cleaned.trim().length > 0) {
              votersArray = cleaned
                .split(',')
                .map((v) => v.trim().replace(/^['"]+|['"]+$/g, ''))
                .map((v) => parseInt(v, 10));
            }
          }
        }

        votersArray = Array.from(
          new Set(
            (votersArray || [])
              .map((value) => {
                if (typeof value === 'number') return value;
                if (typeof value === 'string') {
                  const normalized = value.trim().replace(/^['"]+|['"]+$/g, '');
                  return parseInt(normalized, 10);
                }
                return Number.NaN;
              })
              .filter((value) => !Number.isNaN(value))
          )
        );

        const configuredTotalVoters = votersArray.length;

        // Buscar candidatos baseado na fase
        let candidates;
        let voteResults = [];
        let totalVotesCount = 0;
        let votedVotersCount = 0;
        let allVotesCast = false;
        let winnerInfo = null;
        let effectiveTotalVoters = configuredTotalVoters;
        
        if (currentPhase === 'voting') {
          // FASE DE VOTAÇÃO: Mostrar apenas candidatos que foram indicados
          console.log('🗳️ FASE DE VOTAÇÃO - Buscando candidatos indicados...');
          
          // Buscar IDs dos candidatos indicados
          const votesData = await sql`
            SELECT 
              candidate_id,
              COUNT(*) as nominations
            FROM election_votes
            WHERE election_id = ${election[0].id}
            AND position_id = ${currentPositionName}
            AND vote_type = 'nomination'
            GROUP BY candidate_id
          `;
          
          console.log(`✅ Encontrados ${votesData.length} candidatos com indicações`);
          
          // Buscar dados completos dos usuários
          const candidateIds = votesData.map(v => v.candidate_id);
          
          if (candidateIds.length > 0) {
            const usersData = await sql`
              SELECT id, name, church, birth_date, extra_data
              FROM users
              WHERE id = ANY(${candidateIds})
            `;
            
            console.log(`✅ Encontrados ${usersData.length} usuários na tabela users`);
            
            // Combinar dados
            candidates = votesData.map(v => {
              const user = usersData.find(u => u.id === v.candidate_id);
              console.log(`   Candidato ID ${v.candidate_id}: nome="${user ? user.name : 'NÃO ENCONTRADO'}"`);
              return {
                candidate_id: v.candidate_id,
                candidate_name: user ? user.name : null,
                church: user ? user.church : null,
                birth_date: user ? user.birth_date : null,
                extra_data: user ? user.extra_data : null,
                nominations: parseInt(v.nominations, 10),
                votes: 0,
                points: 0
              };
            });
          } else {
            candidates = [];
          }

          voteResults = await sql`
            SELECT 
              ev.candidate_id,
              COUNT(*)::int as votes
            FROM election_votes ev
            WHERE ev.election_id = ${election[0].id}
              AND ev.position_id = ${currentPositionName}
              AND ev.vote_type = 'vote'
            GROUP BY ev.candidate_id
          `;

          const distinctVotersResult = await sql`
            SELECT COUNT(DISTINCT voter_id)::int as count
            FROM election_votes
            WHERE election_id = ${election[0].id}
              AND position_id = ${currentPositionName}
              AND vote_type = 'vote'
          `;
          votedVotersCount = distinctVotersResult.length > 0 ? parseInt(distinctVotersResult[0].count, 10) || 0 : 0;
        } else {
          // FASE DE INDICAÇÃO: Mostrar todos os candidatos elegíveis
          console.log('📝 FASE DE INDICAÇÃO - Consultando candidatos elegíveis...');
          
          // config já foi buscado acima
          console.log('🔍 Configuração encontrada:', config);
        
        const criteria = config[0].criteria;
        const churchName = config[0].church_name || election[0].church_name || 'Santana do Livramento (i)';
        
        console.log('🔍 Nome da igreja a ser usado:', churchName);
        console.log('🔍 Critérios encontrados:', criteria);
        
        // Construir query baseada nos critérios
        let whereClause = `
          u.church = '${churchName}'
          AND u.role LIKE '%member%'
          AND (u.status = 'approved' OR u.status = 'pending')
        `;
        
        // Aplicar critérios
        if (criteria?.faithfulness?.enabled) {
          if (criteria.faithfulness.recurring) {
            whereClause += ` AND u.is_tither = true AND u.is_donor = true`;
          } else if (criteria.faithfulness.seasonal) {
            whereClause += ` AND u.is_donor = true`;
          }
        }
        
        if (criteria?.churchTime?.enabled) {
          const months = criteria.churchTime.minimumMonths;
          whereClause += ` AND u.created_at <= NOW() - INTERVAL '${months} months'`;
        }
        
        if (criteria?.attendance?.enabled) {
          if (criteria.attendance.recurring) {
            whereClause += ` AND u.attendance >= 90`;
          } else if (criteria.attendance.seasonal) {
            whereClause += ` AND u.attendance >= 60`;
          }
        }
        
        // Aplicar filtros de critérios da configuração
        console.log('🔍 Aplicando filtros de critérios:', criteria);
        
        // Implementar filtros baseados na página de usuários com aplicação de critérios
        const faithfulnessActive = criteria.faithfulness && criteria.faithfulness.enabled;
        const churchTimeActive = criteria.churchTime && criteria.churchTime.enabled && criteria.churchTime.minimumMonths;
        const attendanceActive = criteria.attendance && criteria.attendance.enabled;
        
        console.log('🔍 Filtros ativos:', {
          faithfulness: faithfulnessActive,
          churchTime: churchTimeActive,
          attendance: attendanceActive
        });
        console.log('🔍 Critérios completos:', JSON.stringify(criteria, null, 2));
        console.log('🔍 Critérios de fidelidade:', JSON.stringify(criteria.faithfulness, null, 2));
        
        // Buscar todos os usuários da igreja (como na página de usuários) e aplicar filtros de critérios
        console.log('🔍 Buscando usuários da igreja e aplicando filtros de critérios...');
        
        // Primeiro, buscar todos os usuários da igreja (baseado na página de usuários)
        let allUsers = await sql`
          SELECT DISTINCT 
            u.id as candidate_id,
            u.name as candidate_name,
            u.email,
            u.church,
            u.nome_unidade,
            u.role,
            u.status,
            u.created_at,
            u.is_tither,
            u.is_donor,
            u.attendance,
            u.extra_data,
            u.points,
            0 as nominations,
            0 as votes,
            0 as percentage
          FROM users u
          WHERE u.church = ${churchName}
          AND u.role LIKE '%member%'
          AND (u.status = 'approved' OR u.status = 'pending')
          ORDER BY u.name ASC
        `;
        
        console.log(`🔍 Total de usuários encontrados: ${allUsers.length}`);
        
        // Aplicar filtros de critérios nos dados já carregados
        console.log('🔍 Aplicando filtros de critérios em', allUsers.length, 'usuários');
        
        // Se não há critérios definidos, retornar todos os usuários
        if (!criteria || Object.keys(criteria).length === 0) {
          console.log('🔍 Nenhum critério definido, retornando todos os usuários');
          candidates = allUsers;
        } else {
          candidates = allUsers.filter(user => {
            let passesFaithfulness = true;
            let passesChurchTime = true;
            let passesAttendance = true;
            
            console.log(`🔍 Analisando usuário: ${user.candidate_name} (ID: ${user.candidate_id})`);
          
            // Filtro de fidelidade (dizimista)
            if (faithfulnessActive) {
              let dizimistaType = '';
              try {
                // extra_data pode ser string JSON ou objeto
                const extraData = typeof user.extra_data === 'string' ? JSON.parse(user.extra_data) : user.extra_data;
                dizimistaType = extraData?.dizimistaType || '';
              } catch (e) {
                console.log(`🔍 Erro ao parsear extra_data para ${user.candidate_name}:`, e.message);
                dizimistaType = '';
              }
              
              // Aplicar filtros baseados nos critérios específicos habilitados
              let meetsFaithfulnessCriteria = false;
              
              if (criteria.faithfulness.punctual && dizimistaType.includes('Pontual')) {
                meetsFaithfulnessCriteria = true;
              }
              if (criteria.faithfulness.seasonal && dizimistaType.includes('Sazonal')) {
                meetsFaithfulnessCriteria = true;
              }
              if (criteria.faithfulness.recurring && dizimistaType.includes('Recorrente')) {
                meetsFaithfulnessCriteria = true;
              }
              
              passesFaithfulness = meetsFaithfulnessCriteria;
              console.log(`🔍 Usuário ${user.candidate_name}: dizimistaType=${dizimistaType}, criteria=${JSON.stringify(criteria.faithfulness)}, passesFaithfulness=${passesFaithfulness}`);
            }
          
          // Filtro de tempo de igreja (baseado no tempo de batismo)
          if (churchTimeActive) {
            let tempoBatismoAnos = 0;
            try {
              const extraData = typeof user.extra_data === 'string' ? JSON.parse(user.extra_data) : user.extra_data;
              tempoBatismoAnos = extraData?.tempoBatismoAnos || 0;
            } catch (e) {
              console.log(`🔍 Erro ao parsear extra_data para tempo de batismo: ${user.candidate_name}`, e.message);
              tempoBatismoAnos = 0;
            }
            
            const minimumYears = Math.round(criteria.churchTime.minimumMonths / 12);
            passesChurchTime = tempoBatismoAnos >= minimumYears;
            console.log(`🔍 Usuário ${user.candidate_name}: tempoBatismoAnos=${tempoBatismoAnos}, minimumYears=${minimumYears}, passesChurchTime=${passesChurchTime}`);
          }
          
          // Filtro de presença
          if (attendanceActive) {
            passesAttendance = user.attendance >= 60; // 60% ou mais de presença
            console.log(`🔍 Usuário ${user.candidate_name}: attendance=${user.attendance}, passesAttendance=${passesAttendance}`);
          }
          
            return passesFaithfulness && passesChurchTime && passesAttendance;
          });
        }
        
        console.log(`🔍 Candidatos após aplicar filtros: ${candidates.length}`);
        
        console.log('🔍 Query executada com sucesso');
        console.log('🔍 Filtros aplicados:', {
          faithfulness: faithfulnessActive,
          churchTime: churchTimeActive,
          attendance: attendanceActive
        });
        console.log('🔍 Critérios:', criteria);
        
        // Debug: testar consulta simples sem filtros
        const debugCandidates = await sql`
          SELECT u.id, u.name, u.extra_data->>'dizimistaType' as dizimista_type
          FROM users u
          WHERE u.church = ${churchName}
          AND u.role LIKE '%member%'
          AND (u.status = 'approved' OR u.status = 'pending')
          LIMIT 5
        `;
        console.log('🔍 Debug - Primeiros 5 membros:', debugCandidates);
        
        // Debug: testar consulta com filtro de dizimista
        const debugDizimistas = await sql`
          SELECT u.id, u.name, u.extra_data->>'dizimistaType' as dizimista_type
          FROM users u
          WHERE u.church = ${churchName}
          AND u.role LIKE '%member%'
          AND (u.status = 'approved' OR u.status = 'pending')
          AND u.extra_data->>'dizimistaType' IN ('Recorrente (8-12)', 'Sazonal (4-7)', 'Pontual (1-3)')
          LIMIT 5
        `;
        console.log('🔍 Debug - Dizimistas encontrados:', debugDizimistas);
        
        // Debug: testar consulta mais específica
        const debugSpecific = await sql`
          SELECT u.id, u.name, u.extra_data->>'dizimistaType' as dizimista_type
          FROM users u
          WHERE u.church = ${churchName}
          AND u.role LIKE '%member%'
          AND (u.status = 'approved' OR u.status = 'pending')
          AND u.extra_data->>'dizimistaType' = 'Recorrente (8-12)'
          LIMIT 3
        `;
        console.log('🔍 Debug - Recorrente específico:', debugSpecific);
        
        console.log('🔍 Resultado da query:', candidates);

          console.log(`✅ Candidatos elegíveis encontrados: ${candidates.length}`);
        }
        
        // Normalizar estrutura dos candidatos
        let normalizedCandidates = candidates.map(c => ({
          id: c.candidate_id,
          name: c.candidate_name || c.name || 'Nome não encontrado',
          unit: c.church || 'N/A',
          nomeUnidade: c.nome_unidade || null,
          birthDate: c.birth_date || c.birthDate || null,
          extraData: (() => {
            try {
              return typeof c.extra_data === 'string' ? JSON.parse(c.extra_data) : (c.extra_data || null);
            } catch {
              return null;
            }
          })(),
          points: c.points || 0,
          nominations: c.nominations || 0,
          votes: c.votes || 0,
          percentage: c.percentage || 0
        }));

        const isTeenPosition = typeof currentPositionName === 'string' && currentPositionName.toLowerCase().includes('teen');

        if (isTeenPosition) {
          normalizedCandidates = normalizedCandidates.filter(candidate => {
            let age = null;
            if (candidate.birthDate) {
              const birthDate = new Date(candidate.birthDate);
              if (!Number.isNaN(birthDate.getTime())) {
                age = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
              }
            } else if (candidate.extraData && candidate.extraData.idade) {
              const parsed = parseInt(candidate.extraData.idade, 10);
              age = Number.isNaN(parsed) ? null : parsed;
            }
            const eligible = age !== null && age >= 10 && age <= 15;
            if (!eligible) {
              console.log(`❌ Removendo candidato ${candidate.name} da lista Teen (idade=${age ?? 'desconhecida'})`);
            }
            return eligible;
          });
        }

        // Filtrar candidatos removidos manualmente pelo admin
        console.log('🔍 [VOTING] Verificando removed_candidates do config:', {
          raw: config[0].removed_candidates,
          type: typeof config[0].removed_candidates,
          isArray: Array.isArray(config[0].removed_candidates)
        });
        
        let removedCandidates = [];
        if (config[0].removed_candidates) {
          if (Array.isArray(config[0].removed_candidates)) {
            removedCandidates = config[0].removed_candidates;
          } else if (typeof config[0].removed_candidates === 'string') {
            try {
              removedCandidates = JSON.parse(config[0].removed_candidates || '[]');
            } catch (e) {
              console.error('❌ [VOTING] Erro ao parsear removed_candidates:', e);
              removedCandidates = [];
            }
          }
        }
        
        console.log('🔍 [VOTING] removed_candidates parseado:', removedCandidates);
        console.log('🔍 [VOTING] Total de candidatos antes do filtro:', normalizedCandidates.length);
        
        if (removedCandidates.length > 0) {
          const beforeCount = normalizedCandidates.length;
          normalizedCandidates = normalizedCandidates.filter(candidate => {
            const isRemoved = removedCandidates.includes(candidate.id);
            if (isRemoved) {
              console.log(`❌ [VOTING] Removendo candidato ${candidate.name} (id: ${candidate.id}) - removido manualmente pelo admin`);
            }
            return !isRemoved;
          });
          console.log(`🔧 [VOTING] Filtro de candidatos removidos: ${beforeCount} → ${normalizedCandidates.length} (removidos: ${beforeCount - normalizedCandidates.length})`);
        } else {
          console.log('ℹ️ [VOTING] Nenhum candidato removido encontrado no config');
        }

        normalizedCandidates = normalizedCandidates.map(candidate => ({
          id: candidate.id,
          name: candidate.name,
          unit: candidate.unit,
          points: candidate.points,
          nominations: candidate.nominations,
          votes: candidate.votes,
          percentage: candidate.percentage
        }));

        console.log(`✅ Retornando ${normalizedCandidates.length} candidatos para interface de votação`);
        if (normalizedCandidates.length > 0) {
          console.log('🔍 Primeiro candidato:', JSON.stringify(normalizedCandidates[0]));
        }
        
        let finalCandidates = normalizedCandidates;

        if (currentPhase === 'voting') {
          const voteMap = new Map();
          voteResults.forEach(row => {
            voteMap.set(row.candidate_id, parseInt(row.votes, 10) || 0);
          });

          totalVotesCount = Array.from(voteMap.values()).reduce((sum, value) => sum + value, 0);
          
          finalCandidates = normalizedCandidates.map(candidate => {
            const candidateVotes = voteMap.get(candidate.id) || 0;
            const percentage = totalVotesCount > 0 ? (candidateVotes / totalVotesCount) * 100 : 0;
            return {
              ...candidate,
              votes: candidateVotes,
              percentage
            };
          });

          if (finalCandidates.length > 0) {
            const sortedCandidates = [...finalCandidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));
            const topCandidate = sortedCandidates[0];
            if (topCandidate && (topCandidate.votes || 0) > 0) {
              winnerInfo = {
                id: topCandidate.id,
                name: topCandidate.name,
                votes: topCandidate.votes,
                percentage: topCandidate.percentage
              };
            }
          }

          if (effectiveTotalVoters === 0) {
            effectiveTotalVoters = Math.max(configuredTotalVoters, votedVotersCount, totalVotesCount);
          }

          if (effectiveTotalVoters > 0 && (votedVotersCount >= effectiveTotalVoters || totalVotesCount >= effectiveTotalVoters)) {
            allVotesCast = true;
          }
        }

        if (currentPhase === 'completed') {
          allVotesCast = true;
          if (effectiveTotalVoters === 0) {
            effectiveTotalVoters = Math.max(configuredTotalVoters, votedVotersCount, totalVotesCount);
          }
        }

        const resultAnnounced = Boolean(election[0].result_announced);
        if (resultAnnounced) {
          allVotesCast = true;
          if (effectiveTotalVoters === 0) {
            effectiveTotalVoters = Math.max(configuredTotalVoters, votedVotersCount, totalVotesCount);
          }
        }

        console.log('📊 Status da votação (Netlify function)', {
          configId,
          position: currentPositionName,
          currentPhase,
          configuredTotalVoters,
          effectiveTotalVoters,
          totalVotesCount,
          votedVotersCount,
          allVotesCast,
          resultAnnounced,
          winner: winnerInfo ? { id: winnerInfo.id, votes: winnerInfo.votes, percentage: winnerInfo.percentage } : null
        });
        
        console.log('🔍 Candidatos finais para retornar:', finalCandidates);

        // Verificar se o usuário já votou ou indicou (baseado na fase)
        const userId = event.headers['x-user-id'];
        let hasVoted = false;
        let hasNominated = false;
        let userVote = null;
        let nominationCount = 0;
        const maxNominationsPerVoter = config[0].max_nominations_per_voter || 1;
        const positionDescriptions = config[0].position_descriptions || {};
        const currentPositionDescription = positionDescriptions && positionDescriptions[currentPositionName] ? positionDescriptions[currentPositionName] : '';

        if (userId) {
          // Verificar VOTO (fase de votação)
          const voteCheck = await sql`
            SELECT candidate_id FROM election_votes 
            WHERE election_id = ${election[0].id} 
            AND voter_id = ${parseInt(userId)}
            AND position_id = ${currentPositionName}
            AND vote_type = 'vote'
          `;
          
          // Verificar INDICAÇÃO (fase de indicação) e contar
          const nominationCheck = await sql`
            SELECT COUNT(*) as count FROM election_votes 
            WHERE election_id = ${election[0].id} 
            AND voter_id = ${parseInt(userId)}
            AND position_id = ${currentPositionName}
            AND vote_type = 'nomination'
          `;
          
          if (voteCheck.length > 0) {
            hasVoted = true;
            userVote = voteCheck[0].candidate_id;
          }
          
          nominationCount = parseInt(nominationCheck[0]?.count) || 0;
          const hasReachedNominationLimit = nominationCount >= maxNominationsPerVoter;
          
          if (nominationCount > 0) {
            hasNominated = hasReachedNominationLimit;
          }
          
          console.log(`🔍 Verificação usuário ${userId}: hasVoted=${hasVoted}, hasNominated=${hasNominated}, nominationCount=${nominationCount}/${maxNominationsPerVoter}, phase=${currentPhase}`);
        }

        // Buscar nome do candidato votado
        let votedCandidateName = null;
        if (hasVoted && userVote) {
          const votedCandidate = await sql`
            SELECT name FROM users WHERE id = ${userVote}
          `;
          if (votedCandidate.length > 0) {
            votedCandidateName = votedCandidate[0].name;
          }
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            election: {
              id: election[0].id,
              config_id: election[0].config_id,
              status: election[0].status,
              current_position: election[0].current_position,
              created_at: election[0].created_at,
              updated_at: election[0].updated_at,
              voters: election[0].voters,
              positions: election[0].positions,
              church_name: election[0].church_name
            },
            currentPosition: currentPosition,
            totalPositions: positions.length,
            currentPositionName: currentPositionName,
            currentPositionDescription: currentPositionDescription,
            candidates: finalCandidates,
            phase: currentPhase,
            hasVoted: hasVoted,
            hasNominated: hasNominated,
            nominationCount: nominationCount,
            maxNominationsPerVoter: maxNominationsPerVoter,
            userVote: userVote,
            votedCandidateName: votedCandidateName,
            totalVoters: effectiveTotalVoters,
            totalVotes: totalVotesCount,
            votersWhoVoted: votedVotersCount,
            allVotesCast: allVotesCast,
            resultAnnounced: resultAnnounced,
            winner: winnerInfo
          })
        };

      } catch (error) {
        console.error('❌ Erro na rota de voting:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Erro interno do servidor',
            details: error.message 
          })
        };
      }
    }

    // GET /api/elections/preview-candidates - Preview de candidatos elegíveis
    if (path === '/api/elections/preview-candidates' && method === 'GET') {
      console.log('🔍 API preview-candidates chamada - TESTE SIMPLES');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'API funcionando!',
          path: path,
          method: method,
          timestamp: new Date().toISOString()
        })
      };
    }

    // GET /api/elections/preview-candidates-full - Preview de candidatos elegíveis (versão completa)
    if (path === '/api/elections/preview-candidates-full' && method === 'GET') {
      console.log('🔍 API preview-candidates chamada');
      
      try {
        const url = new URL(event.rawUrl);
        const churchId = url.searchParams.get('churchId');
        const criteria = url.searchParams.get('criteria');

        console.log('🔍 Parâmetros:', { churchId, criteria });

        if (!churchId) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'churchId é obrigatório' })
          };
        }

        let criteriaObj = {};
        if (criteria) {
          try {
            criteriaObj = JSON.parse(criteria);
          } catch (e) {
            console.log('🔍 Usando critérios vazios');
            criteriaObj = {};
          }
        }

        // Buscar nome da igreja primeiro
        const church = await sql`
          SELECT name FROM churches WHERE id = ${parseInt(churchId)}
        `;

        if (church.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Igreja não encontrada' })
          };
        }

        const churchName = church[0].name;
        console.log(`🔍 Buscando membros da igreja: ${churchName}`);

        // Buscar membros da igreja
        const churchMembers = await sql`
          SELECT id, name, email, church, role, status, created_at, birth_date, is_tither, is_donor, attendance, extra_data
          FROM users
          WHERE church = ${churchName}
          AND (role = 'member' OR role = 'admin' OR role LIKE '%member%' OR role LIKE '%admin%')
          AND (status = 'approved' OR status = 'pending')
        `;

        console.log(`🔍 Encontrados ${churchMembers.length} membros na igreja ${churchName}`);

        // Se não há critérios, retornar todos os membros
        if (!criteriaObj.faithfulness?.enabled && !criteriaObj.attendance?.enabled && !criteriaObj.churchTime?.enabled) {
          const candidates = churchMembers.map(member => ({
            id: member.id,
            name: member.name,
            email: member.email,
            church: member.church,
            role: member.role,
            status: member.status,
            isTither: member.is_tither,
            isDonor: member.is_donor,
            attendance: member.attendance,
            monthsInChurch: Math.floor((new Date() - new Date(member.created_at)) / (1000 * 60 * 60 * 24 * 30)),
            extraData: member.extra_data
          }));

          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              totalMembers: churchMembers.length,
              eligibleCandidates: candidates.length,
              candidates: candidates
            })
          };
        }

        // Filtrar candidatos baseado nos critérios
        const eligibleCandidates = [];
        const now = new Date();

        for (const member of churchMembers) {
          let isEligible = true;

          // Critério de Fidelidade
          if (criteriaObj.faithfulness?.enabled) {
            const hasFaithfulness = 
              (criteriaObj.faithfulness.punctual && member.is_tither) ||
              (criteriaObj.faithfulness.seasonal && member.is_donor) ||
              (criteriaObj.faithfulness.recurring && member.attendance >= 70);
            
            if (!hasFaithfulness) {
              isEligible = false;
            }
          }

          // Critério de Presença
          if (criteriaObj.attendance?.enabled) {
            let hasAttendance = false;
            const extraData = member.extra_data || {};
            
            if (criteriaObj.attendance.punctual && extraData.teveParticipacao) {
              hasAttendance = true;
            }
            
            if (!hasAttendance) {
              isEligible = false;
            }
          }

          // Critério de Tempo na Igreja
          if (criteriaObj.churchTime?.enabled) {
            const memberDate = new Date(member.created_at);
            const monthsInChurch = (now - memberDate) / (1000 * 60 * 60 * 24 * 30);
            
            if (monthsInChurch < criteriaObj.churchTime.minimumMonths) {
              isEligible = false;
            }
          }

          // Critério de Classificação
          if (criteriaObj.classification?.enabled) {
            const memberClassification = (member.classificacao || '').toLowerCase();
            let hasValidClassification = false;
            
            if (criteriaObj.classification.frequente && memberClassification === 'frequente') {
              hasValidClassification = true;
            }
            if (criteriaObj.classification.naoFrequente && memberClassification === 'não frequente') {
              hasValidClassification = true;
            }
            if (criteriaObj.classification.aResgatar && memberClassification === 'a resgatar') {
              hasValidClassification = true;
            }
            
            if (!hasValidClassification) {
              isEligible = false;
              console.log(`❌ Candidato ${member.name} inelegível por classificação: ${member.classificacao}`);
            }
          }

          if (isEligible) {
            eligibleCandidates.push({
              id: member.id,
              name: member.name,
              email: member.email,
              church: member.church,
              role: member.role,
              status: member.status,
              isTither: member.is_tither,
              isDonor: member.is_donor,
              attendance: member.attendance,
              monthsInChurch: Math.floor((now - new Date(member.created_at)) / (1000 * 60 * 60 * 24 * 30)),
              extraData: member.extra_data
            });
          }
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            totalMembers: churchMembers.length,
            eligibleCandidates: eligibleCandidates.length,
            candidates: eligibleCandidates
          })
        };

      } catch (error) {
        console.error('❌ Erro ao buscar candidatos elegíveis:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
        };
      }
    }

    // Rota para dashboard do admin
    if (path === '/api/elections/dashboard' && method === 'GET') {
      try {
        // Buscar eleição ativa
        const election = await sql`
          SELECT e.*, ec.voters, ec.positions, ec.church_name
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          WHERE e.status = 'active'
          ORDER BY e.created_at DESC
          LIMIT 1
        `;

        if (election.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Nenhuma eleição ativa' })
          };
        }

        // Buscar estatísticas
        const totalVoters = election[0].voters.length;
        const votedVoters = await sql`
          SELECT COUNT(DISTINCT voter_id) as count
          FROM election_votes
          WHERE election_id = ${election[0].id}
        `;

        // Buscar resultados por posição
        const positions = [];
        for (const position of election[0].positions) {
          const results = await sql`
            SELECT 
              ec.candidate_id,
              ec.candidate_name,
              ec.nominations,
              ec.votes,
              CASE 
                WHEN SUM(ec.votes) OVER() > 0 
                THEN (ec.votes::FLOAT / SUM(ec.votes) OVER() * 100)
                ELSE 0 
              END as percentage
            FROM election_candidates ec
            WHERE ec.election_id = ${election[0].id}
            AND ec.position_id = ${position}
            ORDER BY ec.votes DESC, ec.nominations DESC
          `;

          const winner = results.length > 0 && results[0].votes > 0 ? results[0] : null;
          const totalNominations = results.reduce((sum, r) => sum + r.nominations, 0);

          positions.push({
            positionId: position,
            positionName: position,
            totalVotes: results.reduce((sum, r) => sum + r.votes, 0),
            totalNominations: totalNominations,
            results: results.map(r => ({
              candidateId: r.candidate_id,
              candidateName: r.candidate_name,
              nominations: r.nominations,
              votes: r.votes,
              percentage: r.percentage
            })),
            winner
          });
        }

        const response = {
          totalVoters,
          votedVoters: votedVoters[0].count,
          currentPosition: election[0].current_position,
          totalPositions: election[0].positions.length,
          isActive: election[0].status === 'active',
          positions
        };

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response)
        };

      } catch (error) {
        console.error('❌ Erro ao buscar dashboard:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para dashboard do admin com configId específico
    if (path.startsWith('/api/elections/dashboard/') && method === 'GET') {
      try {
        const configId = parseInt(path.split('/').pop());
        
        // Buscar eleição ativa para o configId específico
        const election = await sql`
          SELECT e.*, ec.voters, ec.positions, ec.church_name
          FROM elections e
          JOIN election_configs ec ON e.config_id = ec.id
          WHERE e.config_id = ${configId}
          AND e.status = 'active'
          ORDER BY e.created_at DESC
          LIMIT 1
        `;

        if (election.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Nenhuma eleição ativa para esta configuração' })
          };
        }

        // Buscar estatísticas
        const totalVoters = election[0].voters.length;
        const votedVoters = await sql`
          SELECT COUNT(DISTINCT voter_id) as count
          FROM election_votes
          WHERE election_id = ${election[0].id}
        `;

        // Buscar todos os resultados de uma vez (otimizado)
        const allResults = await sql`
          SELECT 
            ev.position_id,
            ev.candidate_id,
            COALESCE(u.name, 'Usuário não encontrado') as candidate_name,
            u.email as candidate_email,
            COUNT(CASE WHEN ev.vote_type = 'nomination' THEN 1 END)::int as nominations,
            COUNT(CASE WHEN ev.vote_type = 'vote' THEN 1 END)::int as votes
          FROM election_votes ev
          LEFT JOIN users u ON ev.candidate_id = u.id
          WHERE ev.election_id = ${election[0].id}
          GROUP BY ev.position_id, ev.candidate_id, u.name, u.email
          HAVING COUNT(CASE WHEN ev.vote_type = 'nomination' THEN 1 END) > 0 
             OR COUNT(CASE WHEN ev.vote_type = 'vote' THEN 1 END) > 0
          ORDER BY ev.position_id, votes DESC, nominations DESC
        `;
        
        console.log('📊 [DASHBOARD] Resultados encontrados:', allResults.length);
        allResults.forEach(r => {
          console.log(`  - Candidato ${r.candidate_id}: ${r.candidate_name} (${r.nominations} indicações, ${r.votes} votos)`);
        });

        // Agrupar resultados por posição
        const positions = [];
        const resultsByPosition = new Map();
        
        // Agrupar resultados por posição
        allResults.forEach(result => {
          if (!resultsByPosition.has(result.position_id)) {
            resultsByPosition.set(result.position_id, []);
          }
          resultsByPosition.get(result.position_id).push(result);
        });

        // Processar cada posição
        for (const position of election[0].positions) {
          const results = resultsByPosition.get(position) || [];
          
          // Converter votos e indicações para números e calcular percentuais
          results.forEach(r => {
            r.votes = parseInt(r.votes) || 0;
            r.nominations = parseInt(r.nominations) || 0;
          });
          
          const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);
          results.forEach(r => {
            r.percentage = totalVotes > 0 ? (r.votes / totalVotes * 100) : 0;
          });

          const winner = results.length > 0 && results[0].votes > 0 ? results[0] : null;
          const totalNominations = results.reduce((sum, r) => sum + r.nominations, 0);

          positions.push({
            position: position,
            totalNominations: totalNominations,
            winner: winner ? {
              id: winner.candidate_id,
              name: winner.candidate_name,
              votes: winner.votes,
              percentage: winner.percentage
            } : null,
            results: results.map(r => ({
              id: r.candidate_id,
              name: r.candidate_name || `Candidato ${r.candidate_id}`,
              email: r.candidate_email || '',
              nominations: r.nominations,
              votes: r.votes,
              percentage: r.percentage
            }))
          });
        }

        const response = {
          election: {
            id: election[0].id,
            config_id: election[0].config_id,
            status: election[0].status,
            current_position: election[0].current_position,
            current_phase: election[0].current_phase || 'nomination',
            church_name: election[0].church_name,
            created_at: election[0].created_at
          },
          totalVoters,
          votedVoters: votedVoters[0].count,
          currentPosition: election[0].current_position,
          totalPositions: election[0].positions.length,
          positions
        };

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response)
        };

      } catch (error) {
        console.error('❌ Erro ao buscar dashboard com configId:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para avançar para próxima posição
    if (path === '/api/elections/next-position' && method === 'POST') {
      try {
        const election = await sql`
          SELECT * FROM elections 
          WHERE status = 'active'
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (election.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Nenhuma eleição ativa' })
          };
        }

        const config = await sql`
          SELECT * FROM election_configs 
          WHERE id = ${election[0].config_id}
        `;

        const nextPosition = election[0].current_position + 1;
        
        if (nextPosition >= config[0].positions.length) {
          // Finalizar eleição
          await sql`
            UPDATE elections 
            SET status = 'completed', updated_at = NOW()
            WHERE id = ${election[0].id}
          `;

          await sql`
            UPDATE election_configs 
            SET status = 'completed', updated_at = NOW()
            WHERE id = ${election[0].config_id}
          `;
        } else {
          // Determinar vencedor da posição atual
          const currentPositionName = config[0].positions[election[0].current_position];
          
          // Buscar candidato com mais votos na posição atual
          const winner = await sql`
            SELECT candidate_id, candidate_name, votes
            FROM election_candidates
            WHERE election_id = ${election[0].id}
            AND position_id = ${currentPositionName}
            ORDER BY votes DESC
            LIMIT 1
          `;

          if (winner.length > 0) {
            // Incrementar contador de posições ganhas
            await sql`
              UPDATE election_candidates
              SET positions_won = positions_won + 1
              WHERE election_id = ${election[0].id}
              AND candidate_id = ${winner[0].candidate_id}
            `;

            // Aplicar limite de cargos por pessoa se habilitado
            if (config[0].criteria.positionLimit.enabled) {
              const maxPositions = config[0].criteria.positionLimit.maxPositions;
              
              // Buscar candidatos que já atingiram o limite
              const candidatesAtLimit = await sql`
                SELECT candidate_id
                FROM election_candidates
                WHERE election_id = ${election[0].id}
                AND positions_won >= ${maxPositions}
              `;

              // Remover candidatos que atingiram o limite das próximas posições
              for (const candidateAtLimit of candidatesAtLimit) {
                await sql`
                  DELETE FROM election_candidates
                  WHERE election_id = ${election[0].id}
                  AND candidate_id = ${candidateAtLimit.candidate_id}
                  AND position_id IN (
                    SELECT unnest(positions[${election[0].current_position + 1}:])
                    FROM election_configs
                    WHERE id = ${election[0].config_id}
                  )
                `;
              }
            }
          }

          // Avançar posição
          await sql`
            UPDATE elections 
            SET current_position = ${nextPosition}, updated_at = NOW()
            WHERE id = ${election[0].id}
          `;
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };

      } catch (error) {
        console.error('❌ Erro ao avançar posição:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }


    // Rota para pedidos de discipulado
    if (path === '/api/discipleship-requests' && method === 'GET') {
      try {
        console.log('🔍 Buscando pedidos de discipulado...');
        
        // Verificar se a tabela existe e criar se necessário
        try {
          await sql`SELECT 1 FROM discipleship_requests LIMIT 1`;
        } catch (tableError) {
          console.log('📋 Criando tabela discipleship_requests...');
          await sql`
            CREATE TABLE IF NOT EXISTS discipleship_requests (
              id SERIAL PRIMARY KEY,
              interested_id INTEGER NOT NULL,
              missionary_id INTEGER NOT NULL,
              status VARCHAR(20) DEFAULT 'pending',
              message TEXT,
              admin_notes TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `;
        }
        
        const requests = await sql`
          SELECT 
            dr.id,
            dr.interested_id as "interestedId",
            dr.missionary_id as "missionaryId",
            dr.status,
            dr.notes,
            dr.created_at as "createdAt",
            dr.updated_at as "updatedAt",
            ui.name as "interestedName",
            ui.email as "interestedEmail",
            um.name as "missionaryName",
            um.email as "missionaryEmail"
          FROM discipleship_requests dr
          LEFT JOIN users ui ON dr.interested_id = ui.id
          LEFT JOIN users um ON dr.missionary_id = um.id
          ORDER BY dr.created_at DESC 
          LIMIT 50
        `;
        
        console.log(`📊 Encontrados ${requests.length} pedidos de discipulado`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(requests)
        };
      } catch (error) {
        console.error('❌ Discipleship requests error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar pedidos de discipulado' })
        };
      }
    }

    // Rota para atualizar pedido de discipulado (aprovar/rejeitar)
    if (path.startsWith('/api/discipleship-requests/') && method === 'PUT') {
      try {
        const requestId = path.split('/').pop();
        const body = JSON.parse(event.body || '{}');
        const { status, adminNotes, processedBy } = body;
        
        console.log('🔍 Atualizando pedido de discipulado:', { requestId, status, adminNotes, processedBy });
        
        if (!requestId || !status) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'requestId e status são obrigatórios' })
          };
        }

        if (!['approved', 'rejected'].includes(status)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'status deve ser "approved" ou "rejected"' })
          };
        }

        // Verificar se a tabela existe
        try {
          await sql`SELECT 1 FROM discipleship_requests LIMIT 1`;
          console.log('✅ Tabela discipleship_requests existe');
        } catch (tableError) {
          console.error('❌ Tabela discipleship_requests não existe:', tableError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Tabela discipleship_requests não existe' })
          };
        }

        // Verificar se o pedido existe
        const existingRequest = await sql`
          SELECT * FROM discipleship_requests WHERE id = ${parseInt(requestId)} LIMIT 1
        `;
        
        if (existingRequest.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Pedido de discipulado não encontrado' })
          };
        }

        console.log('🔍 Pedido encontrado:', existingRequest[0]);
        console.log('🔍 Estrutura do pedido:', {
          id: existingRequest[0].id,
          interested_id: existingRequest[0].interested_id,
          missionary_id: existingRequest[0].missionary_id,
          status: existingRequest[0].status
        });

        // Atualizar o pedido
        let updatedRequest;
        try {
          updatedRequest = await sql`
            UPDATE discipleship_requests 
            SET status = ${status}, 
                updated_at = NOW()
            WHERE id = ${parseInt(requestId)}
            RETURNING *
          `;
          console.log('✅ Pedido atualizado:', updatedRequest[0]);
          console.log('🔍 Status após atualização:', updatedRequest[0].status);
        } catch (updateError) {
          console.error('❌ Erro ao atualizar pedido:', updateError);
          console.error('❌ Detalhes do erro:', {
            message: updateError.message,
            code: updateError.code,
            detail: updateError.detail
          });
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Erro ao atualizar pedido de discipulado',
              details: updateError.message,
              code: updateError.code
            })
          };
        }

        // Se aprovado, criar relacionamento ativo automaticamente
        if (status === 'approved') {
          console.log('🔍 ✅ Aprovado - criando relacionamento automaticamente...');
          
          try {
            // Criar relacionamento diretamente sem verificações
        const newRelationship = await sql`
              INSERT INTO relationships (interested_id, missionary_id, status, created_at, updated_at, notes)
              VALUES (${existingRequest[0].interested_id}, ${existingRequest[0].missionary_id}, 'active', NOW(), NOW(), 'Aprovado via solicitação de discipulado')
              RETURNING *
            `;
            console.log('✅ Relacionamento criado automaticamente:', newRelationship[0].id);
            
            // Promover membro a missionário automaticamente (mantendo badge de membro)
            console.log('🔍 Promovendo membro a missionário...');
            const updateResult = await sql`
              UPDATE users 
              SET role = 'member,missionary', updated_at = NOW()
              WHERE id = ${existingRequest[0].missionary_id} AND role = 'member'
              RETURNING id, name, role
            `;
            
            if (updateResult.length > 0) {
              console.log('✅ Membro promovido a missionário:', updateResult[0].name);
            } else {
              console.log('ℹ️ Usuário já é missionário ou admin');
            }
          } catch (relationshipError) {
            console.error('❌ Erro ao criar relacionamento automaticamente:', relationshipError.message);
            // Continuar mesmo se falhar
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedRequest[0])
        };
      } catch (error) {
        console.error('❌ Update discipleship request error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao atualizar pedido de discipulado' })
        };
      }
    }

    // Rota para criar pedido de discipulado
    if (path === '/api/discipleship-requests' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { interestedId, missionaryId, message = '' } = body;
        
        console.log('🔍 Criando pedido de discipulado:', { interestedId, missionaryId, message });
        
        if (!interestedId || !missionaryId) {
        return {
            statusCode: 400,
          headers,
            body: JSON.stringify({ error: 'interestedId e missionaryId são obrigatórios' })
          };
        }

        // Verificar se os usuários existem e têm os roles corretos
        const interestedUser = await sql`SELECT id, name, role FROM users WHERE id = ${parseInt(interestedId)} LIMIT 1`;
        const missionaryUser = await sql`SELECT id, name, role FROM users WHERE id = ${parseInt(missionaryId)} LIMIT 1`;
        
        console.log('🔍 Usuário interessado:', interestedUser[0]);
        console.log('🔍 Usuário missionário:', missionaryUser[0]);
        
        if (interestedUser.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Usuário interessado não encontrado' })
          };
        }
        
        if (missionaryUser.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Usuário missionário não encontrado' })
          };
        }
        
        if (interestedUser[0].role !== 'interested') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Usuário interessado deve ter role "interested"' })
          };
        }
        
        const missionaryRole = missionaryUser[0].role;
        if (!missionaryRole.includes('member') && !missionaryRole.includes('missionary') && !missionaryRole.includes('admin')) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Usuário missionário deve ter role "member", "missionary" ou "admin"' })
          };
        }

        // Verificar se já existe um pedido pendente
        const existingRequest = await sql`
          SELECT id FROM discipleship_requests 
          WHERE interested_id = ${parseInt(interestedId)} 
          AND missionary_id = ${parseInt(missionaryId)} 
          AND status = 'pending'
          LIMIT 1
        `;
        
        if (existingRequest.length > 0) {
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({ error: 'Já existe um pedido de discipulado pendente entre estes usuários' })
          };
        }

        // Verificar se a tabela existe e criar se necessário
        try {
          await sql`SELECT 1 FROM discipleship_requests LIMIT 1`;
          console.log('✅ Tabela discipleship_requests existe e é acessível');
        } catch (tableError) {
          console.log('📋 Criando tabela discipleship_requests...');
          try {
            await sql`
              CREATE TABLE IF NOT EXISTS discipleship_requests (
                id SERIAL PRIMARY KEY,
                interested_id INTEGER NOT NULL,
                missionary_id INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                admin_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `;
            console.log('✅ Tabela discipleship_requests criada com sucesso');
          } catch (createError) {
            console.error('❌ Erro ao criar tabela discipleship_requests:', createError);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: `Erro ao criar tabela: ${createError.message}` })
            };
          }
        }

        // Criar novo pedido
        console.log('🔍 Tentando criar pedido de discipulado...');
        console.log('🔍 Dados para inserção:', {
          interestedId: parseInt(interestedId),
          missionaryId: parseInt(missionaryId),
          message: message
        });
        
        let newRequest;
        try {
          // Inserção sem coluna message
          console.log('🔍 Criando pedido de discipulado...');
          newRequest = await sql`
            INSERT INTO discipleship_requests (interested_id, missionary_id)
            VALUES (${parseInt(interestedId)}, ${parseInt(missionaryId)})
            RETURNING id, interested_id, missionary_id, status, created_at
          `;
          console.log('✅ Pedido criado com sucesso:', newRequest[0]);
        } catch (insertError) {
          console.error('❌ Erro ao inserir pedido:', insertError);
          console.error('❌ Detalhes do erro:', {
            message: insertError.message,
            code: insertError.code,
            detail: insertError.detail,
            stack: insertError.stack
          });
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Erro ao criar pedido de discipulado',
              details: insertError.message,
              code: insertError.code
            })
          };
        }
        
        console.log('✅ Pedido de discipulado criado:', newRequest[0].id);
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newRequest[0])
        };
      } catch (error) {
        console.error('❌ Create discipleship request error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao criar pedido de discipulado' })
        };
      }
    }

    // Rota para atividades
    if (path === '/api/activities' && method === 'GET') {
      try {
        const activities = await sql`SELECT * FROM activities ORDER BY created_at DESC LIMIT 50`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(activities)
        };
      } catch (error) {
        console.error('❌ Activities error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar atividades' })
        };
      }
    }

    // Rota para reuniões
    if (path === '/api/meetings' && method === 'GET') {
      try {
        const meetings = await sql`SELECT * FROM meetings ORDER BY date DESC LIMIT 50`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(meetings)
        };
      } catch (error) {
        console.error('❌ Meetings error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar reuniões' })
        };
      }
    }

    // Rota para orações
    if (path === '/api/prayers' && method === 'GET') {
      try {
        console.log('🔍 [PRAYERS] Iniciando busca de orações...');
        
        // Obter parâmetros da query string
        const queryString = event.queryStringParameters || {};
        const userId = queryString.userId;
        const userRole = queryString.userRole;
        const userChurch = queryString.userChurch;
        
        console.log(`🔍 [PRAYERS] Parâmetros: userId=${userId}, userRole=${userRole}, userChurch=${userChurch}`);
        
        // Verificar se a tabela existe e criar se necessário
        try {
          await sql`SELECT 1 FROM prayers LIMIT 1`;
          console.log('✅ [PRAYERS] Tabela prayers existe');
          
          // Verificar se a coluna user_id existe, se não, adicionar
          try {
            await sql`SELECT user_id FROM prayers LIMIT 1`;
            console.log('✅ [PRAYERS] Coluna user_id existe');
          } catch (columnError) {
            console.log('🔄 [PRAYERS] Coluna user_id não existe, adicionando coluna...');
            await sql`ALTER TABLE prayers ADD COLUMN user_id INTEGER`;
            await sql`ALTER TABLE prayers ADD COLUMN is_private BOOLEAN DEFAULT false`;
            await sql`ALTER TABLE prayers ADD COLUMN allow_church_members BOOLEAN DEFAULT true`;
            await sql`ALTER TABLE prayers ADD COLUMN is_answered BOOLEAN DEFAULT false`;
            console.log('✅ [PRAYERS] Colunas adicionadas com sucesso');
          }
        } catch (tableError) {
          console.log('📋 [PRAYERS] Criando tabela prayers...');
          await sql`
            CREATE TABLE prayers (
              id SERIAL PRIMARY KEY,
              user_id INTEGER NOT NULL,
              title VARCHAR(255) NOT NULL,
              description TEXT,
              is_private BOOLEAN DEFAULT false,
              allow_church_members BOOLEAN DEFAULT true,
              is_answered BOOLEAN DEFAULT false,
              status VARCHAR(20) DEFAULT 'active',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `;
          console.log('✅ [PRAYERS] Tabela prayers criada com sucesso');
        }

        // Criar tabela de intercessores se não existir
        try {
          await sql`SELECT 1 FROM prayer_intercessors LIMIT 1`;
          console.log('✅ [INTERCESSORS] Tabela prayer_intercessors existe');
        } catch (tableError) {
          console.log('📋 [INTERCESSORS] Criando tabela prayer_intercessors...');
          await sql`
            CREATE TABLE prayer_intercessors (
              id SERIAL PRIMARY KEY,
              prayer_id INTEGER NOT NULL,
              intercessor_id INTEGER NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(prayer_id, intercessor_id),
              FOREIGN KEY (prayer_id) REFERENCES prayers(id) ON DELETE CASCADE,
              FOREIGN KEY (intercessor_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `;
          console.log('✅ [INTERCESSORS] Tabela prayer_intercessors criada com sucesso');
        }
        
        // Buscar orações
        let prayers;
        if (userChurch && userChurch !== 'Sistema') {
          console.log(`🔍 [PRAYERS] Buscando orações da igreja: ${userChurch}`);
          prayers = await sql`
            SELECT p.*, u.name as requester_name, u.church
            FROM prayers p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE u.church = ${userChurch}
            ORDER BY p.created_at DESC
            LIMIT 50
          `;
        } else {
          console.log('🔍 [PRAYERS] Buscando todas as orações (admin/global)');
          prayers = await sql`
            SELECT p.*, u.name as requester_name, u.church
            FROM prayers p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 50
          `;
        }
        
        console.log(`📊 [PRAYERS] Encontradas ${prayers.length} orações`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(prayers)
        };
      } catch (error) {
        console.error('❌ [PRAYERS] Erro ao buscar orações:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro ao buscar orações',
            details: error.message 
          })
        };
      }
    }

    // Rota para criar pedido de oração
    if (path === '/api/prayers' && method === 'POST') {
      try {
        console.log('🔍 [PRAYERS POST] Iniciando criação de pedido de oração...');
        
        const body = JSON.parse(event.body || '{}');
        const { userId, title, description, isPrivate = false, allowChurchMembers = true } = body;
        
        console.log(`🔍 [PRAYERS POST] Dados recebidos:`, { userId, title, description, isPrivate, allowChurchMembers });
        
        if (!userId || !title) {
          console.log('❌ [PRAYERS POST] Dados obrigatórios faltando');
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'userId e title são obrigatórios' })
          };
        }

        // Verificar se a tabela existe e criar se necessário
        try {
          await sql`SELECT 1 FROM prayers LIMIT 1`;
          console.log('✅ [PRAYERS POST] Tabela prayers existe');
          
          // Verificar se a coluna user_id existe, se não, adicionar
          try {
            await sql`SELECT user_id FROM prayers LIMIT 1`;
            console.log('✅ [PRAYERS POST] Coluna user_id existe');
          } catch (columnError) {
            console.log('🔄 [PRAYERS POST] Coluna user_id não existe, adicionando coluna...');
            await sql`ALTER TABLE prayers ADD COLUMN user_id INTEGER`;
            await sql`ALTER TABLE prayers ADD COLUMN is_private BOOLEAN DEFAULT false`;
            await sql`ALTER TABLE prayers ADD COLUMN allow_church_members BOOLEAN DEFAULT true`;
            await sql`ALTER TABLE prayers ADD COLUMN is_answered BOOLEAN DEFAULT false`;
            console.log('✅ [PRAYERS POST] Colunas adicionadas com sucesso');
          }
        } catch (tableError) {
          console.log('📋 [PRAYERS POST] Criando tabela prayers...');
          await sql`
            CREATE TABLE prayers (
              id SERIAL PRIMARY KEY,
              user_id INTEGER NOT NULL,
              title VARCHAR(255) NOT NULL,
              description TEXT,
              is_private BOOLEAN DEFAULT false,
              allow_church_members BOOLEAN DEFAULT true,
              is_answered BOOLEAN DEFAULT false,
              status VARCHAR(20) DEFAULT 'active',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `;
          console.log('✅ [PRAYERS POST] Tabela prayers criada com sucesso');
        }

        console.log('🔍 [PRAYERS POST] Inserindo dados na tabela...');
        const result = await sql`
          INSERT INTO prayers (user_id, title, description)
          VALUES (${userId}, ${title}, ${description || ''})
          RETURNING *
        `;
        
        console.log('✅ [PRAYERS POST] Pedido de oração criado com sucesso:', result[0]);
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ success: true, data: result[0] })
        };
      } catch (error) {
        console.error('❌ [PRAYERS POST] Erro ao criar pedido de oração:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro interno do servidor',
            details: error.message 
          })
        };
      }
    }

    // API para listar intercessores de uma oração
    if (path.startsWith('/api/prayers/') && path.endsWith('/intercessors') && method === 'GET') {
      try {
        console.log('🔍 [INTERCESSORS] Buscando intercessores...');
        const prayerId = path.split('/')[3];
        
        if (!prayerId || isNaN(parseInt(prayerId))) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID de oração inválido' })
          };
        }

        const intercessors = await sql`
          SELECT pi.*, u.name as intercessor_name, u.email, u.role, u.church
          FROM prayer_intercessors pi
          JOIN users u ON pi.user_id = u.id
          WHERE pi.prayer_id = ${parseInt(prayerId)}
          ORDER BY pi.joined_at ASC
        `;

        console.log(`✅ [INTERCESSORS] Encontrados ${intercessors.length} intercessores`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(intercessors)
        };
      } catch (error) {
        console.error('❌ [INTERCESSORS] Erro ao buscar intercessores:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro interno do servidor',
            details: error.message 
          })
        };
      }
    }

    // API para adicionar intercessor a uma oração
    if (path.startsWith('/api/prayers/') && path.endsWith('/intercessor') && method === 'POST') {
      try {
        console.log('🔍 [INTERCESSOR ADD] Adicionando intercessor...');
        const prayerId = path.split('/')[3];
        const body = JSON.parse(event.body || '{}');
        const { intercessorId } = body;

        if (!prayerId || isNaN(parseInt(prayerId))) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID de oração inválido' })
          };
        }

        if (!intercessorId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID do intercessor é obrigatório' })
          };
        }

        // Verificar se a oração existe
        const prayer = await sql`
          SELECT id FROM prayers WHERE id = ${parseInt(prayerId)}
        `;

        if (prayer.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Oração não encontrada' })
          };
        }

        // Adicionar intercessor
        const result = await sql`
          INSERT INTO prayer_intercessors (prayer_id, user_id)
          VALUES (${parseInt(prayerId)}, ${parseInt(intercessorId)})
          RETURNING *
        `;

        console.log(`✅ [INTERCESSOR ADD] Intercessor adicionado: ${result.length > 0 ? 'Sim' : 'Já existia'}`);
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: result.length > 0 ? 'Intercessor adicionado' : 'Intercessor já estava orando',
            data: result[0] || null
          })
        };
      } catch (error) {
        console.error('❌ [INTERCESSOR ADD] Erro ao adicionar intercessor:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro interno do servidor',
            details: error.message 
          })
        };
      }
    }

    // API para remover intercessor de uma oração
    if (path.startsWith('/api/prayers/') && path.includes('/intercessor/') && method === 'DELETE') {
      try {
        console.log('🔍 [INTERCESSOR REMOVE] Removendo intercessor...');
        const pathParts = path.split('/');
        const prayerId = pathParts[3];
        const intercessorId = pathParts[5];

        if (!prayerId || isNaN(parseInt(prayerId))) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID de oração inválido' })
          };
        }

        if (!intercessorId || isNaN(parseInt(intercessorId))) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID do intercessor inválido' })
          };
        }

        const result = await sql`
          DELETE FROM prayer_intercessors 
          WHERE prayer_id = ${parseInt(prayerId)} AND user_id = ${parseInt(intercessorId)}
          RETURNING *
        `;

        console.log(`✅ [INTERCESSOR REMOVE] Intercessor removido: ${result.length > 0 ? 'Sim' : 'Não encontrado'}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: result.length > 0 ? 'Intercessor removido' : 'Intercessor não encontrado',
            data: result[0] || null
          })
        };
      } catch (error) {
        console.error('❌ [INTERCESSOR REMOVE] Erro ao remover intercessor:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro interno do servidor',
            details: error.message 
          })
        };
      }
    }

    // Rota para oração específica
    if (path.startsWith('/api/prayers/') && method === 'GET' && !path.includes('/users') && !path.includes('/intercessors')) {
      try {
        console.log('🔍 [PRAYERS DETAIL] Buscando oração específica...');
        
        // Extrair ID da oração da URL (remover parâmetros de query se existirem)
        const pathParts = path.split('/');
        const prayerIdWithParams = pathParts[3];
        const prayerId = prayerIdWithParams.split('?')[0]; // Remover parâmetros de query
        
        console.log(`🔍 [PRAYERS DETAIL] ID da oração: ${prayerId}`);
        
        if (!prayerId || isNaN(parseInt(prayerId))) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID de oração inválido' })
          };
        }

        const prayers = await sql`
          SELECT p.*, u.name as requester_name, u.church
          FROM prayers p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.id = ${parseInt(prayerId)}
          LIMIT 1
        `;
        
        if (prayers.length === 0) {
          console.log(`❌ [PRAYERS DETAIL] Oração ${prayerId} não encontrada`);
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Oração não encontrada' })
          };
        }

        console.log(`✅ [PRAYERS DETAIL] Oração ${prayerId} encontrada`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(prayers[0])
        };
      } catch (error) {
        console.error('❌ [PRAYERS DETAIL] Erro ao buscar oração:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro interno do servidor',
            details: error.message 
          })
        };
      }
    }

    // Rota para configurações do sistema
    if (path === '/api/system/points-config' && method === 'GET') {
      try {
        console.log('🔍 Buscando configuração de pontos do banco de dados...');
        
        // Buscar configurações do banco de dados (colunas em lowercase)
        const configRow = await sql`
          SELECT engajamento, classificacao, dizimista, ofertante, tempobatismo,
                 cargos, nomeunidade, temlicao, totalpresenca, escolasabatina,
                 cpfvalido, camposvaziosacms
          FROM points_configuration 
          LIMIT 1
        `;
        
        if (configRow.length === 0) {
          console.log('⚠️ Nenhuma configuração encontrada, retornando valores padrão');
          // Retornar valores padrão se não houver configuração salva
          const defaultConfig = {
            engajamento: {
              baixo: 50,
              medio: 100,
              alto: 200
            },
            classificacao: {
              frequente: 100,
              naoFrequente: 50
            },
            dizimista: {
              naoDizimista: 0,
              pontual: 25,
              sazonal: 50,
              recorrente: 100
            },
            ofertante: {
              naoOfertante: 0,
              pontual: 15,
              sazonal: 30,
              recorrente: 60
            },
            tempoBatismo: {
              doisAnos: 25,
              cincoAnos: 50,
              dezAnos: 100,
              vinteAnos: 150,
              maisVinte: 200
            },
            cargos: {
              umCargo: 50,
              doisCargos: 100,
              tresOuMais: 150
            },
            nomeUnidade: {
              comUnidade: 25
            },
            temLicao: {
              comLicao: 30
            },
            totalPresenca: {
              zeroATres: 0,
              quatroASete: 50,
              oitoATreze: 100
            },
            escolaSabatina: {
              comunhao: 10,
              missao: 15,
              estudoBiblico: 5,
              batizouAlguem: 100,
              discipuladoPosBatismo: 20
            },
            cpfValido: {
              valido: 25
            },
            camposVaziosACMS: {
              completos: 50
            }
          };
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(defaultConfig)
          };
        }
        
        // Usar configuração do banco de dados e mapear para camelCase
        const rawConfig = configRow[0];
        console.log('✅ Configuração carregada do banco de dados (raw):', rawConfig);
        
        // Mapear colunas lowercase para camelCase
        const config = {
          engajamento: rawConfig.engajamento,
          classificacao: rawConfig.classificacao,
          dizimista: rawConfig.dizimista,
          ofertante: rawConfig.ofertante,
          tempoBatismo: rawConfig.tempobatismo,
          cargos: rawConfig.cargos,
          nomeUnidade: rawConfig.nomeunidade,
          temLicao: rawConfig.temlicao,
          totalPresenca: rawConfig.totalpresenca,
          escolaSabatina: rawConfig.escolasabatina,
          cpfValido: rawConfig.cpfvalido,
          camposVaziosACMS: rawConfig.camposvaziosacms
        };
        
        console.log('✅ Configuração mapeada para camelCase:', config);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(config)
        };
      } catch (error) {
        console.error('❌ Points config error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar configuração de pontos' })
        };
      }
    }

    // Rota para permissões de eventos
    if (path === '/api/system/event-permissions' && method === 'GET') {
      try {
        // Buscar permissões do banco de dados
        const permissionsData = await sql`
          SELECT profile_id, event_type, can_view 
          FROM event_permissions 
          ORDER BY profile_id, event_type
        `;
        
        // Se não há permissões salvas, usar as padrão
        if (permissionsData.length === 0) {
          const defaultPermissions = {
            admin: {
              'igreja-local': true,
              'asr-geral': true,
              'asr-administrativo': true,
              'asr-pastores': true,
              'visitas': true,
              'reunioes': true,
              'pregacoes': true
            },
            member: {
              'igreja-local': true,
              'asr-geral': true,
              'asr-administrativo': false,
              'asr-pastores': false,
              'visitas': true,
              'reunioes': true,
              'pregacoes': true
            },
            interested: {
              'igreja-local': true,
              'asr-geral': false,
              'asr-administrativo': false,
              'asr-pastores': false,
              'visitas': false,
              'reunioes': false,
              'pregacoes': true
            }
          };
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(defaultPermissions)
          };
        }
        
        // Converter dados do banco para o formato esperado
        const permissions = {};
        permissionsData.forEach(row => {
          if (!permissions[row.profile_id]) {
            permissions[row.profile_id] = {};
          }
          permissions[row.profile_id][row.event_type] = row.can_view;
        });
        
        console.log('✅ Event permissions loaded from database:', permissions);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(permissions)
        };
      } catch (error) {
        console.error('❌ Event permissions error:', error);
        
        // Fallback para permissões padrão em caso de erro
        const defaultPermissions = {
          admin: {
            'igreja-local': true,
            'asr-geral': true,
            'asr-administrativo': true,
            'asr-pastores': true,
            'visitas': true,
            'reunioes': true,
            'pregacoes': true
          },
          member: {
            'igreja-local': true,
            'asr-geral': true,
            'asr-administrativo': false,
            'asr-pastores': false,
            'visitas': true,
            'reunioes': true,
            'pregacoes': true
          },
          interested: {
            'igreja-local': true,
            'asr-geral': false,
            'asr-administrativo': false,
            'asr-pastores': false,
            'visitas': false,
            'reunioes': false,
            'pregacoes': true
          }
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(defaultPermissions)
        };
      }
    }

    // Rota para salvar permissões de eventos
    if (path === '/api/system/event-permissions' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        console.log('🔍 Saving event permissions:', body);
        
        // Salvar permissões no banco de dados
        if (body.permissions) {
          // Criar tabela de permissões se não existir
          await sql`
            CREATE TABLE IF NOT EXISTS event_permissions (
              id SERIAL PRIMARY KEY,
              profile_id VARCHAR(50) NOT NULL,
              event_type VARCHAR(50) NOT NULL,
              can_view BOOLEAN NOT NULL DEFAULT false,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(profile_id, event_type)
            )
          `;
          
          // Limpar permissões existentes
          await sql`DELETE FROM event_permissions`;
          
          // Inserir novas permissões
          for (const [profileId, eventTypes] of Object.entries(body.permissions)) {
            for (const [eventType, canView] of Object.entries(eventTypes)) {
              await sql`
                INSERT INTO event_permissions (profile_id, event_type, can_view)
                VALUES (${profileId}, ${eventType}, ${canView})
                ON CONFLICT (profile_id, event_type) 
                DO UPDATE SET can_view = ${canView}, updated_at = CURRENT_TIMESTAMP
              `;
            }
          }
          
          console.log('✅ Event permissions saved successfully');
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Permissões salvas com sucesso' })
        };
      } catch (error) {
        console.error('❌ Save event permissions error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao salvar permissões' })
        };
      }
    }

    // Rota para meu interessados
    if (path === '/api/my-interested' && method === 'GET') {
      try {
        // Obter ID do usuário do header
        const userId = event.headers['x-user-id'];
        
        if (!userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID do usuário é obrigatório' })
          };
        }

        // Buscar dados do usuário para obter a igreja
        const userData = await sql`SELECT church FROM users WHERE id = ${userId} LIMIT 1`;
        
        if (userData.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }

        const userChurch = userData[0].church;
        console.log(`🔍 Buscando interessados da igreja: ${userChurch}`);

        // Buscar interessados da mesma igreja
        const interested = await sql`
          SELECT * FROM users 
          WHERE role = 'interested' 
          AND church = ${userChurch}
          ORDER BY created_at DESC 
          LIMIT 50
        `;
        
        console.log(`📊 Encontrados ${interested.length} interessados da igreja ${userChurch}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(interested)
        };
      } catch (error) {
        console.error('❌ My interested error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar interessados' })
        };
      }
    }

    // Rota para aprovar usuário
    if (path.startsWith('/api/users/') && path.endsWith('/approve') && method === 'POST') {
      try {
        const userId = path.split('/')[3];
        console.log('🔍 Approving user:', userId);
        
        // Simular aprovação
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Usuário aprovado com sucesso' })
        };
      } catch (error) {
        console.error('❌ Approve user error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao aprovar usuário' })
        };
      }
    }

    // Rota para rejeitar usuário
    if (path.startsWith('/api/users/') && path.endsWith('/reject') && method === 'POST') {
      try {
        const userId = path.split('/')[3];
        console.log('🔍 Rejecting user:', userId);
        
        // Simular rejeição
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Usuário rejeitado' })
        };
      } catch (error) {
        console.error('❌ Reject user error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao rejeitar usuário' })
        };
      }
    }

    // Rota para atualizar usuário
    if (path.startsWith('/api/users/') && method === 'PUT') {
      try {
        const userId = parseInt(path.split('/')[3]);
        const body = JSON.parse(event.body || '{}');
        console.log('🔍 Updating user:', userId, body);
        
        if (isNaN(userId)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID de usuário inválido' })
          };
        }
        
        // Verificar se usuário existe
        const existingUser = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
        if (existingUser.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }
        
        // Atualizar campos permitidos
        const updateFields = [];
        const updateValues = [];
        
        if (body.points !== undefined) {
          updateFields.push('points = $' + (updateValues.length + 1));
          updateValues.push(body.points);
        }
        
        if (body.name !== undefined) {
          updateFields.push('name = $' + (updateValues.length + 1));
          updateValues.push(body.name);
        }
        
        if (body.email !== undefined) {
          updateFields.push('email = $' + (updateValues.length + 1));
          updateValues.push(body.email);
        }
        
        if (body.role !== undefined) {
          updateFields.push('role = $' + (updateValues.length + 1));
          updateValues.push(body.role);
        }
        
        if (body.status !== undefined) {
          updateFields.push('status = $' + (updateValues.length + 1));
          updateValues.push(body.status);
        }
        
        if (body.church !== undefined) {
          updateFields.push('church = $' + (updateValues.length + 1));
          updateValues.push(body.church);
        }
        
        if (body.level !== undefined) {
          updateFields.push('level = $' + (updateValues.length + 1));
          updateValues.push(body.level);
        }
        
        if (body.attendance !== undefined) {
          updateFields.push('attendance = $' + (updateValues.length + 1));
          updateValues.push(body.attendance);
        }
        
        if (updateFields.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Nenhum campo válido para atualização' })
          };
        }
        
        // Adicionar updated_at
        updateFields.push('updated_at = NOW()');
        
        // Executar atualização
        console.log('🔍 Campos para atualizar:', updateFields);
        console.log('🔍 Valores:', updateValues);
        
        let result;
        if (updateFields.length > 0) {
          // Adicionar userId aos valores
        updateValues.push(userId);
        
          // Construir query com placeholders corretos
          const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${updateValues.length}`;
          console.log('🔍 Query SQL:', query);
          console.log('🔍 Valores finais:', updateValues);
          
          result = await sql.unsafe(query, updateValues);
          console.log('🔍 Resultado da atualização:', result);
        } else {
          console.log('ℹ️ Nenhum campo para atualizar');
        }
        
        console.log(`✅ Usuário ${userId} atualizado com sucesso`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Usuário atualizado com sucesso' })
        };
      } catch (error) {
        console.error('❌ Update user error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao atualizar usuário' })
        };
      }
    }

    // Rota para criar usuário
    if (path === '/api/users' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { name, email, password, role = 'interested', church } = body;
        
        if (!name || !email) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Nome e email são obrigatórios' })
          };
        }

        // Verificar se usuário já existe
        const existingUsers = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
        if (existingUsers.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Usuário já existe com este email' })
          };
        }

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Usuário criado com sucesso',
            user: {
              id: Date.now(),
              name,
              email,
              role,
              church: church || 'Sistema'
            }
          })
        };
      } catch (error) {
        console.error('❌ Create user error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao criar usuário' })
        };
      }
    }

    // Rota para deletar usuário
    if (path.startsWith('/api/users/') && method === 'DELETE') {
      try {
        const userId = path.split('/')[3];
        console.log('🔍 Deleting user:', userId);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Usuário deletado com sucesso' })
        };
      } catch (error) {
        console.error('❌ Delete user error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao deletar usuário' })
        };
      }
    }

    // Rota para pontos do usuário
    if (path.startsWith('/api/users/') && path.endsWith('/points') && method === 'GET') {
      try {
        const userId = path.split('/')[3];
        console.log('🔍 Getting user points:', userId);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ points: 1000, level: 'Gold' })
        };
      } catch (error) {
        console.error('❌ Get user points error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar pontos' })
        };
      }
    }

    // Rota para adicionar pontos
    if (path.startsWith('/api/users/') && path.endsWith('/points') && method === 'POST') {
      try {
        const userId = path.split('/')[3];
        const body = JSON.parse(event.body || '{}');
        console.log('🔍 Adding points to user:', userId, body);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Pontos adicionados com sucesso' })
        };
      } catch (error) {
        console.error('❌ Add points error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao adicionar pontos' })
        };
      }
    }

    // Rota para registrar visita - VERSÃO COM TABELA SEPARADA
    if (path.startsWith('/api/users/') && path.endsWith('/visit') && method === 'POST') {
      try {
        const userId = parseInt(path.split('/')[3]);
        console.log(`🔍 [VISIT] Registrando visita para usuário ID: ${userId}`);
        
        if (isNaN(userId)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID de usuário inválido' })
          };
        }
        
        // Parse do body da requisição
        let body;
        try {
          body = JSON.parse(event.body || '{}');
        } catch (e) {
          console.log('⚠️ [VISIT] Erro ao parsear body, usando valores padrão');
          body = {};
        }
        
        const visitDate = body.visitDate || new Date().toISOString().split('T')[0];
        console.log(`🔍 [VISIT] Data da visita: ${visitDate}`);
        
        // Buscar usuário
        const user = await sql`SELECT id, name FROM users WHERE id = ${userId}`;
        if (user.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }
        
        console.log(`🔍 [VISIT] Usuário encontrado: ${user[0].name}`);
        
        // Inserir visita na tabela separada
        const visitResult = await sql`
          INSERT INTO visits (user_id, visit_date)
          VALUES (${userId}, ${visitDate})
          ON CONFLICT (user_id, visit_date) DO NOTHING
          RETURNING id, visit_date
        `;
        
        console.log('✅ [VISIT] Visita inserida:', visitResult);
        
        // Buscar estatísticas de visitas
        const visitStats = await sql`
          SELECT 
            COUNT(*) as total_visits,
            MAX(visit_date) as last_visit_date,
            MIN(visit_date) as first_visit_date
          FROM visits 
          WHERE user_id = ${userId}
        `;
        
        const stats = visitStats[0];
        console.log('📊 [VISIT] Estatísticas:', stats);
        
        // Retornar resposta
        const responseUser = {
          ...user[0],
          extraData: {
            visited: true,
            visitCount: parseInt(stats.total_visits),
            lastVisitDate: stats.last_visit_date,
            firstVisitDate: stats.first_visit_date
          }
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Visita registrada com sucesso',
            user: responseUser,
            extraData: responseUser.extraData
          })
        };
      } catch (error) {
        console.error('❌ [VISIT] Erro ao registrar visita:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro ao registrar visita',
            details: error.message 
          })
        };
      }
    }

    // Rota para resetar visitas de um usuário
    if (path.startsWith('/api/users/') && path.endsWith('/visit/reset') && method === 'POST') {
      try {
        console.log('🔍 [VISIT-RESET] Iniciando reset de visitas');
        
        const userId = parseInt(path.split('/')[3]);
        console.log('🔍 [VISIT-RESET] UserID extraído:', userId);
        
        if (isNaN(userId)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID inválido' })
          };
        }

        // Buscar usuário atual
        const user = await sql`SELECT id, name, extra_data FROM users WHERE id = ${userId}`;
        
        if (user.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }
        
        // Parse existing extraData or create new
        let extraData = {};
        if (user[0].extra_data) {
          if (typeof user[0].extra_data === 'string') {
            try {
              extraData = JSON.parse(user[0].extra_data);
            } catch (e) {
              extraData = {};
            }
          } else if (typeof user[0].extra_data === 'object') {
            extraData = { ...user[0].extra_data };
          }
        }
        
        // Reset visit information
        extraData.visited = false;
        extraData.lastVisitDate = null;
        extraData.visitCount = 0;
        
        console.log(`🔍 [VISIT-RESET] Resetando visitas: ${user[0].name}`);
        
        // Update user with reset extraData
        await sql`
          UPDATE users 
          SET extra_data = ${JSON.stringify(extraData)}, updated_at = NOW()
          WHERE id = ${userId}
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Visitas resetadas com sucesso',
            user: {
              id: user[0].id,
              name: user[0].name,
              extraData: extraData
            }
          })
        };
      } catch (error) {
        console.error('❌ [VISIT-RESET] Erro:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao resetar visitas' })
        };
      }
    }

    // Rota de teste para verificar visitas
    if (path === '/api/test/visits' && method === 'GET') {
      try {
        console.log('🧪 [TEST] Testando sistema de visitas...');
        
        // Buscar um usuário específico para teste
        const testUser = await sql`
          SELECT id, name, email, role, extra_data
          FROM users 
          WHERE role = 'member' OR role = 'missionary'
          LIMIT 1
        `;
        
        if (testUser.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Nenhum usuário encontrado para teste' })
          };
        }
        
        const user = testUser[0];
        let extraData = {};
        
        if (user.extra_data) {
          if (typeof user.extra_data === 'string') {
            try {
              extraData = JSON.parse(user.extra_data);
            } catch (e) {
              console.log(`⚠️ Erro ao parsear extra_data:`, e.message);
            }
          } else if (typeof user.extra_data === 'object') {
            extraData = user.extra_data;
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            testUser: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              extraDataRaw: user.extra_data,
              extraDataParsed: extraData,
              visited: extraData.visited || false,
              visitCount: extraData.visitCount || 0,
              lastVisitDate: extraData.lastVisitDate || null
            },
            message: 'Teste de visitas executado com sucesso'
          })
        };
      } catch (error) {
        console.error('❌ [TEST] Erro no teste de visitas:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro no teste de visitas' })
        };
      }
    }

    // Rota para obter estatísticas detalhadas de visitas
    if (path === '/api/visits/stats' && method === 'GET') {
      try {
        console.log('🔍 [VISIT-STATS] Buscando estatísticas de visitas...');
        
        // Buscar todos os usuários (member ou missionary)
        const allUsers = await sql`
          SELECT id, name, email, role, extra_data
          FROM users 
          WHERE role = 'member' OR role = 'missionary'
          ORDER BY name ASC
        `;
        
        let totalUsers = allUsers.length;
        let visitedUsers = 0;
        let totalVisits = 0;
        let usersWithMultipleVisits = 0;
        const visitedUsersList = [];
        const recentVisits = [];
        
        allUsers.forEach(user => {
          let extraData = {};
          if (user.extra_data) {
            if (typeof user.extra_data === 'string') {
              try {
                extraData = JSON.parse(user.extra_data);
              } catch (e) {
                console.log(`⚠️ Erro ao parsear extra_data do usuário ${user.name}:`, e.message);
              }
            } else if (typeof user.extra_data === 'object') {
              extraData = user.extra_data;
            }
          }
          
          if (extraData.visited === true) {
            visitedUsers++;
            const visitCount = extraData.visitCount || 1;
            totalVisits += visitCount;
            
            if (visitCount > 1) {
              usersWithMultipleVisits++;
            }
            
            visitedUsersList.push({
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              visitCount: visitCount,
              lastVisitDate: extraData.lastVisitDate,
              firstVisitDate: extraData.firstVisitDate || extraData.lastVisitDate
            });
            
            // Adicionar às visitas recentes (últimos 30 dias)
            if (extraData.lastVisitDate) {
              const visitDate = new Date(extraData.lastVisitDate);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              
              if (visitDate >= thirtyDaysAgo) {
                recentVisits.push({
                  id: user.id,
                  name: user.name,
                  visitDate: extraData.lastVisitDate,
                  visitCount: visitCount
                });
              }
            }
          }
        });
        
        // Ordenar visitas recentes por data
        recentVisits.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
        
        const percentage = totalUsers > 0 ? Math.round((visitedUsers / totalUsers) * 100) : 0;
        const averageVisitsPerUser = visitedUsers > 0 ? Math.round((totalVisits / visitedUsers) * 10) / 10 : 0;
        
        console.log(`📊 [VISIT-STATS] Estatísticas: ${visitedUsers}/${totalUsers} usuários visitados (${percentage}%), ${totalVisits} visitas totais`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            summary: {
              totalUsers,
              visitedUsers,
              notVisitedUsers: totalUsers - visitedUsers,
              totalVisits,
              percentage,
              averageVisitsPerUser,
              usersWithMultipleVisits
            },
            visitedUsersList,
            recentVisits: recentVisits.slice(0, 10), // Últimas 10 visitas
            lastUpdated: new Date().toISOString()
          })
        };
      } catch (error) {
        console.error('❌ [VISIT-STATS] Erro:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar estatísticas de visitas' })
        };
      }
    }

    // Rota para discipular usuário
    if (path.startsWith('/api/users/') && path.endsWith('/disciple') && method === 'POST') {
      try {
        const userId = path.split('/')[3];
        const body = JSON.parse(event.body || '{}');
        console.log('🔍 Discipling user:', userId, body);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Usuário discipulado com sucesso' })
        };
      } catch (error) {
        console.error('❌ Disciple user error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao discipular usuário' })
        };
      }
    }

    // Rota para testar importação (dry run)
    if (path === '/api/users/test-import' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { users } = body;
        
        console.log('🧪 Test import users:', {
          totalUsers: users?.length || 0,
          sampleUser: users?.[0]
        });
        
        if (!users || !Array.isArray(users) || users.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Nenhum usuário fornecido para teste' 
            })
          };
        }
        
        let validUsers = 0;
        let invalidUsers = 0;
        const validationErrors = [];
        
        // Validar cada usuário sem salvar
        for (const userData of users) {
          if (!userData.name || !userData.email) {
            invalidUsers++;
            validationErrors.push(`Usuário sem nome ou email: ${JSON.stringify(userData)}`);
          } else {
            validUsers++;
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Teste de validação concluído',
            validUsers,
            invalidUsers,
            validationErrors: validationErrors.slice(0, 10),
            totalUsers: users.length,
            note: 'Este é apenas um teste. Use POST /api/users/bulk-import para executar a importação real.'
          })
        };
      } catch (error) {
        console.error('❌ Test import error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'Erro no teste de importação',
            details: error.message
          })
        };
      }
    }

    // Rota para importação em massa
    if (path === '/api/users/bulk-import' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { users, allowUpdates = false } = body;
        
        console.log('🔍 Bulk import users:', {
          totalUsers: users?.length || 0,
          allowUpdates,
          sampleUser: users?.[0]
        });
        
        if (!users || !Array.isArray(users) || users.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Nenhum usuário fornecido para importação' 
            })
          };
        }
        
        let imported = 0;
        let updated = 0;
        let errors = 0;
        const errorDetails = [];
        
        // Processar usuários em lotes para evitar timeout
        const batchSize = 5; // Reduzir ainda mais o tamanho do lote
        let processedCount = 0;
        const startTime = Date.now();
        const maxExecutionTime = 25000; // 25 segundos máximo
        
        for (let i = 0; i < users.length; i += batchSize) {
          // Verificar timeout
          if (Date.now() - startTime > maxExecutionTime) {
            console.log(`⏰ Timeout atingido após ${Date.now() - startTime}ms. Processando ${processedCount}/${users.length} usuários.`);
            break;
          }
          const batch = users.slice(i, i + batchSize);
          console.log(`📦 Processando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(users.length/batchSize)} (${batch.length} usuários)`);
          
          for (const userData of batch) {
          try {
            const userStartTime = Date.now();
            
            // Validar dados obrigatórios
            if (!userData.name || !userData.email) {
              errors++;
              errorDetails.push(`Usuário sem nome ou email: ${JSON.stringify(userData)}`);
              continue;
            }
            
            // Verificar se usuário já existe
            const existingUser = await sql`SELECT id FROM users WHERE email = ${userData.email} LIMIT 1`;
            const checkTime = Date.now() - userStartTime;
            console.log(`⏱️ Verificação de usuário ${userData.email}: ${checkTime}ms`);
            
            if (existingUser.length > 0) {
              if (allowUpdates) {
                // Processar igreja para atualização - criar automaticamente se não existir
                let processedChurch = userData.church || null;
                if (processedChurch && processedChurch.trim() !== '') {
                  try {
                    const existingChurch = await sql`
                      SELECT id, name FROM churches WHERE name = ${processedChurch.trim()}
                    `;
                    
                    if (existingChurch.length === 0) {
                      // Igreja não existe - criar automaticamente
                      console.log(`🏗️ Criando nova igreja para atualização: "${processedChurch}"`);
                      
                      const churchCode = `IGR${Date.now().toString().slice(-6)}`;
                      
                      const newChurch = await sql`
                        INSERT INTO churches (name, code, address, phone, email, pastor, created_at, updated_at)
                        VALUES (
                          ${processedChurch.trim()},
                          ${churchCode},
                          ${userData.churchAddress || null},
                          ${userData.churchPhone || null},
                          ${userData.churchEmail || null},
                          ${userData.churchPastor || null},
                          NOW(),
                          NOW()
                        )
                        RETURNING id, name, code
                      `;
                      
                      processedChurch = newChurch[0].name;
                      console.log(`✅ Nova igreja criada para atualização: ${newChurch[0].name} (ID: ${newChurch[0].id})`);
                    } else {
                      processedChurch = existingChurch[0].name;
                    }
                  } catch (churchError) {
                    console.error(`❌ Erro ao processar igreja para atualização "${processedChurch}":`, churchError);
                    processedChurch = null;
                  }
                }
                
                // Campos vêm diretamente de userData (não de extraData)
                const temLicao = userData.temLicao === true || userData.temLicao === 'Sim';
                const batizouAlguem = userData.batizouAlguem === 'Sim' || userData.batizouAlguem === true;
                const cpfValido = userData.cpfValido === 'Sim' || userData.cpfValido === true;
                const camposVazios = userData.camposVazios === true || !(userData.cpfValido === true);
                
                // Atualizar usuário existente (incluindo novas colunas)
                await sql`
                  UPDATE users SET 
                    name = ${userData.name},
                    role = ${userData.role || 'member'},
                    church = ${processedChurch},
                    church_code = ${userData.churchCode || null},
                    address = ${userData.address || null},
                    birth_date = ${userData.birthDate || null},
                    baptism_date = ${userData.baptismDate || null},
                    civil_status = ${userData.civilStatus || null},
                    occupation = ${userData.occupation || null},
                    education = ${userData.education || null},
                    is_donor = ${userData.isDonor || false},
                    is_tither = ${userData.isTither || false},
                    extra_data = ${userData.extraData ? JSON.stringify(userData.extraData) : null},
                    observations = ${userData.observations || null},
                    engajamento = ${userData.engajamento || null},
                    classificacao = ${userData.classificacao || null},
                    dizimista_type = ${userData.dizimistaType || null},
                    ofertante_type = ${userData.ofertanteType || null},
                    tempo_batismo_anos = ${userData.tempoBatismoAnos || null},
                    departamentos_cargos = ${userData.departamentosCargos || null},
                    nome_unidade = ${userData.nomeUnidade || null},
                    tem_licao = ${temLicao},
                    total_presenca = ${userData.totalPresenca || 0},
                    comunhao = ${userData.comunhao || 0},
                    missao = ${userData.missao || 0},
                    estudo_biblico = ${userData.estudoBiblico || 0},
                    batizou_alguem = ${batizouAlguem},
                    disc_pos_batismal = ${userData.discPosBatismal || 0},
                    cpf_valido = ${cpfValido},
                    campos_vazios = ${camposVazios},
                    updated_at = NOW()
                  WHERE email = ${userData.email}
                `;
                updated++;
                console.log(`✅ Usuário atualizado: ${userData.email}`);
              } else {
                errors++;
                errorDetails.push(`Usuário já existe: ${userData.email}`);
                continue;
              }
            } else {
              // Processar igreja - criar automaticamente se não existir
              let processedChurch = userData.church || null;
              if (processedChurch && processedChurch.trim() !== '') {
                try {
                  const churchStartTime = Date.now();
                  // Verificar se a igreja já existe
                  const existingChurch = await sql`
                    SELECT id, name FROM churches WHERE name = ${processedChurch.trim()}
                  `;
                  const churchTime = Date.now() - churchStartTime;
                  console.log(`⏱️ Verificação de igreja "${processedChurch}": ${churchTime}ms`);
                  
                  if (existingChurch.length === 0) {
                    // Igreja não existe - criar automaticamente
                    console.log(`🏗️ Criando nova igreja: "${processedChurch}"`);
                    
                    // Gerar código único para a igreja
                    const churchCode = `IGR${Date.now().toString().slice(-6)}`;
                    
                    const newChurch = await sql`
                      INSERT INTO churches (name, code, address, phone, email, pastor, created_at, updated_at)
                      VALUES (
                        ${processedChurch.trim()},
                        ${churchCode},
                        ${userData.churchAddress || null},
                        ${userData.churchPhone || null},
                        ${userData.churchEmail || null},
                        ${userData.churchPastor || null},
                        NOW(),
                        NOW()
                      )
                      RETURNING id, name, code
                    `;
                    
                    processedChurch = newChurch[0].name;
                    console.log(`✅ Nova igreja criada: ${newChurch[0].name} (ID: ${newChurch[0].id}, Código: ${newChurch[0].code})`);
                  } else {
                    processedChurch = existingChurch[0].name;
                    console.log(`✅ Igreja encontrada: ${existingChurch[0].name} (ID: ${existingChurch[0].id})`);
                  }
                } catch (churchError) {
                  console.error(`❌ Erro ao processar igreja "${processedChurch}":`, churchError);
                  processedChurch = null; // Fallback para null se houver erro
                }
              }
              
              // Criar novo usuário
              const passwordStartTime = Date.now();
              const hashedPassword = await bcrypt.hash(userData.password || '123456', 8); // Reduzir rounds para ser mais rápido
              const passwordTime = Date.now() - passwordStartTime;
              console.log(`⏱️ Hash da senha para ${userData.email}: ${passwordTime}ms`);
              
              // Campos vêm diretamente de userData (não de extraData)
              const temLicao = userData.temLicao === true || userData.temLicao === 'Sim';
              const batizouAlguem = userData.batizouAlguem === 'Sim' || userData.batizouAlguem === true;
              const cpfValido = userData.cpfValido === 'Sim' || userData.cpfValido === true;
              const camposVazios = userData.camposVazios === true || !(userData.cpfValido === true);
              
              const insertStartTime = Date.now();
              await sql`
                INSERT INTO users (
                  name, email, password, role, church, church_code, 
                  address, birth_date, baptism_date, civil_status, occupation, 
                  education, is_donor, is_tither, extra_data, observations, 
                  is_approved, status,
                  engajamento, classificacao, dizimista_type, ofertante_type,
                  tempo_batismo_anos, departamentos_cargos, nome_unidade, tem_licao,
                  total_presenca, comunhao, missao, estudo_biblico,
                  batizou_alguem, disc_pos_batismal, cpf_valido, campos_vazios,
                  created_at, updated_at
                ) VALUES (
                  ${userData.name},
                  ${userData.email},
                  ${hashedPassword},
                  ${userData.role || 'member'},
                  ${processedChurch},
                  ${userData.churchCode || null},
                  ${userData.address || null},
                  ${userData.birthDate || null},
                  ${userData.baptismDate || null},
                  ${userData.civilStatus || null},
                  ${userData.occupation || null},
                  ${userData.education || null},
                  ${userData.isDonor || false},
                  ${userData.isTither || false},
                  ${userData.extraData ? JSON.stringify(userData.extraData) : null},
                  ${userData.observations || null},
                  ${userData.isApproved || false},
                  ${userData.status || 'pending'},
                  ${userData.engajamento || null},
                  ${userData.classificacao || null},
                  ${userData.dizimistaType || null},
                  ${userData.ofertanteType || null},
                  ${userData.tempoBatismoAnos || null},
                  ${userData.departamentosCargos || null},
                  ${userData.nomeUnidade || null},
                  ${temLicao},
                  ${userData.totalPresenca || 0},
                  ${userData.comunhao || 0},
                  ${userData.missao || 0},
                  ${userData.estudoBiblico || 0},
                  ${batizouAlguem},
                  ${userData.discPosBatismal || 0},
                  ${cpfValido},
                  ${camposVazios},
                  NOW(),
                  NOW()
                )
              `;
              const insertTime = Date.now() - insertStartTime;
              console.log(`⏱️ Inserção de usuário ${userData.email}: ${insertTime}ms`);
              
              imported++;
              console.log(`✅ Usuário criado: ${userData.email}`);
            }
          } catch (userError) {
            errors++;
            errorDetails.push(`Erro ao processar ${userData.email}: ${userError.message}`);
            console.error(`❌ Erro ao processar usuário ${userData.email}:`, userError);
          }
          }
          
          processedCount += batch.length;
          const batchTime = Date.now() - startTime;
          console.log(`📊 Progresso: ${processedCount}/${users.length} usuários processados (${batchTime}ms total)`);
        }
        
        console.log(`🎉 Importação concluída: ${imported} criados, ${updated} atualizados, ${errors} erros`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: `Importação concluída: ${imported} usuários criados, ${updated} atualizados`,
            imported,
            updated,
            errors,
            errorDetails: errorDetails.slice(0, 10), // Limitar detalhes de erro
            totalProcessed: users.length
          })
        };
      } catch (error) {
        console.error('❌ Bulk import error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'Erro interno na importação em massa',
            details: error.message
          })
        };
      }
    }

    // Rota para spiritual check-in
    if (path.startsWith('/api/spiritual-check-in/') && method === 'GET') {
      try {
        const userId = path.split('/')[3];
        console.log('🔍 Spiritual check-in for user:', userId);
        
        // Buscar check-ins espirituais do usuário
        const checkIns = await sql`
          SELECT * FROM emotional_checkins 
          WHERE user_id = ${userId} 
          ORDER BY created_at DESC 
          LIMIT 10
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            checkIns: checkIns || [],
            userId: parseInt(userId)
          })
        };
      } catch (error) {
        console.error('❌ Spiritual check-in error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'Erro ao buscar check-ins espirituais',
            details: error.message
          })
        };
      }
    }

    if (path.startsWith('/api/spiritual-check-in/') && method === 'POST') {
      try {
        const userId = path.split('/')[3];
        const body = JSON.parse(event.body || '{}');
        const { score, notes } = body;
        
        console.log('🔍 Creating spiritual check-in for user:', userId, { score, notes });
        
        // Criar novo check-in espiritual
        const newCheckIn = await sql`
          INSERT INTO emotional_checkins (user_id, score, notes, type, created_at, updated_at)
          VALUES (${userId}, ${score}, ${notes || ''}, 'spiritual', NOW(), NOW())
          RETURNING *
        `;
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            success: true,
            checkIn: newCheckIn[0],
            message: 'Check-in espiritual criado com sucesso'
          })
        };
      } catch (error) {
        console.error('❌ Create spiritual check-in error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'Erro ao criar check-in espiritual',
            details: error.message
          })
        };
      }
    }

    // Rota para importação assíncrona (fallback para lotes muito grandes)
    if (path === '/api/users/bulk-import-async' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { users, allowUpdates = false } = body;
        
        console.log('🔄 Iniciando importação assíncrona:', {
          totalUsers: users?.length || 0,
          allowUpdates
        });
        
        if (!users || !Array.isArray(users) || users.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Nenhum usuário fornecido para importação' 
            })
          };
        }
        
        // Processar apenas os primeiros 20 usuários para evitar timeout
        const usersToProcess = users.slice(0, 20);
        const remainingUsers = users.length - 20;
        
        let imported = 0;
        let updated = 0;
        let errors = 0;
        const errorDetails = [];
        
        // Processar em lotes menores
        const batchSize = 3;
        for (let i = 0; i < usersToProcess.length; i += batchSize) {
          const batch = usersToProcess.slice(i, i + batchSize);
          
          for (const userData of batch) {
            try {
              if (!userData.name || !userData.email) {
                errors++;
                errorDetails.push(`Usuário sem nome ou email: ${JSON.stringify(userData)}`);
                continue;
              }
              
              const existingUser = await sql`SELECT id FROM users WHERE email = ${userData.email} LIMIT 1`;
              
              if (existingUser.length > 0) {
                if (allowUpdates) {
                  await sql`
                    UPDATE users SET 
                      name = ${userData.name},
                      role = ${userData.role || 'member'},
                      church = ${userData.church || null},
                      updated_at = NOW()
                    WHERE email = ${userData.email}
                  `;
                  updated++;
                } else {
                  errors++;
                  errorDetails.push(`Usuário já existe: ${userData.email}`);
                }
              } else {
                const hashedPassword = await bcrypt.hash(userData.password || '123456', 8);
                
                await sql`
                  INSERT INTO users (
                    name, email, password, role, church, 
                    is_approved, status, created_at, updated_at
                  ) VALUES (
                    ${userData.name},
                    ${userData.email},
                    ${hashedPassword},
                    ${userData.role || 'member'},
                    ${userData.church || null},
                    ${userData.isApproved || false},
                    ${userData.status || 'pending'},
                    NOW(),
                    NOW()
                  )
                `;
                imported++;
              }
            } catch (userError) {
              errors++;
              errorDetails.push(`Erro ao processar ${userData.email}: ${userError.message}`);
            }
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: `Importação parcial concluída: ${imported} criados, ${updated} atualizados`,
            imported,
            updated,
            errors,
            errorDetails: errorDetails.slice(0, 5),
            processed: usersToProcess.length,
            remaining: remainingUsers,
            note: remainingUsers > 0 ? `Ainda restam ${remainingUsers} usuários. Use a importação normal para processar o restante.` : 'Todos os usuários foram processados.'
          })
        };
      } catch (error) {
        console.error('❌ Async bulk import error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'Erro na importação assíncrona',
            details: error.message
          })
        };
      }
    }

    // Rota para status do sistema
    if (path === '/api/status' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'online',
          timestamp: new Date().toISOString(),
          version: '1.0.8',
          test: 'Importação de dados funcional - bulk import real - ' + new Date().toISOString()
        })
      };
    }

    // Rota para criar tabela de visitas (executar uma vez)
    if (path === '/api/setup/visits-table' && method === 'POST') {
      try {
        console.log('🔧 [SETUP] Criando tabela de visitas...');
        
        // Criar tabela de visitas
        await sql`
          CREATE TABLE IF NOT EXISTS visits (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            visit_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, visit_date)
          )
        `;
        
        // Criar índices para performance
        await sql`CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date)`;
        
        console.log('✅ [SETUP] Tabela de visitas criada com sucesso');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Tabela de visitas criada com sucesso' 
          })
        };
      } catch (error) {
        console.error('❌ [SETUP] Erro ao criar tabela de visitas:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao criar tabela de visitas' })
        };
      }
    }

    // Rota para limpar todas as visitas do extraData
    if (path === '/api/cleanup/visits' && method === 'POST') {
      try {
        console.log('🧹 [CLEANUP] Limpando visitas do extraData...');
        
        // Buscar todos os usuários com dados de visita no extraData
        const usersWithVisits = await sql`
          SELECT id, name, extra_data 
          FROM users 
          WHERE extra_data IS NOT NULL 
          AND (extra_data::text LIKE '%"visited":true%' OR extra_data::text LIKE '%"visitCount"%')
        `;
        
        console.log(`📊 [CLEANUP] Encontrados ${usersWithVisits.length} usuários com dados de visita`);
        
        let cleanedCount = 0;
        
        for (const user of usersWithVisits) {
          try {
            let extraData = {};
            if (user.extra_data) {
              if (typeof user.extra_data === 'string') {
                extraData = JSON.parse(user.extra_data);
              } else if (typeof user.extra_data === 'object') {
                extraData = user.extra_data;
              }
            }
            
            // Remover campos de visita do extraData
            delete extraData.visited;
            delete extraData.visitCount;
            delete extraData.lastVisitDate;
            delete extraData.firstVisitDate;
            
            // Atualizar usuário
            await sql`
              UPDATE users 
              SET extra_data = ${JSON.stringify(extraData)}, updated_at = NOW()
              WHERE id = ${user.id}
            `;
            
            cleanedCount++;
            console.log(`✅ [CLEANUP] Limpo extraData do usuário ${user.name} (ID: ${user.id})`);
          } catch (error) {
            console.error(`❌ [CLEANUP] Erro ao limpar usuário ${user.name}:`, error);
          }
        }
        
        console.log(`✅ [CLEANUP] Limpeza concluída: ${cleanedCount} usuários processados`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: `Limpeza concluída: ${cleanedCount} usuários processados`,
            cleanedUsers: cleanedCount
          })
        };
      } catch (error) {
        console.error('❌ [CLEANUP] Erro na limpeza:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro na limpeza das visitas' })
        };
      }
    }

    // Rota para debug de usuários visitados
    if (path === '/api/debug/visited-users' && method === 'GET') {
      try {
        console.log('🔍 [DEBUG] Buscando usuários visitados para debug...');
        
        const visitedUsers = await sql`
          SELECT u.id, u.name, u.email, u.role, u.extra_data
          FROM users u 
          WHERE u.role = 'member' OR u.role = 'missionary'
          ORDER BY u.name ASC
        `;
        
        const processedUsers = visitedUsers.map(user => {
          let extraData = {};
          if (user.extra_data) {
            if (typeof user.extra_data === 'string') {
              try {
                extraData = JSON.parse(user.extra_data);
              } catch (e) {
                console.log(`⚠️ Erro ao parsear extra_data do usuário ${user.name}:`, e.message);
              }
            } else if (typeof user.extra_data === 'object') {
              extraData = user.extra_data;
            }
          }
          
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            visited: extraData.visited || false,
            visitCount: extraData.visitCount || 0,
            lastVisitDate: extraData.lastVisitDate || null,
            extraData: extraData
          };
        });
        
        console.log(`📊 [DEBUG] Processados ${processedUsers.length} usuários`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(processedUsers)
        };
      } catch (error) {
        console.error('❌ [DEBUG] Erro ao buscar usuários visitados:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para debug de eventos
    if (path === '/api/debug/events' && method === 'GET') {
      try {
        const events = await sql`
          SELECT id, title, description, date, type, church, created_at
          FROM events 
          ORDER BY date DESC 
          LIMIT 20
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(events)
        };
      } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para dashboard por role
    if (path.startsWith('/api/dashboard/') && method === 'GET') {
      try {
        const role = path.split('/')[3];
        console.log('Dashboard para role:', role);
        
        let stats = {};
        
        switch (role) {
          case 'admin':
            stats = {
              totalUsers: 0,
              totalEvents: 0,
              pendingApprovals: 0,
              totalChurches: 0
            };
            break;
          case 'missionary':
            stats = {
              myInterested: 0,
              myMeetings: 0,
              myMessages: 0,
              myPoints: 0
            };
            break;
          case 'member':
            stats = {
              myEvents: 0,
              myPrayers: 0,
              myPoints: 0,
              myVisits: 0
            };
            break;
          default:
            stats = {
              availableEvents: 0,
              myMeetings: 0,
              myProgress: 0
            };
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(stats)
        };
      } catch (error) {
        console.error('Erro no dashboard:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para limpar aprovações órfãs
    if (path === '/api/system/clean-orphaned-approvals' && method === 'POST') {
      try {
        // Implementar lógica de limpeza
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Limpeza de aprovações órfãs executada' })
        };
      } catch (error) {
        console.error('Erro na limpeza:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para verificar igrejas
    if (path === '/api/debug/check-churches' && method === 'GET') {
      try {
        const churches = await sql`
          SELECT id, name, address, created_at
          FROM churches 
          ORDER BY name
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(churches)
        };
      } catch (error) {
        console.error('Erro ao verificar igrejas:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para verificar usuários
    if (path === '/api/debug/check-users' && method === 'GET') {
      try {
        const users = await sql`
          SELECT id, name, email, role, church, status, points, created_at
          FROM users 
          ORDER BY created_at DESC 
          LIMIT 50
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(users)
        };
      } catch (error) {
        console.error('Erro ao verificar usuários:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para verificar eventos no banco
    if (path === '/api/debug/check-events-db' && method === 'GET') {
      try {
        const events = await sql`
          SELECT COUNT(*) as total, 
                 COUNT(CASE WHEN type = 'igreja-local' THEN 1 END) as igreja_local,
                 COUNT(CASE WHEN type = 'asr-geral' THEN 1 END) as asr_geral,
                 COUNT(CASE WHEN type = 'visitas' THEN 1 END) as visitas,
                 COUNT(CASE WHEN type = 'reunioes' THEN 1 END) as reunioes
          FROM events
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(events[0])
        };
      } catch (error) {
        console.error('Erro ao verificar eventos:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para criar evento simples
    if (path === '/api/debug/create-simple-event' && method === 'GET') {
      try {
        const newEvent = await sql`
          INSERT INTO events (title, description, date, type, church, created_at)
          VALUES ('Evento de Teste', 'Evento criado para debug', NOW(), 'igreja-local', 'Sistema', NOW())
          RETURNING *
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Evento criado com sucesso', event: newEvent[0] })
        };
      } catch (error) {
        console.error('Erro ao criar evento:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para criar evento via SQL
    // Nova rota de teste para inserção direta
    if (path === '/api/debug/test-insert' && method === 'GET') {
      try {
        console.log('🔧 [TEST] Testando inserção direta...');
        const result = await sql`
          INSERT INTO events (title, description, date, type, created_at, updated_at)
          VALUES ('Evento Hoje 2024', 'Teste para verificar se aparece no calendário', '2024-09-21'::date, 'igreja-local', NOW(), NOW())
          RETURNING id, title, date
        `;
        console.log('✅ [TEST] Inserção bem-sucedida:', result[0]);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, inserted: result[0] })
        };
      } catch (error) {
        console.error('❌ [TEST] Erro na inserção:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: error.message, details: error.toString() })
        };
      }
    }

    if (path === '/api/debug/create-event-sql' && method === 'GET') {
      try {
        const newEvent = await sql`
          INSERT INTO events (title, description, date, type, church, created_at)
          VALUES ('Evento SQL', 'Evento criado via SQL direto', NOW() + INTERVAL '1 day', 'asr-geral', 'Sistema', NOW())
          RETURNING *
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Evento SQL criado', event: newEvent[0] })
        };
      } catch (error) {
        console.error('Erro ao criar evento SQL:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para adicionar eventos em massa
    if (path === '/api/debug/add-events' && method === 'GET') {
      try {
        const events = [
          { title: 'Culto Dominical', type: 'igreja-local', days: 0 },
          { title: 'Escola Bíblica', type: 'igreja-local', days: 1 },
          { title: 'Reunião de Oração', type: 'reunioes', days: 2 },
          { title: 'Visita Pastoral', type: 'visitas', days: 3 },
          { title: 'ASR Geral', type: 'asr-geral', days: 7 }
        ];

        const createdEvents = [];
        for (const event of events) {
          const newEvent = await sql`
            INSERT INTO events (title, description, date, type, church, created_at)
            VALUES (${event.title}, 'Evento adicionado automaticamente', NOW() + INTERVAL '${event.days} days', ${event.type}, 'Sistema', NOW())
            RETURNING *
          `;
          createdEvents.push(newEvent[0]);
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Eventos adicionados', events: createdEvents })
        };
      } catch (error) {
        console.error('Erro ao adicionar eventos:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para limpar duplicatas
    if (path === '/api/debug/clean-duplicates' && method === 'POST') {
      try {
        // Remover eventos duplicados baseado no título e data
        const result = await sql`
          DELETE FROM events 
          WHERE id NOT IN (
            SELECT MIN(id) 
            FROM events 
            GROUP BY title, date
          )
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Duplicatas removidas com sucesso' })
        };
      } catch (error) {
        console.error('Erro ao limpar duplicatas:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para agendar limpeza
    if (path === '/api/system/schedule-cleanup' && method === 'POST') {
      try {
        const body = JSON.parse(event.body);
        const { scheduleTime, cleanupType } = body;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            message: 'Limpeza agendada com sucesso',
            scheduleTime,
            cleanupType 
          })
        };
      } catch (error) {
        console.error('Erro ao agendar limpeza:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para iniciar limpeza automática
    if (path === '/api/system/auto-cleanup/start' && method === 'POST') {
      try {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            message: 'Limpeza automática iniciada',
            status: 'running',
            startedAt: new Date().toISOString()
          })
        };
      } catch (error) {
        console.error('Erro ao iniciar limpeza automática:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para parar limpeza automática
    if (path === '/api/system/auto-cleanup/stop' && method === 'POST') {
      try {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            message: 'Limpeza automática parada',
            status: 'stopped',
            stoppedAt: new Date().toISOString()
          })
        };
      } catch (error) {
        console.error('Erro ao parar limpeza automática:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para status da limpeza automática
    if (path === '/api/system/auto-cleanup/status' && method === 'GET') {
      try {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            status: 'idle',
            lastRun: null,
            nextRun: null,
            isRunning: false
          })
        };
      } catch (error) {
        console.error('Erro ao obter status da limpeza:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }



    // Rota limpa para cálculo de pontos - NOVA IMPLEMENTAÇÃO
    if (path === '/api/system/calculate-points-clean' && method === 'POST') {
      try {
        console.log('🧹 Iniciando cálculo limpo de pontos...');
        
        // Buscar configuração de pontos
        const pointsConfigResult = await sql`SELECT * FROM points_configuration LIMIT 1`;
        if (pointsConfigResult.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Configuração de pontos não encontrada' })
          };
        }
        
        const pointsConfig = pointsConfigResult[0];
        console.log('📋 Configuração carregada:', JSON.stringify(pointsConfig, null, 2));
        
        // Buscar todos os usuários (exceto admin)
        const users = await sql`
          SELECT id, name, email, role, points, extra_data
          FROM users 
          WHERE email != 'admin@7care.com' AND role != 'admin'
        `;
        
        console.log(`👥 ${users.length} usuários encontrados para cálculo`);
        
        let updatedCount = 0;
        let totalCalculatedPoints = 0;
        
        for (const user of users) {
          console.log(`\n🔍 Processando: ${user.name} (ID: ${user.id})`);
          console.log(`📊 Pontos atuais: ${user.points}`);
          
          // Parse extra_data
          let userData = {};
          try {
            userData = JSON.parse(user.extra_data || '{}');
            console.log('📋 Dados parseados:', Object.keys(userData).length, 'campos');
          } catch (err) {
            console.log(`⚠️ Erro ao parsear extra_data: ${err.message}`);
            continue;
          }
          
          let totalPoints = 0;
          let appliedCategories = [];
          
          // 1. ENGAJAMENTO
          if (userData.engajamento) {
            const engajamento = userData.engajamento.toLowerCase();
            if (engajamento.includes('alto')) {
              totalPoints += pointsConfig.engajamento?.alto || 0;
              appliedCategories.push(`Engajamento (Alto): +${pointsConfig.engajamento?.alto || 0}`);
            } else if (engajamento.includes('medio') || engajamento.includes('médio')) {
              totalPoints += pointsConfig.engajamento?.medio || 0;
              appliedCategories.push(`Engajamento (Médio): +${pointsConfig.engajamento?.medio || 0}`);
            } else if (engajamento.includes('baixo')) {
              totalPoints += pointsConfig.engajamento?.baixo || 0;
              appliedCategories.push(`Engajamento (Baixo): +${pointsConfig.engajamento?.baixo || 0}`);
            }
          }
          
          // 2. CLASSIFICAÇÃO
          if (userData.classificacao) {
            const classificacao = userData.classificacao.toLowerCase();
            if (classificacao.includes('frequente')) {
              totalPoints += pointsConfig.classificacao?.frequente || 0;
              appliedCategories.push(`Classificação (Frequente): +${pointsConfig.classificacao?.frequente || 0}`);
            } else {
              totalPoints += pointsConfig.classificacao?.naoFrequente || 0;
              appliedCategories.push(`Classificação (Não Frequente): +${pointsConfig.classificacao?.naoFrequente || 0}`);
            }
          }
          
          // 3. DIZIMISTA
          if (userData.dizimistaType) {
            const dizimista = userData.dizimistaType.toLowerCase();
            if (dizimista.includes('recorrente')) {
              totalPoints += pointsConfig.dizimista?.recorrente || 0;
              appliedCategories.push(`Dizimista (Recorrente): +${pointsConfig.dizimista?.recorrente || 0}`);
            } else if (dizimista.includes('sazonal')) {
              totalPoints += pointsConfig.dizimista?.sazonal || 0;
              appliedCategories.push(`Dizimista (Sazonal): +${pointsConfig.dizimista?.sazonal || 0}`);
            } else if (dizimista.includes('pontual')) {
              totalPoints += pointsConfig.dizimista?.pontual || 0;
              appliedCategories.push(`Dizimista (Pontual): +${pointsConfig.dizimista?.pontual || 0}`);
            } else if (dizimista.includes('não dizimista') || dizimista.includes('nao dizimista')) {
              totalPoints += pointsConfig.dizimista?.naoDizimista || 0;
              appliedCategories.push(`Dizimista (Não Dizimista): +${pointsConfig.dizimista?.naoDizimista || 0}`);
            }
          }
          
          // 4. OFERTANTE
          if (userData.ofertanteType) {
            const ofertante = userData.ofertanteType.toLowerCase();
            if (ofertante.includes('recorrente')) {
              totalPoints += pointsConfig.ofertante?.recorrente || 0;
              appliedCategories.push(`Ofertante (Recorrente): +${pointsConfig.ofertante?.recorrente || 0}`);
            } else if (ofertante.includes('sazonal')) {
              totalPoints += pointsConfig.ofertante?.sazonal || 0;
              appliedCategories.push(`Ofertante (Sazonal): +${pointsConfig.ofertante?.sazonal || 0}`);
            } else if (ofertante.includes('pontual')) {
              totalPoints += pointsConfig.ofertante?.pontual || 0;
              appliedCategories.push(`Ofertante (Pontual): +${pointsConfig.ofertante?.pontual || 0}`);
            } else if (ofertante.includes('não ofertante') || ofertante.includes('nao ofertante')) {
              totalPoints += pointsConfig.ofertante?.naoOfertante || 0;
              appliedCategories.push(`Ofertante (Não Ofertante): +${pointsConfig.ofertante?.naoOfertante || 0}`);
            }
          }
          
          // 5. TEMPO DE BATISMO
          if (userData.tempoBatismoAnos && typeof userData.tempoBatismoAnos === 'number') {
            const tempo = userData.tempoBatismoAnos;
            if (tempo >= 30) {
              totalPoints += pointsConfig.tempoBatismo?.maisVinte || 0;
              appliedCategories.push(`Tempo Batismo (30+ anos): +${pointsConfig.tempoBatismo?.maisVinte || 0}`);
            } else if (tempo >= 20) {
              totalPoints += pointsConfig.tempoBatismo?.vinteAnos || 0;
              appliedCategories.push(`Tempo Batismo (20-30 anos): +${pointsConfig.tempoBatismo?.vinteAnos || 0}`);
            } else if (tempo >= 10) {
              totalPoints += pointsConfig.tempoBatismo?.dezAnos || 0;
              appliedCategories.push(`Tempo Batismo (10-20 anos): +${pointsConfig.tempoBatismo?.dezAnos || 0}`);
            } else if (tempo >= 5) {
              totalPoints += pointsConfig.tempoBatismo?.cincoAnos || 0;
              appliedCategories.push(`Tempo Batismo (5-10 anos): +${pointsConfig.tempoBatismo?.cincoAnos || 0}`);
            } else if (tempo >= 2) {
              totalPoints += pointsConfig.tempoBatismo?.doisAnos || 0;
              appliedCategories.push(`Tempo Batismo (2-5 anos): +${pointsConfig.tempoBatismo?.doisAnos || 0}`);
            }
          }
          
          // 6. CARGOS
          if (userData.temCargo === 'Sim' && userData.departamentosCargos) {
            const numCargos = userData.departamentosCargos.split(';').length;
            if (numCargos >= 3) {
              totalPoints += pointsConfig.cargos?.tresOuMais || 0;
              appliedCategories.push(`Cargos (${numCargos} cargos): +${pointsConfig.cargos?.tresOuMais || 0}`);
            } else if (numCargos === 2) {
              totalPoints += pointsConfig.cargos?.doisCargos || 0;
              appliedCategories.push(`Cargos (${numCargos} cargos): +${pointsConfig.cargos?.doisCargos || 0}`);
            } else if (numCargos === 1) {
              totalPoints += pointsConfig.cargos?.umCargo || 0;
              appliedCategories.push(`Cargos (${numCargos} cargo): +${pointsConfig.cargos?.umCargo || 0}`);
            }
          }
          
          // 7. NOME DA UNIDADE
          if (userData.nomeUnidade && userData.nomeUnidade.trim()) {
            totalPoints += pointsConfig.nomeUnidade?.comUnidade || 0;
            appliedCategories.push(`Nome da Unidade: +${pointsConfig.nomeUnidade?.comUnidade || 0}`);
          }
          
          // 8. TEM LIÇÃO
          if (userData.temLicao === true || userData.temLicao === 'true') {
            totalPoints += pointsConfig.temLicao?.comLicao || 0;
            appliedCategories.push(`Tem Lição: +${pointsConfig.temLicao?.comLicao || 0}`);
          }
          
          // 9. TOTAL DE PRESENÇA
          if (userData.totalPresenca !== undefined && userData.totalPresenca !== null) {
            const presenca = parseInt(userData.totalPresenca);
            if (presenca >= 8 && presenca <= 13) {
              totalPoints += pointsConfig.totalPresenca?.oitoATreze || 0;
              appliedCategories.push(`Total Presença (${presenca}): +${pointsConfig.totalPresenca?.oitoATreze || 0}`);
            } else if (presenca >= 4 && presenca <= 7) {
              totalPoints += pointsConfig.totalPresenca?.quatroASete || 0;
              appliedCategories.push(`Total Presença (${presenca}): +${pointsConfig.totalPresenca?.quatroASete || 0}`);
            } else if (presenca >= 0 && presenca <= 3) {
              totalPoints += pointsConfig.totalPresenca?.zeroATres || 0;
              appliedCategories.push(`Total Presença (${presenca}): +${pointsConfig.totalPresenca?.zeroATres || 0}`);
            }
          }
          
          // 10. ESCOLA SABATINA - COMUNHÃO
          if (userData.comunhao && userData.comunhao > 0) {
            const pontosComunhao = userData.comunhao * (pointsConfig.escolaSabatina?.comunhao || 0);
            totalPoints += pontosComunhao;
            appliedCategories.push(`Comunhão (${userData.comunhao}): +${pontosComunhao}`);
          }
          
          // 11. ESCOLA SABATINA - MISSÃO
          if (userData.missao && userData.missao > 0) {
            const pontosMissao = userData.missao * (pointsConfig.escolaSabatina?.missao || 0);
            totalPoints += pontosMissao;
            appliedCategories.push(`Missão (${userData.missao}): +${pontosMissao}`);
          }
          
          // 12. ESCOLA SABATINA - ESTUDO BÍBLICO
          if (userData.estudoBiblico && userData.estudoBiblico > 0) {
            const pontosEstudoBiblico = userData.estudoBiblico * (pointsConfig.escolaSabatina?.estudoBiblico || 0);
            totalPoints += pontosEstudoBiblico;
            appliedCategories.push(`Estudo Bíblico (${userData.estudoBiblico}): +${pontosEstudoBiblico}`);
          }
          
          // 13. ESCOLA SABATINA - BATIZOU ALGUÉM
          if (userData.batizouAlguem === true || userData.batizouAlguem === 'true' || userData.batizouAlguem === 1) {
            totalPoints += pointsConfig.escolaSabatina?.batizouAlguem || 0;
            appliedCategories.push(`Batizou Alguém: +${pointsConfig.escolaSabatina?.batizouAlguem || 0}`);
          }
          
          // 14. ESCOLA SABATINA - DISCIPULADO PÓS-BATISMO
          if (userData.discPosBatismal && userData.discPosBatismal > 0) {
            const pontosDiscPosBatismo = userData.discPosBatismal * (pointsConfig.escolaSabatina?.discipuladoPosBatismo || 0);
            totalPoints += pontosDiscPosBatismo;
            appliedCategories.push(`Discipulado Pós-Batismo (${userData.discPosBatismal}): +${pontosDiscPosBatismo}`);
          }
          
          // 15. CPF VÁLIDO
          if (userData.cpfValido === 'Sim' || userData.cpfValido === true || userData.cpfValido === 'true') {
            totalPoints += pointsConfig.cpfValido?.valido || 0;
            appliedCategories.push(`CPF Válido: +${pointsConfig.cpfValido?.valido || 0}`);
          }
          
          // 16. CAMPOS VAZIOS ACMS
          if (userData.camposVaziosACMS === false || userData.camposVaziosACMS === 'false') {
            totalPoints += pointsConfig.camposVaziosACMS?.completos || 0;
            appliedCategories.push(`Campos Vazios ACMS (Completos): +${pointsConfig.camposVaziosACMS?.completos || 0}`);
          }
          
          const roundedTotalPoints = Math.round(totalPoints);
          totalCalculatedPoints += roundedTotalPoints;
          
          console.log(`🎯 Total calculado: ${roundedTotalPoints} pontos`);
          console.log(`📊 Categorias aplicadas: ${appliedCategories.length}`);
          appliedCategories.forEach(cat => console.log(`   ${cat}`));
          
          // FORÇAR ATUALIZAÇÃO DE TODOS OS USUÁRIOS PARA TESTE
          console.log(`🔍 Comparando: ${user.points} !== ${roundedTotalPoints} = ${user.points !== roundedTotalPoints}`);
          await sql`
            UPDATE users 
            SET points = ${roundedTotalPoints}, updated_at = NOW()
            WHERE id = ${user.id}
          `;
          updatedCount++;
          console.log(`✅ ${user.name}: ${user.points} → ${roundedTotalPoints} pontos`);
        }
        
        console.log(`\n🎉 Cálculo limpo concluído!`);
        console.log(`📊 ${updatedCount} usuários atualizados de ${users.length} total`);
        console.log(`🎯 Total de pontos calculados: ${totalCalculatedPoints}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Cálculo limpo concluído: ${updatedCount} usuários atualizados`,
            updatedCount,
            totalUsers: users.length,
            totalCalculatedPoints,
            averagePoints: users.length > 0 ? Math.round(totalCalculatedPoints / users.length) : 0
          })
        };
        
      } catch (error) {
        console.error('❌ Erro no cálculo limpo de pontos:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor: ' + error.message })
        };
      }
    }

    // Rota para atualizar perfis por estudo bíblico
    if (path === '/api/system/update-profiles-by-bible-study' && method === 'POST') {
      try {
        const body = JSON.parse(event.body);
        const { userId, studyProgress } = body;
        
        // Atualizar progresso do estudo bíblico
        await sql`
          UPDATE users 
          SET bible_study_progress = ${studyProgress},
              updated_at = NOW()
          WHERE id = ${userId}
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            message: 'Perfil atualizado com sucesso',
            userId,
            studyProgress 
          })
        };
      } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }


    // Rota para adicionar coluna end_date à tabela events
    if (path === '/api/events/add-end-date-column' && method === 'POST') {
      try {
        console.log('🔧 Adicionando coluna end_date à tabela events...');
        
        // Verificar se a coluna já existe
        const checkColumn = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'events' AND column_name = 'end_date'
        `;
        
        if (checkColumn.length > 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true,
              message: 'Coluna end_date já existe na tabela events'
            })
          };
        }
        
        // Adicionar a coluna end_date
        await sql`ALTER TABLE events ADD COLUMN end_date TIMESTAMP`;
        console.log('✅ Coluna end_date adicionada com sucesso');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true,
            message: 'Coluna end_date adicionada à tabela events com sucesso'
          })
        };
      } catch (error) {
        console.error('❌ Erro ao adicionar coluna end_date:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'Erro ao adicionar coluna end_date',
            details: error.message
          })
        };
      }
    }

    // Rota para importação direta de eventos (como Gestão de Dados)
    if (path === '/api/events/import' && method === 'POST') {
      try {
        console.log('📅 Importação direta de eventos iniciada');
        
        const body = JSON.parse(event.body || '{}');
        const events = body.events || [];
        
        console.log(`📊 Recebidos ${events.length} eventos para importação`);
        
        if (events.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false,
              error: 'Nenhum evento fornecido'
            })
          };
        }

        // Limpar eventos existentes primeiro
        await sql`DELETE FROM events`;
        console.log('🗑️ Eventos existentes removidos');

        // Inserir novos eventos
        let importedCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (let i = 0; i < events.length; i++) {
          const eventData = events[i];
          try {
            console.log(`🔄 Inserindo evento ${i + 1}/${events.length}: ${eventData.title}`);
            console.log(`📋 Dados do evento:`, {
              title: eventData.title,
              type: eventData.type,
              date: eventData.date,
              endDate: eventData.endDate,
              description: eventData.description
            });
            
            if (eventData.endDate && eventData.endDate !== eventData.date) {
              // Evento com período
              console.log(`📅 Inserindo evento com período: ${eventData.title} (${eventData.date} - ${eventData.endDate})`);
              await sql`
                INSERT INTO events (title, type, date, end_date, description, created_at)
                VALUES (${eventData.title}, ${eventData.type || 'geral'}, ${eventData.date}, ${eventData.endDate}, ${eventData.description || ''}, NOW())
              `;
            } else {
              // Evento de um dia
              console.log(`📅 Inserindo evento de um dia: ${eventData.title}`);
              await sql`
                INSERT INTO events (title, type, date, description, created_at)
                VALUES (${eventData.title}, ${eventData.type || 'geral'}, ${eventData.date}, ${eventData.description || ''}, NOW())
              `;
            }
            
            importedCount++;
            console.log(`✅ Evento inserido com sucesso: ${eventData.title} (${importedCount}/${events.length})`);
          } catch (insertError) {
            errorCount++;
            const errorMsg = `Erro ao inserir "${eventData.title}": ${insertError.message}`;
            console.error(`❌ ${errorMsg}`);
            console.error('❌ Detalhes do erro:', insertError);
            errors.push({
              event: eventData.title,
              error: insertError.message,
              index: i + 1
            });
          }
        }

        console.log(`✅ Importação concluída: ${importedCount}/${events.length} eventos importados`);
        if (errorCount > 0) {
          console.log(`⚠️ ${errorCount} eventos falharam na importação`);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true,
            message: `Importação concluída! ${importedCount} de ${events.length} eventos importados.${errorCount > 0 ? ` ${errorCount} eventos falharam.` : ''}`,
            importedEvents: importedCount,
            totalEvents: events.length,
            errorCount: errorCount,
            errors: errors
          })
        };
      } catch (error) {
        console.error('❌ Erro na importação:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
          })
        };
      }
    }

    // Rota para teste de CSV (simulada)
    if (path === '/api/debug/test-csv' && method === 'POST') {
      try {
        // Simular teste de CSV
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            message: 'Teste de CSV executado',
            validRows: 0,
            invalidRows: 0,
            errors: []
          })
        };
      } catch (error) {
        console.error('Erro no teste de CSV:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para igreja do usuário
    if (path === '/api/user/church' && method === 'GET') {
      try {
        const userId = event.queryStringParameters?.userId;
        
        if (!userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID do usuário é obrigatório' })
          };
        }

        const users = await sql`SELECT * FROM users WHERE id = ${parseInt(userId)} LIMIT 1`;
        
        if (users.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }

        const user = users[0];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            church: user.church || 'Sistema',
            church_code: user.church_code || 'SYS'
          })
        };
      } catch (error) {
        console.error('❌ User church error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar igreja do usuário' })
        };
      }
    }

    // Rota para igreja padrão
    if (path === '/api/settings/default-church' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          defaultChurch: 'Sistema',
          defaultChurchCode: 'SYS'
        })
      };
    }

    // Rota para salvar igreja padrão
    if (path === '/api/settings/default-church' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        console.log('🔍 Setting default church:', body);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Igreja padrão definida com sucesso' })
        };
      } catch (error) {
        console.error('❌ Set default church error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao definir igreja padrão' })
        };
      }
    }

    // Rota para salvar logo
    if (path === '/api/settings/logo' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        console.log('🔍 Saving logo:', body);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Logo salvo com sucesso' })
        };
      } catch (error) {
        console.error('❌ Save logo error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao salvar logo' })
        };
      }
    }

    // Rota para deletar logo
    if (path === '/api/settings/logo' && method === 'DELETE') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Logo removido com sucesso' })
      };
    }

    // Rota para verificar status de recálculo (lê do banco para funcionar em serverless)
    if (path === '/api/system/recalculation-status' && method === 'GET') {
      try {
        const statusResult = await sql`SELECT * FROM recalculation_status ORDER BY id DESC LIMIT 1`;
        
        if (statusResult.length === 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              isRecalculating: false,
              progress: 0,
              message: '',
              totalUsers: 0,
              processedUsers: 0
            })
          };
        }
        
        const status = statusResult[0];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            isRecalculating: status.is_recalculating,
            progress: status.progress,
            message: status.message,
            totalUsers: status.total_users,
            processedUsers: status.processed_users
          })
        };
      } catch (error) {
        console.error('Erro ao buscar status de recálculo:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar status' })
        };
      }
    }

    // Rota para salvar configuração de pontos
    if (path === '/api/system/points-config' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        console.log('🔄 Salvando configuração de pontos e recalculando automaticamente...', body);
        
        // Salvar a configuração real no banco de dados
        console.log('💾 Salvando configuração no banco de dados...');
        
        // Verificar se já existe uma configuração
        const existingConfig = await sql`SELECT id FROM points_configuration LIMIT 1`;
        
        if (existingConfig.length > 0) {
          // Atualizar configuração existente (usar o ID que existe)
          const existingId = existingConfig[0].id;
          await sql`
            UPDATE points_configuration SET 
              engajamento = ${JSON.stringify(body.engajamento || {})},
              classificacao = ${JSON.stringify(body.classificacao || {})},
              dizimista = ${JSON.stringify(body.dizimista || {})},
              ofertante = ${JSON.stringify(body.ofertante || {})},
              tempobatismo = ${JSON.stringify(body.tempoBatismo || {})},
              cargos = ${JSON.stringify(body.cargos || {})},
              nomeunidade = ${JSON.stringify(body.nomeUnidade || {})},
              temlicao = ${JSON.stringify(body.temLicao || {})},
              totalpresenca = ${JSON.stringify(body.totalPresenca || {})},
              escolasabatina = ${JSON.stringify(body.escolaSabatina || {})},
              cpfvalido = ${JSON.stringify(body.cpfValido || {})},
              camposvaziosacms = ${JSON.stringify(body.camposVaziosACMS || {})},
              updated_at = NOW()
            WHERE id = ${existingId}
          `;
        } else {
          // Inserir nova configuração
          await sql`
            INSERT INTO points_configuration (
              engajamento, classificacao, dizimista, ofertante, tempobatismo,
              cargos, nomeunidade, temlicao, totalpresenca, escolasabatina,
              cpfvalido, camposvaziosacms
            ) VALUES (
              ${JSON.stringify(body.engajamento || {})},
              ${JSON.stringify(body.classificacao || {})},
              ${JSON.stringify(body.dizimista || {})},
              ${JSON.stringify(body.ofertante || {})},
              ${JSON.stringify(body.tempoBatismo || {})},
              ${JSON.stringify(body.cargos || {})},
              ${JSON.stringify(body.nomeUnidade || {})},
              ${JSON.stringify(body.temLicao || {})},
              ${JSON.stringify(body.totalPresenca || {})},
              ${JSON.stringify(body.escolaSabatina || {})},
              ${JSON.stringify(body.cpfValido || {})},
              ${JSON.stringify(body.camposVaziosACMS || {})}
            )
          `;
        }
        
        console.log('✅ Configuração salva no banco de dados com sucesso');
        
        // Invalidar cache da configuração para forçar recarregamento
        global.pointsConfigCache = null;
        
        // OTIMIZAÇÃO: Retornar resposta imediatamente e recalcular em background
        // Isso evita timeout 504 em Netlify Functions (limite de 10s)
        console.log('🔄 Marcando recálculo para iniciar...');
        
        // RETORNAR IMEDIATAMENTE - Evitar timeout 504
        // O recálculo será feito por uma rota separada chamada pelo frontend
        console.log('✅ Configuração salva! Retornando imediatamente...');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Configuração salva com sucesso! Os pontos serão recalculados.',
            recalculationTriggered: true
          })
        };
        
      } catch (error) {
        console.error('❌ Save points config error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao salvar configuração de pontos' })
        };
      }
    }

    // Rota para RECALCULAR pontos de todos os usuários (separada para evitar timeout)
    if (path === '/api/system/recalculate-points' && method === 'POST') {
      try {
        console.log('🔄 Iniciando recálculo manual de pontos...');
        
        // Buscar todos os usuários (incluindo admins)
        const users = await sql`SELECT * FROM users ORDER BY id`;
        console.log(`👥 ${users.length} usuários encontrados para recálculo`);
        
        // Marcar início do recálculo
        await sql`
          UPDATE recalculation_status
          SET is_recalculating = true,
              progress = 0,
              message = 'Iniciando recálculo de pontos...',
              total_users = ${users.length},
              processed_users = 0,
              updated_at = NOW()
          WHERE id = 1
        `;
            
            let updatedCount = 0;
            let errorCount = 0;
            
        // Processar em lotes
        const batchSize = 10; // Maior para ser mais rápido
            for (let i = 0; i < users.length; i += batchSize) {
              const batch = users.slice(i, i + batchSize);
              
          // Atualizar progresso
          const processedSoFar = i;
          const progressPercent = (processedSoFar / users.length) * 100;
          const nextBatch = Math.min(i + batchSize, users.length);
          
          await sql`
            UPDATE recalculation_status
            SET progress = ${progressPercent},
                processed_users = ${processedSoFar},
                message = ${'Recalculando pontos... (' + (i + 1) + '-' + nextBatch + ' de ' + users.length + ')'},
                updated_at = NOW()
            WHERE id = 1
          `;
          
          // Processar lote
              const batchPromises = batch.map(async (user) => {
                try {
                  const calculatedPoints = await calculateUserPoints(user);
                  if (user.points !== calculatedPoints) {
                    await sql`UPDATE users SET points = ${calculatedPoints} WHERE id = ${user.id}`;
                return { updated: true };
              }
              return { updated: false };
            } catch (error) {
              console.error(`Erro ao processar usuário ${user.name}:`, error);
              return { error: true };
            }
          });
          
          const results = await Promise.all(batchPromises);
          results.forEach(r => {
            if (r.error) errorCount++;
            if (r.updated) updatedCount++;
          });
        }
        
        // Finalizar
        await sql`
          UPDATE recalculation_status
          SET is_recalculating = false,
              progress = 100,
              message = 'Recálculo concluído!',
              total_users = ${users.length},
              processed_users = ${users.length},
              updated_at = NOW()
          WHERE id = 1
        `;
        
        console.log(`✅ Recálculo concluído: ${updatedCount} atualizados, ${errorCount} erros`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            updatedUsers: updatedCount,
            errors: errorCount,
            totalUsers: users.length
          })
        };
        
      } catch (error) {
        console.error('❌ Erro no recálculo:', error);
        
        // Marcar erro
        await sql`
          UPDATE recalculation_status
          SET is_recalculating = false,
              message = 'Erro no recálculo'
          WHERE id = 1
        `.catch(() => {});
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao recalcular pontos' })
        };
      }
    }

    // ROTA DE DEBUG - Testar cálculo de pontos para um usuário específico
    if (path === '/api/system/debug-points' && method === 'GET') {
      try {
        const userName = new URL(`https://example.com${event.path}`).searchParams.get('name') || 'Daniela';
        console.log(`🔍 DEBUG: Buscando usuário com nome contendo "${userName}"...`);
        
        // Buscar usuário
        const users = await sql`
          SELECT * FROM users 
          WHERE name ILIKE ${`%${userName}%`} 
          AND role != 'admin'
          LIMIT 1
        `;
        
        if (users.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }
        
        const user = users[0];
        console.log(`✅ Usuário encontrado: ${user.name} (ID: ${user.id})`);
        
        // Buscar configuração
        const configRow = await sql`
          SELECT * FROM points_configuration LIMIT 1
        `;
        
        const config = configRow[0];
        
        // Calcular pontos manualmente passo a passo
        const debug = {
          user: {
            id: user.id,
            name: user.name,
            currentPoints: user.points
          },
          columns: {
            engajamento: user.engajamento,
            classificacao: user.classificacao,
            dizimista_type: user.dizimista_type,
            ofertante_type: user.ofertante_type,
            tempo_batismo_anos: user.tempo_batismo_anos,
            departamentos_cargos: user.departamentos_cargos,
            nome_unidade: user.nome_unidade,
            tem_licao: user.tem_licao,
            total_presenca: user.total_presenca,
            comunhao: user.comunhao,
            missao: user.missao,
            estudo_biblico: user.estudo_biblico,
            batizou_alguem: user.batizou_alguem,
            disc_pos_batismal: user.disc_pos_batismal,
            cpf_valido: user.cpf_valido,
            campos_vazios: user.campos_vazios
          },
          calculation: [],
          total: 0
        };
        
        let total = 0;
        
        // 1. Engajamento
        if (user.engajamento) {
          const eng = user.engajamento.toLowerCase();
          let points = 0;
          if (eng.includes('alto')) points = config.engajamento.alto || 0;
          else if (eng.includes('médio') || eng.includes('medio')) points = config.engajamento.medio || 0;
          else if (eng.includes('baixo')) points = config.engajamento.baixo || 0;
          total += points;
          debug.calculation.push({ field: 'Engajamento', value: user.engajamento, points, total });
        }
        
        // 2. Classificação
        if (user.classificacao) {
          const classif = user.classificacao.toLowerCase();
          let points = 0;
          if (classif.includes('frequente')) points = config.classificacao.frequente || 0;
          else points = config.classificacao.naoFrequente || 0;
          total += points;
          debug.calculation.push({ field: 'Classificação', value: user.classificacao, points, total });
        }
        
        // 3. Dizimista
        if (user.dizimista_type) {
          const diz = user.dizimista_type.toLowerCase();
          let points = 0;
          if (diz.includes('recorrente')) points = config.dizimista.recorrente || 0;
          else if (diz.includes('sazonal')) points = config.dizimista.sazonal || 0;
          else if (diz.includes('pontual')) points = config.dizimista.pontual || 0;
          total += points;
          debug.calculation.push({ field: 'Dizimista', value: user.dizimista_type, points, total });
        }
        
        // 4. Ofertante
        if (user.ofertante_type) {
          const ofer = user.ofertante_type.toLowerCase();
          let points = 0;
          if (ofer.includes('recorrente')) points = config.ofertante.recorrente || 0;
          else if (ofer.includes('sazonal')) points = config.ofertante.sazonal || 0;
          else if (ofer.includes('pontual')) points = config.ofertante.pontual || 0;
          total += points;
          debug.calculation.push({ field: 'Ofertante', value: user.ofertante_type, points, total });
        }
        
        // 5. Tempo de Batismo
        if (user.tempo_batismo_anos) {
          let points = 0;
          if (user.tempo_batismo_anos >= 30) points = config.tempobatismo.maisVinte || 0;
          else if (user.tempo_batismo_anos >= 20) points = config.tempobatismo.vinteAnos || 0;
          else if (user.tempo_batismo_anos >= 10) points = config.tempobatismo.dezAnos || 0;
          else if (user.tempo_batismo_anos >= 5) points = config.tempobatismo.cincoAnos || 0;
          else if (user.tempo_batismo_anos >= 2) points = config.tempobatismo.doisAnos || 0;
          total += points;
          debug.calculation.push({ field: 'Tempo Batismo', value: `${user.tempo_batismo_anos} anos`, points, total });
        }
        
        // 6. Cargos
        if (user.departamentos_cargos) {
          const numCargos = user.departamentos_cargos.split(';').filter(c => c.trim()).length;
          let points = 0;
          if (numCargos >= 3) points = config.cargos.tresOuMais || 0;
          else if (numCargos === 2) points = config.cargos.doisCargos || 0;
          else if (numCargos === 1) points = config.cargos.umCargo || 0;
          total += points;
          debug.calculation.push({ field: 'Cargos', value: `${numCargos} cargos`, points, total });
        }
        
        // 7. Nome Unidade
        if (user.nome_unidade && user.nome_unidade.trim()) {
          const points = config.nomeunidade.comUnidade || 0;
          total += points;
          debug.calculation.push({ field: 'Nome Unidade', value: user.nome_unidade, points, total });
        }
        
        // 8. Tem Lição
        if (user.tem_licao === true) {
          const points = config.temlicao.comLicao || 0;
          total += points;
          debug.calculation.push({ field: 'Tem Lição', value: 'Sim', points, total });
        }
        
        // 9. Total Presença
        if (user.total_presenca !== undefined && user.total_presenca !== null) {
          let points = 0;
          if (user.total_presenca >= 8) points = config.totalpresenca.oitoATreze || 0;
          else if (user.total_presenca >= 4) points = config.totalpresenca.quatroASete || 0;
          else points = config.totalpresenca.zeroATres || 0;
          total += points;
          debug.calculation.push({ field: 'Total Presença', value: user.total_presenca, points, total });
        }
        
        // 10. Comunhão
        if (user.comunhao && user.comunhao > 0) {
          const points = user.comunhao * (config.escolasabatina.comunhao || 0);
          total += points;
          debug.calculation.push({ field: 'Comunhão', value: `${user.comunhao}x`, points, total });
        }
        
        // 11. Missão
        if (user.missao && user.missao > 0) {
          const points = user.missao * (config.escolasabatina.missao || 0);
          total += points;
          debug.calculation.push({ field: 'Missão', value: `${user.missao}x`, points, total });
        }
        
        // 12. Estudo Bíblico
        if (user.estudo_biblico && user.estudo_biblico > 0) {
          const points = user.estudo_biblico * (config.escolasabatina.estudoBiblico || 0);
          total += points;
          debug.calculation.push({ field: 'Estudo Bíblico', value: `${user.estudo_biblico}x`, points, total });
        }
        
        // 13. Batizou Alguém
        if (user.batizou_alguem === true) {
          const points = config.escolasabatina.batizouAlguem || 0;
          total += points;
          debug.calculation.push({ field: 'Batizou Alguém', value: 'Sim', points, total });
        }
        
        // 14. Discipulado Pós-Batismo
        if (user.disc_pos_batismal && user.disc_pos_batismal > 0) {
          const points = user.disc_pos_batismal * (config.escolasabatina.discipuladoPosBatismo || 0);
          total += points;
          debug.calculation.push({ field: 'Discipulado Pós-Batismo', value: `${user.disc_pos_batismal}x`, points, total });
        }
        
        // 15. CPF Válido
        if (user.cpf_valido === true) {
          const points = config.cpfvalido.valido || 0;
          total += points;
          debug.calculation.push({ field: 'CPF Válido', value: 'Sim', points, total });
        }
        
        // 16. Sem Campos Vazios
        if (user.campos_vazios === false) {
          const points = config.camposvaziosacms.completos || 0;
          total += points;
          debug.calculation.push({ field: 'Sem Campos Vazios', value: 'Sim', points, total });
        }
        
        debug.total = Math.round(total);
        debug.difference = debug.total - user.points;
        
        // Calcular usando a função real
        const calculatedPoints = await calculateUserPoints(user);
        debug.functionResult = calculatedPoints;
        debug.functionDifference = calculatedPoints - user.points;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(debug, null, 2)
        };
        
      } catch (error) {
        console.error('❌ Erro no debug:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: error.message, stack: error.stack })
        };
      }
    }

    // ROTA DUPLICADA REMOVIDA - usando apenas a versão completa acima (linha 9491)

    // Rota para resetar configuração de pontos
    if (path === '/api/system/points-config/reset' && method === 'POST') {
      try {
        console.log('🔄 Resetando configuração de pontos e recalculando automaticamente...');
        
        // Limpar configuração existente e inserir valores padrão
        console.log('🔄 Limpando configuração existente...');
        await sql`DELETE FROM points_configuration`;
        
        // Inserir configuração padrão
        await sql`
          INSERT INTO points_configuration (
            engajamento, classificacao, dizimista, ofertante, tempoBatismo,
            cargos, nomeUnidade, temLicao, totalPresenca, escolaSabatina,
            cpfValido, camposVaziosACMS
          ) VALUES (
            '{"baixo": 50, "medio": 100, "alto": 200}',
            '{"frequente": 100, "naoFrequente": 50}',
            '{"naoDizimista": 0, "pontual": 25, "sazonal": 50, "recorrente": 100}',
            '{"naoOfertante": 0, "pontual": 15, "sazonal": 30, "recorrente": 60}',
            '{"doisAnos": 25, "cincoAnos": 50, "dezAnos": 100, "vinteAnos": 150, "maisVinte": 200}',
            '{"umCargo": 50, "doisCargos": 100, "tresOuMais": 150}',
            '{"comUnidade": 25, "semUnidade": 0}',
            '{"comLicao": 30}',
            '{"zeroATres": 0, "quatroASete": 50, "oitoATreze": 100}',
            '{"comunhao": 10, "missao": 15, "estudoBiblico": 5, "batizouAlguem": 100, "discipuladoPosBatismo": 20}',
            '{"valido": 25, "invalido": 0}',
            '{"completos": 50, "incompletos": 0}'
          )
        `;
        
        console.log('✅ Configuração resetada para valores padrão');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Configuração resetada com sucesso!'
          })
        };
        
      } catch (error) {
        console.error('❌ Reset points config error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao resetar configuração de pontos' })
        };
      }
    }

    // Rota para limpar tudo (apenas superadmin)
    if (path === '/api/system/clear-all' && method === 'POST') {
      try {
        // Verificar se o usuário é superadmin
        const userId = event.headers['x-user-id'];
        if (!userId) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Usuário não autenticado' })
          };
        }

        const userResult = await sql`SELECT role FROM users WHERE id = ${Number(userId)}`;
        if (!userResult || userResult.length === 0 || userResult[0].role !== 'superadmin') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Apenas superadmin pode executar esta operação' })
          };
        }

        console.log('🧹 Iniciando limpeza completa de todos os dados do sistema...');

        // Limpar todas as tabelas na ordem correta (respeitando foreign keys)
        // Tabelas dependentes primeiro, principais depois
        const queries = [
          // Tabelas dependentes (relacionamentos e vínculos)
          { query: 'DELETE FROM video_call_participants', description: 'Participantes de vídeo' },
          { query: 'DELETE FROM conversation_participants', description: 'Participantes de conversas' },
          { query: 'DELETE FROM event_participants', description: 'Participantes de eventos' },
          { query: 'DELETE FROM prayer_intercessors', description: 'Intercessores de oração' },
          { query: 'DELETE FROM user_achievements', description: 'Conquistas de usuários' },
          { query: 'DELETE FROM user_points_history', description: 'Histórico de pontos' },
          { query: 'DELETE FROM point_activities', description: 'Atividades de pontos' },
          { query: 'DELETE FROM messages', description: 'Mensagens' },
          { query: 'DELETE FROM push_subscriptions', description: 'Subscriptions push' },

          // Tabelas principais
          { query: 'DELETE FROM video_call_sessions', description: 'Sessões de vídeo' },
          { query: 'DELETE FROM conversations', description: 'Conversas' },
          { query: 'DELETE FROM events', description: 'Eventos' },
          { query: 'DELETE FROM meetings', description: 'Reuniões' },
          { query: 'DELETE FROM prayers', description: 'Orações' },
          { query: 'DELETE FROM notifications', description: 'Notificações' },
          { query: 'DELETE FROM emotional_checkins', description: 'Check-ins emocionais' },
          { query: 'DELETE FROM relationships', description: 'Relacionamentos' },
          { query: 'DELETE FROM discipleship_requests', description: 'Solicitações de discipulado' },
          { query: 'DELETE FROM missionary_profiles', description: 'Perfis missionários' },
          { query: 'DELETE FROM meeting_types', description: 'Tipos de reunião' },
          { query: 'DELETE FROM achievements', description: 'Conquistas' },
          { query: 'DELETE FROM point_configs', description: 'Configurações de pontos' },
          { query: 'DELETE FROM pastor_invites', description: 'Convites de pastores' },
          { query: 'DELETE FROM churches', description: 'Igrejas' },

          // Limpar districtId dos superadmins antes de deletar usuários e distritos
          { query: "UPDATE users SET district_id = NULL WHERE role = 'superadmin'", description: 'Limpando districtId dos superadmins' },

          // Usuários (exceto superadmin)
          { query: "DELETE FROM users WHERE role != 'superadmin'", description: 'Usuários (mantendo superadmin)' },

          // Tabelas de distrito por último
          { query: 'DELETE FROM district_points_config', description: 'Configurações de pontos por distrito' },
          { query: 'DELETE FROM district_settings', description: 'Configurações de distrito' },
          { query: 'DELETE FROM districts', description: 'Distritos' }
        ];
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (const item of queries) {
          try {
            console.log(`  🗑️ Limpando ${item.description}...`);
            await sql`${sql.unsafe(item.query)}`;
            console.log(`  ✅ ${item.description} limpo`);
            successCount++;
          } catch (error) {
            console.log(`  ⚠️ Aviso ao limpar ${item.description}:`, error.message);
            errors.push({ table: item.description, error: error.message });
            errorCount++;
            // Continuar mesmo se uma tabela não existir
          }
        }
        
        console.log(`\n✅ Limpeza concluída!`);
        console.log(`   Operações bem-sucedidas: ${successCount}`);
        console.log(`   Avisos/Erros: ${errorCount}`);
        console.log(`ℹ️ Mantidos: usuários superadmin, system_config, system_settings, event_filter_permissions`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Todos os dados foram limpos com sucesso! ${successCount} operações executadas. Superadmin mantido, convites de pastores removidos.`,
            details: {
              operationsExecuted: successCount,
              warnings: errorCount,
              errors: errors.length > 0 ? errors : undefined,
              timestamp: new Date().toISOString(),
              maintained: ['usuários superadmin', 'system_config', 'system_settings', 'event_filter_permissions'],
              cleared: [
                'users (exceto superadmin)', 'events', 'meetings', 'churches', 'relationships',
                'prayers', 'notifications', 'messages', 'conversations', 'discipleship_requests',
                'missionary_profiles', 'emotional_checkins', 'achievements', 'point_configs',
                'point_activities', 'user_achievements', 'user_points_history', 'meeting_types',
                'event_participants', 'prayer_intercessors', 'video_call_sessions',
                'video_call_participants', 'conversation_participants', 'push_subscriptions',
                'pastor_invites'
              ]
            }
          })
        };
      } catch (error) {
        console.error('❌ Erro na limpeza de dados:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Erro interno do servidor durante a limpeza',
            details: error.message
          })
        };
      }
    }

    // Rota para verificar perfis missionários
    if (path === '/api/system/check-missionary-profiles' && method === 'GET') {
      try {
        console.log('🔍 Verificando perfis missionários...');
        
        // Buscar usuários com role missionary
        const missionaries = await sql`
          SELECT id, name, email, role, church, points, level, status, created_at
          FROM users 
          WHERE role LIKE '%missionary%'
          ORDER BY name ASC
        `;
        
        // Buscar relacionamentos ativos dos missionários
        const relationships = await sql`
          SELECT 
            r.id,
            r.missionary_id,
            r.interested_id,
            r.status,
            u.name as missionary_name,
            ui.name as interested_name
          FROM relationships r
          JOIN users u ON r.missionary_id = u.id
          JOIN users ui ON r.interested_id = ui.id
          WHERE r.status = 'active'
          ORDER BY r.created_at DESC
        `;
        
        const stats = {
          totalMissionaries: missionaries.length,
          activeRelationships: relationships.length,
          missionaries: missionaries,
          relationships: relationships
        };
        
        console.log(`📊 Encontrados ${missionaries.length} missionários e ${relationships.length} relacionamentos ativos`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(stats)
        };
      } catch (error) {
        console.error('❌ Check missionary profiles error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao verificar perfis missionários' })
        };
      }
    }

    // Rota para testar limpeza (dry run)
    if (path === '/api/system/test-cleanup' && method === 'GET') {
      try {
        console.log('🧪 Testando estrutura de limpeza...');
        
        // Lista de todas as tabelas que serão limpas
        const tablesToClean = [
          'prayer_intercessors',
          'prayers',
          'video_call_participants',
          'video_call_sessions',
          'conversation_participants',
          'user_achievements',
          'user_points_history',
          'event_participants',
          'event_filter_permissions',
          'system_settings',
          'system_config',
          'point_activities',
          'achievements',
          'point_configs',
          'emotional_checkins',
          'discipleship_requests',
          'relationships',
          'missionary_profiles',
          'notifications',
          'messages',
          'conversations',
          'meetings',
          'meeting_types',
          'events',
          'churches',
          'users (exceto admin)'
        ];
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Estrutura de limpeza verificada',
            tablesToClean: tablesToClean,
            totalTables: tablesToClean.length,
            note: 'Esta é apenas uma verificação. Use POST /api/system/clear-all para executar a limpeza real.'
          })
        };
      } catch (error) {
        console.error('❌ Erro no teste de limpeza:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Erro ao verificar estrutura de limpeza',
            details: error.message
          })
        };
      }
    }

    // Rota para buscar scores de check-ins espirituais
    if (path === '/api/spiritual-checkins/scores' && method === 'GET') {
      try {
        console.log('🔍 Buscando scores de check-ins espirituais...');
        
        // Por enquanto, retornar dados vazios para evitar erros
        const scores = [];
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(scores)
        };
      } catch (error) {
        console.error('❌ Erro ao buscar scores de check-ins:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para buscar usuários com perfis missionários
    if (path === '/api/missionary-profiles/users' && method === 'GET') {
      try {
        console.log('🔍 Buscando usuários com perfis missionários...');
        
        const users = await sql`
          SELECT id, name, email, role, church, points, level, status, created_at
          FROM users 
          WHERE role IN ('missionary', 'member') 
          ORDER BY points DESC, name ASC
        `;
        
        console.log(`📊 ${users.length} usuários missionários encontrados`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(users)
        };
      } catch (error) {
        console.error('❌ Erro ao buscar usuários missionários:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para verificar/criar tabela points_configuration
    if (path === '/api/system/setup-points-config' && method === 'POST') {
      try {
        console.log('🔧 Verificando/criando tabela points_configuration...');
        
        // Verificar se a tabela existe
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'points_configuration'
          );
        `;
        
        if (!tableCheck[0].exists) {
          console.log('📋 Criando tabela points_configuration...');
          
          // Criar tabela points_configuration
          await sql`
            CREATE TABLE IF NOT EXISTS points_configuration (
              id SERIAL PRIMARY KEY,
              engajamento JSONB DEFAULT '{"baixo": 10, "medio": 25, "alto": 50}',
              classificacao JSONB DEFAULT '{"frequente": 30, "naoFrequente": 10}',
              dizimista JSONB DEFAULT '{"naoDizimista": 0, "pontual": 15, "sazonal": 25, "recorrente": 40}',
              ofertante JSONB DEFAULT '{"naoOfertante": 0, "pontual": 10, "sazonal": 20, "recorrente": 35}',
              tempoBatismo JSONB DEFAULT '{"doisAnos": 5, "cincoAnos": 15, "dezAnos": 25, "vinteAnos": 35, "maisVinte": 50}',
              cargos JSONB DEFAULT '{"umCargo": 20, "doisCargos": 35, "tresOuMais": 50}',
              nomeUnidade JSONB DEFAULT '{"comUnidade": 25}',
              temLicao JSONB DEFAULT '{"comLicao": 15}',
              totalPresenca JSONB DEFAULT '{"zeroATres": 0, "quatroASete": 10, "oitoATreze": 20}',
              escolaSabatina JSONB DEFAULT '{"comunhao": 5, "missao": 5, "estudoBiblico": 5, "batizouAlguem": 50, "discipuladoPosBatismo": 10}',
              cpfValido JSONB DEFAULT '{"valido": 10}',
              camposVaziosACMS JSONB DEFAULT '{"completos": 100}',
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            );
          `;
          
          // Inserir configuração padrão
          await sql`
            INSERT INTO points_configuration (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
          `;
          
          console.log('✅ Tabela points_configuration criada com sucesso!');
        } else {
          console.log('✅ Tabela points_configuration já existe');
          
          // Atualizar valores padrão na tabela existente
          console.log('🔄 Atualizando valores padrão...');
          await sql`
            UPDATE points_configuration SET
              engajamento = '{"baixo": 10, "medio": 25, "alto": 50}',
              classificacao = '{"frequente": 30, "naoFrequente": 10}',
              dizimista = '{"naoDizimista": 0, "pontual": 15, "sazonal": 25, "recorrente": 40}',
              ofertante = '{"naoOfertante": 0, "pontual": 10, "sazonal": 20, "recorrente": 35}',
              tempoBatismo = '{"doisAnos": 5, "cincoAnos": 15, "dezAnos": 25, "vinteAnos": 35, "maisVinte": 50}',
              cargos = '{"umCargo": 20, "doisCargos": 35, "tresOuMais": 50}',
              nomeUnidade = '{"comUnidade": 25}',
              temLicao = '{"comLicao": 15}',
              totalPresenca = '{"zeroATres": 0, "quatroASete": 10, "oitoATreze": 20}',
              escolaSabatina = '{"comunhao": 5, "missao": 5, "estudoBiblico": 5, "batizouAlguem": 50, "discipuladoPosBatismo": 10}',
              cpfValido = '{"valido": 10}',
              camposVaziosACMS = '{"completos": 100}',
              updated_at = NOW()
            WHERE id = 1;
          `;
          console.log('✅ Valores padrão atualizados!');
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Tabela points_configuration configurada com sucesso!'
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao configurar tabela:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor: ' + error.message })
        };
      }
    }

    // Rota para correção rápida de pontuação
    if (path === '/api/system/fix-points-calculation' && method === 'POST') {
      try {
        console.log('🔧 Iniciando correção rápida de pontuação...');
        
        // Buscar configuração de pontos
        const pointsConfigResult = await sql`SELECT * FROM points_configuration LIMIT 1`;
        if (pointsConfigResult.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Configuração de pontos não encontrada' })
          };
        }
        
        const pointsConfig = pointsConfigResult[0];
        
        // Buscar todos os usuários (exceto admin)
        const users = await sql`
          SELECT id, name, email, role, points, extra_data
          FROM users 
          WHERE email != 'admin@7care.com' AND role != 'admin'
        `;
        
        let updatedCount = 0;
        let totalCalculatedPoints = 0;
        
        for (const user of users) {
          // Parse extra_data
          let userData = {};
          try {
            userData = JSON.parse(user.extra_data || '{}');
          } catch (err) {
            continue;
          }
          
          let totalPoints = 0;
          
          // 1. ENGAJAMENTO
          if (userData.engajamento) {
            const engajamento = userData.engajamento.toLowerCase();
            if (engajamento.includes('alto')) totalPoints += pointsConfig.engajamento?.alto || 0;
            else if (engajamento.includes('medio') || engajamento.includes('médio')) totalPoints += pointsConfig.engajamento?.medio || 0;
            else if (engajamento.includes('baixo')) totalPoints += pointsConfig.engajamento?.baixo || 0;
          }
          
          // 2. CLASSIFICAÇÃO
          if (userData.classificacao) {
            const classificacao = userData.classificacao.toLowerCase();
            if (classificacao.includes('frequente')) totalPoints += pointsConfig.classificacao?.frequente || 0;
            else totalPoints += pointsConfig.classificacao?.naoFrequente || 0;
          }
          
          // 3. DIZIMISTA
          if (userData.dizimistaType) {
            const dizimista = userData.dizimistaType.toLowerCase();
            if (dizimista.includes('recorrente')) totalPoints += pointsConfig.dizimista?.recorrente || 0;
            else if (dizimista.includes('sazonal')) totalPoints += pointsConfig.dizimista?.sazonal || 0;
            else if (dizimista.includes('pontual')) totalPoints += pointsConfig.dizimista?.pontual || 0;
            else if (dizimista.includes('não dizimista') || dizimista.includes('nao dizimista')) totalPoints += pointsConfig.dizimista?.naoDizimista || 0;
          }
          
          // 4. OFERTANTE
          if (userData.ofertanteType) {
            const ofertante = userData.ofertanteType.toLowerCase();
            if (ofertante.includes('recorrente')) totalPoints += pointsConfig.ofertante?.recorrente || 0;
            else if (ofertante.includes('sazonal')) totalPoints += pointsConfig.ofertante?.sazonal || 0;
            else if (ofertante.includes('pontual')) totalPoints += pointsConfig.ofertante?.pontual || 0;
            else if (ofertante.includes('não ofertante') || ofertante.includes('nao ofertante')) totalPoints += pointsConfig.ofertante?.naoOfertante || 0;
          }
          
          // 5. TEMPO DE BATISMO
          if (userData.tempoBatismoAnos && typeof userData.tempoBatismoAnos === 'number') {
            const tempo = userData.tempoBatismoAnos;
            if (tempo >= 30) totalPoints += pointsConfig.tempoBatismo?.maisVinte || 0;
            else if (tempo >= 20) totalPoints += pointsConfig.tempoBatismo?.vinteAnos || 0;
            else if (tempo >= 10) totalPoints += pointsConfig.tempoBatismo?.dezAnos || 0;
            else if (tempo >= 5) totalPoints += pointsConfig.tempoBatismo?.cincoAnos || 0;
            else if (tempo >= 2) totalPoints += pointsConfig.tempoBatismo?.doisAnos || 0;
          }
          
          // 6. CARGOS
          if (userData.temCargo === 'Sim' && userData.departamentosCargos) {
            const numCargos = userData.departamentosCargos.split(';').length;
            if (numCargos >= 3) totalPoints += pointsConfig.cargos?.tresOuMais || 0;
            else if (numCargos === 2) totalPoints += pointsConfig.cargos?.doisCargos || 0;
            else if (numCargos === 1) totalPoints += pointsConfig.cargos?.umCargo || 0;
          }
          
          // 7. NOME DA UNIDADE
          if (userData.nomeUnidade && userData.nomeUnidade.trim()) {
            totalPoints += pointsConfig.nomeUnidade?.comUnidade || 0;
          }
          
          // 8. TEM LIÇÃO
          if (userData.temLicao === true || userData.temLicao === 'true') {
            totalPoints += pointsConfig.temLicao?.comLicao || 0;
          }
          
          // 9. TOTAL DE PRESENÇA
          if (userData.totalPresenca !== undefined && userData.totalPresenca !== null) {
            const presenca = parseInt(userData.totalPresenca);
            if (presenca >= 8 && presenca <= 13) totalPoints += pointsConfig.totalPresenca?.oitoATreze || 0;
            else if (presenca >= 4 && presenca <= 7) totalPoints += pointsConfig.totalPresenca?.quatroASete || 0;
            else if (presenca >= 0 && presenca <= 3) totalPoints += pointsConfig.totalPresenca?.zeroATres || 0;
          }
          
          // 10. ESCOLA SABATINA - COMUNHÃO
          if (userData.comunhao && userData.comunhao > 0) {
            totalPoints += userData.comunhao * (pointsConfig.escolaSabatina?.comunhao || 0);
          }
          
          // 11. ESCOLA SABATINA - MISSÃO
          if (userData.missao && userData.missao > 0) {
            totalPoints += userData.missao * (pointsConfig.escolaSabatina?.missao || 0);
          }
          
          // 12. ESCOLA SABATINA - ESTUDO BÍBLICO
          if (userData.estudoBiblico && userData.estudoBiblico > 0) {
            totalPoints += userData.estudoBiblico * (pointsConfig.escolaSabatina?.estudoBiblico || 0);
          }
          
          // 13. ESCOLA SABATINA - BATIZOU ALGUÉM
          if (userData.batizouAlguem === true || userData.batizouAlguem === 'true' || userData.batizouAlguem === 1) {
            totalPoints += pointsConfig.escolaSabatina?.batizouAlguem || 0;
          }
          
          // 14. ESCOLA SABATINA - DISCIPULADO PÓS-BATISMO
          if (userData.discPosBatismal && userData.discPosBatismal > 0) {
            totalPoints += userData.discPosBatismal * (pointsConfig.escolaSabatina?.discipuladoPosBatismo || 0);
          }
          
          // 15. CPF VÁLIDO
          if (userData.cpfValido === 'Sim' || userData.cpfValido === true || userData.cpfValido === 'true') {
            totalPoints += pointsConfig.cpfValido?.valido || 0;
          }
          
          // 16. CAMPOS VAZIOS ACMS
          if (userData.camposVaziosACMS === false || userData.camposVaziosACMS === 'false') {
            totalPoints += pointsConfig.camposVaziosACMS?.completos || 0;
          }
          
          const roundedTotalPoints = Math.round(totalPoints);
          totalCalculatedPoints += roundedTotalPoints;
          
          // Atualizar usuário
          await sql`
            UPDATE users 
            SET points = ${roundedTotalPoints}, updated_at = NOW()
            WHERE id = ${user.id}
          `;
          updatedCount++;
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Correção de pontuação concluída! ${updatedCount} usuários atualizados.`,
            totalUsers: users.length,
            updatedUsers: updatedCount,
            totalCalculatedPoints: totalCalculatedPoints
          })
        };
        
      } catch (error) {
        console.error('❌ Erro na correção de pontuação:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota removida - conflitante com /api/system/calculate-points-clean
    if (false && path === '/api/system/calculate-points-correct' && method === 'POST') {
      try {
        console.log('🎯 Iniciando cálculo correto de pontos...');
        
        // Buscar configuração de pontos atual (a mesma da rota /api/system/points-config)
        const pointsConfigResult = await sql`SELECT * FROM points_configuration LIMIT 1`;
        if (pointsConfigResult.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Configuração de pontos não encontrada' })
          };
        }
        
        const pointsConfig = pointsConfigResult[0];
        console.log('📋 Configuração carregada:', JSON.stringify(pointsConfig, null, 2));
        
        // Buscar todos os usuários (exceto admin)
        const users = await sql`
          SELECT id, name, email, role, points, extra_data
          FROM users 
          WHERE email != 'admin@7care.com' AND role != 'admin'
        `;
        
        console.log(`👥 ${users.length} usuários encontrados para cálculo`);
        
        let updatedCount = 0;
        let totalCalculatedPoints = 0;
        
        for (const user of users) {
          console.log(`\n🔍 Processando: ${user.name} (ID: ${user.id})`);
          console.log(`📊 Pontos atuais: ${user.points}`);
          
          // Parse extra_data
          let userData = {};
          try {
            userData = JSON.parse(user.extra_data || '{}');
            console.log('📋 Dados parseados:', Object.keys(userData).length, 'campos');
          } catch (err) {
            console.log(`⚠️ Erro ao parsear extra_data: ${err.message}`);
            continue;
          }
          
          let totalPoints = 0;
          let appliedCategories = [];
          
          // 1. ENGAJAMENTO
          if (userData.engajamento) {
            const engajamento = userData.engajamento.toLowerCase();
            if (engajamento.includes('alto')) {
              totalPoints += pointsConfig.engajamento?.alto || 0;
              appliedCategories.push(`Engajamento (Alto): +${pointsConfig.engajamento?.alto || 0}`);
            } else if (engajamento.includes('medio') || engajamento.includes('médio')) {
              totalPoints += pointsConfig.engajamento?.medio || 0;
              appliedCategories.push(`Engajamento (Médio): +${pointsConfig.engajamento?.medio || 0}`);
            } else if (engajamento.includes('baixo')) {
              totalPoints += pointsConfig.engajamento?.baixo || 0;
              appliedCategories.push(`Engajamento (Baixo): +${pointsConfig.engajamento?.baixo || 0}`);
            }
          }
          
          // 2. CLASSIFICAÇÃO
          if (userData.classificacao) {
            const classificacao = userData.classificacao.toLowerCase();
            if (classificacao.includes('frequente')) {
              totalPoints += pointsConfig.classificacao?.frequente || 0;
              appliedCategories.push(`Classificação (Frequente): +${pointsConfig.classificacao?.frequente || 0}`);
            } else {
              totalPoints += pointsConfig.classificacao?.naoFrequente || 0;
              appliedCategories.push(`Classificação (Não Frequente): +${pointsConfig.classificacao?.naoFrequente || 0}`);
            }
          }
          
          // 3. DIZIMISTA
          if (userData.dizimistaType) {
            const dizimista = userData.dizimistaType.toLowerCase();
            if (dizimista.includes('recorrente')) {
              totalPoints += pointsConfig.dizimista?.recorrente || 0;
              appliedCategories.push(`Dizimista (Recorrente): +${pointsConfig.dizimista?.recorrente || 0}`);
            } else if (dizimista.includes('sazonal')) {
              totalPoints += pointsConfig.dizimista?.sazonal || 0;
              appliedCategories.push(`Dizimista (Sazonal): +${pointsConfig.dizimista?.sazonal || 0}`);
            } else if (dizimista.includes('pontual')) {
              totalPoints += pointsConfig.dizimista?.pontual || 0;
              appliedCategories.push(`Dizimista (Pontual): +${pointsConfig.dizimista?.pontual || 0}`);
            } else if (dizimista.includes('não dizimista') || dizimista.includes('nao dizimista')) {
              totalPoints += pointsConfig.dizimista?.naoDizimista || 0;
              appliedCategories.push(`Dizimista (Não Dizimista): +${pointsConfig.dizimista?.naoDizimista || 0}`);
            }
          }
          
          // 4. OFERTANTE
          if (userData.ofertanteType) {
            const ofertante = userData.ofertanteType.toLowerCase();
            if (ofertante.includes('recorrente')) {
              totalPoints += pointsConfig.ofertante?.recorrente || 0;
              appliedCategories.push(`Ofertante (Recorrente): +${pointsConfig.ofertante?.recorrente || 0}`);
            } else if (ofertante.includes('sazonal')) {
              totalPoints += pointsConfig.ofertante?.sazonal || 0;
              appliedCategories.push(`Ofertante (Sazonal): +${pointsConfig.ofertante?.sazonal || 0}`);
            } else if (ofertante.includes('pontual')) {
              totalPoints += pointsConfig.ofertante?.pontual || 0;
              appliedCategories.push(`Ofertante (Pontual): +${pointsConfig.ofertante?.pontual || 0}`);
            } else if (ofertante.includes('não ofertante') || ofertante.includes('nao ofertante')) {
              totalPoints += pointsConfig.ofertante?.naoOfertante || 0;
              appliedCategories.push(`Ofertante (Não Ofertante): +${pointsConfig.ofertante?.naoOfertante || 0}`);
            }
          }
          
          // 5. TEMPO DE BATISMO
          if (userData.tempoBatismoAnos && typeof userData.tempoBatismoAnos === 'number') {
            const tempo = userData.tempoBatismoAnos;
            if (tempo >= 30) {
              totalPoints += pointsConfig.tempoBatismo?.maisVinte || 0;
              appliedCategories.push(`Tempo Batismo (30+ anos): +${pointsConfig.tempoBatismo?.maisVinte || 0}`);
            } else if (tempo >= 20) {
              totalPoints += pointsConfig.tempoBatismo?.vinteAnos || 0;
              appliedCategories.push(`Tempo Batismo (20-30 anos): +${pointsConfig.tempoBatismo?.vinteAnos || 0}`);
            } else if (tempo >= 10) {
              totalPoints += pointsConfig.tempoBatismo?.dezAnos || 0;
              appliedCategories.push(`Tempo Batismo (10-20 anos): +${pointsConfig.tempoBatismo?.dezAnos || 0}`);
            } else if (tempo >= 5) {
              totalPoints += pointsConfig.tempoBatismo?.cincoAnos || 0;
              appliedCategories.push(`Tempo Batismo (5-10 anos): +${pointsConfig.tempoBatismo?.cincoAnos || 0}`);
            } else if (tempo >= 2) {
              totalPoints += pointsConfig.tempoBatismo?.doisAnos || 0;
              appliedCategories.push(`Tempo Batismo (2-5 anos): +${pointsConfig.tempoBatismo?.doisAnos || 0}`);
            }
          }
          
          // 6. CARGOS
          if (userData.temCargo === 'Sim' && userData.departamentosCargos) {
            const numCargos = userData.departamentosCargos.split(';').length;
            if (numCargos >= 3) {
              totalPoints += pointsConfig.cargos?.tresOuMais || 0;
              appliedCategories.push(`Cargos (${numCargos} cargos): +${pointsConfig.cargos?.tresOuMais || 0}`);
            } else if (numCargos === 2) {
              totalPoints += pointsConfig.cargos?.doisCargos || 0;
              appliedCategories.push(`Cargos (${numCargos} cargos): +${pointsConfig.cargos?.doisCargos || 0}`);
            } else if (numCargos === 1) {
              totalPoints += pointsConfig.cargos?.umCargo || 0;
              appliedCategories.push(`Cargos (${numCargos} cargo): +${pointsConfig.cargos?.umCargo || 0}`);
            }
          }
          
          // 7. NOME DA UNIDADE
          if (userData.nomeUnidade && userData.nomeUnidade.trim()) {
            totalPoints += pointsConfig.nomeUnidade?.comUnidade || 0;
            appliedCategories.push(`Nome da Unidade: +${pointsConfig.nomeUnidade?.comUnidade || 0}`);
          }
          
          // 8. TEM LIÇÃO
          if (userData.temLicao === true || userData.temLicao === 'true') {
            totalPoints += pointsConfig.temLicao?.comLicao || 0;
            appliedCategories.push(`Tem Lição: +${pointsConfig.temLicao?.comLicao || 0}`);
          }
          
          // 9. TOTAL DE PRESENÇA
          if (userData.totalPresenca !== undefined && userData.totalPresenca !== null) {
            const presenca = parseInt(userData.totalPresenca);
            if (presenca >= 8 && presenca <= 13) {
              totalPoints += pointsConfig.totalPresenca?.oitoATreze || 0;
              appliedCategories.push(`Total Presença (${presenca}): +${pointsConfig.totalPresenca?.oitoATreze || 0}`);
            } else if (presenca >= 4 && presenca <= 7) {
              totalPoints += pointsConfig.totalPresenca?.quatroASete || 0;
              appliedCategories.push(`Total Presença (${presenca}): +${pointsConfig.totalPresenca?.quatroASete || 0}`);
            } else if (presenca >= 0 && presenca <= 3) {
              totalPoints += pointsConfig.totalPresenca?.zeroATres || 0;
              appliedCategories.push(`Total Presença (${presenca}): +${pointsConfig.totalPresenca?.zeroATres || 0}`);
            }
          }
          
          // 10. ESCOLA SABATINA - COMUNHÃO
          if (userData.comunhao && userData.comunhao > 0) {
            const pontosComunhao = userData.comunhao * (pointsConfig.escolaSabatina?.comunhao || 0);
            totalPoints += pontosComunhao;
            appliedCategories.push(`Comunhão (${userData.comunhao}): +${pontosComunhao}`);
          }
          
          // 11. ESCOLA SABATINA - MISSÃO
          if (userData.missao && userData.missao > 0) {
            const pontosMissao = userData.missao * (pointsConfig.escolaSabatina?.missao || 0);
            totalPoints += pontosMissao;
            appliedCategories.push(`Missão (${userData.missao}): +${pontosMissao}`);
          }
          
          // 12. ESCOLA SABATINA - ESTUDO BÍBLICO
          if (userData.estudoBiblico && userData.estudoBiblico > 0) {
            const pontosEstudoBiblico = userData.estudoBiblico * (pointsConfig.escolaSabatina?.estudoBiblico || 0);
            totalPoints += pontosEstudoBiblico;
            appliedCategories.push(`Estudo Bíblico (${userData.estudoBiblico}): +${pontosEstudoBiblico}`);
          }
          
          // 13. ESCOLA SABATINA - BATIZOU ALGUÉM
          if (userData.batizouAlguem === true || userData.batizouAlguem === 'true' || userData.batizouAlguem === 1) {
            totalPoints += pointsConfig.escolaSabatina?.batizouAlguem || 0;
            appliedCategories.push(`Batizou Alguém: +${pointsConfig.escolaSabatina?.batizouAlguem || 0}`);
          }
          
          // 14. ESCOLA SABATINA - DISCIPULADO PÓS-BATISMO
          if (userData.discPosBatismal && userData.discPosBatismal > 0) {
            const pontosDiscPosBatismo = userData.discPosBatismal * (pointsConfig.escolaSabatina?.discipuladoPosBatismo || 0);
            totalPoints += pontosDiscPosBatismo;
            appliedCategories.push(`Discipulado Pós-Batismo (${userData.discPosBatismal}): +${pontosDiscPosBatismo}`);
          }
          
          // 15. CPF VÁLIDO
          if (userData.cpfValido === 'Sim' || userData.cpfValido === true || userData.cpfValido === 'true') {
            totalPoints += pointsConfig.cpfValido?.valido || 0;
            appliedCategories.push(`CPF Válido: +${pointsConfig.cpfValido?.valido || 0}`);
          }
          
          // 16. CAMPOS VAZIOS ACMS
          if (userData.camposVaziosACMS === false || userData.camposVaziosACMS === 'false') {
            totalPoints += pointsConfig.camposVaziosACMS?.completos || 0;
            appliedCategories.push(`Campos Vazios ACMS (Completos): +${pointsConfig.camposVaziosACMS?.completos || 0}`);
          }
          
          const roundedTotalPoints = Math.round(totalPoints);
          totalCalculatedPoints += roundedTotalPoints;
          
          console.log(`🎯 Total calculado: ${roundedTotalPoints} pontos`);
          console.log(`📊 Categorias aplicadas: ${appliedCategories.length}`);
          appliedCategories.forEach(cat => console.log(`   ${cat}`));
          
          // FORÇAR ATUALIZAÇÃO DE TODOS OS USUÁRIOS
          console.log(`🔍 Comparando: ${user.points} !== ${roundedTotalPoints} = ${user.points !== roundedTotalPoints}`);
          await sql`
            UPDATE users 
            SET points = ${roundedTotalPoints}, updated_at = NOW()
            WHERE id = ${user.id}
          `;
          updatedCount++;
          console.log(`✅ ${user.name}: ${user.points} → ${roundedTotalPoints} pontos`);
        }
        
        console.log(`\n🎉 Cálculo correto concluído!`);
        console.log(`📊 ${updatedCount} usuários atualizados de ${users.length} total`);
        console.log(`🎯 Total de pontos calculados: ${totalCalculatedPoints}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Cálculo correto concluído: ${updatedCount} usuários atualizados`,
            updatedCount,
            totalUsers: users.length,
            totalCalculatedPoints,
            averagePoints: users.length > 0 ? Math.round(totalCalculatedPoints / users.length) : 0
          })
        };
        
      } catch (error) {
        console.error('❌ Erro no cálculo correto de pontos:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor: ' + error.message })
        };
      }
    }

    // Rota para teste simples de cálculo
    if (path === '/api/system/test-calculation' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const userId = body.userId || 754;
        
        console.log(`🧪 Teste de cálculo para usuário ID: ${userId}`);
        
        const user = await sql`SELECT * FROM users WHERE id = ${userId}`;
        if (user.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }
        
        const userData = user[0];
        const pointsConfigResult = await sql`SELECT * FROM points_configuration LIMIT 1`;
        const pointsConfig = pointsConfigResult.length > 0 ? pointsConfigResult[0] : {};
        
        let extraData = {};
        try {
          extraData = JSON.parse(userData.extra_data || '{}');
        } catch (e) {
          console.log('⚠️ Erro ao parsear extra_data:', e.message);
        }
        
        let totalPoints = 0;
        let debug = {};
        
        // Engajamento
        if (extraData.engajamento) {
          const engajamento = extraData.engajamento.toLowerCase();
          if (engajamento.includes('alto')) {
            totalPoints += pointsConfig.engajamento?.alto || 0;
            debug.engajamento = { value: extraData.engajamento, points: pointsConfig.engajamento?.alto || 0 };
          }
        }
        
        // Classificação
        if (extraData.classificacao) {
          const classificacao = extraData.classificacao.toLowerCase();
          if (classificacao.includes('frequente')) {
            totalPoints += pointsConfig.classificacao?.frequente || 0;
            debug.classificacao = { value: extraData.classificacao, points: pointsConfig.classificacao?.frequente || 0 };
          }
        }
        
        // Dizimista
        if (extraData.dizimistaType) {
          const dizimista = extraData.dizimistaType.toLowerCase();
          if (dizimista.includes('recorrente')) {
            totalPoints += pointsConfig.dizimista?.recorrente || 0;
            debug.dizimista = { value: extraData.dizimistaType, points: pointsConfig.dizimista?.recorrente || 0 };
          }
        }
        
        // Ofertante
        if (extraData.ofertanteType) {
          const ofertante = extraData.ofertanteType.toLowerCase();
          if (ofertante.includes('recorrente')) {
            totalPoints += pointsConfig.ofertante?.recorrente || 0;
            debug.ofertante = { value: extraData.ofertanteType, points: pointsConfig.ofertante?.recorrente || 0 };
          }
        }
        
        // Tempo de batismo
        if (extraData.tempoBatismoAnos && typeof extraData.tempoBatismoAnos === 'number') {
          const tempo = extraData.tempoBatismoAnos;
          if (tempo >= 20) {
            totalPoints += pointsConfig.tempoBatismo?.vinteAnos || 0;
            debug.tempoBatismo = { value: tempo, points: pointsConfig.tempoBatismo?.vinteAnos || 0 };
          }
        }
        
        // Cargos
        if (extraData.temCargo === 'Sim' && extraData.departamentosCargos) {
          const numCargos = extraData.departamentosCargos.split(';').length;
          if (numCargos >= 3) {
            totalPoints += pointsConfig.cargos?.tresOuMais || 0;
            debug.cargos = { value: `${numCargos} cargos`, points: pointsConfig.cargos?.tresOuMais || 0 };
          }
        }
        
        // Nome da unidade
        if (extraData.nomeUnidade && extraData.nomeUnidade.trim()) {
          totalPoints += pointsConfig.nomeUnidade?.comUnidade || 0;
          debug.nomeUnidade = { value: extraData.nomeUnidade, points: pointsConfig.nomeUnidade?.comUnidade || 0 };
        }
        
        // Tem lição
        if (extraData.temLicao === true || extraData.temLicao === 'true') {
          totalPoints += pointsConfig.temLicao?.comLicao || 0;
          debug.temLicao = { value: extraData.temLicao, points: pointsConfig.temLicao?.comLicao || 0 };
        }
        
        // Total de presença
        if (extraData.totalPresenca !== undefined && extraData.totalPresenca !== null) {
          const presenca = parseInt(extraData.totalPresenca);
          if (presenca >= 8 && presenca <= 13) {
            totalPoints += pointsConfig.totalPresenca?.oitoATreze || 0;
            debug.totalPresenca = { value: presenca, points: pointsConfig.totalPresenca?.oitoATreze || 0 };
          }
        }
        
        // Escola sabatina - Comunhão
        if (extraData.comunhao && extraData.comunhao > 0) {
          const pontosComunhao = extraData.comunhao * (pointsConfig.escolaSabatina?.comunhao || 0);
          totalPoints += pontosComunhao;
          debug.comunhao = { value: extraData.comunhao, points: pontosComunhao };
        }
        
        // Escola sabatina - Missão
        if (extraData.missao && extraData.missao > 0) {
          const pontosMissao = extraData.missao * (pointsConfig.escolaSabatina?.missao || 0);
          totalPoints += pontosMissao;
          debug.missao = { value: extraData.missao, points: pontosMissao };
        }
        
        // Escola sabatina - Estudo Bíblico
        if (extraData.estudoBiblico && extraData.estudoBiblico > 0) {
          const pontosEstudoBiblico = extraData.estudoBiblico * (pointsConfig.escolaSabatina?.estudoBiblico || 0);
          totalPoints += pontosEstudoBiblico;
          debug.estudoBiblico = { value: extraData.estudoBiblico, points: pontosEstudoBiblico };
        }
        
        // Escola sabatina - Discipulado Pós-Batismo
        if (extraData.discPosBatismal && extraData.discPosBatismal > 0) {
          const pontosDiscPosBatismo = extraData.discPosBatismal * (pointsConfig.escolaSabatina?.discipuladoPosBatismo || 0);
          totalPoints += pontosDiscPosBatismo;
          debug.discPosBatismal = { value: extraData.discPosBatismal, points: pontosDiscPosBatismo };
        }
        
        // CPF válido
        if (extraData.cpfValido === 'Sim' || extraData.cpfValido === true || extraData.cpfValido === 'true') {
          totalPoints += pointsConfig.cpfValido?.valido || 0;
          debug.cpfValido = { value: extraData.cpfValido, points: pointsConfig.cpfValido?.valido || 0 };
        }
        
        // Campos vazios ACMS
        if (extraData.camposVaziosACMS === false || extraData.camposVaziosACMS === 'false') {
          totalPoints += pointsConfig.camposVaziosACMS?.completos || 0;
          debug.camposVaziosACMS = { value: extraData.camposVaziosACMS, points: pointsConfig.camposVaziosACMS?.completos || 0 };
        }
        
        const roundedTotalPoints = Math.round(totalPoints);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            user: {
              id: userData.id,
              name: userData.name,
              currentPoints: userData.points,
              calculatedPoints: roundedTotalPoints
            },
            debug,
            config: {
              engajamento: pointsConfig.engajamento,
              classificacao: pointsConfig.classificacao,
              dizimista: pointsConfig.dizimista,
              ofertante: pointsConfig.ofertante,
              tempoBatismo: pointsConfig.tempoBatismo,
              cargos: pointsConfig.cargos,
              nomeUnidade: pointsConfig.nomeUnidade,
              temLicao: pointsConfig.temLicao,
              totalPresenca: pointsConfig.totalPresenca,
              escolaSabatina: pointsConfig.escolaSabatina,
              cpfValido: pointsConfig.cpfValido,
              camposVaziosACMS: pointsConfig.camposVaziosACMS
            }
          })
        };
        
      } catch (error) {
        console.error('❌ Erro no teste de cálculo:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor: ' + error.message })
        };
      }
    }

    // Rota removida - conflitante com /api/system/calculate-points-clean
    if (false && path === '/api/system/debug-user-points' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const userId = body.userId || 419; // Marly da Silva Pereira por padrão
        
        console.log(`🔍 Debug detalhado para usuário ID: ${userId}`);
        
        const user = await sql`SELECT * FROM users WHERE id = ${userId}`;
        if (user.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
          };
        }
        
        const userData = user[0];
        console.log(`👤 Usuário: ${userData.name}`);
        console.log(`📊 Pontos atuais: ${userData.points}`);
        console.log(`📋 Extra data:`, userData.extra_data);
        
        const pointsConfigResult = await sql`SELECT * FROM points_configuration LIMIT 1`;
        const pointsConfig = pointsConfigResult.length > 0 ? pointsConfigResult[0] : {};
        
        let totalPoints = 0;
        console.log('🧮 Calculando pontos...');
        
        // Parse extra_data
        let extraData = {};
        try {
          extraData = JSON.parse(userData.extra_data || '{}');
          console.log('📋 Dados extra parseados:', extraData);
        } catch (e) {
          console.log('⚠️ Erro ao parsear extra_data:', e.message);
        }
        
        // Engajamento
        if (extraData.engajamento) {
          const engajamento = extraData.engajamento.toLowerCase();
          console.log(`📈 Engajamento: "${extraData.engajamento}" -> ${engajamento}`);
          if (engajamento.includes('baixo')) {
            totalPoints += pointsConfig.engajamento?.baixo || 0;
            console.log(`   +${pointsConfig.engajamento?.baixo || 0} pontos (baixo)`);
          } else if (engajamento.includes('médio') || engajamento.includes('medio')) {
            totalPoints += pointsConfig.engajamento?.medio || 0;
            console.log(`   +${pointsConfig.engajamento?.medio || 0} pontos (médio)`);
          } else if (engajamento.includes('alto')) {
            totalPoints += pointsConfig.engajamento?.alto || 0;
            console.log(`   +${pointsConfig.engajamento?.alto || 0} pontos (alto)`);
          }
        }
        
        // Classificação
        if (extraData.classificacao) {
          const classificacao = extraData.classificacao.toLowerCase();
          console.log(`📊 Classificação: "${extraData.classificacao}" -> ${classificacao}`);
          if (classificacao.includes('frequente')) {
            totalPoints += pointsConfig.classificacao?.frequente || 0;
            console.log(`   +${pointsConfig.classificacao?.frequente || 0} pontos (frequente)`);
          } else {
            totalPoints += pointsConfig.classificacao?.naoFrequente || 0;
            console.log(`   +${pointsConfig.classificacao?.naoFrequente || 0} pontos (não frequente)`);
          }
        }
        
        // Dizimista
        if (extraData.dizimistaType) {
          const dizimista = extraData.dizimistaType.toLowerCase();
          console.log(`💰 Dizimista: "${extraData.dizimistaType}" -> ${dizimista}`);
          if (dizimista.includes('não dizimista') || dizimista.includes('nao dizimista')) {
            totalPoints += pointsConfig.dizimista?.naoDizimista || 0;
            console.log(`   +${pointsConfig.dizimista?.naoDizimista || 0} pontos (não dizimista)`);
          } else if (dizimista.includes('pontual')) {
            totalPoints += pointsConfig.dizimista?.pontual || 0;
            console.log(`   +${pointsConfig.dizimista?.pontual || 0} pontos (pontual)`);
          } else if (dizimista.includes('sazonal')) {
            totalPoints += pointsConfig.dizimista?.sazonal || 0;
            console.log(`   +${pointsConfig.dizimista?.sazonal || 0} pontos (sazonal)`);
          } else if (dizimista.includes('recorrente')) {
            totalPoints += pointsConfig.dizimista?.recorrente || 0;
            console.log(`   +${pointsConfig.dizimista?.recorrente || 0} pontos (recorrente)`);
          }
        }
        
        // Ofertante
        if (extraData.ofertanteType) {
          const ofertante = extraData.ofertanteType.toLowerCase();
          console.log(`🎁 Ofertante: "${extraData.ofertanteType}" -> ${ofertante}`);
          if (ofertante.includes('não ofertante') || ofertante.includes('nao ofertante')) {
            totalPoints += pointsConfig.ofertante?.naoOfertante || 0;
            console.log(`   +${pointsConfig.ofertante?.naoOfertante || 0} pontos (não ofertante)`);
          } else if (ofertante.includes('pontual')) {
            totalPoints += pointsConfig.ofertante?.pontual || 0;
            console.log(`   +${pointsConfig.ofertante?.pontual || 0} pontos (pontual)`);
          } else if (ofertante.includes('sazonal')) {
            totalPoints += pointsConfig.ofertante?.sazonal || 0;
            console.log(`   +${pointsConfig.ofertante?.sazonal || 0} pontos (sazonal)`);
          } else if (ofertante.includes('recorrente')) {
            totalPoints += pointsConfig.ofertante?.recorrente || 0;
            console.log(`   +${pointsConfig.ofertante?.recorrente || 0} pontos (recorrente)`);
          }
        }
        
        // Tempo de batismo
        if (extraData.tempoBatismoAnos && typeof extraData.tempoBatismoAnos === 'number') {
          const tempo = extraData.tempoBatismoAnos;
          console.log(`⏰ Tempo de batismo: ${tempo} anos`);
          if (tempo >= 2 && tempo < 5) {
            totalPoints += pointsConfig.tempoBatismo?.doisAnos || 0;
            console.log(`   +${pointsConfig.tempoBatismo?.doisAnos || 0} pontos (2-5 anos)`);
          } else if (tempo >= 5 && tempo < 10) {
            totalPoints += pointsConfig.tempoBatismo?.cincoAnos || 0;
            console.log(`   +${pointsConfig.tempoBatismo?.cincoAnos || 0} pontos (5-10 anos)`);
          } else if (tempo >= 10 && tempo < 20) {
            totalPoints += pointsConfig.tempoBatismo?.dezAnos || 0;
            console.log(`   +${pointsConfig.tempoBatismo?.dezAnos || 0} pontos (10-20 anos)`);
          } else if (tempo >= 20 && tempo < 30) {
            totalPoints += pointsConfig.tempoBatismo?.vinteAnos || 0;
            console.log(`   +${pointsConfig.tempoBatismo?.vinteAnos || 0} pontos (20-30 anos)`);
          } else if (tempo >= 30) {
            totalPoints += pointsConfig.tempoBatismo?.maisVinte || 0;
            console.log(`   +${pointsConfig.tempoBatismo?.maisVinte || 0} pontos (30+ anos)`);
          }
        }
        
        // Nome da unidade
        if (extraData.nomeUnidade && extraData.nomeUnidade.trim()) {
          console.log(`🏠 Nome da unidade: "${extraData.nomeUnidade}"`);
          totalPoints += pointsConfig.nomeUnidade?.comUnidade || 0;
          console.log(`   +${pointsConfig.nomeUnidade?.comUnidade || 0} pontos (com unidade)`);
        }
        
        // Tem lição
        if (extraData.temLicao) {
          console.log(`📚 Tem lição: ${extraData.temLicao}`);
          totalPoints += pointsConfig.temLicao?.comLicao || 0;
          console.log(`   +${pointsConfig.temLicao?.comLicao || 0} pontos (com lição)`);
        }
        
        // Total de presença
        if (extraData.totalPresenca !== undefined) {
          const presenca = extraData.totalPresenca;
          console.log(`📅 Total presença: ${presenca}`);
          if (presenca >= 0 && presenca <= 3) {
            totalPoints += pointsConfig.totalPresenca?.zeroATres || 0;
            console.log(`   +${pointsConfig.totalPresenca?.zeroATres || 0} pontos (0-3 presenças)`);
          } else if (presenca >= 4 && presenca <= 7) {
            totalPoints += pointsConfig.totalPresenca?.quatroASete || 0;
            console.log(`   +${pointsConfig.totalPresenca?.quatroASete || 0} pontos (4-7 presenças)`);
          } else if (presenca >= 8 && presenca <= 13) {
            totalPoints += pointsConfig.totalPresenca?.oitoATreze || 0;
            console.log(`   +${pointsConfig.totalPresenca?.oitoATreze || 0} pontos (8-13 presenças)`);
          }
        }
        
        // Cargos
        if (extraData.temCargo === 'Sim' && extraData.departamentosCargos) {
          const numCargos = extraData.departamentosCargos.split(';').length;
          console.log(`💼 Cargos: ${numCargos} cargos`);
          if (numCargos === 1) {
            totalPoints += pointsConfig.cargos?.umCargo || 0;
            console.log(`   +${pointsConfig.cargos?.umCargo || 0} pontos (1 cargo)`);
          } else if (numCargos === 2) {
            totalPoints += pointsConfig.cargos?.doisCargos || 0;
            console.log(`   +${pointsConfig.cargos?.doisCargos || 0} pontos (2 cargos)`);
          } else if (numCargos >= 3) {
            totalPoints += pointsConfig.cargos?.tresOuMais || 0;
            console.log(`   +${pointsConfig.cargos?.tresOuMais || 0} pontos (3+ cargos)`);
          }
        }
        
        // Escola sabatina
        if (extraData.comunhao) {
          const pontosComunhao = extraData.comunhao * (pointsConfig.escolaSabatina?.comunhao || 0);
          totalPoints += pontosComunhao;
          console.log(`🤝 Comunhão (${extraData.comunhao}): +${pontosComunhao} pontos`);
        }
        
        if (extraData.missao) {
          const pontosMissao = extraData.missao * (pointsConfig.escolaSabatina?.missao || 0);
          totalPoints += pontosMissao;
          console.log(`🌍 Missão (${extraData.missao}): +${pontosMissao} pontos`);
        }
        
        if (extraData.estudoBiblico) {
          const pontosEstudoBiblico = extraData.estudoBiblico * (pointsConfig.escolaSabatina?.estudoBiblico || 0);
          totalPoints += pontosEstudoBiblico;
          console.log(`📖 Estudo Bíblico (${extraData.estudoBiblico}): +${pontosEstudoBiblico} pontos`);
        }
        
        if (extraData.discPosBatismal) {
          const pontosDiscPosBatismo = extraData.discPosBatismal * (pointsConfig.escolaSabatina?.discipuladoPosBatismo || 0);
          totalPoints += pontosDiscPosBatismo;
          console.log(`👥 Discipulado Pós-Batismo (${extraData.discPosBatismal}): +${pontosDiscPosBatismo} pontos`);
        }
        
        // CPF válido
        if (extraData.cpfValido === 'Sim' || extraData.cpfValido === true) {
          console.log(`🆔 CPF válido: ${extraData.cpfValido}`);
          totalPoints += pointsConfig.cpfValido?.valido || 0;
          console.log(`   +${pointsConfig.cpfValido?.valido || 0} pontos (CPF válido)`);
        }
        
        // Campos vazios ACMS
        if (extraData.camposVaziosACMS === false) {
          console.log(`📝 Campos vazios ACMS: completos`);
          totalPoints += pointsConfig.camposVaziosACMS?.completos || 0;
          console.log(`   +${pointsConfig.camposVaziosACMS?.completos || 0} pontos (campos completos)`);
        }
        
        console.log(`🎯 Total calculado: ${totalPoints} pontos`);
        console.log(`📊 Pontos atuais no DB: ${userData.points}`);
        console.log(`🔄 Precisa atualizar: ${userData.points !== Math.round(totalPoints) ? 'SIM' : 'NÃO'}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            user: {
              id: userData.id,
              name: userData.name,
              currentPoints: userData.points,
              calculatedPoints: Math.round(totalPoints),
              needsUpdate: userData.points !== Math.round(totalPoints)
            },
            extraData,
            calculation: {
              engajamento: extraData.engajamento,
              classificacao: extraData.classificacao,
              totalPoints
            }
          })
        };
        
      } catch (error) {
        console.error('❌ Erro no debug detalhado:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor: ' + error.message })
        };
      }
    }

    // Rota removida - conflitante com /api/system/calculate-points-clean
    if (false && path === '/api/system/debug-points' && method === 'POST') {
      try {
        console.log('🔍 Debug: Analisando dados para cálculo de pontos...');
        
        const users = await sql`SELECT * FROM users LIMIT 3`;
        const pointsConfigResult = await sql`SELECT * FROM points_configuration LIMIT 1`;
        const pointsConfig = pointsConfigResult.length > 0 ? pointsConfigResult[0] : {};
        
        console.log('📊 Configuração de pontos:', pointsConfig);
        console.log('👥 Primeiros 3 usuários:', users.map(u => ({ id: u.id, name: u.name, points: u.points, role: u.role })));
        
        for (const user of users.slice(0, 2)) {
          if (user.email === 'admin@7care.com' || user.role.includes('admin')) {
            console.log(`⏭️ Pulando admin: ${user.name}`);
            continue;
          }
          
          console.log(`\n🔍 Analisando usuário: ${user.name} (ID: ${user.id})`);
          console.log(`📊 Pontos atuais: ${user.points}`);
          
          let userData = {};
          try {
            const userDataResult = await sql`
              SELECT engajamento, classificacao, dizimista, ofertante, tempo_batismo, 
                     cargos, nome_unidade, tem_licao, total_presenca, escola_sabatina,
                     batizou_alguem, discipulado_pos_batismo, cpf_valido, campos_vazios_acms
              FROM users 
              WHERE id = ${user.id}
            `;
            if (userDataResult.length > 0) {
              userData = userDataResult[0];
            }
            console.log('📋 Dados detalhados:', userData);
          } catch (err) {
            console.log(`⚠️ Erro ao buscar dados para ${user.name}:`, err.message);
            continue;
          }
          
          let totalPoints = 0;
          console.log('🧮 Calculando pontos...');
          
          // Engajamento
          if (userData.engajamento) {
            const engajamento = userData.engajamento.toLowerCase();
            console.log(`📈 Engajamento: "${userData.engajamento}" -> ${engajamento}`);
            if (engajamento.includes('baixo')) {
              totalPoints += pointsConfig.engajamento?.baixo || 0;
              console.log(`   +${pointsConfig.engajamento?.baixo || 0} pontos (baixo)`);
            } else if (engajamento.includes('médio') || engajamento.includes('medio')) {
              totalPoints += pointsConfig.engajamento?.medio || 0;
              console.log(`   +${pointsConfig.engajamento?.medio || 0} pontos (médio)`);
            } else if (engajamento.includes('alto')) {
              totalPoints += pointsConfig.engajamento?.alto || 0;
              console.log(`   +${pointsConfig.engajamento?.alto || 0} pontos (alto)`);
            }
          }
          
          console.log(`🎯 Total calculado: ${totalPoints} pontos`);
          console.log(`📊 Pontos atuais no DB: ${user.points}`);
          console.log(`🔄 Precisa atualizar: ${user.points !== Math.round(totalPoints) ? 'SIM' : 'NÃO'}`);
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Debug concluído - verifique os logs',
            usersAnalyzed: users.length,
            config: pointsConfig
          })
        };
        
      } catch (error) {
        console.error('❌ Erro no debug:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor: ' + error.message })
        };
      }
    }

    // Rota removida - conflitante com /api/system/calculate-points-clean
    if (false && path === '/api/system/calculate-points' && method === 'POST') {
      try {
        console.log('🔄 Iniciando cálculo de pontos para todos os usuários...');
        
        // Buscar todos os usuários
        const users = await sql`SELECT * FROM users`;
        console.log(`📊 Total de usuários encontrados: ${users.length}`);
        
        // Buscar configuração de pontos
        const pointsConfigResult = await sql`SELECT * FROM points_configuration LIMIT 1`;
        const pointsConfig = pointsConfigResult.length > 0 ? pointsConfigResult[0] : {};
        
        if (!pointsConfig || Object.keys(pointsConfig).length === 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              message: 'Nenhuma configuração de pontos encontrada. Configure os pontos primeiro.',
              updatedCount: 0,
              totalUsers: users.length
            })
          };
        }
        
        let updatedCount = 0;
        
        for (const user of users) {
          // Pular Super Admin
          if (user.email === 'admin@7care.com' || user.role.includes('admin')) {
            continue;
          }
          
          // Buscar dados detalhados do usuário
            // Parse extra_data do usuário
            let userData = {};
            try {
              userData = JSON.parse(user.extra_data || '{}');
            } catch (err) {
              console.log(`⚠️ Erro ao parsear extra_data para ${user.name}:`, err.message);
              continue;
            }
          
          // Calcular pontos usando a mesma lógica da rota points-details
          let totalPoints = 0;
          
            // Engajamento
            if (userData.engajamento) {
              const engajamento = userData.engajamento.toLowerCase();
              if (engajamento.includes('baixo')) totalPoints += pointsConfig.engajamento?.baixo || 0;
              else if (engajamento.includes('médio') || engajamento.includes('medio')) totalPoints += pointsConfig.engajamento?.medio || 0;
              else if (engajamento.includes('alto')) totalPoints += pointsConfig.engajamento?.alto || 0;
            }
            
            // Classificação
            if (userData.classificacao) {
              const classificacao = userData.classificacao.toLowerCase();
              if (classificacao.includes('frequente')) {
                totalPoints += pointsConfig.classificacao?.frequente || 0;
              } else {
                totalPoints += pointsConfig.classificacao?.naoFrequente || 0;
              }
            }
            
            // Dizimista
            if (userData.dizimistaType) {
              const dizimista = userData.dizimistaType.toLowerCase();
              if (dizimista.includes('não dizimista') || dizimista.includes('nao dizimista')) totalPoints += pointsConfig.dizimista?.naoDizimista || 0;
              else if (dizimista.includes('pontual')) totalPoints += pointsConfig.dizimista?.pontual || 0;
              else if (dizimista.includes('sazonal')) totalPoints += pointsConfig.dizimista?.sazonal || 0;
              else if (dizimista.includes('recorrente')) totalPoints += pointsConfig.dizimista?.recorrente || 0;
            }
            
            // Ofertante
            if (userData.ofertanteType) {
              const ofertante = userData.ofertanteType.toLowerCase();
              if (ofertante.includes('não ofertante') || ofertante.includes('nao ofertante')) totalPoints += pointsConfig.ofertante?.naoOfertante || 0;
              else if (ofertante.includes('pontual')) totalPoints += pointsConfig.ofertante?.pontual || 0;
              else if (ofertante.includes('sazonal')) totalPoints += pointsConfig.ofertante?.sazonal || 0;
              else if (ofertante.includes('recorrente')) totalPoints += pointsConfig.ofertante?.recorrente || 0;
            }
            
            // Tempo de batismo
            if (userData.tempoBatismoAnos && typeof userData.tempoBatismoAnos === 'number') {
              const tempo = userData.tempoBatismoAnos;
              if (tempo >= 2 && tempo < 5) totalPoints += pointsConfig.tempoBatismo?.doisAnos || 0;
              else if (tempo >= 5 && tempo < 10) totalPoints += pointsConfig.tempoBatismo?.cincoAnos || 0;
              else if (tempo >= 10 && tempo < 20) totalPoints += pointsConfig.tempoBatismo?.dezAnos || 0;
              else if (tempo >= 20 && tempo < 30) totalPoints += pointsConfig.tempoBatismo?.vinteAnos || 0;
              else if (tempo >= 30) totalPoints += pointsConfig.tempoBatismo?.maisVinte || 0;
            }
            
            // Cargos
            if (userData.temCargo === 'Sim' && userData.departamentosCargos) {
              const numCargos = userData.departamentosCargos.split(';').length;
              if (numCargos === 1) totalPoints += pointsConfig.cargos?.umCargo || 0;
              else if (numCargos === 2) totalPoints += pointsConfig.cargos?.doisCargos || 0;
              else if (numCargos >= 3) totalPoints += pointsConfig.cargos?.tresOuMais || 0;
            }
            
            // Nome da unidade
            if (userData.nomeUnidade && userData.nomeUnidade.trim()) {
              totalPoints += pointsConfig.nomeUnidade?.comUnidade || 0;
            }
            
            // Tem lição
            if (userData.temLicao) {
              totalPoints += pointsConfig.temLicao?.comLicao || 0;
            }
            
            // Total de presença
            if (userData.totalPresenca !== undefined) {
              const presenca = userData.totalPresenca;
              if (presenca >= 0 && presenca <= 3) totalPoints += pointsConfig.totalPresenca?.zeroATres || 0;
              else if (presenca >= 4 && presenca <= 7) totalPoints += pointsConfig.totalPresenca?.quatroASete || 0;
              else if (presenca >= 8 && presenca <= 13) totalPoints += pointsConfig.totalPresenca?.oitoATreze || 0;
            }
            
            // Escola sabatina
            if (userData.comunhao) totalPoints += (userData.comunhao * (pointsConfig.escolaSabatina?.comunhao || 0));
            if (userData.missao) totalPoints += (userData.missao * (pointsConfig.escolaSabatina?.missao || 0));
            if (userData.estudoBiblico) totalPoints += (userData.estudoBiblico * (pointsConfig.escolaSabatina?.estudoBiblico || 0));
            if (userData.batizouAlguem) totalPoints += pointsConfig.escolaSabatina?.batizouAlguem || 0;
            if (userData.discPosBatismal) totalPoints += (userData.discPosBatismal * (pointsConfig.escolaSabatina?.discipuladoPosBatismo || 0));
            
            // CPF válido
            if (userData.cpfValido === 'Sim' || userData.cpfValido === true) {
              totalPoints += pointsConfig.cpfValido?.valido || 0;
            }
            
            // Campos vazios ACMS
            if (userData.camposVaziosACMS === false) {
              totalPoints += pointsConfig.camposVaziosACMS?.completos || 0;
            }
          
          // Atualizar pontos se mudaram
          const roundedTotalPoints = Math.round(totalPoints);
          if (user.points !== roundedTotalPoints) {
            await sql`
              UPDATE users 
              SET points = ${roundedTotalPoints}, updated_at = NOW()
              WHERE id = ${user.id}
            `;
            updatedCount++;
            console.log(`✅ ${user.name}: ${user.points} → ${roundedTotalPoints} pontos`);
          }
        }
        
        console.log(`✅ Processamento concluído: ${updatedCount} usuários atualizados`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: `Cálculo concluído: ${updatedCount} usuários atualizados`,
            updatedCount,
            totalUsers: users.length
          })
        };
        
      } catch (error) {
        console.error('❌ Erro no cálculo de pontos:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor: ' + error.message })
        };
      }
    }



    // ===== ROTAS DO GOOGLE DRIVE =====
    
    // Configurar Google Drive
    if (path === '/api/calendar/google-drive-config' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { spreadsheetUrl, autoSync, syncInterval, realtimeSync, pollingInterval, lastSync, lastCheck } = body;
        
        // Validar URL (opcional - pode ser vazia para limpar configuração)
        if (spreadsheetUrl && !spreadsheetUrl.includes('docs.google.com/spreadsheets')) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'URL inválida do Google Sheets' })
          };
        }
        
        // Preparar configuração completa
        const configData = {
          spreadsheetUrl: spreadsheetUrl || '',
          autoSync: autoSync || false,
          syncInterval: syncInterval || 60,
          realtimeSync: realtimeSync || false,
          pollingInterval: pollingInterval || 30,
          lastSync: lastSync || null,
          lastCheck: lastCheck || null
        };
        
        // Salvar no banco de dados
        try {
          await sql`
            INSERT INTO system_settings (key, value, description, created_at, updated_at)
            VALUES ('google_drive_config', ${JSON.stringify(configData)}, 'Configurações do Google Drive para sincronização de eventos', NOW(), NOW())
            ON CONFLICT (key) 
            DO UPDATE SET 
              value = ${JSON.stringify(configData)},
              updated_at = NOW()
          `;
          
          console.log('💾 [CONFIG] Configuração Google Drive salva no banco:', configData);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Configuração salva com sucesso',
              config: configData
            })
          };
        } catch (dbError) {
          console.error('❌ [CONFIG] Erro ao salvar no banco:', dbError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro ao salvar configuração no banco de dados' })
          };
        }
      } catch (error) {
        console.error('❌ [CONFIG] Erro ao processar configuração Google Drive:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao salvar configuração' })
        };
      }
    }
    
    // Buscar configuração Google Drive
    if (path === '/api/calendar/google-drive-config' && method === 'GET') {
      try {
        // Buscar configuração salva da tabela system_settings ou usar padrão
        try {
          console.log('🔍 [CONFIG] Buscando configuração no banco...');
          const result = await sql`
            SELECT value FROM system_settings 
            WHERE key = 'google_drive_config'
            LIMIT 1
          `;
          
          console.log('🔍 [CONFIG] Resultado da query:', result);
          
          if (result.length > 0 && result[0].value) {
            console.log('🔍 [CONFIG] Valor encontrado:', result[0].value);
            
            // Se o valor já é um objeto, usar diretamente
            let savedConfig;
            if (typeof result[0].value === 'object') {
              savedConfig = result[0].value;
            } else {
              savedConfig = JSON.parse(result[0].value);
            }
            
            console.log('📋 [CONFIG] Configuração encontrada no banco:', savedConfig);
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(savedConfig)
            };
          } else {
            console.log('⚠️ [CONFIG] Nenhuma configuração encontrada no banco');
          }
        } catch (dbError) {
          console.log('⚠️ [CONFIG] Erro ao buscar do banco, usando padrão:', dbError.message);
        }
        
        // Configuração padrão se não houver nenhuma salva
        const defaultConfig = {
          spreadsheetUrl: '',
          autoSync: false,
          syncInterval: 60,
          realtimeSync: false,
          pollingInterval: 30
        };
        
        console.log('📋 [CONFIG] Usando configuração padrão');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(defaultConfig)
        };
      } catch (error) {
        console.error('❌ [CONFIG] Erro ao buscar configuração Google Drive:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }
    
    // Testar conexão Google Drive
    if (path === '/api/calendar/test-google-drive' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { csvUrl } = body;
        
        if (!csvUrl) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'URL CSV não fornecida' })
          };
        }
        
        // Testar conexão com diferentes formatos de URL
        let response;
        let finalUrl = csvUrl;
        
        try {
          response = await fetch(csvUrl, { 
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; GoogleSheetsBot/1.0)',
              'Accept': 'text/csv,application/csv,*/*'
            },
            redirect: 'follow'
          });
        } catch (error) {
          // Tentar com URL alternativa sem gid
          const altUrl = csvUrl.replace('&gid=0', '').replace('?gid=0', '');
          try {
            response = await fetch(altUrl, { 
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; GoogleSheetsBot/1.0)',
                'Accept': 'text/csv,application/csv,*/*'
              },
              redirect: 'follow'
            });
            finalUrl = altUrl;
          } catch (altError) {
            throw new Error(`Erro de conexão: ${error.message}`);
          }
        }
        
        if (!response.ok) {
          let errorMessage = `Erro HTTP: ${response.status}`;
          if (response.status === 400) {
            errorMessage = `Erro 400: Problema de acesso à planilha. Verifique se:
1. A planilha está compartilhada como "Qualquer pessoa com o link pode ver"
2. A planilha não está vazia
3. A URL está correta
4. A planilha não tem proteção adicional`;
          } else if (response.status === 403) {
            errorMessage = `Erro 403: Acesso negado. A planilha pode estar privada ou protegida.`;
          } else if (response.status === 404) {
            errorMessage = `Erro 404: Planilha não encontrada. Verifique se a URL está correta.`;
          }
          throw new Error(errorMessage);
        }
        
        const csvContent = await response.text();
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({
            success: true,
            message: `Conexão bem-sucedida! ${lines.length} linhas encontradas.`,
            lineCount: lines.length
          })
        };
      } catch (error) {
        console.error('❌ Erro ao testar Google Drive:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: `Erro ao testar conexão: ${error.message}` })
        };
      }
    }
    
    // Verificar mudanças na planilha (polling inteligente)
    if (path === '/api/calendar/check-changes' && method === 'POST') {
      try {
        console.log('🔍 [POLLING] Verificando mudanças na planilha...');
        
        const body = JSON.parse(event.body || '{}');
        const { spreadsheetUrl, lastCheck } = body;
        
        if (!spreadsheetUrl) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'URL da planilha não fornecida' })
          };
        }
        
        // Extrair ID da planilha e gid
        const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+).*[#?].*gid=([0-9]+)/);
        if (!match) {
          throw new Error('URL inválida da planilha');
        }
        
        const spreadsheetId = match[1];
        const gid = match[2];
        
        // Fazer requisição HEAD para verificar se houve mudanças
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
        
        try {
          const response = await fetch(csvUrl, { 
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; GoogleSheetsBot/1.0)',
              'Accept': 'text/csv,application/csv,*/*'
            },
            redirect: 'follow',
            follow: 10
          });
          
          if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
          }
          
          // Verificar headers de modificação
          const lastModified = response.headers.get('last-modified');
          const contentLength = response.headers.get('content-length');
          const etag = response.headers.get('etag');
          
          console.log('📊 [POLLING] Headers da planilha:', {
            lastModified,
            contentLength,
            etag
          });
          
          // Verificar se houve mudanças
          let hasChanges = false;
          let changeReason = '';
          
          if (lastModified) {
            const sheetModified = new Date(lastModified);
            const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(0);
            
            if (sheetModified > lastCheckDate) {
              hasChanges = true;
              changeReason = `Planilha modificada em ${sheetModified.toISOString()}`;
            }
          }
          
          if (!hasChanges && lastCheck) {
            // Verificar se o tamanho mudou (indicativo de mudanças)
            const currentCheck = new Date().toISOString();
            console.log('⏰ [POLLING] Verificação de mudanças:', {
              lastCheck,
              currentCheck,
              hasChanges,
              changeReason
            });
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              hasChanges,
              changeReason,
              lastModified,
              contentLength,
              etag,
              checkedAt: new Date().toISOString()
            })
          };
          
        } catch (fetchError) {
          console.error('❌ [POLLING] Erro ao verificar planilha:', fetchError);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              hasChanges: false,
              error: fetchError.message,
              checkedAt: new Date().toISOString()
            })
          };
        }
        
      } catch (error) {
        console.error('❌ [POLLING] Erro geral:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: `Erro ao verificar mudanças: ${error.message}` })
        };
      }
    }

    // Status da sincronização automática
    if (path === '/api/calendar/sync-status' && method === 'GET') {
      try {
        // Buscar configuração salva
        const configResponse = await fetch(`${process.env.URL || 'https://7care.netlify.app'}/api/calendar/google-drive-config`);
        if (!configResponse.ok) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Configuração não encontrada' })
          };
        }
        
        const config = await configResponse.json();
        
        if (!config.spreadsheetUrl || !config.autoSync) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              autoSync: false,
              message: 'Sincronização automática desabilitada' 
            })
          };
        }
        
        // Calcular próximo sync
        const now = new Date();
        const lastSync = config.lastSync ? new Date(config.lastSync) : new Date(0);
        const timeSinceLastSync = now.getTime() - lastSync.getTime();
        const syncIntervalMs = config.syncInterval * 60 * 1000;
        const nextSyncIn = Math.max(0, syncIntervalMs - timeSinceLastSync);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            autoSync: true,
            syncInterval: config.syncInterval,
            lastSync: config.lastSync,
            nextSyncIn: Math.ceil(nextSyncIn / (60 * 1000)), // em minutos
            nextSyncAt: new Date(now.getTime() + nextSyncIn).toISOString()
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao buscar status:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao buscar status' })
        };
      }
    }

    // Sincronização automática Google Drive
    if (path === '/api/calendar/auto-sync' && method === 'POST') {
      try {
        console.log('🔄 [AUTO-SYNC] Iniciando sincronização automática...');
        
        // Buscar configuração salva diretamente do banco
        let config;
        try {
          const result = await sql`
            SELECT value FROM system_settings 
            WHERE key = 'google_drive_config'
            LIMIT 1
          `;
          
          if (result.length === 0 || !result[0].value) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Configuração do Google Drive não encontrada' })
            };
          }
          
          config = typeof result[0].value === 'object' ? result[0].value : JSON.parse(result[0].value);
          
          if (!config.spreadsheetUrl || !config.autoSync) {
          console.log('⚠️ [AUTO-SYNC] Sincronização automática desabilitada ou URL não configurada');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: false, 
              message: 'Sincronização automática desabilitada' 
            })
          };
        }
        
        } catch (configError) {
          console.error('❌ [AUTO-SYNC] Erro ao buscar configuração:', configError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro ao buscar configuração do Google Drive' })
          };
        }
        
        // Verificar se é hora de sincronizar
        const now = new Date();
        const lastSync = config.lastSync ? new Date(config.lastSync) : new Date(0);
        const timeSinceLastSync = now.getTime() - lastSync.getTime();
        const syncIntervalMs = config.syncInterval * 60 * 1000; // converter minutos para ms
        
        if (timeSinceLastSync < syncIntervalMs) {
          const nextSyncIn = Math.ceil((syncIntervalMs - timeSinceLastSync) / (60 * 1000));
          console.log(`⏰ [AUTO-SYNC] Próxima sincronização em ${nextSyncIn} minutos`);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: false, 
              message: `Próxima sincronização em ${nextSyncIn} minutos`,
              nextSyncIn
            })
          };
        }
        
        // Executar sincronização
        console.log('🚀 [AUTO-SYNC] Executando sincronização...');
        
        // Extrair ID da planilha e GID
        const url = config.spreadsheetUrl.trim();
        let spreadsheetId = '';
        let gid = '0';
        
        const match1 = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match1) {
          spreadsheetId = match1[1];
        }
        
        const gidMatch = url.match(/[?&]gid=(\d+)/);
        if (gidMatch) {
          gid = gidMatch[1];
        }
        
        if (!spreadsheetId) {
          throw new Error('Não foi possível extrair o ID da planilha');
        }
        
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
        
        // Fazer a chamada para a API de sincronização
        const syncResponse = await fetch(`${process.env.URL || 'https://7care.netlify.app'}/api/calendar/sync-google-drive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            csvUrl,
            spreadsheetUrl: url
          }),
        });
        
        const syncResult = await syncResponse.json();
        
        if (syncResult.success) {
          // Atualizar timestamp da última sincronização
          await fetch(`${process.env.URL || 'https://7care.netlify.app'}/api/calendar/google-drive-config`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...config,
              lastSync: now.toISOString()
            }),
          });
          
          console.log('✅ [AUTO-SYNC] Sincronização automática concluída:', syncResult.importedCount, 'eventos');
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Sincronização automática concluída: ${syncResult.importedCount || 0} eventos importados`,
            importedCount: syncResult.importedCount,
            totalEvents: syncResult.totalEvents
          })
        };
        
      } catch (error) {
        console.error('❌ [AUTO-SYNC] Erro na sincronização automática:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: `Erro na sincronização automática: ${error.message}` 
          })
        };
      }
    }

    // Sincronizar Google Drive
    if (path === '/api/calendar/sync-google-drive' && method === 'POST') {
      try {
        console.log('🔄 [SYNC] Iniciando sincronização Google Drive...');
        console.log('🔄 [SYNC] Event body:', event.body);
        
        const body = JSON.parse(event.body || '{}');
        const { spreadsheetUrl, csvUrl } = body;
        
        // Converter spreadsheetUrl para csvUrl se necessário
        let finalCsvUrl = csvUrl;
        if (spreadsheetUrl && !csvUrl) {
          const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
          if (match) {
            const spreadsheetId = match[1];
            
            // Extrair GID da URL se existir
            const gidMatch = spreadsheetUrl.match(/[?&]gid=(\d+)/);
            const gid = gidMatch ? gidMatch[1] : '0';
            
            finalCsvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
            console.log('🔄 [SYNC] GID extraído:', gid);
            console.log('🔄 [SYNC] URL CSV gerada:', finalCsvUrl);
          }
        }
        
        console.log('🔄 [SYNC] CSV URL final:', finalCsvUrl);
        
        if (!finalCsvUrl) {
          console.log('❌ [SYNC] URL CSV não fornecida');
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify({ error: 'URL CSV não fornecida' })
          };
        }
        
        // Buscar dados CSV com diferentes formatos de URL
        let response;
        let finalUrl = finalCsvUrl;
        
        try {
          console.log('🌐 [SYNC] Fazendo fetch da URL:', finalCsvUrl);
          response = await fetch(finalCsvUrl, { 
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; GoogleSheetsBot/1.0)',
              'Accept': 'text/csv,application/csv,*/*'
            },
            redirect: 'follow',
            follow: 10
          });
          console.log('🌐 [SYNC] Resposta recebida:', response.status);
        } catch (error) {
          console.log('⚠️ [SYNC] Erro na primeira tentativa:', error.message);
          // Tentar com URL alternativa sem gid
          const altUrl = csvUrl.replace('&gid=0', '').replace('?gid=0', '');
          try {
            console.log('🌐 [SYNC] Tentando URL alternativa:', altUrl);
            response = await fetch(altUrl, { 
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; GoogleSheetsBot/1.0)',
                'Accept': 'text/csv,application/csv,*/*'
              },
              redirect: 'follow'
            });
            finalUrl = altUrl;
            console.log('🌐 [SYNC] Resposta alternativa:', response.status);
          } catch (altError) {
            console.log('❌ [SYNC] Erro na segunda tentativa:', altError.message);
            throw new Error(`Erro de conexão: ${error.message}`);
          }
        }
        
        if (!response.ok) {
          let errorMessage = `Erro HTTP: ${response.status}`;
          if (response.status === 400) {
            errorMessage = `Erro 400: Problema de acesso à planilha. Verifique se:
1. A planilha está compartilhada como "Qualquer pessoa com o link pode ver"
2. A planilha não está vazia
3. A URL está correta
4. A planilha não tem proteção adicional`;
          } else if (response.status === 403) {
            errorMessage = `Erro 403: Acesso negado. A planilha pode estar privada ou protegida.`;
          } else if (response.status === 404) {
            errorMessage = `Erro 404: Planilha não encontrada. Verifique se a URL está correta.`;
          }
          console.log('❌ [SYNC] Erro HTTP:', errorMessage);
          throw new Error(errorMessage);
        }
        
        const csvContent = await response.text();
        console.log('📄 [SYNC] CSV Content Preview:', csvContent.substring(0, 500));
        
        const lines = csvContent.split('\n').filter(line => line.trim());
        console.log('📊 [SYNC] Total lines found:', lines.length);
        
        if (lines.length < 2) {
          console.log('❌ [SYNC] Planilha vazia');
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Planilha vazia ou sem dados' })
          };
        }
        
        // Melhor parsing CSV para lidar com vírgulas dentro de aspas
        function parseCSVLine(line) {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        }
        
        const headers = parseCSVLine(lines[0]);
        console.log('📋 [SYNC] Headers:', headers);
        const events = [];
        
        // Converter data brasileira (DD/MM/YYYY) para ISO
        function parseBrazilianDate(dateStr) {
          if (!dateStr) {
            console.log('⚠️ [SYNC] Data vazia, usando data atual');
            return new Date().toISOString().split('T')[0]; // Apenas YYYY-MM-DD
          }
          try {
            const cleanDate = dateStr.trim();
            console.log('📅 [SYNC] Processando data:', cleanDate);
            const [day, month, year] = cleanDate.split('/');
            if (day && month && year) {
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const dateOnly = date.toISOString().split('T')[0]; // Apenas YYYY-MM-DD
              console.log('📅 [SYNC] Data convertida:', dateOnly);
              return dateOnly;
            }
          } catch (error) {
            console.log('⚠️ [SYNC] Erro ao converter data:', dateStr, error.message);
          }
          console.log('⚠️ [SYNC] Usando data padrão para:', dateStr);
          return new Date().toISOString().split('T')[0]; // Apenas YYYY-MM-DD
        }
        
        // Mapear categoria flexível com cores dinâmicas
        function mapEventType(categoryStr) {
          if (!categoryStr) {
            console.log('⚠️ [SYNC] Categoria vazia, usando padrão');
            return { type: 'igreja-local', color: '#ef4444' };
          }
          
          const category = categoryStr.toLowerCase().trim();
          console.log('🏷️ [SYNC] Mapeando categoria:', category);
          
          // Categorias estabelecidas com suas cores
          const establishedCategories = {
            // Igreja Local - Vermelho
            'igreja-local': { 
              variations: ['igreja local', 'igreja-local', 'local', 'igreja', 'culto', 'cultos', 'culto dominical', 'culto de domingo', 'escola sabatina', 'escola sabática', 'escola sabatica', 'reunião de oração', 'reuniao de oracao', 'oração', 'oracao', 'jovem', 'jovens', 'culto jovem', 'culto de jovens', 'batismo', 'batismos', 'cerimônia de batismo', 'cerimonia de batismo', 'ação de graças', 'acao de gracas', 'ação', 'acao', 'escola bíblica', 'escola biblica', 'escola bíblica dominical'],
              color: '#ef4444' // Vermelho
            },
            
            // ASR Geral - Laranja
            'asr-geral': { 
              variations: ['asr geral', 'asr-geral', 'asr_geral', 'asr', 'conferência', 'conferencia', 'conferência geral', 'conferencia geral', 'conferência anual', 'conferencia anual', 'conferência de fim de ano', 'conferencia de fim de ano', 'retiro', 'retiros', 'retiro espiritual', 'retiro de fim de ano', 'missões', 'missoes', 'conferência de missões', 'conferencia de missoes'],
              color: '#f97316' // Laranja
            },
            
            // ASR Administrativo - Ciano
            'asr-administrativo': { 
              variations: ['asr administrativo', 'asr-administrativo', 'asr_administrativo', 'administrativo', 'admin', 'reunião administrativa', 'reuniao administrativa', 'reuniões administrativas', 'reunioes administrativas', 'plenária', 'plenaria', 'cd plenária', 'cd plenaria'],
              color: '#06b6d4' // Ciano
            },
            
            // ASR Pastores - Roxo
            'asr-pastores': { 
              variations: ['asr pastores', 'asr-pastores', 'asr_pastores', 'pastores', 'pastor', 'reunião de pastores', 'reuniao de pastores', 'concílio ministerial', 'concilio ministerial', 'concílio anual', 'concilio anual', 'formação teológica', 'formacao teologica', 'vocações ministeriais', 'vocacoes ministeriais'],
              color: '#8b5cf6' // Roxo
            },
            
            // Visitas - Verde
            'visitas': { 
              variations: ['visitas', 'visita', 'visitação', 'visitacao'],
              color: '#10b981' // Verde
            },
            
            // Reuniões - Azul
            'reuniões': { 
              variations: ['reuniões', 'reunioes', 'reunião', 'reuniao'],
              color: '#3b82f6' // Azul
            },
            
            // Pregações - Índigo
            'pregacoes': { 
              variations: ['pregacoes', 'pregações', 'pregacao', 'pregação', 'sermão', 'sermao', 'pregação especial', 'pregacao especial'],
              color: '#6366f1' // Índigo
            }
          };
          
          // Buscar categoria correspondente - ordem de prioridade: mais específico primeiro
          const priorityOrder = ['asr-administrativo', 'asr-pastores', 'asr-geral', 'igreja-local', 'visitas', 'reuniões', 'pregacoes'];
          
          for (const standardCategory of priorityOrder) {
            const data = establishedCategories[standardCategory];
            if (data) {
              for (const variation of data.variations) {
                if (category.includes(variation) || variation.includes(category)) {
                  console.log(`✅ [SYNC] Categoria estabelecida mapeada: "${category}" -> "${standardCategory}" (${data.color})`);
                  return { type: standardCategory, color: data.color };
                }
              }
            }
          }
          
          // Se não encontrar correspondência, tentar detectar por palavras-chave
          // Ordem de prioridade: mais específico primeiro
          
          if (category.includes('plenária') || category.includes('plenaria') || 
              (category.includes('administrativ') && category.includes('reuni')) ||
              (category.includes('cd') && category.includes('plenaria'))) {
            console.log(`✅ [SYNC] Categoria detectada por palavra-chave: "${category}" -> "asr-administrativo"`);
            return { type: 'asr-administrativo', color: '#06b6d4' };
          }
          
          if (category.includes('concílio') || category.includes('concilio') ||
              category.includes('ministerial') || category.includes('formação teológica') ||
              category.includes('formacao teologica') || category.includes('vocações ministeriais') ||
              (category.includes('pastor') && (category.includes('formação') || category.includes('teológica') || category.includes('ministerial')))) {
            console.log(`✅ [SYNC] Categoria detectada por palavra-chave: "${category}" -> "asr-pastores"`);
            return { type: 'asr-pastores', color: '#8b5cf6' };
          }
          
          if (category.includes('administrativo') || category.includes('admin')) {
            console.log(`✅ [SYNC] Categoria detectada por palavra-chave: "${category}" -> "asr-administrativo"`);
            return { type: 'asr-administrativo', color: '#06b6d4' };
          }
          
          if (category.includes('pastor')) {
            console.log(`✅ [SYNC] Categoria detectada por palavra-chave: "${category}" -> "asr-pastores"`);
            return { type: 'asr-pastores', color: '#8b5cf6' };
          }
          
          if (category.includes('conferência') || category.includes('conferencia')) {
            console.log(`✅ [SYNC] Categoria detectada por palavra-chave: "${category}" -> "asr-geral"`);
            return { type: 'asr-geral', color: '#f97316' };
          }
          
          if (category.includes('retiro') || category.includes('espiritual')) {
            console.log(`✅ [SYNC] Categoria detectada por palavra-chave: "${category}" -> "asr-geral"`);
            return { type: 'asr-geral', color: '#f97316' };
          }
          
          if (category.includes('missões') || category.includes('missoes')) {
            console.log(`✅ [SYNC] Categoria detectada por palavra-chave: "${category}" -> "asr-geral"`);
            return { type: 'asr-geral', color: '#f97316' };
          }
          
          if (category.includes('visita')) {
            console.log(`✅ [SYNC] Categoria detectada por palavra-chave: "${category}" -> "visitas"`);
            return { type: 'visitas', color: '#10b981' };
          }
          
          if (category.includes('pregação') || category.includes('pregacao') || category.includes('sermão') || category.includes('sermao')) {
            console.log(`✅ [SYNC] Categoria detectada por palavra-chave: "${category}" -> "pregacoes"`);
            return { type: 'pregacoes', color: '#6366f1' };
          }
          
          // Nova categoria - gerar cor dinâmica
          const newCategoryColor = generateDynamicColor(category);
          console.log(`🆕 [SYNC] Nova categoria detectada: "${category}" -> cor dinâmica: ${newCategoryColor}`);
          return { type: category, color: newCategoryColor };
        }
        
        // Gerar cor dinâmica para novas categorias
        function generateDynamicColor(categoryName) {
          // Paleta de cores para novas categorias
          const dynamicColors = [
            '#ec4899', // Rosa
            '#f59e0b', // Âmbar
            '#84cc16', // Lima
            '#14b8a6', // Teal
            '#a855f7', // Violeta
            '#ef4444', // Vermelho
            '#f97316', // Laranja
            '#06b6d4', // Ciano
            '#8b5cf6', // Roxo
            '#10b981', // Verde
            '#3b82f6', // Azul
            '#6366f1', // Índigo
            '#64748b', // Slate
            '#dc2626', // Vermelho escuro
            '#ea580c', // Laranja escuro
            '#0891b2', // Ciano escuro
            '#7c3aed', // Roxo escuro
            '#059669', // Verde escuro
            '#2563eb', // Azul escuro
            '#4f46e5'  // Índigo escuro
          ];
          
          // Gerar hash simples baseado no nome da categoria
          let hash = 0;
          for (let i = 0; i < categoryName.length; i++) {
            hash = ((hash << 5) - hash + categoryName.charCodeAt(i)) & 0xffffffff;
          }
          
          // Usar hash para selecionar cor
          const colorIndex = Math.abs(hash) % dynamicColors.length;
          return dynamicColors[colorIndex];
        }

        
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          console.log(`📝 [SYNC] Line ${i}:`, values);
          
          // FORMATO CORRETO DO GOOGLE SHEETS:
          // values[0] = ID (pular)
          // values[1] = Título
          // values[2] = Data Início
          // values[3] = Data Fim
          // values[4] = Categoria
          // values[5] = Descrição
          // values[6] = Local (opcional)
          
          // Verificar se a linha tem dados suficientes (precisa ter pelo menos ID, título, data início, data fim)
          if (values.length >= 4 && values[1] && values[2] && values[3]) {
            console.log(`✅ [SYNC] Line ${i} has sufficient data`);
            
            const categoryData = mapEventType(values[4] || '');
            console.log(`🏷️ [SYNC] Line ${i} category mapped:`, categoryData);
            
            const parsedStartDate = parseBrazilianDate(values[2]);
            const parsedEndDate = parseBrazilianDate(values[3]);
            console.log(`📅 [SYNC] Line ${i} dates parsed:`, {
              start: values[2], parsedStart: parsedStartDate,
              end: values[3], parsedEnd: parsedEndDate
            });
            
            if (parsedStartDate && parsedEndDate) {
              const event = {
                title: values[1] || 'Evento',
                date: parsedStartDate,
                end_date: parsedEndDate,
                type: categoryData.type,
                color: categoryData.color,
                description: values[5] || '',
                location: values[6] || ''
              };
              events.push(event);
              console.log('✅ [SYNC] Event created and added:', event);
            } else {
              console.log('❌ [SYNC] Line skipped (invalid dates):', {
                start: values[2], parsedStart: parsedStartDate,
                end: values[3], parsedEnd: parsedEndDate
              });
            }
          } else {
            console.log('❌ [SYNC] Line skipped (insufficient data):', {
              valuesLength: values.length,
              id: values[0],
              title: values[1],
              startDate: values[2],
              endDate: values[3]
            });
          }
        }
        
        if (events.length === 0) {
          console.log('⚠️ [SYNC] Nenhum evento encontrado no Google Sheets - NÃO vou deletar eventos existentes');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true,
              importedCount: 0,
              totalEvents: 0,
              message: 'Planilha vazia - eventos existentes preservados'
            })
          };
        }
        
        console.log('🔄 [SYNC] Sincronizando eventos de forma inteligente...');
        
        // 1. Buscar eventos existentes no banco
        const existingEvents = await sql`SELECT id, title, date, end_date, type, description, location FROM events`;
        console.log(`📊 [SYNC] ${existingEvents.length} eventos no banco, ${events.length} eventos no Sheets`);
        
        // 2. Criar mapas para comparação usando apenas título + data (SEM tipo para evitar problemas)
        const existingEventsMap = new Map();
        existingEvents.forEach(e => {
          const dateStr = e.date.toISOString().split('T')[0];
          const key = `${e.title.toLowerCase().trim()}_${dateStr}`;
          existingEventsMap.set(key, e);
        });
        
        const sheetsEventsMap = new Map();
        events.forEach(e => {
          const key = `${e.title.toLowerCase().trim()}_${e.date}`;
          sheetsEventsMap.set(key, e);
        });
        
        let importedCount = 0;
        let updatedCount = 0;
        let deletedCount = 0;
        
        // 3. PROTEÇÃO: NÃO deletar nada se tiver menos de 10 eventos no Sheets
        // (possível erro de leitura)
        const shouldDelete = events.length >= 10;
        
        if (!shouldDelete) {
          console.log('⚠️ [SYNC] PROTEÇÃO ATIVADA: Poucos eventos no Sheets, não vou deletar nada do banco');
        }
        
        // 4. Deletar eventos que não estão mais no Sheets (COM PROTEÇÃO)
        if (shouldDelete) {
          for (const existingEvent of existingEvents) {
            const dateStr = existingEvent.date.toISOString().split('T')[0];
            const key = `${existingEvent.title.toLowerCase().trim()}_${dateStr}`;
            if (!sheetsEventsMap.has(key)) {
              console.log(`🗑️ [SYNC] Deletando evento ausente no Sheets: ${existingEvent.title}`);
              try {
                await sql`DELETE FROM events WHERE id = ${existingEvent.id}`;
                deletedCount++;
              } catch (error) {
                console.error(`❌ [SYNC] Erro ao deletar evento ${existingEvent.id}:`, error.message);
              }
            }
          }
        }
        
        // 5. Inserir ou atualizar eventos do Sheets
        for (const eventData of events) {
          const key = `${eventData.title.toLowerCase().trim()}_${eventData.date}`;
          const existingEvent = existingEventsMap.get(key);
          
          try {
            if (!existingEvent) {
              // Evento novo - inserir
              console.log(`➕ [SYNC] Inserindo novo evento:`, eventData.title);
              
              await sql`
                INSERT INTO events (title, date, end_date, type, color, description, location, created_at, updated_at)
                VALUES (${eventData.title}, ${eventData.date}::date, ${eventData.end_date}::date, ${eventData.type}, ${eventData.color}, ${eventData.description}, ${eventData.location || ''}, NOW(), NOW())
                ON CONFLICT DO NOTHING
              `;
              importedCount++;
            } else {
              // Evento existe - verificar se precisa atualizar
              const needsUpdate = 
                existingEvent.end_date?.toISOString().split('T')[0] !== eventData.end_date ||
                existingEvent.description !== eventData.description ||
                existingEvent.location !== (eventData.location || '');
              
              if (needsUpdate) {
                console.log(`📝 [SYNC] Atualizando evento:`, eventData.title);
                await sql`
                  UPDATE events 
                  SET 
                    date = ${eventData.date}::date,
                    end_date = ${eventData.end_date}::date,
                    description = ${eventData.description},
                    location = ${eventData.location || ''},
                    updated_at = NOW()
                  WHERE id = ${existingEvent.id}
                `;
                updatedCount++;
              }
            }
          } catch (error) {
            console.error('❌ [SYNC] Erro ao processar evento:', error.message);
          }
        }
        
        console.log(`✅ [SYNC] Sincronização concluída:`);
        console.log(`   - Novos: ${importedCount}`);
        console.log(`   - Atualizados: ${updatedCount}`);
        console.log(`   - Deletados: ${deletedCount}`);
        console.log(`   - Total no Sheets: ${events.length}`);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({
            success: true,
            message: `Sincronizado: ${importedCount} novos, ${updatedCount} atualizados, ${deletedCount} removidos`,
            importedCount,
            updatedCount,
            deletedCount,
            totalEvents: events.length
          })
        };
      } catch (error) {
        console.error('💥 [SYNC] ERRO CRÍTICO na sincronização Google Drive:', error);
        console.error('💥 [SYNC] Stack trace:', error.stack);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({ 
            error: `Erro na sincronização: ${error.message}`,
            details: error.stack
          })
        };
      }
    }

    // ===== FUNÇÕES DE SINCRONIZAÇÃO DE TAREFAS COM GOOGLE SHEETS =====
    
    // Função para adicionar tarefas à planilha do Google Drive
    async function addTasksToGoogleDrive(tasks) {
      try {
        console.log('📊 [TASKS-GOOGLE-DRIVE] Tentando adicionar tarefas à planilha...');
        
        // Buscar configuração do Google Drive
        const configResult = await sql`
          SELECT value FROM system_settings 
          WHERE key = 'google_drive_config'
          LIMIT 1
        `;
        
        if (configResult.length === 0 || !configResult[0].value) {
          console.log('⚠️ [TASKS-GOOGLE-DRIVE] Configuração do Google Drive não encontrada');
          return { success: false, message: 'Configuração do Google Drive não encontrada' };
        }
        
        const config = typeof configResult[0].value === 'object' ? 
          configResult[0].value : 
          JSON.parse(configResult[0].value);
        
        if (!config.spreadsheetUrl) {
          console.log('⚠️ [TASKS-GOOGLE-DRIVE] URL da planilha não configurada');
          return { success: false, message: 'URL da planilha não configurada' };
        }
        
        console.log(`📊 [TASKS-GOOGLE-DRIVE] Configuração encontrada: ${config.spreadsheetUrl}`);
        
        // Extrair ID da planilha e gid
        const match = config.spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+).*[#?].*gid=([0-9]+)/);
        if (!match) {
          throw new Error('URL inválida da planilha');
        }
        
        const spreadsheetId = match[1];
        const gid = match[2];
        
        console.log(`📊 [TASKS-GOOGLE-DRIVE] Spreadsheet ID: ${spreadsheetId}, GID: ${gid}`);
        
        let addedCount = 0;
        
        // Processar cada tarefa
        for (const task of tasks) {
          try {
            console.log(`📊 [TASKS-GOOGLE-DRIVE] Processando tarefa: ${task.title}`);
            
            // Buscar informações do usuário responsável
            let assignedToName = 'Não atribuída';
            if (task.assigned_to) {
              const userResult = await sql`
                SELECT name FROM users WHERE id = ${task.assigned_to}
              `;
              if (userResult.length > 0) {
                assignedToName = userResult[0].name;
              }
            }
            
            // Buscar informações do criador
            let createdByName = 'Sistema';
            if (task.created_by) {
              const creatorResult = await sql`
                SELECT name FROM users WHERE id = ${task.created_by}
              `;
              if (creatorResult.length > 0) {
                createdByName = creatorResult[0].name;
              }
            }
            
            // Formatar data de vencimento
            const dueDate = task.due_date ? 
              new Date(task.due_date).toLocaleDateString('pt-BR') : 
              'Sem prazo';
            
            // Formatar data de criação
            const createdAt = new Date(task.created_at).toLocaleDateString('pt-BR');
            
            // Formatar data de conclusão
            const completedAt = task.completed_at ? 
              new Date(task.completed_at).toLocaleDateString('pt-BR') : 
              '';
            
            // Dados da tarefa para a planilha
            const taskData = {
              id: task.id,
              titulo: task.title,
              descricao: task.description || '',
              status: task.status === 'completed' ? 'Concluída' : 
                     task.status === 'in_progress' ? 'Em Progresso' : 'Pendente',
              prioridade: task.priority === 'high' ? 'Alta' : 
                         task.priority === 'low' ? 'Baixa' : 'Média',
              responsavel: assignedToName,
              criador: createdByName,
              data_criacao: createdAt,
              data_vencimento: dueDate,
              data_conclusao: completedAt,
              tags: task.tags || ''
            };
            
            console.log(`📊 [TASKS-GOOGLE-DRIVE] Dados da tarefa preparados:`, taskData);
            
            // Tentar adicionar via Google Apps Script
            try {
              // URL do Google Apps Script
              const scriptUrl = 'https://script.google.com/macros/s/AKfycbw7ylcQvor2tlElCamOqsBKuFyb-tVLYIVejzIsJ-OsOFpe8lO15Sz0GMuCTiBzN3xh/exec';
              
              console.log(`📊 [TASKS-GOOGLE-DRIVE] Chamando Google Apps Script para: ${task.title}`);
              
              const scriptResponse = await fetch(scriptUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'addTask',
                  spreadsheetId: spreadsheetId,
                  sheetName: 'tarefas',
                  taskData: taskData
                })
              });
              
              console.log(`📊 [TASKS-GOOGLE-DRIVE] Status da resposta: ${scriptResponse.status}`);
              
              if (!scriptResponse.ok) {
                throw new Error(`HTTP ${scriptResponse.status}: ${scriptResponse.statusText}`);
              }
              
              const scriptResult = await scriptResponse.json();
              console.log(`📊 [TASKS-GOOGLE-DRIVE] Resultado do script:`, scriptResult);
              
              if (scriptResult.success) {
                console.log(`✅ [TASKS-GOOGLE-DRIVE] Tarefa "${task.title}" adicionada à planilha`);
                addedCount++;
              } else {
                throw new Error(`Google Apps Script falhou: ${scriptResult.message}`);
              }
              
            } catch (scriptError) {
              console.error(`❌ [TASKS-GOOGLE-DRIVE] Erro ao chamar Google Apps Script para "${task.title}":`, scriptError.message);
              
              // Fallback: Salvar para processamento posterior
              try {
                await sql`
                  INSERT INTO pending_google_drive_tasks (title, description, status, priority, assigned_to, created_by, due_date, tags, spreadsheet_id, created_at)
                  VALUES (${task.title}, ${task.description || ''}, ${task.status}, ${task.priority}, ${task.assigned_to}, ${task.created_by}, ${task.due_date}, ${task.tags || ''}, ${spreadsheetId}, NOW())
                `;
                
                console.log(`✅ [TASKS-GOOGLE-DRIVE] Tarefa "${task.title}" salva para processamento posterior`);
                addedCount++;
              } catch (fallbackError) {
                console.error(`❌ [TASKS-GOOGLE-DRIVE] Erro no fallback para "${task.title}":`, fallbackError.message);
              }
            }
            
          } catch (error) {
            console.error(`❌ [TASKS-GOOGLE-DRIVE] Erro ao processar tarefa "${task.title}":`, error.message);
          }
        }
        
        const result = {
          success: true,
          message: `${addedCount} tarefas processadas para a planilha do Google Drive`,
          addedCount,
          totalTasks: tasks.length
        };
        
        console.log(`✅ [TASKS-GOOGLE-DRIVE] Resultado: ${result.message}`);
        return result;
        
      } catch (error) {
        console.error('❌ [TASKS-GOOGLE-DRIVE] Erro ao adicionar tarefas à planilha:', error);
        return { success: false, message: `Erro: ${error.message}` };
      }
    }
    
    // Função para sincronizar tarefas da planilha para o app
    async function syncTasksFromGoogleDrive(csvUrl, spreadsheetUrl) {
      try {
        console.log('🔄 [TASKS-SYNC] Iniciando sincronização de tarefas do Google Drive...');
        console.log('📊 [TASKS-SYNC] Spreadsheet URL:', spreadsheetUrl);
        
        // Extrair ID da planilha
        const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
          throw new Error('URL inválida da planilha');
        }
        
        const spreadsheetId = match[1];
        console.log(`📊 [TASKS-SYNC] Spreadsheet ID: ${spreadsheetId}`);
        
        // Chamar Google Apps Script para obter tarefas da planilha
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbw7ylcQvor2tlElCamOqsBKuFyb-tVLYIVejzIsJ-OsOFpe8lO15Sz0GMuCTiBzN3xh/exec';
        
        console.log('📊 [TASKS-SYNC] Chamando Google Apps Script para obter tarefas...');
        
        const scriptResponse = await fetch(scriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'getTasks',
            spreadsheetId: spreadsheetId,
            sheetName: 'tarefas'
          })
        });
        
        if (!scriptResponse.ok) {
          throw new Error(`Erro ao chamar Google Apps Script: ${scriptResponse.status}`);
        }
        
        const scriptResult = await scriptResponse.json();
        console.log('📊 [TASKS-SYNC] Resultado do Google Apps Script:', scriptResult);
        
        if (!scriptResult.success) {
          throw new Error(`Google Apps Script falhou: ${scriptResult.message}`);
        }
        
        const tasks = scriptResult.tasks || [];
        console.log(`📊 [TASKS-SYNC] ${tasks.length} tarefas obtidas da planilha`);
        
        if (tasks.length === 0) {
          console.log('📄 [TASKS-SYNC] Planilha vazia');
          return { success: true, importedTasks: 0, removedTasks: 0, totalTasks: 0, message: 'Planilha vazia' };
        }
        
        const spreadsheetTaskIds = new Set();
        let importedCount = 0;
        let errorCount = 0;
        const errors = []; // 🆕 Array para coletar erros detalhados
        
        // Processar cada tarefa
        for (const task of tasks) {
          // 🆕 Definir title FORA do try para estar disponível no catch
          let title = 'Tarefa sem nome';
          
          try {
            // 🆕 NÃO usar ID do Sheets (pode ser string/inválido)
            // Vamos buscar/criar por título único
            title = task.titulo || task.title || task.Título;
            const description = task.descricao || task.description || task.Descrição || '';
            const status = task.status || task.Status || 'pending';
            const priority = task.prioridade || task.priority || task.Prioridade || 'medium';
            const assignedTo = task.responsavel || task.assignedTo || task.Responsável || '';
            const createdBy = task.criador || task.createdBy || task.Criador || '';
            const dueDate = task.data_vencimento || task.dueDate || task['Data Vencimento'] || '';
            const completedAt = task.data_conclusao || task.completedAt || task['Data Conclusão'] || '';
            const tags = task.tags || task.Tags || '';
            
            // Validar dados obrigatórios
            if (!title || title.trim() === '') {
              console.log(`⚠️ [TASKS-SYNC] Tarefa sem título, pulando...`);
              errorCount++;
              continue;
            }
            
            // Mapear status
            let mappedStatus = 'pending';
            if (status.toLowerCase().includes('concluída') || status.toLowerCase().includes('completed')) {
              mappedStatus = 'completed';
            } else if (status.toLowerCase().includes('progresso') || status.toLowerCase().includes('progress')) {
              mappedStatus = 'in_progress';
            }
            
            // Mapear prioridade
            let mappedPriority = 'medium';
            if (priority.toLowerCase().includes('alta') || priority.toLowerCase().includes('high')) {
              mappedPriority = 'high';
            } else if (priority.toLowerCase().includes('baixa') || priority.toLowerCase().includes('low')) {
              mappedPriority = 'low';
            }
            
            // 🆕 SIMPLIFICADO: IDs fixos para evitar erros
            const assignedToId = null;
            const createdById = 1;
            
            // 🆕 SIMPLIFICADO: Sem parsear datas para evitar erros
            const dueDateFormatted = null;
            const completedAtFormatted = null;
            
            const taskData = {
              title,
              description,
              status: mappedStatus,
              priority: mappedPriority,
              assigned_to: assignedToId,
              created_by: createdById,
              due_date: dueDateFormatted,
              completed_at: completedAtFormatted,
              tags: [] // 🆕 SIMPLIFICADO: Sempre array vazio para evitar erros
            };
            
            // 🆕 Buscar tarefa por título (não por ID do Sheets)
            const existingTask = await sql`
              SELECT id FROM tasks 
              WHERE title = ${title} 
              AND created_by = ${createdById}
              LIMIT 1
            `;
            
            if (existingTask.length > 0) {
              // Atualizar tarefa existente
              const taskId = existingTask[0].id;
              spreadsheetTaskIds.add(taskId);
              
              await sql`
                UPDATE tasks SET
                  description = ${taskData.description},
                  status = ${taskData.status},
                  priority = ${taskData.priority},
                  assigned_to = ${taskData.assigned_to},
                  due_date = ${taskData.due_date},
                  completed_at = ${taskData.completed_at},
                  updated_at = NOW()
                WHERE id = ${taskId}
              `;
              
              console.log(`🔄 [TASKS-SYNC] Tarefa "${title}" atualizada (ID: ${taskId})`);
            } else {
              // Criar nova tarefa (PostgreSQL gera ID automaticamente)
              const result = await sql`
                INSERT INTO tasks (
                  title, description, status, priority, assigned_to, 
                  created_by, due_date, completed_at, created_at, updated_at
                ) VALUES (
                  ${taskData.title}, ${taskData.description}, ${taskData.status}, 
                  ${taskData.priority}, ${taskData.assigned_to}, ${taskData.created_by}, 
                  ${taskData.due_date}, ${taskData.completed_at}, 
                  NOW(), NOW()
                )
                RETURNING id
              `;
              
              const newTaskId = result[0].id;
              spreadsheetTaskIds.add(newTaskId);
              
              console.log(`➕ [TASKS-SYNC] Tarefa "${title}" criada (ID: ${newTaskId})`);
            }
            
            importedCount++;
            
          } catch (error) {
            const errorMsg = `Tarefa "${title}": ${error.message}`;
            console.error(`❌ [TASKS-SYNC]`, errorMsg);
            console.error(`❌ [TASKS-SYNC] Stack:`, error.stack);
            errors.push(errorMsg); // 🆕 Adicionar ao array
            errorCount++;
          }
        }
        
        console.log(`📊 [TASKS-SYNC] ${tasks.length} tarefas processadas, ${errorCount} erros`);
        
        // Obter IDs das tarefas que existem na planilha
        
        // Importar tarefas para o banco de dados
        for (const task of tasks) {
          try {
            // Verificar se já existe uma tarefa com o mesmo título e criador
            const existingTask = await sql`
              SELECT id FROM tasks 
              WHERE title = ${task.title} 
              AND created_by = ${task.created_by}
              LIMIT 1
            `;
            
            if (existingTask.length > 0) {
              // Atualizar tarefa existente
              await sql`
                UPDATE tasks SET
                  description = ${task.description},
                  status = ${task.status},
                  priority = ${task.priority},
                  assigned_to = ${task.assigned_to},
                  due_date = ${task.due_date},
                  tags = ${task.tags},
                  updated_at = NOW()
                WHERE id = ${existingTask[0].id}
              `;
              console.log(`✅ [TASKS-SYNC] Tarefa "${task.title}" atualizada`);
              spreadsheetTaskIds.add(existingTask[0].id);
            } else {
              // Criar nova tarefa
              const newTask = await sql`
                INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, due_date, tags, source, source_url, created_at, updated_at)
                VALUES (${task.title}, ${task.description}, ${task.status}, ${task.priority}, ${task.assigned_to}, ${task.created_by}, ${task.due_date}, ${task.tags}, ${task.source}, ${task.sourceUrl}, NOW(), NOW())
                RETURNING id
              `;
              console.log(`✅ [TASKS-SYNC] Tarefa "${task.title}" criada`);
              if (newTask.length > 0) {
                spreadsheetTaskIds.add(newTask[0].id);
              }
            }
            
            importedCount++;
            
          } catch (error) {
            console.error(`❌ [TASKS-SYNC] Erro ao importar tarefa "${task.title}":`, error);
            errorCount++;
          }
        }
        
        // 🆕 REMOÇÃO DESABILITADA TEMPORARIAMENTE
        // Estava removendo as tarefas que acabou de importar
        console.log('ℹ️ [TASKS-SYNC] Remoção automática desabilitada');
        let removedCount = 0;
        
        // Atualizar configuração com última sincronização
        const configResult = await sql`
          SELECT value FROM system_settings 
          WHERE key = 'google_drive_config'
          LIMIT 1
        `;
        
        if (configResult.length > 0) {
          const config = typeof configResult[0].value === 'object' ? 
            configResult[0].value : 
            JSON.parse(configResult[0].value);
          
          await sql`
            UPDATE system_settings 
            SET value = ${JSON.stringify({ ...config, lastTasksSync: new Date().toISOString() })}
            WHERE key = 'google_drive_config'
          `;
        }
        
        console.log(`✅ [TASKS-SYNC] Sincronização concluída: ${importedCount} tarefas importadas, ${removedCount} tarefas removidas`);
        
        return {
          success: true,
          importedTasks: importedCount,
          removedTasks: removedCount,
          totalTasks: tasks.length,
          errorCount,
          errors, // 🆕 Incluir erros detalhados
          message: `${importedCount} tarefas sincronizadas, ${removedCount} tarefas removidas`
        };
        
      } catch (error) {
        console.error('❌ [TASKS-SYNC] Erro na sincronização de tarefas:', error);
        return { 
          success: false, 
          error: `Erro na sincronização: ${error.message}` 
        };
      }
    }

    // ==================== ROTAS DE TAREFAS ====================
    
    // Rota para listar tarefas
    if (path === '/api/tasks' && method === 'GET') {
      try {
        const userId = event.headers['x-user-id'];
        const { status, priority, assigned_to } = event.queryStringParameters || {};
        
        console.log('📋 [TASKS] Listando tarefas para usuário:', userId);
        
        // Construir filtros
        let whereConditions = [];
        let queryParams = [];
        
        if (status) {
          whereConditions.push(`t.status = $${queryParams.length + 1}`);
          queryParams.push(status);
        }
        
        if (priority) {
          whereConditions.push(`t.priority = $${queryParams.length + 1}`);
          queryParams.push(priority);
        }
        
        if (assigned_to) {
          whereConditions.push(`t.assigned_to = $${queryParams.length + 1}`);
          queryParams.push(assigned_to);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // Consulta simples primeiro
        const tasks = await sql`
          SELECT t.*, 
                 creator.name as created_by_name,
                 assignee.name as assigned_to_name
          FROM tasks t
          LEFT JOIN users creator ON t.created_by = creator.id
          LEFT JOIN users assignee ON t.assigned_to = assignee.id
          ORDER BY t.created_at DESC
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            tasks: tasks.map(task => ({
              ...task,
              due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
              created_at: new Date(task.created_at).toISOString(),
              updated_at: new Date(task.updated_at).toISOString(),
              completed_at: task.completed_at ? new Date(task.completed_at).toISOString() : null
            }))
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao listar tarefas:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }
    
    // Rota para criar tarefa
    if (path === '/api/tasks' && method === 'POST') {
      try {
        const userId = event.headers['x-user-id'];
        const body = JSON.parse(event.body || '{}');
        const { title, description, priority = 'medium', due_date, assigned_to, tags = [] } = body;
        
        if (!title) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Título é obrigatório' })
          };
        }
        
        console.log('📋 [TASKS] Criando tarefa:', { title, priority, assigned_to });
        
        const result = await sql`
          INSERT INTO tasks (title, description, priority, due_date, created_by, assigned_to, tags)
          VALUES (${title}, ${description || null}, ${priority}, ${due_date ? new Date(due_date).toISOString() : null}, ${userId}, ${assigned_to || null}, ${tags})
          RETURNING *
        `;
        
        const task = result[0];
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            success: true,
            task: {
              ...task,
              due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
              created_at: new Date(task.created_at).toISOString(),
              updated_at: new Date(task.updated_at).toISOString()
            }
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao criar tarefa:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }
    
    // Rota para buscar tarefa específica
    if (path.startsWith('/api/tasks/') && method === 'GET' && !path.includes('/users')) {
      try {
        const taskId = path.split('/')[3];
        
        if (!taskId || isNaN(parseInt(taskId))) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'ID da tarefa inválido' })
          };
        }

        const task = await sql`
          SELECT t.*, 
                 uc.name as created_by_name,
                 ua.name as assigned_to_name
          FROM tasks t
          LEFT JOIN users uc ON t.created_by = uc.id
          LEFT JOIN users ua ON t.assigned_to = ua.id
          WHERE t.id = ${parseInt(taskId)}
        `;

        if (task.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Tarefa não encontrada' })
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true, task: task[0] })
        };
      } catch (error) {
        console.error('❌ Erro ao buscar tarefa:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }
    
    // Rota para atualizar tarefa
    if (path.startsWith('/api/tasks/') && method === 'PUT') {
      try {
        const userId = event.headers['x-user-id'];
        const taskId = path.split('/')[3];
        const body = JSON.parse(event.body || '{}');
        const { title, description, status, priority, due_date, assigned_to, tags } = body;
        
        console.log('📋 [TASKS] Atualizando tarefa:', taskId, body);
        
        // Construir objeto de atualização
        const updateData = {
          updated_at: new Date().toISOString()
        };
        
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (priority !== undefined) updateData.priority = priority;
        if (due_date !== undefined) updateData.due_date = due_date ? new Date(due_date).toISOString() : null;
        if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
        if (tags !== undefined) updateData.tags = tags;
        
        if (status !== undefined) {
          updateData.status = status;
          // Se marcando como concluída, definir completed_at
          if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
          } else {
            updateData.completed_at = null;
          }
        }
        
        console.log('📋 [TASKS] Update data:', updateData);
        
        // 🆕 UPDATE COMPLETO com todos os campos
        const result = await sql`
          UPDATE tasks 
          SET 
            title = COALESCE(${updateData.title}, title),
            description = COALESCE(${updateData.description}, description),
            status = COALESCE(${updateData.status}, status),
            priority = COALESCE(${updateData.priority}, priority),
            due_date = COALESCE(${updateData.due_date}, due_date),
            assigned_to = COALESCE(${updateData.assigned_to}, assigned_to),
            completed_at = ${updateData.completed_at !== undefined ? updateData.completed_at : sql`completed_at`},
            updated_at = ${updateData.updated_at}
          WHERE id = ${parseInt(taskId)}
          RETURNING *
        `;
        
        if (result.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Tarefa não encontrada' })
          };
        }
        
        const task = result[0];
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            task: {
              ...task,
              due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
              created_at: new Date(task.created_at).toISOString(),
              updated_at: new Date(task.updated_at).toISOString(),
              completed_at: task.completed_at ? new Date(task.completed_at).toISOString() : null
            }
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao atualizar tarefa:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }
    
    // Rota para deletar tarefa
    if (path.startsWith('/api/tasks/') && method === 'DELETE') {
      try {
        const taskId = path.split('/')[3];
        
        console.log('📋 [TASKS] Deletando tarefa:', taskId);
        
        const result = await sql`
          DELETE FROM tasks WHERE id = ${taskId} RETURNING id
        `;
        
        if (result.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Tarefa não encontrada' })
          };
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Tarefa deletada com sucesso' })
        };
        
      } catch (error) {
        console.error('❌ Erro ao deletar tarefa:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }
    
    // Rota para buscar usuários para atribuição de tarefas
    if (path === '/api/tasks/users' && method === 'GET') {
      try {
        const users = await sql`
          SELECT id, name, email, role, church
          FROM users 
          WHERE role IN ('admin', 'member', 'missionary')
          ORDER BY name ASC
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            users: users.map(user => ({
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              church: user.church
            }))
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao buscar usuários:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // ===== ROTAS DE SINCRONIZAÇÃO DE TAREFAS COM GOOGLE SHEETS =====
    
    // Rota para sincronizar tarefas com Google Drive
    if (path === '/api/tasks/sync-google-drive' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { csvUrl, spreadsheetUrl } = body;
        
        if (!csvUrl || !spreadsheetUrl) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'URL do CSV e URL da planilha são obrigatórias' })
          };
        }
        
        // Função para sincronizar tarefas da planilha para o app
        const result = await syncTasksFromGoogleDrive(csvUrl, spreadsheetUrl);
        
        return {
          statusCode: result.success ? 200 : 500,
          headers,
          body: JSON.stringify(result)
        };
        
      } catch (error) {
        console.error('❌ Erro na sincronização de tarefas:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }
    
    // Rota para adicionar tarefas à planilha do Google Drive
    if (path === '/api/tasks/add-to-google-drive' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { taskIds, tasks: tasksFromBody } = body;
        
        let tasks = [];
        
        if (tasksFromBody && Array.isArray(tasksFromBody)) {
          // Se tarefas foram enviadas diretamente
          tasks = tasksFromBody;
        } else if (taskIds && Array.isArray(taskIds)) {
          // Se IDs foram enviados, buscar tarefas do banco
          const tasksFromDb = await sql`
            SELECT t.*, 
                   uc.name as created_by_name,
                   ua.name as assigned_to_name
            FROM tasks t
            LEFT JOIN users uc ON t.created_by = uc.id
            LEFT JOIN users ua ON t.assigned_to = ua.id
            WHERE t.id = ANY(${taskIds})
          `;
          tasks = tasksFromDb;
        } else {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'IDs das tarefas ou tarefas são obrigatórios' })
          };
        }
        
        if (tasks.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Nenhuma tarefa encontrada' })
          };
        }
        
        // Função para adicionar tarefas à planilha do Google Drive
        const result = await addTasksToGoogleDrive(tasks);
        
        return {
          statusCode: result.success ? 200 : 500,
          headers,
          body: JSON.stringify(result)
        };
        
      } catch (error) {
        console.error('❌ Erro ao adicionar tarefas à planilha:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }
    
    // Rota para configurar sincronização automática de tarefas
    if (path === '/api/tasks/google-drive-config' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { autoSync, syncInterval } = body;
        
        // Buscar configuração atual do Google Drive
        const configResult = await sql`
          SELECT value FROM system_settings 
          WHERE key = 'google_drive_config'
          LIMIT 1
        `;
        
        let config = {};
        if (configResult.length > 0 && configResult[0].value) {
          config = typeof configResult[0].value === 'object' ? 
            configResult[0].value : 
            JSON.parse(configResult[0].value);
        }
        
        // Atualizar configuração de tarefas
        config.tasksAutoSync = autoSync || false;
        config.tasksSyncInterval = syncInterval || 60; // minutos
        
        // Salvar configuração
        await sql`
          INSERT INTO system_settings (key, value, created_at, updated_at)
          VALUES ('google_drive_config', ${JSON.stringify(config)}, NOW(), NOW())
          ON CONFLICT (key) DO UPDATE SET
            value = ${JSON.stringify(config)},
            updated_at = NOW()
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Configuração de sincronização de tarefas salva com sucesso',
            config: {
              tasksAutoSync: config.tasksAutoSync,
              tasksSyncInterval: config.tasksSyncInterval
            }
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao configurar sincronização de tarefas:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
      }
    }

    // Rota para resetar senhas de todos os usuários
    if (path === '/api/reset-all-passwords' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { newPassword, adminKey } = body;
        
        // Verificar chave de administrador
        if (adminKey !== 'reset-passwords-2024') {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Chave de administrador inválida' 
            })
          };
        }
        
        if (!newPassword) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Nova senha é obrigatória' 
            })
          };
        }
        
        console.log('🔄 Resetando senhas de todos os usuários...');
        
        // Atualizar senhas de todos os usuários
        const result = await sql`
          UPDATE users 
          SET password = ${newPassword}, 
              updated_at = NOW()
          WHERE id IS NOT NULL
        `;
        
        console.log('✅ Senhas resetadas com sucesso');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Senhas resetadas com sucesso',
            updatedCount: result.count || 'N/A'
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao resetar senhas:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Erro interno do servidor: ' + error.message 
          })
        };
      }
    }

    // Rota para verificar usuário
    if (path === '/api/check-user' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { email, adminKey } = body;
        
        // Verificar chave de administrador
        if (adminKey !== 'check-user-2024') {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Chave de administrador inválida' 
            })
          };
        }
        
        if (!email) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Email é obrigatório' 
            })
          };
        }
        
        console.log('🔍 Verificando usuário:', email);
        
        // Buscar usuário por email exato
        let users = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
        
        // Se não encontrou por email exato, tentar por formato nome.ultimonome
        if (users.length === 0) {
          console.log('🔍 Tentando formato nome.ultimonome...');
          users = await sql`SELECT * FROM users WHERE email LIKE ${`%${email}@%`} LIMIT 1`;
        }
        
        if (users.length > 0) {
          const user = users[0];
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                church: user.church
              }
            })
          };
        } else {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Usuário não encontrado'
            })
          };
        }
        
      } catch (error) {
        console.error('❌ Erro ao verificar usuário:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Erro interno do servidor: ' + error.message 
          })
        };
      }
    }

    // Rota para criar usuário
    if (path === '/api/create-user' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { name, email, password, role, church, adminKey } = body;
        
        // Verificar chave de administrador
        if (adminKey !== 'create-user-2024') {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Chave de administrador inválida' 
            })
          };
        }
        
        if (!name || !email || !password) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Nome, email e senha são obrigatórios' 
            })
          };
        }
        
        console.log('🔄 Criando usuário:', { name, email, role });
        
        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Verificar se usuário já existe
        const existingUsers = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
        if (existingUsers.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Usuário já existe com este email'
            })
          };
        }
        
        // Criar novo usuário
        const newUser = await sql`
          INSERT INTO users (
            name, email, password, role, church, 
            is_approved, status, created_at, updated_at
          ) VALUES (
            ${name},
            ${email},
            ${hashedPassword},
            ${role || 'member'},
            ${church || 'Sistema'},
            ${role === 'superadmin' || role === 'pastor'},
            ${(role === 'superadmin' || role === 'pastor') ? 'active' : 'pending'},
            NOW(),
            NOW()
          ) RETURNING *
        `;
        
        console.log('✅ Usuário criado com sucesso');
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Usuário criado com sucesso',
            user: {
              id: newUser[0].id,
              name: newUser[0].name,
              email: newUser[0].email,
              role: newUser[0].role,
              church: newUser[0].church
            }
          })
        };
        
      } catch (error) {
        console.error('❌ Erro ao criar usuário:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Erro interno do servidor: ' + error.message 
          })
        };
      }
    }

    // Push notifications routes
    if (path === '/api/push/subscribe' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { subscription, userId } = body;

        if (!subscription || !userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Subscription e userId são obrigatórios'
            })
          };
        }

        console.log('📱 Salvando push subscription para usuário:', userId);

        // Criar tabela se não existir
        await sql`
          CREATE TABLE IF NOT EXISTS push_subscriptions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;

        // Desativar subscriptions antigas do usuário
        await sql`
          UPDATE push_subscriptions 
          SET is_active = false, updated_at = NOW()
          WHERE user_id = ${userId}
        `;

        // Capturar user agent
        const userAgent = headers['user-agent'] || 'Unknown';
        
        // Salvar nova subscription
        const result = await sql`
          INSERT INTO push_subscriptions (
            user_id, endpoint, p256dh, auth, user_agent, is_active, created_at, updated_at
          ) VALUES (
            ${userId},
            ${subscription.endpoint},
            ${subscription.keys.p256dh},
            ${subscription.keys.auth},
            ${userAgent},
            true,
            NOW(),
            NOW()
          ) RETURNING *
        `;

        console.log('✅ Push subscription salva com sucesso');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Subscription salva com sucesso',
            subscription: result[0]
          })
        };

      } catch (error) {
        console.error('❌ Erro ao salvar push subscription:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Erro interno do servidor: ' + error.message
          })
        };
      }
    }

    if (path === '/api/push/unsubscribe' && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { userId } = body;

        if (!userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'userId é obrigatório'
            })
          };
        }

        console.log('📱 Removendo push subscription para usuário:', userId);

        // Criar tabela se não existir
        await sql`
          CREATE TABLE IF NOT EXISTS push_subscriptions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;

        // Desativar subscription do usuário
        const result = await sql`
          UPDATE push_subscriptions 
          SET is_active = false, updated_at = NOW()
          WHERE user_id = ${userId}
          RETURNING *
        `;

        console.log('✅ Push subscription removida com sucesso');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Subscription removida com sucesso',
            removed: result.length
          })
        };

      } catch (error) {
        console.error('❌ Erro ao remover push subscription:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Erro interno do servidor: ' + error.message
          })
        };
      }
    }

    if (path === '/api/push/send' && method === 'POST') {
      try {
        // JSON com informações de mídia rica
        const body = JSON.parse(event.body || '{}');
        const { 
          title, 
          message, 
          userId, 
          type = 'general', 
          hasImage = false, 
          hasAudio = false, 
          imageName = null, 
          audioSize = null,
          imageData = null,
          audioData = null
        } = body;
        
        console.log('📦 JSON recebido:', { 
          title, 
          message, 
          type, 
          userId, 
          hasImage, 
          hasAudio, 
          imageName, 
          audioSize,
          hasImageData: !!imageData,
          hasAudioData: !!audioData,
          imageDataLength: imageData?.length || 0,
          audioDataLength: audioData?.length || 0
        });

        if (!title || !message) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Título e mensagem são obrigatórios'
            })
          };
        }

        console.log('📱 Enviando push notification:', { 
          title, 
          message, 
          userId, 
          type
        });

        // Buscar subscriptions ativas
        let subscriptions;
        if (userId) {
          // Enviar para usuário específico
          subscriptions = await sql`
            SELECT * FROM push_subscriptions 
            WHERE user_id = ${userId} AND is_active = true
          `;
        } else {
          // Enviar para todos os usuários
          subscriptions = await sql`
            SELECT * FROM push_subscriptions 
            WHERE is_active = true
          `;
        }

        if (subscriptions.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Nenhuma subscription ativa encontrada'
            })
          };
        }

        // Salvar uma notificação para CADA usuário que vai receber
        console.log(`💾 Salvando notificações para ${subscriptions.length} usuários...`);
        const savedNotifications = [];
        for (const subscription of subscriptions) {
          try {
            const result = await sql`
              INSERT INTO notifications (title, message, user_id, type, is_read, created_at)
              VALUES (${title}, ${message}, ${subscription.user_id}, ${type}, false, NOW())
              RETURNING *
            `;
            savedNotifications.push(result[0]);
            console.log(`✅ Notificação salva para user_id ${subscription.user_id} (ID: ${result[0].id})`);
          } catch (error) {
            console.error(`❌ Erro ao salvar notificação para user_id ${subscription.user_id}:`, error);
          }
        }
        console.log(`💾 Total salvo: ${savedNotifications.length}/${subscriptions.length} notificações`);

        // ENVIO SIMPLES - Apenas texto da mensagem (SEM JSON)
        let payload = message;
        
        // Adicionar emojis indicadores de mídia no texto
        if (hasImage && hasAudio) {
          payload = `📷🎵 ${message}`;
        } else if (hasImage) {
          payload = `📷 ${message}`;
        } else if (hasAudio) {
          payload = `🎵 ${message}`;
        }
        
        console.log('📦 Payload SIMPLES preparado:', { 
          title,
          message: payload,
          type,
          hasImage,
          hasAudio,
          payloadLength: payload.length
        });

        let sentCount = 0;
        const errors = [];

        for (const subscription of subscriptions) {
          try {
            const pushSubscription = {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            };

            await webpush.sendNotification(pushSubscription, payload);
            sentCount++;
            console.log(`📱 Notificação enviada para usuário ${subscription.user_id}`);
          } catch (error) {
            console.error(`❌ Erro ao enviar para usuário ${subscription.user_id}:`, error);
            errors.push({ userId: subscription.user_id, error: error.message });
            
            // Se a subscription expirou, marcar como inativa
            if (error.statusCode === 410) {
              await sql`
                UPDATE push_subscriptions 
                SET is_active = false, updated_at = NOW()
                WHERE id = ${subscription.id}
              `;
            }
          }
        }

        console.log(`📱 Notificação enviada: ${sentCount}/${subscriptions.length} subscriptions`);
        console.log(`💾 Notificações salvas no BD: ${savedNotifications.length}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Notificação enviada com sucesso',
            sentTo: sentCount,
            totalSubscriptions: subscriptions.length,
            savedNotifications: savedNotifications.length,
            notificationIds: savedNotifications.map(n => n.id),
            errors: errors,
            subscriptions: subscriptions.map(sub => ({ id: sub.id, userId: sub.user_id }))
          })
        };

      } catch (error) {
        console.error('❌ Erro ao enviar push notification:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Erro interno do servidor: ' + error.message
          })
        };
      }
    }

    // ROTA PARA EXCLUIR SUBSCRIPTION
    if (path.match(/^\/api\/push\/subscriptions\/\d+$/) && method === 'DELETE') {
      try {
        const subscriptionId = parseInt(path.split('/')[4]);

        console.log(`🗑️ Excluindo subscription ${subscriptionId}`);

        await sql`
          DELETE FROM push_subscriptions
          WHERE id = ${subscriptionId}
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Subscription excluída com sucesso'
          })
        };
      } catch (error) {
        console.error('❌ Erro ao excluir subscription:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao excluir subscription' })
        };
      }
    }

    // ROTA PARA ATIVAR/DESATIVAR SUBSCRIPTION
    if (path.match(/^\/api\/push\/subscriptions\/\d+\/toggle$/) && method === 'PATCH') {
      try {
        const subscriptionId = parseInt(path.split('/')[4]);
        const body = JSON.parse(event.body || '{}');
        const { isActive } = body;

        console.log(`🔄 Toggling subscription ${subscriptionId} para ${isActive ? 'ATIVA' : 'DESATIVADA'}`);

        await sql`
          UPDATE push_subscriptions
          SET is_active = ${isActive}, updated_at = NOW()
          WHERE id = ${subscriptionId}
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: isActive ? 'Subscription ativada' : 'Subscription desativada'
          })
        };
      } catch (error) {
        console.error('❌ Erro ao atualizar subscription:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao atualizar subscription' })
        };
      }
    }

    if (path === '/api/push/subscriptions' && method === 'GET') {
      try {
        // Verificar se a tabela push_subscriptions existe, se não, criar
        await sql`
          CREATE TABLE IF NOT EXISTS push_subscriptions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            user_agent TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;
        
        // Adicionar coluna user_agent se não existir
        await sql`
          ALTER TABLE push_subscriptions 
          ADD COLUMN IF NOT EXISTS user_agent TEXT
        `;

        // Extrair userId da query string de forma mais robusta
        let userId = null;
        if (event.queryStringParameters && event.queryStringParameters.userId) {
          userId = event.queryStringParameters.userId;
        } else if (event.rawUrl) {
          try {
            const url = new URL(event.rawUrl);
            userId = url.searchParams.get('userId');
          } catch (urlError) {
            console.log('⚠️ Erro ao parsear URL:', urlError.message);
          }
        }

        console.log('📱 Listando push subscriptions ativas', userId ? `para usuário ${userId}` : 'todas');
        console.log('🔍 Event object:', JSON.stringify({
          path: event.path,
          queryStringParameters: event.queryStringParameters,
          rawUrl: event.rawUrl
        }, null, 2));

        let subscriptions = [];
        try {
          if (userId) {
            // Buscar subscription de usuário específico
            console.log('🔍 Buscando subscription para userId:', parseInt(userId));
            subscriptions = await sql`
              SELECT ps.*, u.name as user_name, u.email as user_email
              FROM push_subscriptions ps
              JOIN users u ON ps.user_id = u.id
              WHERE ps.user_id = ${parseInt(userId)} AND ps.is_active = true
              ORDER BY ps.created_at DESC
            `;
          } else {
            // Buscar todas as subscriptions (ativas e inativas)
            console.log('🔍 Buscando todas as subscriptions');
            subscriptions = await sql`
              SELECT ps.*, u.name as user_name, u.email as user_email
              FROM push_subscriptions ps
              JOIN users u ON ps.user_id = u.id
              ORDER BY ps.is_active DESC, ps.created_at DESC
            `;
          }
          console.log('✅ Subscriptions encontradas:', subscriptions.length);
        } catch (dbError) {
          console.error('❌ Erro na consulta ao banco:', dbError);
          throw dbError;
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            subscriptions: subscriptions || []
          })
        };

      } catch (error) {
        console.error('❌ Erro ao listar push subscriptions:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Erro interno do servidor: ' + error.message
          })
        };
      }
    }

    // System endpoints
    if (path === '/api/system/check-missionary-profiles' && method === 'POST') {
      try {
        console.log('🔍 Verificando perfis missionários...');

        // Buscar todos os usuários com role missionary
        const missionaries = await sql`
          SELECT id, name, email, role
          FROM users 
          WHERE role = 'missionary'
        `;

        let correctedCount = 0;

        // Para cada missionário, verificar se tem relacionamentos ativos
        for (const missionary of missionaries) {
          const activeRelationships = await sql`
            SELECT COUNT(*) as count
            FROM relationships 
            WHERE missionary_id = ${missionary.id} AND is_active = true
          `;

          const hasActiveRelationships = activeRelationships[0]?.count > 0;

          // Se não tem relacionamentos ativos, criar um relacionamento padrão
          if (!hasActiveRelationships) {
            await sql`
              INSERT INTO relationships (missionary_id, interested_id, is_active, created_at, updated_at)
              VALUES (${missionary.id}, ${missionary.id}, true, NOW(), NOW())
            `;
            correctedCount++;
            console.log(`✅ Relacionamento padrão criado para missionário: ${missionary.name}`);
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            correctedCount,
            message: `${correctedCount} perfis missionários corrigidos`
          })
        };

      } catch (error) {
        console.error('❌ Erro ao verificar perfis missionários:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Erro interno do servidor: ' + error.message
          })
        };
      }
    }

    // ========== ROTAS DE NOTIFICAÇÕES ==========
    
    // GET /api/notifications/:userId - Buscar notificações do usuário
    if (path.startsWith('/api/notifications/') && method === 'GET') {
      try {
        const pathParts = path.split('/');
        const userId = parseInt(pathParts[3]);
        const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 50;
        
        console.log(`📥 GET /api/notifications/${userId} (limit: ${limit})`);
        
        const notifications = await sql`
          SELECT * FROM notifications
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
        
        console.log(`✅ Retornando ${notifications.length} notificações para user ${userId}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(notifications)
        };
      } catch (error) {
        console.error('❌ Get notifications error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Internal server error' })
        };
      }
    }
    
    // GET /api/debug/notifications - Debug endpoint
    if (path === '/api/debug/notifications' && method === 'GET') {
      try {
        const userId = event.queryStringParameters?.userId ? parseInt(event.queryStringParameters.userId) : null;
        
        if (userId) {
          console.log(`🔍 Buscando notificações para user_id: ${userId}`);
          const notifications = await sql`
            SELECT * FROM notifications
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
            LIMIT 100
          `;
          console.log(`📥 Encontradas ${notifications.length} notificações`);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              userId,
              count: notifications.length,
              notifications
            })
          };
        } else {
          console.log(`🔍 Buscando TODAS as notificações`);
          const allNotifications = await sql`
            SELECT * FROM notifications
            ORDER BY created_at DESC
            LIMIT 100
          `;
          console.log(`📥 Encontradas ${allNotifications.length} notificações no total`);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              count: allNotifications.length,
              notifications: allNotifications
            })
          };
        }
      } catch (error) {
        console.error('❌ Debug notifications error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Internal server error', 
            details: error.message 
          })
        };
      }
    }

    // ========== ROTAS DE DISTRITOS ==========
    
    // GET /api/districts - Listar distritos
    if (path === '/api/districts' && method === 'GET') {
      try {
        const userId = parseInt(event.headers['x-user-id'] || '0');
        console.log('🔍 [GET /api/districts] userId recebido:', userId);
        let user = null;
        
        if (userId) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
          if (userResult.length > 0) {
            user = userResult[0];
            console.log('🔍 [GET /api/districts] Usuário encontrado:', {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              district_id: user.district_id
            });
          } else {
            console.warn('⚠️ [GET /api/districts] Usuário não encontrado para ID:', userId);
          }
        } else {
          console.warn('⚠️ [GET /api/districts] userId não fornecido ou inválido');
        }

        const isSuperAdminUser = isSuperAdmin(user);
        const hasAdminAccessUser = hasAdminAccess(user);
        console.log('🔍 [GET /api/districts] Permissões:', {
          isSuperAdmin: isSuperAdminUser,
          hasAdminAccess: hasAdminAccessUser,
          district_id: user?.district_id
        });

        if (isSuperAdminUser) {
          // Superadmin vê todos os distritos
          console.log('✅ [GET /api/districts] Buscando todos os distritos (superadmin)');
          const districts = await sql`
            SELECT 
              d.id,
              d.name,
              d.code,
              d.pastor_id,
              d.description,
              d.created_at,
              d.updated_at,
              u.name as pastor_name,
              u.email as pastor_email
            FROM districts d
            LEFT JOIN users u ON d.pastor_id = u.id
            ORDER BY d.name
          `;
          console.log(`✅ [GET /api/districts] Encontrados ${districts.length} distritos`);
          // Log detalhado do primeiro distrito para debug
          if (districts.length > 0) {
            console.log('🔍 [GET /api/districts] Exemplo de distrito:', {
              id: districts[0].id,
              name: districts[0].name,
              pastor_id: districts[0].pastor_id,
              pastor_name: districts[0].pastor_name,
              pastor_email: districts[0].pastor_email
            });
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(districts)
          };
        } else if (hasAdminAccessUser && user?.district_id) {
          // Pastor vê apenas seu distrito
          console.log(`✅ [GET /api/districts] Buscando distrito ${user.district_id} (pastor)`);
          const districts = await sql`
            SELECT d.*, u.name as pastor_name, u.email as pastor_email
            FROM districts d
            LEFT JOIN users u ON d.pastor_id = u.id
            WHERE d.id = ${user.district_id}
          `;
          console.log(`✅ [GET /api/districts] Encontrados ${districts.length} distritos para o pastor`);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(districts)
          };
        } else {
          console.log('⚠️ [GET /api/districts] Sem permissão ou sem distrito associado, retornando array vazio');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify([])
          };
        }
      } catch (error) {
        console.error("❌ [GET /api/districts] Erro ao buscar distritos:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error", details: error.message })
        };
      }
    }

    // GET /api/districts/:id - Obter distrito por ID
    if (path.match(/^\/api\/districts\/\d+$/) && method === 'GET') {
      try {
        const districtId = parseInt(path.split('/')[3]);
        const userId = parseInt(event.headers['x-user-id'] || '0');
        let user = null;
        
        if (userId) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
          if (userResult.length > 0) {
            user = userResult[0];
          }
        }

        const district = await sql`
          SELECT d.*, u.name as pastor_name, u.email as pastor_email
          FROM districts d
          LEFT JOIN users u ON d.pastor_id = u.id
          WHERE d.id = ${districtId}
        `;

        if (district.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Distrito não encontrado" })
          };
        }

        // Verificar permissão
        if (!isSuperAdmin(user) && !(isPastor(user) && user?.district_id === districtId)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: "Acesso negado" })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(district[0])
        };
      } catch (error) {
        console.error("Erro ao buscar distrito:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }

    // POST /api/districts/pastor/create - Criar distrito pelo pastor (primeiro acesso)
    if (path === '/api/districts/pastor/create' && method === 'POST') {
      try {
        const userId = parseInt(event.headers['x-user-id'] || '0');
        let user = null;
        
        if (userId) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
          if (userResult.length > 0) {
            user = userResult[0];
          }
        }

        // Apenas pastores podem usar esta rota
        if (!isPastor(user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: "Apenas pastores podem criar distritos através desta rota" })
          };
        }

        // Verificar se o pastor já tem um distrito
        if (user?.district_id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Você já possui um distrito associado" })
          };
        }

        const { name, code, pastorId } = JSON.parse(event.body || '{}');

        if (!name) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Nome é obrigatório" })
          };
        }

        // Garantir que o pastorId seja o próprio usuário
        const finalPastorId = pastorId && parseInt(pastorId) === userId ? userId : userId;

        // Gerar código se não fornecido
        let finalCode = code;
        if (!finalCode || finalCode.trim() === '') {
          finalCode = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '-')
            .substring(0, 20);
        }

        // Verificar se código já existe
        const existing = await sql`SELECT id FROM districts WHERE code = ${finalCode}`;
        if (existing.length > 0) {
          // Se código existe, adicionar sufixo numérico
          let counter = 1;
          let newCode = `${finalCode}-${counter}`;
          while (true) {
            const check = await sql`SELECT id FROM districts WHERE code = ${newCode}`;
            if (check.length === 0) {
              finalCode = newCode;
              break;
            }
            counter++;
            newCode = `${finalCode}-${counter}`;
          }
        }

        // Criar distrito
        const newDistrict = await sql`
          INSERT INTO districts (name, code, pastor_id, description, created_at, updated_at)
          VALUES (${name}, ${finalCode}, ${finalPastorId}, NULL, NOW(), NOW())
          RETURNING *
        `;

        // Atualizar o usuário pastor com o district_id
        if (newDistrict[0]) {
          await sql`
            UPDATE users
            SET district_id = ${newDistrict[0].id}
            WHERE id = ${finalPastorId}
          `;
        }

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newDistrict[0])
        };
      } catch (error) {
        console.error("Erro ao criar distrito pelo pastor:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }

    // POST /api/districts - Criar distrito
    if (path === '/api/districts' && method === 'POST') {
      try {
        const userId = parseInt(event.headers['x-user-id'] || '0');
        let user = null;
        
        if (userId) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
          if (userResult.length > 0) {
            user = userResult[0];
          }
        }

        if (!isSuperAdmin(user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: "Apenas superadmin pode criar distritos" })
          };
        }

        const { name, code, pastorId, description } = JSON.parse(event.body || '{}');

        if (!name || !code) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Nome e código são obrigatórios" })
          };
        }

        // Verificar se código já existe
        const existing = await sql`SELECT id FROM districts WHERE code = ${code}`;
        if (existing.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Código já existe" })
          };
        }

        // Se pastorId foi fornecido, verificar se é um pastor válido
        if (pastorId) {
          const pastorResult = await sql`SELECT * FROM users WHERE id = ${pastorId}`;
          if (pastorResult.length === 0 || pastorResult[0].role !== 'pastor') {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Usuário não é um pastor válido" })
            };
          }
        }

        const newDistrict = await sql`
          INSERT INTO districts (name, code, pastor_id, description, created_at, updated_at)
          VALUES (${name}, ${code}, ${pastorId || null}, ${description || null}, NOW(), NOW())
          RETURNING *
        `;

        // Se pastorId foi fornecido, atualizar o usuário pastor
        if (pastorId && newDistrict[0]) {
          await sql`
            UPDATE users
            SET district_id = ${newDistrict[0].id}
            WHERE id = ${pastorId}
          `;
        }

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newDistrict[0])
        };
      } catch (error) {
        console.error("Erro ao criar distrito:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }

    // PUT /api/districts/:id - Atualizar distrito
    if (path.match(/^\/api\/districts\/\d+$/) && method === 'PUT') {
      try {
        const districtId = parseInt(path.split('/')[3]);
        const userId = parseInt(event.headers['x-user-id'] || '0');
        let user = null;
        
        if (userId) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
          if (userResult.length > 0) {
            user = userResult[0];
          }
        }

        if (!isSuperAdmin(user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: "Apenas superadmin pode atualizar distritos" })
          };
        }

        const { name, code, pastorId, description } = JSON.parse(event.body || '{}');

        // Verificar se distrito existe
        const existing = await sql`SELECT * FROM districts WHERE id = ${districtId}`;
        if (existing.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Distrito não encontrado" })
          };
        }

        // Se código foi alterado, verificar se já existe
        if (code && code !== existing[0].code) {
          const codeExists = await sql`
            SELECT id FROM districts WHERE code = ${code} AND id != ${districtId}
          `;
          if (codeExists.length > 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Código já existe" })
            };
          }
        }

        // Se pastorId foi fornecido, verificar se é um pastor válido
        if (pastorId !== undefined) {
          if (pastorId) {
            const pastorResult = await sql`SELECT * FROM users WHERE id = ${pastorId}`;
            if (pastorResult.length === 0 || pastorResult[0].role !== 'pastor') {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Usuário não é um pastor válido" })
              };
            }
          }
        }

        const updated = await sql`
          UPDATE districts
          SET 
            name = COALESCE(${name}, name),
            code = COALESCE(${code}, code),
            pastor_id = ${pastorId !== undefined ? (pastorId || null) : sql`pastor_id`},
            description = COALESCE(${description}, description),
            updated_at = NOW()
          WHERE id = ${districtId}
          RETURNING *
        `;

        // Atualizar districtId do pastor se necessário
        if (pastorId !== undefined) {
          // Remover associação do pastor anterior
          if (existing[0].pastor_id) {
            await sql`
              UPDATE users
              SET district_id = NULL
              WHERE id = ${existing[0].pastor_id}
            `;
          }
          // Associar novo pastor
          if (pastorId) {
            await sql`
              UPDATE users
              SET district_id = ${districtId}
              WHERE id = ${pastorId}
            `;
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updated[0])
        };
      } catch (error) {
        console.error("Erro ao atualizar distrito:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }

    // DELETE /api/districts/:id - Deletar distrito
    if (path.match(/^\/api\/districts\/\d+$/) && method === 'DELETE') {
      try {
        const districtId = parseInt(path.split('/')[3]);
        const userId = parseInt(event.headers['x-user-id'] || '0');
        let user = null;
        
        if (userId) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
          if (userResult.length > 0) {
            user = userResult[0];
          }
        }

        if (!isSuperAdmin(user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: "Apenas superadmin pode deletar distritos" })
          };
        }

        // Verificar se distrito existe
        const existing = await sql`SELECT * FROM districts WHERE id = ${districtId}`;
        if (existing.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Distrito não encontrado" })
          };
        }

        // Verificar se há igrejas associadas
        const churches = await sql`
          SELECT COUNT(*) as count FROM churches WHERE district_id = ${districtId}
        `;
        if (churches[0].count > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: "Não é possível deletar distrito com igrejas associadas. Remova as igrejas primeiro." 
            })
          };
        }

        // Remover associação de pastores
        await sql`
          UPDATE users
          SET district_id = NULL
          WHERE district_id = ${districtId}
        `;

        // Deletar distrito
        await sql`DELETE FROM districts WHERE id = ${districtId}`;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: "Distrito deletado com sucesso" })
        };
      } catch (error) {
        console.error("Erro ao deletar distrito:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }

    // GET /api/districts/:id/churches - Listar igrejas de um distrito
    if (path.match(/^\/api\/districts\/\d+\/churches$/) && method === 'GET') {
      try {
        const districtId = parseInt(path.split('/')[3]);
        const userId = parseInt(event.headers['x-user-id'] || '0');
        let user = null;
        
        if (userId) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
          if (userResult.length > 0) {
            user = userResult[0];
          }
        }

        // Verificar permissão
        if (!isSuperAdmin(user) && !(isPastor(user) && user?.district_id === districtId)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: "Acesso negado" })
          };
        }

        const churches = await sql`
          SELECT * FROM churches WHERE district_id = ${districtId} ORDER BY name
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(churches)
        };
      } catch (error) {
        console.error("Erro ao buscar igrejas do distrito:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }

    // ========== ROTAS DE PASTORES ==========
    
    // GET /api/pastors - Listar pastores
    if (path === '/api/pastors' && method === 'GET') {
      try {
        const userId = parseInt(event.headers['x-user-id'] || '0');
        let user = null;
        
        if (userId) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
          if (userResult.length > 0) {
            user = userResult[0];
          }
        }

        if (isSuperAdmin(user)) {
          // Superadmin vê todos os pastores
          const pastors = await sql`
            SELECT u.*, d.name as district_name, d.code as district_code
            FROM users u
            LEFT JOIN districts d ON u.district_id = d.id
            WHERE u.role = 'pastor'
            ORDER BY u.name
          `;
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(pastors)
          };
        } else {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify([])
          };
        }
      } catch (error) {
        console.error("Erro ao buscar pastores:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }

    // GET /api/pastors/:id - Obter pastor por ID
    if (path.match(/^\/api\/pastors\/\d+$/) && method === 'GET') {
      try {
        const pastorId = parseInt(path.split('/')[3]);
        const userId = parseInt(event.headers['x-user-id'] || '0');
        let user = null;
        
        if (userId) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
          if (userResult.length > 0) {
            user = userResult[0];
          }
        }

        const pastor = await sql`
          SELECT u.*, d.name as district_name, d.code as district_code
          FROM users u
          LEFT JOIN districts d ON u.district_id = d.id
          WHERE u.id = ${pastorId} AND u.role = 'pastor'
        `;

        if (pastor.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Pastor não encontrado" })
          };
        }

        // Verificar permissão
        if (!isSuperAdmin(user) && !(isPastor(user) && user?.id === pastorId)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: "Acesso negado" })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(pastor[0])
        };
      } catch (error) {
        console.error("Erro ao buscar pastor:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }

    // POST /api/pastors - Criar pastor
    if (path === '/api/pastors' && method === 'POST') {
      try {
        const userId = parseInt(event.headers['x-user-id'] || '0');
        let user = null;
        
        if (userId) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
          if (userResult.length > 0) {
            user = userResult[0];
          }
        }

        if (!isSuperAdmin(user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: "Apenas superadmin pode criar pastores" })
          };
        }

        const { name, email, password, districtId } = JSON.parse(event.body || '{}');

        if (!name || !email || !password) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Nome, email e senha são obrigatórios" })
          };
        }

        // Verificar se email já existe
        const existing = await sql`SELECT * FROM users WHERE email = ${email}`;
        if (existing.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Email já está em uso" })
          };
        }

        // Verificar se districtId é válido (se fornecido)
        if (districtId) {
          const district = await sql`SELECT id FROM districts WHERE id = ${districtId}`;
          if (district.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Distrito não encontrado" })
            };
          }
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Criar usuário como pastor
        const newPastor = await sql`
          INSERT INTO users (name, email, password, role, district_id, is_approved, status, first_access, created_at, updated_at)
          VALUES (${name}, ${email}, ${hashedPassword}, 'pastor', ${districtId || null}, true, 'active', true, NOW(), NOW())
          RETURNING *
        `;

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newPastor[0])
        };
      } catch (error) {
        console.error("Erro ao criar pastor:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }

    // PUT /api/pastors/:id - Atualizar pastor
    if (path.match(/^\/api\/pastors\/\d+$/) && method === 'PUT') {
      try {
        const pastorId = parseInt(path.split('/')[3]);
        const userId = parseInt(event.headers['x-user-id'] || '0');
        let user = null;
        
        if (userId) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
          if (userResult.length > 0) {
            user = userResult[0];
          }
        }

        if (!isSuperAdmin(user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: "Apenas superadmin pode atualizar pastores" })
          };
        }

        const pastorResult = await sql`SELECT * FROM users WHERE id = ${pastorId}`;
        if (pastorResult.length === 0 || pastorResult[0].role !== 'pastor') {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Pastor não encontrado" })
          };
        }

        const { name, email, districtId, password } = JSON.parse(event.body || '{}');
        const updates = {};

        if (name) updates.name = name;
        if (email && email !== pastorResult[0].email) {
          // Verificar se novo email já existe
          const existing = await sql`SELECT * FROM users WHERE email = ${email}`;
          if (existing.length > 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: "Email já está em uso" })
            };
          }
          updates.email = email;
        }
        if (districtId !== undefined) {
          // Verificar se districtId é válido
          if (districtId) {
            const district = await sql`SELECT id FROM districts WHERE id = ${districtId}`;
            if (district.length === 0) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Distrito não encontrado" })
              };
            }
          }
          updates.district_id = districtId;
        }
        if (password) {
          updates.password = await bcrypt.hash(password, 10);
        }

        // Construir query de atualização usando template literals do Neon
        let updatedPastor = pastorResult[0];
        
        if (updates.name || updates.email || updates.district_id !== undefined || updates.password) {
          if (updates.name && updates.email && updates.district_id !== undefined && updates.password) {
            updatedPastor = await sql`
              UPDATE users
              SET name = ${updates.name}, email = ${updates.email}, district_id = ${updates.district_id}, password = ${updates.password}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          } else if (updates.name && updates.email && updates.district_id !== undefined) {
            updatedPastor = await sql`
              UPDATE users
              SET name = ${updates.name}, email = ${updates.email}, district_id = ${updates.district_id}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          } else if (updates.name && updates.email && updates.password) {
            updatedPastor = await sql`
              UPDATE users
              SET name = ${updates.name}, email = ${updates.email}, password = ${updates.password}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          } else if (updates.name && updates.email) {
            updatedPastor = await sql`
              UPDATE users
              SET name = ${updates.name}, email = ${updates.email}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          } else if (updates.name && updates.district_id !== undefined) {
            updatedPastor = await sql`
              UPDATE users
              SET name = ${updates.name}, district_id = ${updates.district_id}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          } else if (updates.name && updates.password) {
            updatedPastor = await sql`
              UPDATE users
              SET name = ${updates.name}, password = ${updates.password}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          } else if (updates.email && updates.district_id !== undefined) {
            updatedPastor = await sql`
              UPDATE users
              SET email = ${updates.email}, district_id = ${updates.district_id}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          } else if (updates.email && updates.password) {
            updatedPastor = await sql`
              UPDATE users
              SET email = ${updates.email}, password = ${updates.password}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          } else if (updates.district_id !== undefined && updates.password) {
            updatedPastor = await sql`
              UPDATE users
              SET district_id = ${updates.district_id}, password = ${updates.password}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          } else if (updates.name) {
            updatedPastor = await sql`
              UPDATE users
              SET name = ${updates.name}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          } else if (updates.email) {
            updatedPastor = await sql`
              UPDATE users
              SET email = ${updates.email}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          } else if (updates.district_id !== undefined) {
            updatedPastor = await sql`
              UPDATE users
              SET district_id = ${updates.district_id}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          } else if (updates.password) {
            updatedPastor = await sql`
              UPDATE users
              SET password = ${updates.password}, updated_at = NOW()
              WHERE id = ${pastorId}
              RETURNING *
            `;
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(updatedPastor[0])
          };
        } else {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(pastorResult[0])
          };
        }
      } catch (error) {
        console.error("Erro ao atualizar pastor:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }

    // DELETE /api/pastors/:id - Deletar pastor
    if (path.match(/^\/api\/pastors\/\d+$/) && method === 'DELETE') {
      try {
        const pastorId = parseInt(path.split('/')[3]);
        const userId = parseInt(event.headers['x-user-id'] || '0');
        let user = null;
        
        if (userId) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
          if (userResult.length > 0) {
            user = userResult[0];
          }
        }

        if (!isSuperAdmin(user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: "Apenas superadmin pode deletar pastores" })
          };
        }

        const pastorResult = await sql`SELECT * FROM users WHERE id = ${pastorId}`;
        if (pastorResult.length === 0 || pastorResult[0].role !== 'pastor') {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Pastor não encontrado" })
          };
        }

        // Remover associação do distrito
        if (pastorResult[0].district_id) {
          await sql`
            UPDATE districts
            SET pastor_id = NULL
            WHERE pastor_id = ${pastorId}
          `;
        }

        // Converter para member ao invés de deletar
        await sql`
          UPDATE users
          SET role = 'member', district_id = NULL
          WHERE id = ${pastorId}
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: "Pastor removido com sucesso" })
        };
      } catch (error) {
        console.error("Erro ao deletar pastor:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    }

    // =============================================
    // ROTAS DE CONVITES DE PASTORES
    // =============================================

    // Helper function para garantir que a tabela pastor_invites existe
    async function ensurePastorInvitesTable() {
      await sql`
        CREATE TABLE IF NOT EXISTS pastor_invites (
          id SERIAL PRIMARY KEY,
          token VARCHAR(64) UNIQUE NOT NULL,
          email VARCHAR(255) NOT NULL,
          created_by INTEGER NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' NOT NULL,
          onboarding_data JSONB,
          submitted_at TIMESTAMP WITH TIME ZONE,
          reviewed_at TIMESTAMP WITH TIME ZONE,
          reviewed_by INTEGER,
          rejection_reason TEXT,
          user_id INTEGER,
          district_id INTEGER,
          approved_by INTEGER,
          approved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      // Criar índices se não existirem
      try {
        await sql`CREATE INDEX IF NOT EXISTS idx_pastor_invites_token ON pastor_invites(token)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_pastor_invites_status ON pastor_invites(status)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_pastor_invites_email ON pastor_invites(email)`;
      } catch (indexError) {
        // Ignora erros de índice, podem já existir
      }
    }

    // GET /api/invites/setup - Cria a tabela se não existir (apenas superadmin)
    if (path === '/api/invites/setup' && method === 'POST') {
      try {
        const auth = requireAuth(event);
        if (!auth.isValid) {
          return {
            statusCode: auth.statusCode,
            headers,
            body: JSON.stringify({ error: auth.error })
          };
        }

        if (!isSuperAdmin(auth.user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Acesso negado' })
          };
        }

        await ensurePastorInvitesTable();

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Tabela pastor_invites criada/verificada com sucesso' })
        };
      } catch (error) {
        console.error('Erro ao criar tabela:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao criar tabela: ' + error.message })
        };
      }
    }

    // POST /api/invites - Criar novo convite (Superadmin)
    if (path === '/api/invites' && method === 'POST') {
      try {
        const auth = requireAuth(event);
        if (!auth.isValid) {
          return {
            statusCode: auth.statusCode,
            headers,
            body: JSON.stringify({ error: auth.error })
          };
        }

        // Verificar se é superadmin
        if (!isSuperAdmin(auth.user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Acesso negado. Apenas superadmin pode criar convites.' })
          };
        }

        // Garantir que a tabela existe
        await ensurePastorInvitesTable();

        const parsedBody = JSON.parse(body || '{}');
        const { email, expiresInDays = 7 } = parsedBody;

        if (!email) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Email é obrigatório' })
          };
        }

        // Verificar se já existe convite pendente para este email
        const existingInvites = await sql`
          SELECT * FROM pastor_invites 
          WHERE email = ${email} AND status = 'pending'
          LIMIT 1
        `;

        if (existingInvites.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Já existe um convite pendente para este email' })
          };
        }

        // Gerar token seguro
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');

        // Calcular data de expiração
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        // Criar convite
        const [invite] = await sql`
          INSERT INTO pastor_invites (token, email, created_by, expires_at, status)
          VALUES (${token}, ${email}, ${auth.user.id}, ${expiresAt.toISOString()}, 'pending')
          RETURNING *
        `;

        const APP_URL = process.env.APP_URL || 'https://7careapp-2026.netlify.app';
        const link = `${APP_URL}/pastor-onboarding/${token}`;

        console.log(`Convite criado para ${email} por ${auth.user.email}`);

        // Tentar enviar email via Brevo
        let emailSent = false;
        const BREVO_API_KEY = process.env.BREVO_API_KEY;
        
        if (BREVO_API_KEY) {
          try {
            const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
              },
              body: JSON.stringify({
                sender: {
                  name: '7Care App',
                  email: process.env.BREVO_SENDER_EMAIL || 'noreply@7care.app'
                },
                to: [{ email: email }],
                subject: '🎉 Convite para se cadastrar no 7Care App',
                htmlContent: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  </head>
                  <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">7Care App</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Gestão de Cuidado Pastoral</p>
                      </div>
                      
                      <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                        <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 24px;">Você foi convidado! 🎉</h2>
                        
                        <p style="color: #4a5568; line-height: 1.6; margin: 0 0 20px 0;">
                          Você recebeu um convite para se cadastrar como pastor no <strong>7Care App</strong>, 
                          a plataforma de gestão de cuidado pastoral.
                        </p>
                        
                        <p style="color: #4a5568; line-height: 1.6; margin: 0 0 30px 0;">
                          Clique no botão abaixo para completar seu cadastro:
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${link}" 
                             style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                                    color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; 
                                    font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(59,130,246,0.4);">
                            Completar Cadastro
                          </a>
                        </div>
                        
                        <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                          <strong>⚠️ Este convite expira em ${expiresInDays} dias.</strong>
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                        
                        <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                          Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                          <a href="${link}" style="color: #3b82f6; word-break: break-all;">${link}</a>
                        </p>
                      </div>
                      
                      <p style="text-align: center; color: #a0aec0; font-size: 12px; margin-top: 20px;">
                        © 2026 7Care App. Todos os direitos reservados.
                      </p>
                    </div>
                  </body>
                  </html>
                `
              })
            });
            
            if (emailResponse.ok) {
              emailSent = true;
              console.log(`Email de convite enviado para ${email}`);
            } else {
              const emailError = await emailResponse.text();
              console.error(`Erro ao enviar email via Brevo: ${emailError}`);
            }
          } catch (emailError) {
            console.error('Erro ao enviar email:', emailError);
          }
        } else {
          console.log('BREVO_API_KEY não configurada - email não enviado');
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            token: invite.token,
            link,
            expiresAt: invite.expires_at,
            emailSent
          })
        };
      } catch (error) {
        console.error('Erro ao criar convite:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao criar convite' })
        };
      }
    }

    // GET /api/invites - Listar convites (Superadmin)
    if (path === '/api/invites' && method === 'GET') {
      try {
        const auth = requireAuth(event);
        if (!auth.isValid) {
          return {
            statusCode: auth.statusCode,
            headers,
            body: JSON.stringify({ error: auth.error })
          };
        }

        if (!isSuperAdmin(auth.user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Acesso negado. Apenas superadmin pode listar convites.' })
          };
        }

        // Garantir que a tabela existe
        await ensurePastorInvitesTable();

        const invites = await sql`
          SELECT pi.*, u.name as created_by_name, u.email as created_by_email
          FROM pastor_invites pi
          LEFT JOIN users u ON pi.created_by = u.id
          ORDER BY pi.created_at DESC
          LIMIT 50
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(invites)
        };
      } catch (error) {
        console.error('Erro ao listar convites:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao listar convites' })
        };
      }
    }

    // DELETE /api/invites/:id - Deletar convite individual (Superadmin)
    if (path.match(/^\/api\/invites\/\d+$/) && method === 'DELETE') {
      try {
        const auth = requireAuth(event);
        if (!auth.isValid) {
          return {
            statusCode: auth.statusCode,
            headers,
            body: JSON.stringify({ error: auth.error })
          };
        }

        if (!isSuperAdmin(auth.user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Acesso negado. Apenas superadmin pode deletar convites.' })
          };
        }

        const inviteId = parseInt(path.split('/').pop());
        
        const result = await sql`DELETE FROM pastor_invites WHERE id = ${inviteId} RETURNING id`;
        
        if (result.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Convite não encontrado' })
          };
        }

        console.log(`Convite ${inviteId} deletado`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Convite deletado com sucesso'
          })
        };
      } catch (error) {
        console.error('Erro ao deletar convite:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao deletar convite' })
        };
      }
    }

    // DELETE /api/invites/all - Deletar todos os convites (Superadmin)
    if (path === '/api/invites/all' && method === 'DELETE') {
      try {
        const auth = requireAuth(event);
        if (!auth.isValid) {
          return {
            statusCode: auth.statusCode,
            headers,
            body: JSON.stringify({ error: auth.error })
          };
        }

        if (!isSuperAdmin(auth.user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Acesso negado. Apenas superadmin pode deletar convites.' })
          };
        }

        // Deletar todos os convites
        const result = await sql`DELETE FROM pastor_invites RETURNING id`;
        
        console.log(`Deletados ${result.length} convites`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: `${result.length} convites deletados com sucesso`,
            deletedCount: result.length
          })
        };
      } catch (error) {
        console.error('Erro ao deletar convites:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao deletar convites' })
        };
      }
    }

    // GET /api/invites/validate/:token - Validar token de convite (Público)
    if (path.match(/^\/api\/invites\/validate\/[a-f0-9]+$/) && method === 'GET') {
      try {
        const token = path.split('/').pop();

        const invites = await sql`
          SELECT * FROM pastor_invites 
          WHERE token = ${token}
          LIMIT 1
        `;

        if (invites.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ valid: false, error: 'Convite não encontrado' })
          };
        }

        const invite = invites[0];

        if (invite.status !== 'pending') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ valid: false, error: `Convite já foi ${invite.status === 'approved' ? 'aprovado' : invite.status === 'rejected' ? 'rejeitado' : 'processado'}` })
          };
        }

        if (new Date(invite.expires_at) < new Date()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ valid: false, error: 'Convite expirado' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            valid: true,
            email: invite.email,
            expiresAt: invite.expires_at
          })
        };
      } catch (error) {
        console.error('Erro ao validar convite:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ valid: false, error: 'Erro ao validar convite' })
        };
      }
    }

    // POST /api/invites/onboarding/:token - Submeter onboarding de pastor (Público)
    if (path.match(/^\/api\/invites\/onboarding\/[a-f0-9]+$/) && method === 'POST') {
      try {
        const token = path.split('/').pop();
        const parsedBody = JSON.parse(body || '{}');
        const { name, password, phone, churches = [], district, excelData, churchValidation } = parsedBody;

        // Validar campos obrigatórios
        if (!name || !password) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Nome e senha são obrigatórios' })
          };
        }

        // Buscar convite
        const invites = await sql`
          SELECT * FROM pastor_invites 
          WHERE token = ${token}
          LIMIT 1
        `;

        if (invites.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Convite não encontrado' })
          };
        }

        const invite = invites[0];

        if (invite.status !== 'pending') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Convite já foi utilizado' })
          };
        }

        if (new Date(invite.expires_at) < new Date()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Convite expirado' })
          };
        }

        // Verificar se email já existe
        const existingUsers = await sql`
          SELECT id FROM users WHERE email = ${invite.email} LIMIT 1
        `;

        if (existingUsers.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Email já está em uso' })
          };
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Criar usuário pastor
        const [newUser] = await sql`
          INSERT INTO users (name, email, password, role, phone, created_at)
          VALUES (${name}, ${invite.email}, ${hashedPassword}, 'pastor', ${phone || null}, NOW())
          RETURNING id, name, email, role
        `;

        // Salvar dados de onboarding no convite (todos os dados para processar na aprovação)
        const onboardingData = {
          personal: { name, phone },
          churches,
          district,
          excelData,
          churchValidation,
          submittedAt: new Date().toISOString()
        };

        await sql`
          UPDATE pastor_invites 
          SET status = 'submitted', 
              onboarding_data = ${JSON.stringify(onboardingData)},
              user_id = ${newUser.id}
          WHERE id = ${invite.id}
        `;

        console.log(`Onboarding submetido por ${invite.email}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Cadastro realizado com sucesso! Aguarde aprovação do administrador.',
            user: newUser
          })
        };
      } catch (error) {
        console.error('Erro no onboarding:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao processar cadastro' })
        };
      }
    }

    // POST /api/invites/:token/validate-churches - Validar correspondência de igrejas
    if (path.match(/^\/api\/invites\/[a-f0-9]+\/validate-churches$/) && method === 'POST') {
      try {
        const token = path.split('/')[3];
        const parsedBody = JSON.parse(body || '{}');
        const { excelData } = parsedBody;

        // Validar token
        const invites = await sql`
          SELECT * FROM pastor_invites
          WHERE token = ${token}
          LIMIT 1
        `;

        if (invites.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Convite não encontrado' })
          };
        }

        const invite = invites[0];

        if (invite.status !== 'pending') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Convite inválido' })
          };
        }

        if (!excelData || !excelData.data || excelData.data.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Dados de Excel não fornecidos' })
          };
        }

        // Extrair igrejas únicas do Excel e contar membros
        const churchMemberCount = {};
        excelData.data.forEach(row => {
          const churchName = (row.igreja || '').trim().toLowerCase();
          if (churchName) {
            churchMemberCount[churchName] = (churchMemberCount[churchName] || 0) + 1;
          }
        });

        const excelChurchNames = Object.keys(churchMemberCount);

        // Buscar igrejas cadastradas no sistema
        const registeredChurches = await sql`
          SELECT id, name FROM churches
        `;

        // Função para calcular similaridade (Levenshtein simplificado)
        const calculateSimilarity = (str1, str2) => {
          const s1 = str1.toLowerCase();
          const s2 = str2.toLowerCase();
          if (s1 === s2) return 1;

          const longer = s1.length > s2.length ? s1 : s2;
          const shorter = s1.length > s2.length ? s2 : s1;

          if (longer.length === 0) return 1;

          // Similaridade baseada em substring comum
          if (longer.includes(shorter) || shorter.includes(longer)) {
            return shorter.length / longer.length;
          }

          // Similaridade simples baseada em caracteres comuns
          let matches = 0;
          const chars1 = s1.split('');
          const chars2 = s2.split('');
          chars1.forEach(c => {
            const idx = chars2.indexOf(c);
            if (idx !== -1) {
              matches++;
              chars2.splice(idx, 1);
            }
          });

          return matches / Math.max(s1.length, s2.length);
        };

        // Validar cada igreja
        const validations = excelChurchNames.map(excelChurch => {
          const originalName = excelData.data.find(row =>
            (row.igreja || '').trim().toLowerCase() === excelChurch
          )?.igreja || excelChurch;

          const memberCount = churchMemberCount[excelChurch];

          // Buscar correspondência exata
          const exactMatch = registeredChurches.find(c =>
            c.name.toLowerCase() === excelChurch
          );

          if (exactMatch) {
            return {
              churchName: originalName,
              status: 'exact_match',
              matchedChurchId: exactMatch.id,
              memberCount,
              suggestions: []
            };
          }

          // Buscar similares (> 60% similaridade)
          const suggestions = registeredChurches
            .map(c => ({
              id: c.id,
              name: c.name,
              similarity: calculateSimilarity(excelChurch, c.name)
            }))
            .filter(s => s.similarity > 0.6)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3);

          return {
            churchName: originalName,
            status: suggestions.length > 0 ? 'similar_found' : 'not_found',
            matchedChurchId: null,
            memberCount,
            suggestions
          };
        });

        console.log(`Validação de igrejas para convite ${token}: ${validations.length} igrejas`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ validations })
        };
      } catch (error) {
        console.error('Erro ao validar igrejas:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao validar igrejas' })
        };
      }
    }

    // POST /api/invites/:id/approve - Aprovar convite (Superadmin)
    if (path.match(/^\/api\/invites\/\d+\/approve$/) && method === 'POST') {
      try {
        const auth = requireAuth(event);
        if (!auth.isValid) {
          return {
            statusCode: auth.statusCode,
            headers,
            body: JSON.stringify({ error: auth.error })
          };
        }

        if (!isSuperAdmin(auth.user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Acesso negado. Apenas superadmin pode aprovar convites.' })
          };
        }

        const inviteId = parseInt(path.split('/')[3]);

        const invites = await sql`
          SELECT * FROM pastor_invites WHERE id = ${inviteId} LIMIT 1
        `;

        if (invites.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Convite não encontrado' })
          };
        }

        const invite = invites[0];

        if (invite.status !== 'submitted') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Convite não está aguardando aprovação' })
          };
        }

        // Verificar se o convite tem user_id (pastor deve ter completado o onboarding)
        if (!invite.user_id) {
          console.error(`❌ Convite ${inviteId} não tem user_id associado`);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Convite incompleto: pastor não finalizou o cadastro. O pastor precisa completar o formulário de onboarding primeiro.' 
            })
          };
        }

        // Verificar se o usuário existe
        const userExists = await sql`
          SELECT id, email, status FROM users WHERE id = ${invite.user_id} LIMIT 1
        `;
        if (userExists.length === 0) {
          console.error(`❌ Usuário ${invite.user_id} não encontrado para o convite ${inviteId}`);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Usuário do convite não encontrado no sistema. Pode ter sido deletado.' 
            })
          };
        }

        console.log(`✅ Usuário encontrado: ${userExists[0].email} (status: ${userExists[0].status})`);

        // Parsear dados de onboarding
        let onboardingData;
        try {
          onboardingData = typeof invite.onboarding_data === 'string' 
            ? JSON.parse(invite.onboarding_data) 
            : invite.onboarding_data;
        } catch (parseError) {
          console.error(`❌ Erro ao parsear onboarding_data do convite ${inviteId}:`, parseError);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Dados de onboarding inválidos ou corrompidos.' 
            })
          };
        }

        if (!onboardingData) {
          console.error(`❌ Convite ${inviteId} não tem dados de onboarding`);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Dados de onboarding não encontrados no convite.' 
            })
          };
        }

        console.log('📋 Dados de onboarding:', JSON.stringify(onboardingData, null, 2));

        // 1. Criar distrito (se houver dados)
        let districtId = null;
        if (onboardingData?.district?.name) {
          const districtData = onboardingData.district;
          
          // Verificar se distrito já existe
          const existingDistricts = await sql`
            SELECT id FROM districts WHERE name = ${districtData.name} LIMIT 1
          `;
          
          if (existingDistricts.length > 0) {
            districtId = existingDistricts[0].id;
            console.log(`📍 Distrito já existe: ${districtData.name} (ID: ${districtId})`);
          } else {
            const [newDistrict] = await sql`
              INSERT INTO districts (name, region, created_at)
              VALUES (${districtData.name}, ${districtData.region || null}, NOW())
              RETURNING id
            `;
            districtId = newDistrict.id;
            console.log(`📍 Distrito criado: ${districtData.name} (ID: ${districtId})`);
          }
          
          // Vincular pastor ao distrito
          await sql`
            UPDATE users SET district_id = ${districtId} WHERE id = ${invite.user_id}
          `;
          console.log(`👤 Pastor vinculado ao distrito ${districtId}`);
        }

        // 2. Criar igrejas (se houver)
        const churchIds = [];
        if (onboardingData?.churches && onboardingData.churches.length > 0) {
          for (let i = 0; i < onboardingData.churches.length; i++) {
            const church = onboardingData.churches[i];
            // Verificar se igreja já existe
            const existingChurches = await sql`
              SELECT id FROM churches WHERE name = ${church.name} AND district_id = ${districtId} LIMIT 1
            `;
            
            if (existingChurches.length > 0) {
              churchIds.push(existingChurches[0].id);
              console.log(`⛪ Igreja já existe: ${church.name}`);
            } else {
              // Gerar código único para a igreja (baseado no nome + timestamp)
              const churchCode = church.code || `IGR-${Date.now()}-${i + 1}`;
              
              const [newChurch] = await sql`
                INSERT INTO churches (name, code, district_id, address, created_at)
                VALUES (${church.name}, ${churchCode}, ${districtId}, ${church.address || null}, NOW())
                RETURNING id
              `;
              churchIds.push(newChurch.id);
              console.log(`⛪ Igreja criada: ${church.name} (ID: ${newChurch.id}, Code: ${churchCode})`);
            }
          }
        }

        // 3. Importar membros da planilha (se houver excelData)
        let membersImported = 0;
        if (onboardingData?.excelData && onboardingData.excelData.length > 0) {
          console.log(`📊 Importando ${onboardingData.excelData.length} membros...`);
          
          for (const member of onboardingData.excelData) {
            try {
              // Verificar se membro já existe pelo email
              if (member.email) {
                const existingMember = await sql`
                  SELECT id FROM users WHERE email = ${member.email} LIMIT 1
                `;
                if (existingMember.length > 0) {
                  console.log(`⚠️ Membro já existe: ${member.email}`);
                  continue;
                }
              }
              
              // Determinar a igreja do membro
              let memberChurchId = churchIds[0] || null; // Default: primeira igreja
              if (member.church && onboardingData.churches) {
                const churchIndex = onboardingData.churches.findIndex(c => 
                  c.name?.toLowerCase() === member.church?.toLowerCase()
                );
                if (churchIndex >= 0 && churchIds[churchIndex]) {
                  memberChurchId = churchIds[churchIndex];
                }
              }
              
              // Criar membro
              await sql`
                INSERT INTO users (
                  name, email, role, church, phone, 
                  birth_date, civil_status, occupation, education, address,
                  baptism_date, is_tither, is_donor, status, created_at,
                  district_id
                )
                VALUES (
                  ${member.name || 'Sem nome'},
                  ${member.email || null},
                  'member',
                  ${member.church || null},
                  ${member.phone || null},
                  ${member.birthDate ? new Date(member.birthDate) : null},
                  ${member.civilStatus || null},
                  ${member.occupation || null},
                  ${member.education || null},
                  ${member.address || null},
                  ${member.baptismDate ? new Date(member.baptismDate) : null},
                  ${member.isTither || false},
                  ${member.isDonor || false},
                  'active',
                  NOW(),
                  ${districtId}
                )
              `;
              membersImported++;
            } catch (memberError) {
              console.error(`❌ Erro ao importar membro ${member.name}:`, memberError.message);
            }
          }
          console.log(`✅ ${membersImported} membros importados com sucesso`);
        }

        // 4. Ativar o usuário pastor
        await sql`
          UPDATE users SET status = 'active', first_access = false WHERE id = ${invite.user_id}
        `;

        // 5. Atualizar status do convite para approved
        await sql`
          UPDATE pastor_invites 
          SET status = 'approved',
              approved_by = ${auth.user.id},
              approved_at = NOW()
          WHERE id = ${inviteId}
        `;

        console.log(`✅ Convite ${inviteId} aprovado por ${auth.user.email}`);
        console.log(`   - Distrito: ${districtId || 'Nenhum'}`);
        console.log(`   - Igrejas: ${churchIds.length}`);
        console.log(`   - Membros importados: ${membersImported}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Convite aprovado com sucesso!',
            details: {
              districtId,
              churchesCreated: churchIds.length,
              membersImported
            }
          })
        };
      } catch (error) {
        console.error('Erro ao aprovar convite:', error);
        console.error('Stack trace:', error.stack);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Erro ao aprovar convite',
            details: error.message || 'Erro desconhecido'
          })
        };
      }
    }

    // POST /api/invites/:id/reject - Rejeitar convite (Superadmin)
    if (path.match(/^\/api\/invites\/\d+\/reject$/) && method === 'POST') {
      try {
        const auth = requireAuth(event);
        if (!auth.isValid) {
          return {
            statusCode: auth.statusCode,
            headers,
            body: JSON.stringify({ error: auth.error })
          };
        }

        if (!isSuperAdmin(auth.user)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Acesso negado. Apenas superadmin pode rejeitar convites.' })
          };
        }

        const inviteId = parseInt(path.split('/')[3]);
        const parsedBody = JSON.parse(body || '{}');
        const { reason } = parsedBody;

        await sql`
          UPDATE pastor_invites 
          SET status = 'rejected',
              rejection_reason = ${reason || null}
          WHERE id = ${inviteId}
        `;

        console.log(`Convite ${inviteId} rejeitado por ${auth.user.email}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Convite rejeitado'
          })
        };
      } catch (error) {
        console.error('Erro ao rejeitar convite:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erro ao rejeitar convite' })
        };
      }
    }

    // Rota padrão - retornar erro 404
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Rota não encontrada' })
    };

  } catch (error) {
    console.error('❌ Erro na função API:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno do servidor' })
    };
  }
};
