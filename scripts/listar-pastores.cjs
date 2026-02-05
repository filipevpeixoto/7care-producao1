const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  // Buscar pastores
  const pastores = await sql`
    SELECT u.id, u.name, u.email, u.role, u.district_id as "districtId", d.name as "districtName"
    FROM users u
    LEFT JOIN districts d ON u.district_id = d.id
    WHERE u.role LIKE '%pastor%'
    ORDER BY u.id
    LIMIT 10
  `;
  
  console.log('\n📋 PASTORES DISPONÍVEIS PARA TESTE:\n');
  console.log('─'.repeat(80));
  
  for (const p of pastores) {
    console.log(`Pastor: ${p.name}`);
    console.log(`   Email: ${p.email}`);
    console.log(`   Role: ${p.role}`);
    console.log(`   Distrito: ${p.districtName || 'N/A'} (ID: ${p.districtId || 'N/A'})`);
    
    // Contar usuários no distrito
    if (p.districtId) {
      const count = await sql`SELECT COUNT(*) as total FROM users WHERE district_id = ${p.districtId}`;
      console.log(`   Usuários no distrito: ${count[0].total}`);
    }
    console.log('─'.repeat(80));
  }
  
  // Mostrar distritos
  const distritos = await sql`
    SELECT d.id, d.name, COUNT(u.id) as total_users
    FROM districts d
    LEFT JOIN users u ON u.district_id = d.id
    GROUP BY d.id, d.name
    ORDER BY d.id
    LIMIT 10
  `;
  
  console.log('\n🏛️ DISTRITOS E QUANTIDADE DE USUÁRIOS:\n');
  distritos.forEach(d => {
    console.log(`   Distrito ${d.id}: ${d.name} - ${d.total_users} usuários`);
  });
}

main().catch(console.error);
