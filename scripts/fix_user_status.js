import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function fixUserStatus() {
  try {
    // Atualizar usuários que ainda não fizeram primeiro acesso para status pending
    const result = await sql`
      UPDATE users
      SET status = 'pending'
      WHERE district_id IN (49, 50)
      AND first_access = true
      AND status = 'active'
      AND role = 'member'
      RETURNING id, name, email, status
    `;

    console.log(`✅ ${result.length} usuários atualizados para status 'pending'`);
    console.log('\nPrimeiros 10 usuários atualizados:');
    result.slice(0, 10).forEach(u => {
      console.log(`ID: ${u.id}, Nome: ${u.name}, Email: ${u.email}, Status: ${u.status}`);
    });

    // Verificar contagem final
    const statusCount = await sql`
      SELECT status, COUNT(*) as count
      FROM users
      WHERE district_id IN (49, 50)
      GROUP BY status
    `;

    console.log('\n📊 Contagem final por status nos distritos 49 e 50:');
    statusCount.forEach(s => {
      console.log(`Status '${s.status}': ${s.count} usuários`);
    });
  } catch (error) {
    console.error('Erro:', error);
  }
}

fixUserStatus();
