import { neon } from '@neondatabase/serverless';
const sql = neon(
  'postgresql://neondb_owner:npg_enihr4YBSDm8@ep-still-glade-ac5u1r48-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
);

(async () => {
  try {
    // Buscar distrito de Santana do Livramento
    console.log('🔍 Buscando distrito de Santana do Livramento...');
    const districts =
      await sql`SELECT * FROM districts WHERE name ILIKE '%santana%' OR name ILIKE '%livramento%'`;
    console.log('Distritos encontrados:', JSON.stringify(districts, null, 2));

    if (districts.length === 0) {
      // Buscar todos os distritos
      console.log('\n📋 Listando todos os distritos:');
      const allDistricts = await sql`SELECT id, name, pastor_id FROM districts ORDER BY id`;
      console.log(JSON.stringify(allDistricts, null, 2));
      return;
    }

    const districtId = districts[0].id;
    console.log('\n✅ Distrito ID:', districtId);

    // Buscar pastor do distrito
    console.log('\n👤 Buscando pastor do distrito...');
    const pastors =
      await sql`SELECT id, name, email, role, district_id FROM users WHERE district_id = ${districtId} AND role = 'pastor'`;
    console.log('Pastores do distrito:', JSON.stringify(pastors, null, 2));

    // Buscar total de usuários no distrito
    const userCount =
      await sql`SELECT COUNT(*) as total FROM users WHERE district_id = ${districtId}`;
    console.log('\n📊 Total de usuários no distrito:', userCount[0].total);

    // Buscar alguns usuários para verificar estrutura
    console.log('\n👥 Amostra de usuários no distrito:');
    const sampleUsers =
      await sql`SELECT id, name, role, points, church FROM users WHERE district_id = ${districtId} LIMIT 5`;
    console.log(JSON.stringify(sampleUsers, null, 2));

    // Verificar se existe a tabela district_settings
    console.log('\n⚙️ Verificando tabela district_settings...');
    try {
      const settings = await sql`SELECT * FROM district_settings WHERE district_id = ${districtId}`;
      console.log('Configurações do distrito:', JSON.stringify(settings, null, 2));
    } catch (e) {
      console.log('Tabela district_settings não existe ou erro:', e.message);
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
})();
