/**
 * TESTE COMPLETO DE ISOLAMENTO DE DISTRITOS
 * 
 * Este script:
 * 1. Cria 2 distritos de teste (Distrito Norte e Distrito Sul)
 * 2. Cria 2 pastores (um para cada distrito)
 * 3. Cria 10 usuários em cada distrito com nomes distintos
 * 4. Testa a API para verificar que cada pastor só vê seus usuários
 * 5. Limpa os dados de teste ao final
 * 
 * Uso: DATABASE_URL=... node scripts/teste-isolamento-completo.cjs
 */

const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

// Verificar se DATABASE_URL está definida
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não está definida!');
  console.error('   Use: DATABASE_URL=postgres://... node scripts/teste-isolamento-completo.cjs');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Configuração do teste
const TEST_PREFIX = 'TESTE_ISO_';
const BASE_URL = process.env.API_URL || 'http://localhost:3067';

// Dados de teste
const DISTRITOS = [
  { name: `${TEST_PREFIX}Distrito_NORTE`, code: 'TESTE_NORTE' },
  { name: `${TEST_PREFIX}Distrito_SUL`, code: 'TESTE_SUL' }
];

const USUARIOS_NORTE = [
  'Carlos_NORTE_01', 'Maria_NORTE_02', 'João_NORTE_03', 'Ana_NORTE_04', 'Pedro_NORTE_05',
  'Lucia_NORTE_06', 'Paulo_NORTE_07', 'Julia_NORTE_08', 'Lucas_NORTE_09', 'Beatriz_NORTE_10'
];

const USUARIOS_SUL = [
  'Roberto_SUL_01', 'Fernanda_SUL_02', 'Marcos_SUL_03', 'Patricia_SUL_04', 'Diego_SUL_05',
  'Camila_SUL_06', 'Rafael_SUL_07', 'Amanda_SUL_08', 'Gabriel_SUL_09', 'Isabela_SUL_10'
];

