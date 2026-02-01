import 'dotenv/config';
import { sql } from './server/neonConfig.ts';

console.log('✅ VALIDAÇÃO DA INSTALAÇÃO - Automação de Notas Fiscais\n');
console.log('═══════════════════════════════════════════════════════════\n');

let allGood = true;

// 1. Verificar conexão com banco
console.log('1️⃣ Conexão com Banco de Dados');
try {
  await sql`SELECT 1`;
  console.log('   ✅ Conectado ao Neon Database\n');
} catch (err) {
  console.log('   ❌ Erro ao conectar:', err.message, '\n');
  allGood = false;
}

// 2. Verificar tabelas
console.log('2️⃣ Tabelas do Banco');
try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('expense_receipts', 'automation_config')
  `;

  if (tables.length === 2) {
    console.log('   ✅ expense_receipts');
    console.log('   ✅ automation_config\n');
  } else {
    console.log('   ❌ Tabelas não encontradas. Execute: npx tsx run-migration.mjs\n');
    allGood = false;
  }
} catch (err) {
  console.log('   ❌ Erro:', err.message, '\n');
  allGood = false;
}

// 3. Verificar configurações
console.log('3️⃣ Configurações');
try {
  const configs = await sql`SELECT key, value FROM automation_config ORDER BY key`;

  configs.forEach(c => {
    const configured = c.value !== 'CHANGE_ME';
    const icon = configured ? '✅' : '⚠️';
    console.log(`   ${icon} ${c.key.padEnd(20)} ${configured ? 'Configurado' : 'Precisa configurar'}`);
  });
  console.log();
} catch (err) {
  console.log('   ❌ Erro:', err.message, '\n');
  allGood = false;
}

// 4. Verificar recibos
console.log('4️⃣ Recibos no Banco');
try {
  const stats = await sql`
    SELECT COUNT(*) as total FROM expense_receipts
  `;

  if (stats[0].total > 0) {
    console.log(`   ✅ ${stats[0].total} recibo(s) encontrado(s)\n`);
  } else {
    console.log('   ⚠️ Nenhum recibo ainda. Execute: npx tsx test-api.mjs\n');
  }
} catch (err) {
  console.log('   ❌ Erro:', err.message, '\n');
  allGood = false;
}

// 5. Verificar arquivos
console.log('5️⃣ Arquivos Implementados');
const filesToCheck = [
  'server/schema.ts',
  'server/migrations/003_create_expense_receipts_and_automation_config.ts',
  'server/routes/receiptRoutes.ts',
  'server/services/dracmaSubmitter.ts',
  'server/jobs/dracmaSubmissionJob.ts',
  'docs/receipt-automation-README.md',
  'docs/dracma-selectors.md',
];

import { existsSync } from 'fs';
filesToCheck.forEach(file => {
  const exists = existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});
console.log();

// Resumo final
console.log('═══════════════════════════════════════════════════════════\n');

if (allGood) {
  console.log('🎉 INSTALAÇÃO COMPLETA!\n');
  console.log('✅ Todos os componentes principais estão funcionando.');
  console.log('✅ Você pode iniciar o servidor com: npm run dev\n');
  console.log('📚 Próximos passos: Ver QUICK-START.md\n');
} else {
  console.log('⚠️ ALGUNS PROBLEMAS ENCONTRADOS\n');
  console.log('   Revise os erros acima e execute os comandos sugeridos.\n');
}

console.log('═══════════════════════════════════════════════════════════\n');

process.exit(allGood ? 0 : 1);
