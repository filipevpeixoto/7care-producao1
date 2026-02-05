/**
 * Script para verificar o isolamento de distrito do Pastor A
 */
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('\n=== VERIFICAÇÃO DE ISOLAMENTO DE DISTRITO ===\n');
  
  // 1. Buscar dados do Pastor A
  const pastorA = await sql`SELECT id, name, email, role, district_id FROM users WHERE email = 'pastor.teste.a@teste.com'`;
  
  if (pastorA.length === 0) {
    console.log('❌ Pastor A não encontrado!');
    return;
  }
  
  console.log('👤 Pastor A:', pastorA[0]);
  const districtId = pastorA[0].district_id;
  console.log('📍 District ID:', districtId);
  
  // 2. Total de usuários no sistema
  const allUsers = await sql`SELECT COUNT(*) as total FROM users`;
  console.log('\n📊 Total de usuários no sistema:', allUsers[0].total);
  
  // 3. Usuários no distrito do Pastor A
  const districtUsers = await sql`SELECT COUNT(*) as total FROM users WHERE district_id = ${districtId}`;
  console.log('📊 Usuários no Distrito Alpha (district_id=' + districtId + '):', districtUsers[0].total);
  
  // 4. Contagem por role no distrito
  const byRole = await sql`SELECT role, COUNT(*) as count FROM users WHERE district_id = ${districtId} GROUP BY role ORDER BY role`;
  console.log('\n📈 Por role no Distrito Alpha:');
  byRole.forEach(r => console.log('   -', r.role + ':', r.count));
  
  // 5. Listar usuários do distrito
  const usersInDistrict = await sql`SELECT id, name, email, role FROM users WHERE district_id = ${districtId} ORDER BY role, name`;
  console.log('\n👥 Usuários no Distrito Alpha:');
  usersInDistrict.forEach(u => console.log('   -', u.role.padEnd(12), u.name, '(' + u.email + ')'));
  
  // 6. Usuários sem distrito
  const noDistrict = await sql`SELECT COUNT(*) as total FROM users WHERE district_id IS NULL`;
  console.log('\n⚠️ Usuários SEM distrito:', noDistrict[0].total);
  
  // 7. Usuários em outros distritos
  const otherDistrict = await sql`SELECT COUNT(*) as total FROM users WHERE district_id IS NOT NULL AND district_id != ${districtId}`;
  console.log('⚠️ Usuários em OUTROS distritos:', otherDistrict[0].total);
  
  // 8. Verificar se o Pastor A deveria ver 3 admins e 12 membros
  console.log('\n=== ANÁLISE ===');
  const adminCount = byRole.find(r => r.role === 'pastor' || r.role === 'superadmin' || r.role === 'admin');
  const memberCount = byRole.find(r => r.role === 'member');
  
  console.log('O Pastor A está vendo: 3 admins e 12 membros');
  console.log('No banco, para o Distrito Alpha:');
  console.log('   - Admins/Pastores:', byRole.filter(r => ['pastor', 'superadmin', 'admin'].includes(r.role)).reduce((a, b) => a + parseInt(b.count), 0));
  console.log('   - Membros:', memberCount ? memberCount.count : 0);
  
  if (parseInt(districtUsers[0].total) !== 15) {
    console.log('\n⚠️ POSSÍVEL PROBLEMA: O Pastor A deveria ver apenas usuários do Distrito Alpha!');
    console.log('   Esperado: ~7 usuários (1 pastor + 6 membros de teste)');
    console.log('   Total no distrito:', districtUsers[0].total);
  }
}

main().catch(console.error);