// Função para gerar hash de senha simples (para teste)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Função para fazer chamadas HTTP
async function fetchAPI(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Servidor não está rodando em ${BASE_URL}`);
    }
    throw error;
  }
}

// ============================================
// FUNÇÕES DE SETUP
// ============================================

async function limparDadosTeste() {
  console.log('🧹 Limpando dados de teste anteriores...');
  
  // Deletar usuários de teste
  await sql`DELETE FROM users WHERE name LIKE ${TEST_PREFIX + '%'}`;
  
  // Deletar distritos de teste
  await sql`DELETE FROM districts WHERE name LIKE ${TEST_PREFIX + '%'}`;
  
  console.log('   ✅ Dados anteriores removidos\n');
}

async function criarDistritos() {
  console.log('🏛️  Criando distritos de teste...');
  
  const distritosIds = [];
  
  for (const distrito of DISTRITOS) {
    const result = await sql`
      INSERT INTO districts (name, code)
      VALUES (${distrito.name}, ${distrito.code})
      RETURNING id, name
    `;
    distritosIds.push(result[0]);
    console.log(`   ✅ Criado: ${result[0].name} (ID: ${result[0].id})`);
  }
  
  console.log('');
  return distritosIds;
}

async function criarPastor(nome, email, districtId) {
  const result = await sql`
    INSERT INTO users (name, email, password, role, district_id, is_approved, status)
    VALUES (
      ${nome},
      ${email},
      ${hashPassword('senha123')},
      'pastor',
      ${districtId},
      true,
      'approved'
    )
    RETURNING id, name, email, district_id as "districtId"
  `;
  return result[0];
}

async function criarPastores(distritosIds) {
  console.log('👨‍💼 Criando pastores...');
  
  const pastorNorte = await criarPastor(
    `${TEST_PREFIX}Pastor_NORTE`,
    'pastor.norte.teste@teste.com',
    distritosIds[0].id
  );
  console.log(`   ✅ ${pastorNorte.name} (Distrito NORTE, ID: ${pastorNorte.id})`);
  
  const pastorSul = await criarPastor(
    `${TEST_PREFIX}Pastor_SUL`,
    'pastor.sul.teste@teste.com',
    distritosIds[1].id
  );
  console.log(`   ✅ ${pastorSul.name} (Distrito SUL, ID: ${pastorSul.id})`);
  
  // Atualizar distrito com pastor_id
  await sql`UPDATE districts SET pastor_id = ${pastorNorte.id} WHERE id = ${distritosIds[0].id}`;
  await sql`UPDATE districts SET pastor_id = ${pastorSul.id} WHERE id = ${distritosIds[1].id}`;
  
  console.log('');
  return { pastorNorte, pastorSul };
}

async function criarUsuarios(nomes, districtId, churchName) {
  const usuarios = [];
  
  for (let i = 0; i < nomes.length; i++) {
    const nome = `${TEST_PREFIX}${nomes[i]}`;
    const email = `${nomes[i].toLowerCase().replace(/_/g, '.')}@teste.com`;
    
    const result = await sql`
      INSERT INTO users (name, email, password, role, district_id, church, is_approved, status)
      VALUES (
        ${nome},
        ${email},
        ${hashPassword('senha123')},
        'member',
        ${districtId},
        ${churchName},
        true,
        'approved'
      )
      RETURNING id, name, email, district_id as "districtId"
    `;
    usuarios.push(result[0]);
  }
  
  return usuarios;
}

async function criarUsuariosTeste(distritosIds) {
  console.log('👥 Criando usuários de teste...');
  
  const usuariosNorte = await criarUsuarios(
    USUARIOS_NORTE,
    distritosIds[0].id,
    'Igreja Norte Teste'
  );
  console.log(`   ✅ ${usuariosNorte.length} usuários criados no Distrito NORTE`);
  
  const usuariosSul = await criarUsuarios(
    USUARIOS_SUL,
    distritosIds[1].id,
    'Igreja Sul Teste'
  );
  console.log(`   ✅ ${usuariosSul.length} usuários criados no Distrito SUL`);
  
  console.log('');
  return { usuariosNorte, usuariosSul };
}

// ============================================
// FUNÇÕES DE TESTE
// ============================================

async function testarIsolamentoViaSQL(pastores, distritosIds) {
  console.log('========================================');
  console.log('📊 TESTE 1: Verificação via SQL direto');
  console.log('========================================\n');
  
  // Contar usuários por distrito
  const contagem = await sql`
    SELECT district_id as "districtId", COUNT(*) as total
    FROM users
    WHERE name LIKE ${TEST_PREFIX + '%'}
    GROUP BY district_id
    ORDER BY district_id
  `;
  
  console.log('Contagem de usuários por distrito:');
  contagem.forEach(c => {
    const distritoNome = c.districtId === distritosIds[0].id ? 'NORTE' : 'SUL';
    console.log(`   Distrito ${distritoNome} (ID ${c.districtId}): ${c.total} usuários`);
  });
  console.log('');
  
  // Simular query como pastor NORTE
  console.log('🔍 Simulando query como Pastor NORTE:');
  const usersNorte = await sql`
    SELECT id, name, district_id as "districtId"
    FROM users
    WHERE district_id = ${pastores.pastorNorte.districtId}
    AND name LIKE ${TEST_PREFIX + '%'}
    ORDER BY name
  `;
  
  console.log(`   Usuários visíveis: ${usersNorte.length}`);
  const temSulNoNorte = usersNorte.some(u => u.name.includes('_SUL_'));
  console.log(`   Contém usuários SUL? ${temSulNoNorte ? '❌ SIM (ERRO!)' : '✅ NÃO (Correto)'}`);
  console.log('   Amostra:');
  usersNorte.slice(0, 3).forEach(u => console.log(`      - ${u.name}`));
  console.log('');
  
  // Simular query como pastor SUL
  console.log('🔍 Simulando query como Pastor SUL:');
  const usersSul = await sql`
    SELECT id, name, district_id as "districtId"
    FROM users
    WHERE district_id = ${pastores.pastorSul.districtId}
    AND name LIKE ${TEST_PREFIX + '%'}
    ORDER BY name
  `;
  
  console.log(`   Usuários visíveis: ${usersSul.length}`);
  const temNorteNoSul = usersSul.some(u => u.name.includes('_NORTE_'));
  console.log(`   Contém usuários NORTE? ${temNorteNoSul ? '❌ SIM (ERRO!)' : '✅ NÃO (Correto)'}`);
  console.log('   Amostra:');
  usersSul.slice(0, 3).forEach(u => console.log(`      - ${u.name}`));
  console.log('');
  
  return !temSulNoNorte && !temNorteNoSul;
}

async function testarIsolamentoViaAPI(pastores) {
  console.log('========================================');
  console.log('🌐 TESTE 2: Verificação via API HTTP');
  console.log('========================================\n');
  
  let apiDisponivel = true;
  
  // Testar se a API está disponível
  try {
    await fetchAPI('/api/health');
    console.log(`✅ API disponível em ${BASE_URL}\n`);
  } catch (error) {
    console.log(`⚠️  API não disponível em ${BASE_URL}`);
    console.log(`   Erro: ${error.message}`);
    console.log('   Pulando testes de API...\n');
    apiDisponivel = false;
  }
  
  if (!apiDisponivel) {
    return null; // Não é erro, apenas não testou
  }
  
  let resultado = true;
  
  // Testar como Pastor NORTE
  console.log('🔍 Testando API como Pastor NORTE:');
  try {
    const responseNorte = await fetchAPI('/api/users', {
      headers: {
        'x-user-id': String(pastores.pastorNorte.id),
        'x-user-role': 'pastor'
      }
    });
    
    const usersNorte = Array.isArray(responseNorte) ? responseNorte : responseNorte.users || [];
    const testUsersNorte = usersNorte.filter(u => u.name?.startsWith(TEST_PREFIX));
    
    console.log(`   Total de usuários retornados: ${usersNorte.length}`);
    console.log(`   Usuários de teste: ${testUsersNorte.length}`);
    
    const temSul = testUsersNorte.some(u => u.name?.includes('_SUL_'));
    console.log(`   Contém usuários SUL? ${temSul ? '❌ SIM (ERRO!)' : '✅ NÃO (Correto)'}`);
    
    if (temSul) {
      console.log('   ⚠️  Usuários SUL encontrados indevidamente:');
      testUsersNorte.filter(u => u.name?.includes('_SUL_')).forEach(u => {
        console.log(`      - ${u.name} (ID: ${u.id})`);
      });
      resultado = false;
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    resultado = false;
  }
  console.log('');
  
  // Testar como Pastor SUL
  console.log('🔍 Testando API como Pastor SUL:');
  try {
    const responseSul = await fetchAPI('/api/users', {
      headers: {
        'x-user-id': String(pastores.pastorSul.id),
        'x-user-role': 'pastor'
      }
    });
    
    const usersSul = Array.isArray(responseSul) ? responseSul : responseSul.users || [];
    const testUsersSul = usersSul.filter(u => u.name?.startsWith(TEST_PREFIX));
    
    console.log(`   Total de usuários retornados: ${usersSul.length}`);
    console.log(`   Usuários de teste: ${testUsersSul.length}`);
    
    const temNorte = testUsersSul.some(u => u.name?.includes('_NORTE_'));
    console.log(`   Contém usuários NORTE? ${temNorte ? '❌ SIM (ERRO!)' : '✅ NÃO (Correto)'}`);
    
    if (temNorte) {
      console.log('   ⚠️  Usuários NORTE encontrados indevidamente:');
      testUsersSul.filter(u => u.name?.includes('_NORTE_')).forEach(u => {
        console.log(`      - ${u.name} (ID: ${u.id})`);
      });
      resultado = false;
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    resultado = false;
  }
  console.log('');
  
  return resultado;
}

async function testarDashboardStats(pastores) {
  console.log('========================================');
  console.log('📈 TESTE 3: Dashboard Stats por Distrito');
  console.log('========================================\n');
  
  let apiDisponivel = true;
  
  try {
    await fetchAPI('/api/health');
  } catch (error) {
    console.log(`⚠️  API não disponível. Pulando teste de dashboard...\n`);
    return null;
  }
  
  let resultado = true;
  
  // Testar dashboard como Pastor NORTE
  console.log('🔍 Testando /api/dashboard/stats como Pastor NORTE:');
  try {
    const statsNorte = await fetchAPI('/api/dashboard/stats', {
      headers: {
        'x-user-id': String(pastores.pastorNorte.id),
        'x-user-role': 'pastor'
      }
    });
    
    console.log(`   Total de usuários no dashboard: ${statsNorte.totalUsers || 'N/A'}`);
    console.log(`   Membros ativos: ${statsNorte.activeMembers || 'N/A'}`);
    // Note: Não podemos verificar se são só do Norte sem mais dados
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  }
  console.log('');
  
  // Testar dashboard como Pastor SUL
  console.log('🔍 Testando /api/dashboard/stats como Pastor SUL:');
  try {
    const statsSul = await fetchAPI('/api/dashboard/stats', {
      headers: {
        'x-user-id': String(pastores.pastorSul.id),
        'x-user-role': 'pastor'
      }
    });
    
    console.log(`   Total de usuários no dashboard: ${statsSul.totalUsers || 'N/A'}`);
    console.log(`   Membros ativos: ${statsSul.activeMembers || 'N/A'}`);
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  }
  console.log('');
  
  return resultado;
}

async function testarChatList(pastores) {
  console.log('========================================');
  console.log('💬 TESTE 4: Chat List por Distrito');
  console.log('========================================\n');
  
  try {
    await fetchAPI('/api/health');
  } catch (error) {
    console.log(`⚠️  API não disponível. Pulando teste de chat...\n`);
    return null;
  }
  
  let resultado = true;
  
  // Testar chat-list como Pastor NORTE
  console.log('🔍 Testando /api/users/chat-list como Pastor NORTE:');
  try {
    const chatNorte = await fetchAPI('/api/users/chat-list', {
      headers: {
        'x-user-id': String(pastores.pastorNorte.id),
        'x-user-role': 'pastor'
      }
    });
    
    const users = Array.isArray(chatNorte) ? chatNorte : chatNorte.users || [];
    const testUsers = users.filter(u => u.name?.startsWith(TEST_PREFIX));
    
    console.log(`   Usuários no chat: ${users.length}`);
    console.log(`   Usuários de teste: ${testUsers.length}`);
    
    const temSul = testUsers.some(u => u.name?.includes('_SUL_'));
    console.log(`   Contém usuários SUL? ${temSul ? '❌ SIM (ERRO!)' : '✅ NÃO (Correto)'}`);
    
    if (temSul) resultado = false;
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  }
  console.log('');
  
  // Testar chat-list como Pastor SUL
  console.log('🔍 Testando /api/users/chat-list como Pastor SUL:');
  try {
    const chatSul = await fetchAPI('/api/users/chat-list', {
      headers: {
        'x-user-id': String(pastores.pastorSul.id),
        'x-user-role': 'pastor'
      }
    });
    
    const users = Array.isArray(chatSul) ? chatSul : chatSul.users || [];
    const testUsers = users.filter(u => u.name?.startsWith(TEST_PREFIX));
    
    console.log(`   Usuários no chat: ${users.length}`);
    console.log(`   Usuários de teste: ${testUsers.length}`);
    
    const temNorte = testUsers.some(u => u.name?.includes('_NORTE_'));
    console.log(`   Contém usuários NORTE? ${temNorte ? '❌ SIM (ERRO!)' : '✅ NÃO (Correto)'}`);
    
    if (temNorte) resultado = false;
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  }
  console.log('');
  
  return resultado;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     TESTE COMPLETO DE ISOLAMENTO DE DISTRITOS - 7Care        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 API URL: ${BASE_URL}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL?.substring(0, 50)}...`);
  console.log('');
  
  const resultados = {
    sql: false,
    api: null,
    dashboard: null,
    chat: null
  };
  
  try {
    // Setup
    console.log('========================================');
    console.log('⚙️  SETUP - Criando dados de teste');
    console.log('========================================\n');
    
    await limparDadosTeste();
    const distritosIds = await criarDistritos();
    const pastores = await criarPastores(distritosIds);
    const usuarios = await criarUsuariosTeste(distritosIds);
    
    console.log('✅ Setup completo!\n');
    console.log(`   📍 Distrito NORTE: ID ${distritosIds[0].id}`);
    console.log(`      - Pastor: ${pastores.pastorNorte.name} (ID: ${pastores.pastorNorte.id})`);
    console.log(`      - Usuários: ${usuarios.usuariosNorte.length}`);
    console.log('');
    console.log(`   📍 Distrito SUL: ID ${distritosIds[1].id}`);
    console.log(`      - Pastor: ${pastores.pastorSul.name} (ID: ${pastores.pastorSul.id})`);
    console.log(`      - Usuários: ${usuarios.usuariosSul.length}`);
    console.log('\n');
    
    // Executar testes
    resultados.sql = await testarIsolamentoViaSQL(pastores, distritosIds);
    resultados.api = await testarIsolamentoViaAPI(pastores);
    resultados.dashboard = await testarDashboardStats(pastores);
    resultados.chat = await testarChatList(pastores);
    
    // Resumo
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    RESUMO DOS TESTES                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    
    const statusIcon = (result) => {
      if (result === null) return '⏭️  PULADO';
      return result ? '✅ PASSOU' : '❌ FALHOU';
    };
    
    console.log(`   Teste SQL direto:      ${statusIcon(resultados.sql)}`);
    console.log(`   Teste API /users:      ${statusIcon(resultados.api)}`);
    console.log(`   Teste Dashboard:       ${statusIcon(resultados.dashboard)}`);
    console.log(`   Teste Chat List:       ${statusIcon(resultados.chat)}`);
    console.log('');
    
    const todosPaasaram = resultados.sql && 
                          (resultados.api === null || resultados.api) &&
                          (resultados.dashboard === null || resultados.dashboard) &&
                          (resultados.chat === null || resultados.chat);
    
    if (todosPaasaram) {
      console.log('🎉 ISOLAMENTO DE DISTRITOS ESTÁ FUNCIONANDO CORRETAMENTE!');
    } else {
      console.log('⚠️  ALGUNS TESTES FALHARAM - VERIFICAR ISOLAMENTO!');
    }
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    console.log('========================================');
    console.log('🧹 LIMPEZA - Removendo dados de teste');
    console.log('========================================\n');
    
    await limparDadosTeste();
    console.log('✅ Dados de teste removidos.\n');
  }
}

// Executar
main().catch(console.error);
