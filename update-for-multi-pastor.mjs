import 'dotenv/config';
import { sql } from './server/neonConfig.ts';

console.log('🔧 Adaptando sistema para múltiplos pastores...\n');

try {
  // 1. Adicionar colunas user_id e church_id à tabela automation_config
  console.log('📋 Adicionando colunas para suporte multi-pastor...');

  await sql`
    ALTER TABLE automation_config
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS church_id INTEGER REFERENCES churches(id) ON DELETE CASCADE
  `;

  console.log('✅ Colunas user_id e church_id adicionadas\n');

  // 2. Criar índices
  await sql`CREATE INDEX IF NOT EXISTS idx_automation_config_user_id ON automation_config(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_automation_config_church_id ON automation_config(church_id)`;

  console.log('✅ Índices criados\n');

  // 3. Converter configuração global em exemplo
  await sql`
    UPDATE automation_config
    SET value = 'EXEMPLO_' || value
    WHERE user_id IS NULL
    AND value NOT LIKE 'EXEMPLO_%'
  `;

  console.log('✅ Configurações globais marcadas como exemplo\n');

  // 4. Mostrar estrutura atual
  const configs = await sql`
    SELECT
      id,
      key,
      CASE
        WHEN user_id IS NOT NULL THEN 'Pastor ID: ' || user_id::text
        WHEN church_id IS NOT NULL THEN 'Igreja ID: ' || church_id::text
        ELSE 'Global (exemplo)'
      END as escopo,
      CASE
        WHEN value LIKE 'EXEMPLO_%' THEN 'Exemplo'
        WHEN value = 'CHANGE_ME' THEN 'Não configurado'
        ELSE 'Configurado'
      END as status
    FROM automation_config
    ORDER BY user_id NULLS FIRST, key
  `;

  console.log('📊 Configurações atuais:\n');
  console.table(configs);

  console.log('\n✅ Sistema adaptado para múltiplos pastores!\n');

  console.log('📝 Próximos passos:\n');
  console.log('   1. Cada pastor deve configurar suas credenciais');
  console.log('   2. Use o script: npx tsx configure-pastor-credentials.mjs');
  console.log('   3. Os recibos serão filtrados por igreja automaticamente\n');

  process.exit(0);

} catch (err) {
  console.error('❌ Erro:', err);
  process.exit(1);
}
