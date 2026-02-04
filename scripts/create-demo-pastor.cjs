/**
 * Script para criar um pastor de demonstração com dados mockados
 * para screenshot da landing page
 */

const bcrypt = require('bcryptjs');

// Dados de demonstração
const DEMO_DATA = {
  // Estatísticas do pastor (números que farão sentido)
  stats: {
    totalUsers: 847,
    amigos: 312,
    membros: 423,
    missionarios: 112,
    interessados: 45,
    oracoes: 156,
    conversas: 89,
    checkins: 78,
    visitas: 234
  },
  
  // Dados do pastor
  pastor: {
    name: 'Pastor João Silva',
    email: 'pastor.demo@7care.com',
    password: 'Demo7care!2026',
    role: 'pastor',
    church: 'Igreja Adventista Central',
    districtId: 47, // Usar um distrito existente
    status: 'active',
    isApproved: true,
    firstAccess: false
  }
};

async function createDemoPastor() {
  const hashedPassword = bcrypt.hashSync(DEMO_DATA.pastor.password, 10);
  
  console.log('='.repeat(60));
  console.log('DADOS DO PASTOR DE DEMONSTRAÇÃO');
  console.log('='.repeat(60));
  console.log('');
  console.log('📧 Email:', DEMO_DATA.pastor.email);
  console.log('🔐 Senha:', DEMO_DATA.pastor.password);
  console.log('👤 Nome:', DEMO_DATA.pastor.name);
  console.log('⛪ Igreja:', DEMO_DATA.pastor.church);
  console.log('');
  console.log('='.repeat(60));
  console.log('NÚMEROS PARA OS CARDS DO DASHBOARD');
  console.log('='.repeat(60));
  console.log('');
  console.log('📊 Total de Usuários:', DEMO_DATA.stats.totalUsers);
  console.log('   ├── 🤝 Amigos da Igreja:', DEMO_DATA.stats.amigos);
  console.log('   ├── 👥 Membros:', DEMO_DATA.stats.membros);
  console.log('   └── ⭐ Missionários:', DEMO_DATA.stats.missionarios);
  console.log('   (312 + 423 + 112 = 847 ✓)');
  console.log('');
  console.log('📈 Outras Estatísticas:');
  console.log('   🔍 Interessados:', DEMO_DATA.stats.interessados);
  console.log('   🙏 Orações:', DEMO_DATA.stats.oracoes);
  console.log('   💬 Conversas:', DEMO_DATA.stats.conversas);
  console.log('   ✅ Check-ins Espirituais:', DEMO_DATA.stats.checkins);
  console.log('   🏠 Visitas:', DEMO_DATA.stats.visitas);
  console.log('');
  console.log('='.repeat(60));
  console.log('SQL PARA CRIAR O PASTOR');
  console.log('='.repeat(60));
  console.log('');
  
  const sql = `
-- Criar pastor de demonstração
INSERT INTO users (
  name, 
  email, 
  password, 
  role, 
  church, 
  district_id,
  status, 
  is_approved, 
  first_access,
  created_at,
  updated_at
) VALUES (
  '${DEMO_DATA.pastor.name}',
  '${DEMO_DATA.pastor.email}',
  '${hashedPassword}',
  '${DEMO_DATA.pastor.role}',
  '${DEMO_DATA.pastor.church}',
  ${DEMO_DATA.pastor.districtId},
  '${DEMO_DATA.pastor.status}',
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password = '${hashedPassword}',
  name = '${DEMO_DATA.pastor.name}',
  role = '${DEMO_DATA.pastor.role}',
  church = '${DEMO_DATA.pastor.church}',
  is_approved = true,
  first_access = false,
  updated_at = NOW();
`;
  
  console.log(sql);
  console.log('');
  console.log('='.repeat(60));
  console.log('EXECUTANDO VIA API');
  console.log('='.repeat(60));
  console.log('');
  
  // Tentar criar via API
  try {
    const response = await fetch('http://localhost:3065/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: DEMO_DATA.pastor.name,
        email: DEMO_DATA.pastor.email,
        password: DEMO_DATA.pastor.password,
        role: DEMO_DATA.pastor.role,
        church: DEMO_DATA.pastor.church,
        districtId: DEMO_DATA.pastor.districtId
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Pastor criado com sucesso!');
      console.log('   ID:', data.user?.id || 'N/A');
    } else if (data.error?.includes('já existe') || data.error?.includes('already exists') || data.message?.includes('already')) {
      console.log('⚠️  Pastor já existe no banco, atualizando...');
      
      // Tentar fazer login para verificar
      const loginResponse = await fetch('http://localhost:3065/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: DEMO_DATA.pastor.email,
          password: DEMO_DATA.pastor.password
        })
      });
      
      if (loginResponse.ok) {
        console.log('✅ Login verificado com sucesso!');
      } else {
        console.log('❌ Erro ao verificar login');
      }
    } else {
      console.log('❌ Erro ao criar pastor:', data.error || data.message);
    }
  } catch (error) {
    console.log('❌ Erro de conexão:', error.message);
    console.log('');
    console.log('💡 Execute o SQL acima diretamente no banco de dados.');
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('PRÓXIMOS PASSOS');
  console.log('='.repeat(60));
  console.log('');
  console.log('1. Acesse: http://localhost:3065');
  console.log('2. Faça login com:');
  console.log('   Email: ' + DEMO_DATA.pastor.email);
  console.log('   Senha: ' + DEMO_DATA.pastor.password);
  console.log('3. O dashboard exibirá os dados reais do distrito');
  console.log('');
  console.log('Para o screenshot com números customizados, use:');
  console.log('   node scripts/capture-dashboard.cjs');
  console.log('');
}

createDemoPastor();
