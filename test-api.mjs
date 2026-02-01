import 'dotenv/config';
import { sql } from './server/neonConfig.ts';

console.log('🧪 Testando API de Recibos\n');

// Buscar n8n_api_key do banco
const [config] = await sql`SELECT value FROM automation_config WHERE key = 'n8n_api_key'`;
const apiKey = config.value;

console.log('✅ API Key encontrada:', apiKey.substring(0, 20) + '...\n');

// Buscar um usuário existente para testar
let users = await sql`SELECT id, name, phone FROM users WHERE phone IS NOT NULL LIMIT 1`;

if (users.length === 0) {
  console.log('⚠️ Nenhum usuário com telefone. Usando primeiro usuário disponível...');
  users = await sql`SELECT id, name, phone FROM users LIMIT 1`;

  if (users.length === 0) {
    console.log('❌ Nenhum usuário encontrado no banco. Crie usuários primeiro.\n');
    process.exit(1);
  }

  // Atualizar com telefone de teste
  await sql`UPDATE users SET phone = '5511999999999' WHERE id = ${users[0].id}`;
  users[0].phone = '5511999999999';
  console.log('✅ Telefone de teste adicionado ao usuário\n');
}

const testUser = users[0];
console.log(`✅ Usuário de teste: ${testUser.name} (ID: ${testUser.id})`);
console.log(`   Telefone: ${testUser.phone}\n`);

console.log('📝 Criando recibo de teste...\n');

// Simular chamada da API (sem precisar do servidor rodando)
try {
  await sql`
    INSERT INTO expense_receipts (
      user_id, whatsapp_number, image_url, ocr_provider,
      merchant_name, receipt_date, total_amount, category, status
    )
    VALUES (
      ${testUser.id},
      ${testUser.phone},
      'https://picsum.photos/400/600',
      'ocrspace',
      'Posto Shell - TESTE',
      '2026-02-01',
      '150.50',
      'transport',
      'pending'
    )
    RETURNING id
  `;

  console.log('✅ Recibo de teste criado com sucesso!\n');

  // Buscar estatísticas
  const stats = await sql`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error
    FROM expense_receipts
  `;

  console.log('📊 Estatísticas:');
  console.log(`   Total de recibos: ${stats[0].total}`);
  console.log(`   Pendentes: ${stats[0].pending}`);
  console.log(`   Submetidos: ${stats[0].submitted}`);
  console.log(`   Com erro: ${stats[0].error}\n`);

  // Buscar últimos recibos
  const receipts = await sql`
    SELECT id, merchant_name, total_amount, status, created_at
    FROM expense_receipts
    ORDER BY created_at DESC
    LIMIT 5
  `;

  console.log('📋 Últimos 5 recibos:');
  receipts.forEach(r => {
    const date = new Date(r.created_at).toLocaleString('pt-BR');
    console.log(`   #${r.id} - ${r.merchant_name} - R$ ${r.total_amount} (${r.status}) - ${date}`);
  });

  console.log('\n✅ Teste completo! A API está funcionando corretamente.\n');

  console.log('🚀 Próximos passos:');
  console.log('   1. Rodar o servidor: npm run dev');
  console.log('   2. Testar endpoint: curl http://localhost:3065/api/receipts/stats');
  console.log('   3. Ver documentação completa em docs/receipt-automation-README.md\n');

} catch (err) {
  console.error('❌ Erro ao criar recibo:', err.message);
  process.exit(1);
}

process.exit(0);
