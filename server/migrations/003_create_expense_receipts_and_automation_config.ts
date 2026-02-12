/**
 * Migration: 003 - Create expense_receipts and automation_config tables
 * Adiciona tabelas para automação de notas fiscais via WhatsApp
 */

import { type NeonQueryFunction } from '@neondatabase/serverless';

export async function up(sql: NeonQueryFunction<boolean, boolean>): Promise<void> {
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
      ocr_confidence INTEGER, -- 0-100

      -- Extracted fields
      merchant_name TEXT,
      receipt_date DATE,
      total_amount TEXT,
      currency TEXT DEFAULT 'BRL',
      category TEXT, -- 'transport', 'food', 'materials', 'other'
      tax_id TEXT, -- CNPJ/CPF

      -- Workflow
      status TEXT DEFAULT 'pending',
      -- 'pending' -> 'processing' -> 'submitted' | 'error'

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

  console.log('📋 Criando índice para automation_config...');

  await sql`CREATE INDEX IF NOT EXISTS idx_automation_config_key ON automation_config(key)`;

  console.log('✅ Tabela automation_config criada com sucesso!');

  console.log('📋 Inserindo configurações iniciais...');

  // Inserir configurações vazias (usuário deve preencher depois)
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
}

export async function down(sql: NeonQueryFunction<boolean, boolean>): Promise<void> {
  console.log('📋 Removendo índices de expense_receipts...');

  await sql`DROP INDEX IF EXISTS idx_expense_receipts_user_id`;
  await sql`DROP INDEX IF EXISTS idx_expense_receipts_status`;
  await sql`DROP INDEX IF EXISTS idx_expense_receipts_receipt_date`;
  await sql`DROP INDEX IF EXISTS idx_expense_receipts_whatsapp_number`;
  await sql`DROP INDEX IF EXISTS idx_expense_receipts_created_at`;

  console.log('📋 Removendo tabela expense_receipts...');

  await sql`DROP TABLE IF EXISTS expense_receipts CASCADE`;

  console.log('✅ Tabela expense_receipts removida!');

  console.log('📋 Removendo índice de automation_config...');

  await sql`DROP INDEX IF EXISTS idx_automation_config_key`;

  console.log('📋 Removendo tabela automation_config...');

  await sql`DROP TABLE IF EXISTS automation_config CASCADE`;

  console.log('✅ Tabela automation_config removida!');
}
