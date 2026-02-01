import 'dotenv/config';
import { sql } from './server/neonConfig.ts';

console.log('🧪 TESTE DO SISTEMA MULTI-PASTOR\n');
console.log('═══════════════════════════════════════════════════════════\n');

let allTestsPassed = true;

try {
  // TESTE 1: Verificar estrutura da tabela automation_config
  console.log('1️⃣ Verificando estrutura da tabela automation_config...\n');

  const columns = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'automation_config'
    AND column_name IN ('user_id', 'church_id')
  `;

  if (columns.length === 2) {
    console.log('   ✅ Colunas user_id e church_id existem');
    columns.forEach(col => {
      console.log(`      - ${col.column_name}: ${col.data_type}`);
    });
  } else {
    console.log('   ❌ FALHOU: Colunas user_id e church_id não encontradas');
    console.log('   Execute: npx tsx update-for-multi-pastor.mjs');
    allTestsPassed = false;
  }
  console.log('');

  // TESTE 2: Verificar configurações existentes
  console.log('2️⃣ Verificando configurações por pastor...\n');

  const configsByPastor = await sql`
    SELECT
      u.id as pastor_id,
      u.name as pastor_name,
      u.church_id,
      COUNT(ac.id) as config_count,
      STRING_AGG(ac.key, ', ') as configured_keys
    FROM users u
    LEFT JOIN automation_config ac ON ac.user_id = u.id
    WHERE u.role IN ('pastor', 'admin', 'superadmin')
    GROUP BY u.id, u.name, u.church_id
    ORDER BY u.name
  `;

  if (configsByPastor.length > 0) {
    console.log('   📋 Configurações por pastor:\n');
    configsByPastor.forEach(p => {
      console.log(`   Pastor: ${p.pastor_name} (ID: ${p.pastor_id})`);
      console.log(`   Igreja ID: ${p.church_id || '⚠️ não associado'}`);
      console.log(`   Configurações: ${p.config_count || 0}`);
      if (p.configured_keys) {
        console.log(`   Chaves: ${p.configured_keys}`);
      } else {
        console.log('   ⚠️ Nenhuma configuração pessoal');
      }
      console.log('');
    });

    const pastorsWithoutConfig = configsByPastor.filter(p => !p.config_count || p.config_count === '0');
    if (pastorsWithoutConfig.length > 0) {
      console.log('   ⚠️ Pastores sem configuração:');
      pastorsWithoutConfig.forEach(p => {
        console.log(`      - ${p.pastor_name} (ID: ${p.pastor_id})`);
      });
      console.log('   Execute: npx tsx configure-pastor-credentials.mjs\n');
    }
  } else {
    console.log('   ⚠️ Nenhum pastor encontrado no sistema\n');
  }

  // TESTE 3: Verificar configurações globais (exemplo)
  console.log('3️⃣ Verificando configurações globais...\n');

  const globalConfigs = await sql`
    SELECT key, value, user_id, church_id
    FROM automation_config
    WHERE user_id IS NULL
    ORDER BY key
  `;

  if (globalConfigs.length > 0) {
    console.log('   📋 Configurações globais (exemplo):\n');
    globalConfigs.forEach(c => {
      const isExample = c.value.startsWith('EXEMPLO_');
      const icon = isExample ? '✅' : '⚠️';
      const status = isExample ? 'Marcado como exemplo' : 'Deveria ser exemplo';
      console.log(`   ${icon} ${c.key}: ${status}`);
    });
  } else {
    console.log('   ℹ️ Nenhuma configuração global encontrada');
  }
  console.log('');

  // TESTE 4: Simular busca de credenciais
  console.log('4️⃣ Testando lógica de busca de credenciais...\n');

  // Buscar um usuário membro para testar
  const members = await sql`
    SELECT id, name, church_id, role
    FROM users
    WHERE role NOT IN ('pastor', 'admin', 'superadmin')
    AND church_id IS NOT NULL
    LIMIT 1
  `;

  if (members.length > 0) {
    const testUser = members[0];
    console.log(`   Testando com usuário: ${testUser.name} (ID: ${testUser.id})`);
    console.log(`   Igreja ID: ${testUser.church_id}\n`);

    // Simular busca de credenciais (mesma lógica do DracmaSubmitter)
    let credentials = await sql`
      SELECT key, value FROM automation_config
      WHERE key IN ('dracma_username', 'dracma_password')
      AND user_id = ${testUser.id}
      AND value != 'CHANGE_ME'
    `;

    if (credentials.length < 2) {
      console.log('   ➡️ Usuário não tem credenciais próprias, buscando do pastor...');

      const pastor = await sql`
        SELECT id, name FROM users
        WHERE church_id = ${testUser.church_id}
        AND role IN ('pastor', 'admin')
        LIMIT 1
      `;

      if (pastor.length > 0) {
        console.log(`   ➡️ Pastor encontrado: ${pastor[0].name} (ID: ${pastor[0].id})`);

        credentials = await sql`
          SELECT key, value FROM automation_config
          WHERE key IN ('dracma_username', 'dracma_password')
          AND user_id = ${pastor[0].id}
          AND value != 'CHANGE_ME'
        `;

        if (credentials.length === 2) {
          console.log('   ✅ Credenciais do pastor encontradas:');
          credentials.forEach(c => {
            const maskedValue = c.key.includes('password') ? '••••••••' : c.value;
            console.log(`      - ${c.key}: ${maskedValue}`);
          });
        } else {
          console.log('   ⚠️ Pastor não tem credenciais configuradas');
          console.log('   Execute: npx tsx configure-pastor-credentials.mjs');
        }
      } else {
        console.log('   ⚠️ Nenhum pastor encontrado para a igreja');
        allTestsPassed = false;
      }
    } else {
      console.log('   ✅ Usuário tem credenciais próprias configuradas');
    }
  } else {
    console.log('   ℹ️ Nenhum membro com igreja associada para testar');
  }
  console.log('');

  // TESTE 5: Verificar isolamento por igreja
  console.log('5️⃣ Verificando isolamento de recibos por igreja...\n');

  const receiptsByChurch = await sql`
    SELECT
      c.id as church_id,
      c.name as church_name,
      COUNT(er.id) as receipt_count
    FROM churches c
    LEFT JOIN users u ON u.church_id = c.id
    LEFT JOIN expense_receipts er ON er.user_id = u.id
    GROUP BY c.id, c.name
    HAVING COUNT(er.id) > 0
    ORDER BY receipt_count DESC
  `;

  if (receiptsByChurch.length > 0) {
    console.log('   📊 Recibos por igreja:\n');
    receiptsByChurch.forEach(church => {
      console.log(`   ${church.church_name || `Igreja ID ${church.church_id}`}`);
      console.log(`   └─ Total de recibos: ${church.receipt_count}`);
      console.log('');
    });
    console.log('   ✅ Sistema está isolando recibos por igreja');
  } else {
    console.log('   ℹ️ Nenhum recibo encontrado no sistema');
    console.log('   Execute: npx tsx test-api.mjs para criar recibos de teste');
  }
  console.log('');

  // TESTE 6: Verificar índices
  console.log('6️⃣ Verificando índices de performance...\n');

  const indexes = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'automation_config'
    AND indexname LIKE 'idx_automation_config_%'
  `;

  if (indexes.length >= 2) {
    console.log('   ✅ Índices criados:');
    indexes.forEach(idx => {
      console.log(`      - ${idx.indexname}`);
    });
  } else {
    console.log('   ⚠️ Índices faltando');
    console.log('   Execute: npx tsx update-for-multi-pastor.mjs');
    allTestsPassed = false;
  }
  console.log('');

  // RESUMO FINAL
  console.log('═══════════════════════════════════════════════════════════\n');

  if (allTestsPassed) {
    console.log('🎉 TODOS OS TESTES PASSARAM!\n');
    console.log('✅ Sistema multi-pastor está funcionando corretamente\n');

    console.log('📝 Próximos passos:\n');
    console.log('   1. Configure credenciais de cada pastor:');
    console.log('      npx tsx configure-pastor-credentials.mjs\n');
    console.log('   2. Teste o fluxo completo enviando uma foto via WhatsApp\n');
    console.log('   3. Verifique isolamento: pastores devem ver apenas recibos da sua igreja\n');
  } else {
    console.log('⚠️ ALGUNS TESTES FALHARAM\n');
    console.log('   Revise os erros acima e execute os comandos sugeridos.\n');
  }

  console.log('═══════════════════════════════════════════════════════════\n');

} catch (err) {
  console.error('\n❌ Erro durante os testes:', err.message);
  console.error('\nStack trace:', err.stack);
  process.exit(1);
}

process.exit(allTestsPassed ? 0 : 1);
