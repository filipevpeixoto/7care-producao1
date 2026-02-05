import { neon } from '@neondatabase/serverless';
const sql = neon(
  'postgresql://neondb_owner:npg_enihr4YBSDm8@ep-still-glade-ac5u1r48-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
);

const PASTOR_ID = 6641;
const DISTRICT_ID = 16;

// Simular a função calculateUserPoints do api.js
async function calculateUserPoints(user) {
  let points = 0;

  // Pontos base por role
  const rolePoints = {
    member: 50,
    pastor: 100,
    missionary: 75,
    interested: 25,
    superadmin: 0,
  };

  points += rolePoints[user.role] || 0;

  // Pontos por engajamento
  const engajamento = (user.engajamento || '').toLowerCase();
  if (engajamento.includes('alto') || engajamento === 'high') points += 200;
  else if (
    engajamento.includes('médio') ||
    engajamento.includes('medio') ||
    engajamento === 'medium'
  )
    points += 100;
  else if (engajamento.includes('baixo') || engajamento === 'low') points += 50;

  // Pontos por classificação
  const classificacao = (user.classificacao || '').toLowerCase();
  if (classificacao.includes('frequente')) points += 100;
  else if (classificacao.includes('não frequente') || classificacao.includes('nao frequente'))
    points += 50;

  // Pontos por dizimista
  if (user.is_tither) points += 100;

  // Pontos por ofertante
  if (user.is_donor) points += 50;

  // Pontos por tempo de batismo
  if (user.tempo_batismo_anos) {
    if (user.tempo_batismo_anos >= 8) points += 400;
    else if (user.tempo_batismo_anos >= 4) points += 200;
    else points += 100;
  }

  return points;
}

(async () => {
  try {
    console.log('🔄 Simulando recálculo de pontos como pastor ID:', PASTOR_ID);
    console.log('📍 Distrito ID:', DISTRICT_ID);

    // Buscar usuários do distrito (igual ao endpoint)
    console.log('\n📊 Buscando usuários do distrito...');
    const users =
      await sql`SELECT * FROM users WHERE district_id = ${DISTRICT_ID} AND role != 'superadmin' ORDER BY id`;
    console.log(`👥 ${users.length} usuários encontrados`);

    // Processar alguns para verificar
    console.log('\n🧮 Calculando pontos para primeiros 5 usuários:');
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < Math.min(5, users.length); i++) {
      const user = users[i];
      try {
        const calculatedPoints = await calculateUserPoints(user);
        console.log(
          `- ${user.name}: pontos atuais=${user.points}, calculado=${calculatedPoints}, atualizar=${user.points !== calculatedPoints}`
        );

        if (user.points !== calculatedPoints) {
          updatedCount++;
        }
      } catch (error) {
        console.error(`Erro ao processar ${user.name}:`, error.message);
        errorCount++;
      }
    }

    // Verificar chamada HTTP real
    console.log('\n🌐 Testando chamada HTTP real ao endpoint...');

    const response = await fetch(
      'https://7careadv.netlify.app/api/users/recalculate-all-points',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(PASTOR_ID),
        },
      }
    );

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Resposta:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Erro:', error);
  }
})();
