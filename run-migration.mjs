import 'dotenv/config';
import { sql } from './server/neonConfig.ts';

console.log('🔄 Executando migration 003...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing');

try {
  // Criar tabela _migrations se não existir
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('✅ Tabela _migrations verificada');

  // Verificar se migration já foi executada
  const existing = await sql`
    SELECT name FROM _migrations
    WHERE name = '003_create_expense_receipts_and_automation_config.ts'
  `;

  if (existing.length > 0) {
    console.log('⚠️ Migration 003 já foi executada anteriormente');
    process.exit(0);
  }

  console.log('📋 Criando tabela expense_receipts...');

  await sql`
    CREATE TABLE IF NOT EXISTS expense_receipts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      whatsapp_number TEXT,
      image_url TEXT NOT NULL,

      -- OCR data
      ocr_provider TEXT DEFAULT 'ocrspace',
      ocr_raw_data JSONB,
      ocr_confidence INTEGER,

      -- Extracted fields
      merchant_name TEXT,
      receipt_date DATE,
      total_amount TEXT,
      currency TEXT DEFAULT 'BRL',
      category TEXT,
      tax_id TEXT,

      -- Workflow
      status TEXT DEFAULT 'pending',

      -- Dracma integration
      dracma_submitted_at TIMESTAMP WITH TIME ZONE,
      dracma_confirmation_id TEXT,
      dracma_error TEXT,
      dracma_retry_count INTEGER DEFAULT 0,

      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  console.log('📋 Criando índices para expense_receipts...');

  await sql`CREATE INDEX IF NOT EXISTS idx_expense_receipts_user_id ON expense_receipts(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_receipts_status ON expense_receipts(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_receipts_receipt_date ON expense_receipts(receipt_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_receipts_whatsapp_number ON expense_receipts(whatsapp_number)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_receipts_created_at ON expense_receipts(created_at)`;

  console.log('✅ Tabela expense_receipts criada com sucesso!');

  console.log('📋 Criando tabela automation_config...');

  await sql`
    CREATE TABLE IF NOT EXISTS automation_config (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      encrypted BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_automation_config_key ON automation_config(key)`;

  console.log('✅ Tabela automation_config criada com sucesso!');

  console.log('📋 Inserindo configurações iniciais...');

  await sql`
    INSERT INTO automation_config (key, value, encrypted)
    VALUES
      ('n8n_api_key', 'CHANGE_ME', false),
      ('dracma_username', 'CHANGE_ME', false),
      ('dracma_password', 'CHANGE_ME', true),
      ('ocr_space_api_key', 'CHANGE_ME', false)
    ON CONFLICT (key) DO NOTHING
  `;

  console.log('✅ Configurações iniciais inseridas!');

  // Marcar migration como executada
  await sql`
    INSERT INTO _migrations (name)
    VALUES ('003_create_expense_receipts_and_automation_config.ts')
  `;

  console.log('🎉 Migration 003 executada com sucesso!');
  process.exit(0);

} catch (err) {
  console.error('❌ Erro ao executar migration:', err);
  process.exit(1);
}
