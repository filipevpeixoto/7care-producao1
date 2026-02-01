import 'dotenv/config';
import { sql } from './server/neonConfig.ts';

console.log('📊 Verificando tabelas criadas...\n');

const tables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('expense_receipts', 'automation_config')
  ORDER BY table_name
`;

console.log('✅ Tabelas encontradas:', tables.map(t => t.table_name).join(', '));

const configs = await sql`SELECT key, value FROM automation_config ORDER BY key`;

console.log('\n📋 Configurações atuais:\n');
configs.forEach(c => {
  const needsConfig = c.value === 'CHANGE_ME';
  const status = needsConfig ? '⚠️ PRECISA CONFIGURAR' : '✅ Configurado';
  const display = c.key.includes('password') ? '***' : (needsConfig ? c.value : '***');
  console.log(`  ${status} ${c.key.padEnd(20)} = ${display}`);
});

console.log('\n');
process.exit(0);
