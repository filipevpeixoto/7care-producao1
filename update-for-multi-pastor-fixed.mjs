import 'dotenv/config';
import { sql } from './server/neonConfig.ts';

console.log('🔧 Corrigindo sistema multi-pastor para usar district_id...\n');

try {
  // 1. Verificar se automation_config já tem as colunas corretas
  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'automation_config'
    AND column_name IN ('user_id', 'church_id', 'district_id')
  `;

  const hasUserId = columns.some(c => c.column_name === 'user_id');
  const hasChurchId = columns.some(c => c.column_name === 'church_id');
  const hasDistrictId = columns.some(c => c.column_name === 'district_id');

  console.log(`📋 Status das colunas:`);
  console.log(`   user_id: ${hasUserId ? '✅ existe' : '❌ não existe'}`);
  console.log(`   church_id: ${hasChurchId ? '✅ existe' : '⚠️ não existe (não é necessária)'}`);
  console.log(`   district_id: ${hasDistrictId ? '✅ existe' : '❌ não existe'}\n`);

  // 2. Adicionar district_id se não existir
  if (!hasDistrictId) {
    console.log('📝 Adicionando coluna district_id...');
    await sql`
      ALTER TABLE automation_config
      ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE
    `;
    console.log('✅ Coluna district_id adicionada\n');
  } else {
    console.log('✅ Coluna district_id já existe\n');
  }

  // 3. Criar índice para district_id
  await sql`
    CREATE INDEX IF NOT EXISTS idx_automation_config_district_id
    ON automation_config(district_id)
  `;
  console.log('✅ Índice para district_id criado\n');

  // 4. Atualizar configurações existentes para adicionar district_id dos pastores
  console.log('📝 Associando configurações aos distritos dos pastores...\n');

  // Buscar pastores e seus distritos
  const pastorsWithConfig = await sql`
    SELECT DISTINCT ac.user_id, u.district_id, u.name
    FROM automation_config ac
    JOIN users u ON ac.user_id = u.id
    WHERE ac.user_id IS NOT NULL
    AND u.district_id IS NOT NULL
    AND ac.district_id IS NULL
  `;

  if (pastorsWithConfig.length > 0) {
    for (const pastor of pastorsWithConfig) {
      await sql`
        UPDATE automation_config
        SET district_id = ${pastor.district_id}
        WHERE user_id = ${pastor.user_id}
        AND district_id IS NULL
      `;
      console.log(`   ✅ ${pastor.name}: district_id = ${pastor.district_id}`);
    }
    console.log('');
  } else {
    console.log('   ℹ️ Nenhuma configuração de pastor precisa ser atualizada\n');
  }

  // 5. Mostrar resumo
  const configs = await sql`
    SELECT
      ac.id,
      ac.key,
      u.name as pastor_name,
      u.district_id,
      CASE
        WHEN ac.user_id IS NOT NULL THEN 'Pastor ID: ' || ac.user_id::text
        WHEN ac.district_id IS NOT NULL THEN 'Distrito ID: ' || ac.district_id::text
        ELSE 'Global (exemplo)'
      END as escopo,
      CASE
        WHEN ac.value LIKE 'EXEMPLO_%' THEN 'Exemplo'
        WHEN ac.value = 'CHANGE_ME' THEN 'Não configurado'
        ELSE 'Configurado'
      END as status
    FROM automation_config ac
    LEFT JOIN users u ON ac.user_id = u.id
    ORDER BY ac.user_id NULLS FIRST, ac.key
  `;

  console.log('📊 Configurações atuais:\n');
  console.table(configs);

  console.log('\n✅ Sistema adaptado para usar district_id!\n');

  console.log('📝 Próximos passos:\n');
  console.log('   1. Cada pastor deve configurar suas credenciais');
  console.log('   2. Use o script: npx tsx configure-pastor-credentials.mjs');
  console.log('   3. Recibos serão filtrados por distrito automaticamente\n');

  console.log('💡 IMPORTANTE:\n');
  console.log('   - Pastores do mesmo distrito compartilham credenciais');
  console.log('   - Membros usam automaticamente as credenciais do pastor do distrito');
  console.log('   - Isolamento é feito por district_id (não por igreja individual)\n');

  process.exit(0);

} catch (err) {
  console.error('❌ Erro:', err);
  process.exit(1);
}
