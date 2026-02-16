/**
 * Migration: 003 - Create expense_receipts and automation_config tables
 * Adiciona tabelas para automação de notas fiscais via WhatsApp
 */

import { type NeonQueryFunction } from '@neondatabase/serverless';
import { logger } from '../utils/logger';

export async function up(sql: NeonQueryFunction<boolean, boolean>): Promise<void> {
  logger.info('📋 Criando tabela expense_receipts...');

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

  logger.info('📋 Criando índices para expense_receipts...');

  await sql`CREATE INDEX IF NOT EXISTS idx_expense_receipts_user_id ON expense_receipts(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_receipts_status ON expense_receipts(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_receipts_receipt_date ON expense_receipts(receipt_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_receipts_whatsapp_number ON expense_receipts(whatsapp_number)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expense_receipts_created_at ON expense_receipts(created_at)`;

  logger.info('✅ Tabela expense_receipts criada com sucesso!');

  logger.info('📋 Criando tabela automation_config...');

  await sql`
    CREATE TABLE IF NOT EXISTS automation_config (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      encrypted BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  logger.info('📋 Criando índice para automation_config...');

  await sql`CREATE INDEX IF NOT EXISTS idx_automation_config_key ON automation_config(key)`;

  logger.info('✅ Tabela automation_config criada com sucesso!');

  logger.info('📋 Inserindo configurações iniciais...');

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

  logger.info('✅ Configurações iniciais inseridas!');
}

export async function down(sql: NeonQueryFunction<boolean, boolean>): Promise<void> {
  logger.info('📋 Removendo índices de expense_receipts...');

  await sql`DROP INDEX IF EXISTS idx_expense_receipts_user_id`;
  await sql`DROP INDEX IF EXISTS idx_expense_receipts_status`;
  await sql`DROP INDEX IF EXISTS idx_expense_receipts_receipt_date`;
  await sql`DROP INDEX IF EXISTS idx_expense_receipts_whatsapp_number`;
  await sql`DROP INDEX IF EXISTS idx_expense_receipts_created_at`;

  logger.info('📋 Removendo tabela expense_receipts...');

  await sql`DROP TABLE IF EXISTS expense_receipts CASCADE`;

  logger.info('✅ Tabela expense_receipts removida!');

  logger.info('📋 Removendo índice de automation_config...');

  await sql`DROP INDEX IF EXISTS idx_automation_config_key`;

  logger.info('📋 Removendo tabela automation_config...');

  await sql`DROP TABLE IF EXISTS automation_config CASCADE`;

  logger.info('✅ Tabela automation_config removida!');
}
