import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function checkUsers() {
  try {
    const users = await sql`
      SELECT id, name, email, status, first_access, district_id 
      FROM users 
      WHERE district_id IN (49, 50)
      AND status = 'pending'
      ORDER BY district_id, id
      LIMIT 20
    `;

    console.log('Usuários com status=pending:');
    console.log('Total:', users.length);
    console.log('\nPrimeiros 10:');
    users.slice(0, 10).forEach(u => {
      console.log(
        `ID: ${u.id}, Distrito: ${u.district_id}, Status: ${u.status}, FirstAccess: ${u.first_access}, Nome: ${u.name}`
      );
    });

    // Verificar total por status
    const statusCount = await sql`
      SELECT status, COUNT(*) as count
      FROM users
      WHERE district_id IN (49, 50)
      GROUP BY status
    `;

    console.log('\nContagem por status nos distritos 49 e 50:');
    statusCount.forEach(s => {
      console.log(`Status '${s.status}': ${s.count} usuários`);
    });
  } catch (error) {
    console.error('Erro:', error);
  }
}

checkUsers();
