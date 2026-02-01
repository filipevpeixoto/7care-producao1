import 'dotenv/config';
import { sql } from './server/neonConfig.ts';
import * as crypto from 'crypto';
import * as readline from 'readline';

console.log('🔐 Configurador de Credenciais por Pastor\n');
console.log('═══════════════════════════════════════════════════════════\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

try {
  // 1. Listar usuários pastores
  const pastors = await sql`
    SELECT id, name, email, phone, district_id
    FROM users
    WHERE role IN ('pastor', 'admin', 'superadmin')
    ORDER BY name
  `;

  if (pastors.length === 0) {
    console.log('❌ Nenhum pastor encontrado no sistema.\n');
    process.exit(1);
  }

  console.log('📋 Pastores disponíveis:\n');
  pastors.forEach((p, idx) => {
    console.log(`   ${idx + 1}. ${p.name} (ID: ${p.id})`);
    console.log(`      Email: ${p.email || 'não cadastrado'}`);
    console.log(`      Igreja ID: ${p.district_id || 'não associado'}`);
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════════\n');

  // 2. Selecionar pastor
  const pastorIndex = await question('Digite o número do pastor (ou 0 para sair): ');
  const selectedIndex = parseInt(pastorIndex) - 1;

  if (selectedIndex < 0 || selectedIndex >= pastors.length) {
    console.log('\n❌ Seleção inválida. Saindo...\n');
    process.exit(0);
  }

  const selectedPastor = pastors[selectedIndex];

  console.log(`\n✅ Selecionado: ${selectedPastor.name}\n`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // 3. Verificar configurações existentes
  const existingConfigs = await sql`
    SELECT key, value
    FROM automation_config
    WHERE user_id = ${selectedPastor.id}
    ORDER BY key
  `;

  if (existingConfigs.length > 0) {
    console.log('⚠️  Este pastor já possui configurações:\n');
    existingConfigs.forEach(c => {
      const maskedValue = c.key.includes('password') || c.key.includes('api_key')
        ? '••••••••'
        : c.value;
      console.log(`   ${c.key}: ${maskedValue}`);
    });
    console.log('');

    const overwrite = await question('Deseja sobrescrever? (s/n): ');
    if (overwrite.toLowerCase() !== 's') {
      console.log('\n❌ Operação cancelada.\n');
      process.exit(0);
    }
    console.log('');
  }

  // 4. Coletar credenciais
  console.log('📝 Configure as credenciais do Dracma:\n');
  console.log('   Acesse: https://dracma.sdasystems.org/\n');

  const dracmaUsername = await question('Usuário do Dracma: ');
  const dracmaPassword = await question('Senha do Dracma: ');

  console.log('\n📝 Configure a API Key do OCR.space (opcional):\n');
  console.log('   Registre-se GRÁTIS em: https://ocr.space/ocrapi\n');
  console.log('   Você ganha 500 requisições/dia sem cartão de crédito\n');

  const ocrApiKey = await question('API Key do OCR.space (ou ENTER para pular): ');

  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('💾 Salvando configurações...\n');

  // 5. Gerar API key única para n8n webhook (se necessário)
  const n8nApiKey = crypto.randomBytes(32).toString('hex');

  // 6. Salvar no banco (UPSERT)
  const configs = [
    { key: 'n8n_api_key', value: n8nApiKey },
    { key: 'dracma_username', value: dracmaUsername || 'CHANGE_ME' },
    { key: 'dracma_password', value: dracmaPassword || 'CHANGE_ME' },
    { key: 'ocr_space_api_key', value: ocrApiKey || 'CHANGE_ME' },
  ];

  for (const config of configs) {
    // Verificar se já existe
    const existing = await sql`
      SELECT id FROM automation_config
      WHERE key = ${config.key}
      AND user_id = ${selectedPastor.id}
    `;

    if (existing.length > 0) {
      // UPDATE
      await sql`
        UPDATE automation_config
        SET value = ${config.value}, updated_at = NOW()
        WHERE key = ${config.key}
        AND user_id = ${selectedPastor.id}
      `;
    } else {
      // INSERT
      await sql`
        INSERT INTO automation_config (key, value, user_id, district_id, encrypted)
        VALUES (
          ${config.key},
          ${config.value},
          ${selectedPastor.id},
          ${selectedPastor.district_id},
          ${config.key.includes('password')}
        )
      `;
    }

    const displayValue = config.key.includes('password') || config.key.includes('api_key')
      ? '••••••••'
      : config.value;
    console.log(`   ✅ ${config.key}: ${displayValue}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('✅ Configurações salvas com sucesso!\n');

  // 7. Mostrar resumo
  console.log('📋 Resumo da configuração:\n');
  console.log(`   Pastor: ${selectedPastor.name}`);
  console.log(`   Igreja ID: ${selectedPastor.district_id || 'não associado'}`);
  console.log(`   Usuário Dracma: ${dracmaUsername || '⚠️ não configurado'}`);
  console.log(`   Senha Dracma: ${dracmaPassword ? '✅ configurada' : '⚠️ não configurada'}`);
  console.log(`   OCR API Key: ${ocrApiKey ? '✅ configurada' : '⚠️ não configurada'}`);
  console.log(`   n8n API Key: ${n8nApiKey.substring(0, 20)}...`);
  console.log('');

  console.log('📝 Próximos passos:\n');
  console.log('   1. Configure o webhook n8n com a API Key acima');
  console.log('   2. Conecte o WhatsApp Business via Evolution API');
  console.log('   3. Envie uma foto de nota fiscal para testar');
  console.log('   4. Os recibos serão processados automaticamente\n');

  console.log('═══════════════════════════════════════════════════════════\n');

} catch (err) {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
} finally {
  rl.close();
  process.exit(0);
}
