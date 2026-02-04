const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function testeIsolamentoDistritos() {
  console.log('========================================');
  console.log('TESTE DE ISOLAMENTO DE DISTRITOS');
  console.log('========================================\n');

  // 1. Buscar informações do pastor Filipe
  const filipe = await sql`
    SELECT id, name, email, role, district_id as "districtId"
    FROM users
    WHERE email = 'filipevpeixoto@hotmail.com'
  `;

  if (filipe.length === 0) {
    console.log('❌ Usuário filipevpeixoto@hotmail.com não encontrado!');
    return;
  }

  const pastor = filipe[0];
  console.log('📋 PASTOR FILIPE:');
  console.log(`   ID: ${pastor.id}`);
  console.log(`   Nome: ${pastor.name}`);
  console.log(`   Email: ${pastor.email}`);
  console.log(`   Role: ${pastor.role}`);
  console.log(`   Distrito ID: ${pastor.districtId}\n`);

  // 2. Buscar informações do distrito
  const distrito = await sql`
    SELECT id, name, pastor_id as "pastorId"
    FROM districts
    WHERE id = ${pastor.districtId}
  `;

  if (distrito.length > 0) {
    console.log('🏛️  DISTRITO:');
    console.log(`   ID: ${distrito[0].id}`);
    console.log(`   Nome: ${distrito[0].name}`);
    console.log(`   Pastor ID: ${distrito[0].pastorId}\n`);
  }

  // 3. Contar usuários por distrito
  const usersByDistrict = await sql`
    SELECT district_id as "districtId", COUNT(*) as total
    FROM users
    WHERE district_id IN (49, 50)
    GROUP BY district_id
  `;

  console.log('📊 USUÁRIOS POR DISTRITO:');
  usersByDistrict.forEach(d => {
    console.log(`   Distrito ${d.districtId}: ${d.total} usuários`);
  });
  console.log('');

  // 4. Simular query como pastor (deveria retornar apenas usuários do seu distrito)
  console.log('🔍 SIMULANDO QUERY COMO PASTOR (deve retornar apenas distrito ' + pastor.districtId + '):');
  
  // Query que DEVERIA ser executada no backend para pastor
  const usuariosDoDistrito = await sql`
    SELECT id, name, email, district_id as "districtId", church
    FROM users
    WHERE district_id = ${pastor.districtId}
    ORDER BY id
    LIMIT 10
  `;

  console.log(`   ✅ Usuários do distrito ${pastor.districtId}: ${usuariosDoDistrito.length} (primeiros 10)`);
  usuariosDoDistrito.slice(0, 5).forEach(u => {
    console.log(`      - ID: ${u.id}, Nome: ${u.name}, Distrito: ${u.districtId}`);
  });
  console.log('');

  // 5. Verificar se existem usuários de outros distritos
  const outrosDistritos = await sql`
    SELECT COUNT(*) as total
    FROM users
    WHERE district_id != ${pastor.districtId}
    AND district_id IS NOT NULL
  `;

  console.log('⚠️  VERIFICAÇÃO:');
  console.log(`   Usuários de OUTROS distritos: ${outrosDistritos[0].total}`);
  console.log('');

  // 6. Buscar o outro pastor
  const outroPastor = await sql`
    SELECT id, name, email, district_id as "districtId"
    FROM users
    WHERE role LIKE '%pastor%'
    AND id != ${pastor.id}
    ORDER BY id
    LIMIT 1
  `;

  if (outroPastor.length > 0) {
    console.log('👤 OUTRO PASTOR (NÃO DEVERIA SER VISÍVEL):');
    console.log(`   ID: ${outroPastor[0].id}`);
    console.log(`   Nome: ${outroPastor[0].name}`);
    console.log(`   Distrito ID: ${outroPastor[0].districtId}`);
    
    // Contar usuários do outro distrito
    const outroDistritoUsers = await sql`
      SELECT COUNT(*) as total
      FROM users
      WHERE district_id = ${outroPastor[0].districtId}
    `;
    console.log(`   Usuários no distrito ${outroPastor[0].districtId}: ${outroDistritoUsers[0].total}`);
    console.log('');
  }

  // 7. Testar query SEM filtro (como está retornando para o pastor)
  console.log('⚠️  TESTE: Query SEM filtro de distrito (BUG POTENCIAL):');
  const semFiltro = await sql`
    SELECT district_id as "districtId", COUNT(*) as total
    FROM users
    WHERE district_id IN (49, 50)
    GROUP BY district_id
  `;
  
  console.log('   Se esta query estiver sendo usada, o pastor vê TODOS os usuários:');
  semFiltro.forEach(d => {
    console.log(`      Distrito ${d.districtId}: ${d.total} usuários`);
  });
  console.log('');

  // 8. Verificar igrejas do distrito
  const igrejasDistrito = await sql`
    SELECT id, name, district_id as "districtId"
    FROM churches
    WHERE district_id = ${pastor.districtId}
  `;

  console.log('⛪ IGREJAS DO DISTRITO ' + pastor.districtId + ':');
  if (igrejasDistrito.length > 0) {
    igrejasDistrito.forEach(i => {
      console.log(`   - ${i.name} (ID: ${i.id})`);
    });
  } else {
    console.log('   ⚠️  Nenhuma igreja encontrada!');
  }
  console.log('');

  console.log('========================================');
  console.log('CONCLUSÃO:');
  console.log('========================================');
  console.log('✅ Pastor Filipe está no distrito: ' + pastor.districtId);
  console.log('✅ Query com filtro retorna apenas usuários do distrito: ' + pastor.districtId);
  console.log('⚠️  Se o frontend ainda mostra usuários de outros distritos,');
  console.log('    o problema está em:');
  console.log('    1. Backend não está aplicando o filtro de districtId');
  console.log('    2. Frontend não está enviando os headers x-user-id/x-user-role');
  console.log('    3. Middleware não está extraindo corretamente o districtId do usuário');
  console.log('========================================\n');
}

testeIsolamentoDistritos().catch(console.error);
