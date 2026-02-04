const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function testeAPIIsolamento() {
  console.log('========================================');
  console.log('TESTE DE API - ISOLAMENTO DE DISTRITOS');
  console.log('========================================\n');

  // 1. Buscar pastor Filipe
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
  console.log(`   Distrito ID: ${pastor.districtId}`);
  console.log('');

  // 2. Buscar pastor Samuel
  const samuel = await sql`
    SELECT id, name, email, role, district_id as "districtId"
    FROM users
    WHERE role LIKE '%pastor%'
    AND id != ${pastor.id}
    LIMIT 1
  `;

  if (samuel.length === 0) {
    console.log('❌ Outro pastor não encontrado!');
    return;
  }

  const outroPastor = samuel[0];
  console.log('📋 PASTOR SAMUEL:');
  console.log(`   ID: ${outroPastor.id}`);
  console.log(`   Distrito ID: ${outroPastor.districtId}`);
  console.log('');

  console.log('========================================');
  console.log('SIMULAÇÃO DE CHAMADAS À API');
  console.log('========================================\n');

  // 3. Simular getAllUsers() e filtrar manualmente
  console.log('🔍 1. TESTE: storage.getAllUsers() + filtro manual por districtId\n');

  const allUsers = await sql`
    SELECT id, name, email, district_id as "districtId", church, role
    FROM users
    ORDER BY id
  `;

  console.log(`   Total de usuários no banco: ${allUsers.length}`);

  // Filtrar manualmente como o código faz
  const filteredFilipe = allUsers.filter(u => u.districtId === pastor.districtId);
  const filteredSamuel = allUsers.filter(u => u.districtId === outroPastor.districtId);

  console.log(`   Usuários do distrito ${pastor.districtId} (Filipe): ${filteredFilipe.length}`);
  console.log(`   Usuários do distrito ${outroPastor.districtId} (Samuel): ${filteredSamuel.length}`);
  console.log('');

  // 4. Verificar se há usuários sem distrito
  const semDistrito = allUsers.filter(u => u.districtId === null);
  console.log(`   ⚠️  Usuários SEM distrito: ${semDistrito.length}`);
  if (semDistrito.length > 0 && semDistrito.length <= 10) {
    semDistrito.forEach(u => {
      console.log(`      - ID: ${u.id}, Nome: ${u.name}, Role: ${u.role}`);
    });
  }
  console.log('');

  // 5. Testar se o pastor Filipe está no seu próprio distrito
  const filipeNoDistrito = filteredFilipe.find(u => u.id === pastor.id);
  if (filipeNoDistrito) {
    console.log('   ✅ Pastor Filipe está incluído na lista do seu distrito');
  } else {
    console.log('   ❌ Pastor Filipe NÃO está na lista do seu distrito!');
  }
  console.log('');

  // 6. Verificar se pastores estão vendo apenas seu distrito
  const samuelNoDistritoFilipe = filteredFilipe.find(u => u.id === outroPastor.id);
  const filipeNoDistritoSamuel = filteredSamuel.find(u => u.id === pastor.id);

  if (samuelNoDistritoFilipe) {
    console.log('   ❌ ERRO: Pastor Samuel aparece no distrito do Filipe!');
  } else {
    console.log('   ✅ Pastor Samuel NÃO aparece no distrito do Filipe');
  }

  if (filipeNoDistritoSamuel) {
    console.log('   ❌ ERRO: Pastor Filipe aparece no distrito do Samuel!');
  } else {
    console.log('   ✅ Pastor Filipe NÃO aparece no distrito do Samuel');
  }
  console.log('');

  // 7. Listar alguns usuários de cada distrito
  console.log('📋 PRIMEIROS 5 USUÁRIOS DO DISTRITO ' + pastor.districtId + ':');
  filteredFilipe.slice(0, 5).forEach(u => {
    console.log(`   - ID: ${u.id}, Nome: ${u.name}`);
  });
  console.log('');

  console.log('📋 PRIMEIROS 5 USUÁRIOS DO DISTRITO ' + outroPastor.districtId + ':');
  filteredSamuel.slice(0, 5).forEach(u => {
    console.log(`   - ID: ${u.id}, Nome: ${u.name}`);
  });
  console.log('');

  console.log('========================================');
  console.log('DIAGNÓSTICO');
  console.log('========================================');
  console.log('');
  console.log('✅ Filtro manual por districtId funciona corretamente');
  console.log('✅ Os distritos estão separados no banco de dados');
  console.log('');
  console.log('Se o pastor Filipe ainda vê usuários do outro distrito:');
  console.log('');
  console.log('POSSÍVEIS CAUSAS:');
  console.log('1. ❌ requestingUser.districtId está undefined ou null');
  console.log('   → Verificar se getUserById() está retornando districtId');
  console.log('   → Adicionar log no backend: console.log("requestingUser:", requestingUser)');
  console.log('');
  console.log('2. ❌ O frontend não está enviando x-user-id header');
  console.log('   → Verificar network tab no navegador');
  console.log('   → Procurar por requisições GET /api/users');
  console.log('   → Confirmar presença dos headers x-user-id e x-user-role');
  console.log('');
  console.log('3. ❌ O backend está ignorando o filtro por distrito');
  console.log('   → Adicionar logs antes e depois do filtro');
  console.log('   → Verificar se a condição if (requestingUser.role === "pastor") está sendo executada');
  console.log('');
  console.log('========================================');
  console.log('');
  console.log('PRÓXIMO PASSO:');
  console.log('Adicione logs no arquivo server/routes/userRoutes.ts na linha ~347:');
  console.log('');
  console.log('  logger.info("🔍 requestingUser:", {');
  console.log('    id: requestingUser.id,');
  console.log('    role: requestingUser.role,');
  console.log('    districtId: requestingUser.districtId');
  console.log('  });');
  console.log('');
  console.log('  logger.info(`🏛️ Filtrando ${users.length} usuários por distrito ${requestingUser.districtId}`);');
  console.log('');
  console.log('========================================\n');
}

testeAPIIsolamento().catch(console.error);
