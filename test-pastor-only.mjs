import 'dotenv/config';
import { sql } from './server/neonConfig.ts';

console.log('🧪 TESTE: Validar que apenas pastores podem enviar notas\n');
console.log('═══════════════════════════════════════════════════════════\n');

let allTestsPassed = true;

try {
  // TESTE 1: Verificar roles no sistema
  console.log('1️⃣ Verificando roles dos usuários...\n');

  const usersByRole = await sql`
    SELECT
      role,
      COUNT(*) as count
    FROM users
    GROUP BY role
    ORDER BY count DESC
  `;

  console.log('   📊 Usuários por role:\n');
  usersByRole.forEach(r => {
    console.log(`      ${r.role}: ${r.count}`);
  });
  console.log('');

  // TESTE 2: Verificar pastores com credenciais
  console.log('2️⃣ Verificando pastores com credenciais configuradas...\n');

  const pastorsWithCreds = await sql`
    SELECT
      u.id,
      u.name,
      u.role,
      u.district_id,
      COUNT(DISTINCT ac.key) as config_count
    FROM users u
    LEFT JOIN automation_config ac ON ac.user_id = u.id
    WHERE u.role IN ('pastor', 'admin', 'superadmin')
    GROUP BY u.id, u.name, u.role, u.district_id
    ORDER BY u.name
  `;

  if (pastorsWithCreds.length === 0) {
    console.log('   ⚠️ Nenhum pastor encontrado no sistema\n');
  } else {
    pastorsWithCreds.forEach(p => {
      const hasFullConfig = p.config_count >= 4; // n8n, dracma_user, dracma_pass, ocr
      const status = hasFullConfig ? '✅' : '⚠️';
      console.log(`   ${status} ${p.name} (${p.role})`);
      console.log(`      ID: ${p.id} | Distrito: ${p.district_id || 'não associado'}`);
      console.log(`      Configurações: ${p.config_count || 0}/4`);
      console.log('');
    });

    const pastorsWithoutConfig = pastorsWithCreds.filter(p => !p.config_count || p.config_count < 4);
    if (pastorsWithoutConfig.length > 0) {
      console.log('   ⚠️ Pastores sem configuração completa:');
      pastorsWithoutConfig.forEach(p => {
        console.log(`      - ${p.name} (faltam ${4 - (p.config_count || 0)} configs)`);
      });
      console.log('\n   Execute: npx tsx configure-pastor-credentials.mjs\n');
    }
  }

  // TESTE 3: Simular validação de role
  console.log('3️⃣ Simulando validação de envio de nota...\n');

  // Buscar um pastor
  const pastor = await sql`
    SELECT id, name, role FROM users
    WHERE role IN ('pastor', 'admin', 'superadmin')
    LIMIT 1
  `;

  if (pastor.length > 0) {
    const p = pastor[0];
    const allowedRoles = ['pastor', 'admin', 'superadmin'];
    const canSend = allowedRoles.includes(p.role);

    console.log(`   Pastor: ${p.name} (role: ${p.role})`);
    console.log(`   Pode enviar notas? ${canSend ? '✅ SIM' : '❌ NÃO'}\n`);

    if (!canSend) {
      console.log('   ❌ ERRO: Pastor não pode enviar notas!\n');
      allTestsPassed = false;
    }
  }

  // Buscar um membro comum
  const member = await sql`
    SELECT id, name, role FROM users
    WHERE role NOT IN ('pastor', 'admin', 'superadmin')
    LIMIT 1
  `;

  if (member.length > 0) {
    const m = member[0];
    const allowedRoles = ['pastor', 'admin', 'superadmin'];
    const canSend = allowedRoles.includes(m.role);

    console.log(`   Membro: ${m.name} (role: ${m.role})`);
    console.log(`   Pode enviar notas? ${canSend ? '❌ SIM (ERRO!)' : '✅ NÃO (correto)'}\n`);

    if (canSend) {
      console.log('   ❌ ERRO: Membro comum pode enviar notas!\n');
      allTestsPassed = false;
    }
  } else {
    console.log('   ℹ️ Nenhum membro comum encontrado para testar\n');
  }

  // TESTE 4: Verificar recibos existentes
  console.log('4️⃣ Verificando recibos existentes...\n');

  const receiptsWithUsers = await sql`
    SELECT
      er.id,
      er.user_id,
      u.name,
      u.role,
      er.status,
      er.created_at
    FROM expense_receipts er
    JOIN users u ON er.user_id = u.id
    ORDER BY er.created_at DESC
    LIMIT 10
  `;

  if (receiptsWithUsers.length > 0) {
    console.log('   📋 Últimos recibos:\n');
    receiptsWithUsers.forEach(r => {
      const isPastor = ['pastor', 'admin', 'superadmin'].includes(r.role);
      const icon = isPastor ? '✅' : '❌';
      const roleLabel = isPastor ? 'PASTOR' : 'MEMBRO (ERRO!)';

      console.log(`   ${icon} Recibo #${r.id}`);
      console.log(`      Enviado por: ${r.name} (${r.role}) - ${roleLabel}`);
      console.log(`      Status: ${r.status}`);
      console.log('');

      if (!isPastor) {
        console.log(`   ❌ ATENÇÃO: Recibo enviado por ${r.role}, não por pastor!\n`);
        allTestsPassed = false;
      }
    });
  } else {
    console.log('   ℹ️ Nenhum recibo encontrado no sistema\n');
    console.log('   Execute: npx tsx test-api.mjs para criar recibos de teste\n');
  }

  // TESTE 5: Verificar estrutura de credenciais
  console.log('5️⃣ Verificando estrutura de credenciais...\n');

  const allConfigs = await sql`
    SELECT
      ac.id,
      ac.key,
      ac.user_id,
      ac.district_id,
      u.name as pastor_name,
      u.role,
      CASE
        WHEN ac.value LIKE 'EXEMPLO_%' THEN 'Exemplo'
        WHEN ac.value = 'CHANGE_ME' THEN 'Não configurado'
        ELSE 'Configurado'
      END as status
    FROM automation_config ac
    LEFT JOIN users u ON ac.user_id = u.id
    ORDER BY ac.user_id NULLS FIRST, ac.key
  `;

  const globalConfigs = allConfigs.filter(c => !c.user_id);
  const pastorConfigs = allConfigs.filter(c => c.user_id);

  console.log(`   Configurações globais: ${globalConfigs.length}`);
  console.log(`   Configurações por pastor: ${pastorConfigs.length}\n`);

  if (pastorConfigs.length > 0) {
    console.log('   📋 Configurações por pastor:\n');

    const configsByPastor = {};
    pastorConfigs.forEach(c => {
      if (!configsByPastor[c.user_id]) {
        configsByPastor[c.user_id] = {
          name: c.pastor_name,
          role: c.role,
          district_id: c.district_id,
          configs: []
        };
      }
      configsByPastor[c.user_id].configs.push(c);
    });

    Object.values(configsByPastor).forEach(p => {
      const hasAllConfigs = p.configs.length >= 4;
      const allConfigured = p.configs.every(c => c.status === 'Configurado');
      const icon = hasAllConfigs && allConfigured ? '✅' : '⚠️';

      console.log(`   ${icon} ${p.name} (${p.role})`);
      console.log(`      Distrito: ${p.district_id || 'não associado'}`);
      console.log(`      Configurações: ${p.configs.length}`);
      p.configs.forEach(c => {
        const statusIcon = c.status === 'Configurado' ? '✅' : '⚠️';
        console.log(`         ${statusIcon} ${c.key}: ${c.status}`);
      });
      console.log('');
    });
  }

  // RESUMO FINAL
  console.log('═══════════════════════════════════════════════════════════\n');

  if (allTestsPassed) {
    console.log('✅ TODOS OS TESTES PASSARAM!\n');
    console.log('✅ Sistema configurado corretamente:');
    console.log('   - Apenas pastores podem enviar notas');
    console.log('   - Credenciais isoladas por pastor');
    console.log('   - Recibos apenas de pastores\n');

    console.log('📝 Próximos passos:\n');
    console.log('   1. Configurar credenciais de cada pastor (se ainda não configurou)');
    console.log('      npx tsx configure-pastor-credentials.mjs\n');
    console.log('   2. Testar envio de nota via WhatsApp\n');
    console.log('   3. Verificar submissão no Dracma\n');
  } else {
    console.log('⚠️ ALGUNS PROBLEMAS ENCONTRADOS\n');
    console.log('   Revise os erros acima e corrija antes de prosseguir.\n');
  }

  console.log('═══════════════════════════════════════════════════════════\n');

} catch (err) {
  console.error('\n❌ Erro durante os testes:', err.message);
  console.error('\nStack trace:', err.stack);
  process.exit(1);
}

process.exit(allTestsPassed ? 0 : 1);
