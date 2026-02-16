/**
 * Migração: Adiciona integração com Google Calendar
 * - Cria tabela google_calendar_tokens para armazenar tokens OAuth2 criptografados
 * - Adiciona campos de rastreamento de sincronização na tabela events
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL não definida');
}

const sql = neon(DATABASE_URL);

async function migrate() {
  logger.info('🚀 Iniciando migração: Integração Google Calendar...');

  try {
    // 1. Criar tabela google_calendar_tokens
    logger.info('📝 Criando tabela google_calendar_tokens...');
    await sql`
      CREATE TABLE IF NOT EXISTS google_calendar_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        scope TEXT NOT NULL,
        token_type TEXT DEFAULT 'Bearer',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    logger.info('✅ Tabela google_calendar_tokens criada');

    // 2. Criar índices na tabela google_calendar_tokens
    logger.info('📝 Criando índices para google_calendar_tokens...');
    await sql`
      CREATE INDEX IF NOT EXISTS google_calendar_tokens_user_idx
      ON google_calendar_tokens(user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS google_calendar_tokens_district_idx
      ON google_calendar_tokens(district_id)
    `;
    logger.info('✅ Índices da tabela google_calendar_tokens criados');

    // 3. Adicionar campos de sincronização à tabela events
    logger.info('📝 Adicionando campos de sincronização à tabela events...');
    await sql`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT
    `;
    await sql`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS sync_source TEXT
    `;
    await sql`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP
    `;
    logger.info('✅ Campos de sincronização adicionados à tabela events');

    // 4. Criar índice para google_calendar_event_id
    logger.info('📝 Criando índice para google_calendar_event_id...');
    await sql`
      CREATE INDEX IF NOT EXISTS events_google_calendar_event_id_idx
      ON events(google_calendar_event_id)
    `;
    logger.info('✅ Índice google_calendar_event_id criado');

    // 5. Adicionar comentários às colunas para documentação
    logger.info('📝 Adicionando comentários às colunas...');
    await sql`
      COMMENT ON TABLE google_calendar_tokens IS
      'Armazena tokens OAuth2 criptografados para integração com Google Calendar'
    `;
    await sql`
      COMMENT ON COLUMN google_calendar_tokens.access_token IS
      'Token de acesso criptografado com AES-256-GCM'
    `;
    await sql`
      COMMENT ON COLUMN google_calendar_tokens.refresh_token IS
      'Token de refresh criptografado com AES-256-GCM'
    `;
    await sql`
      COMMENT ON COLUMN events.google_calendar_event_id IS
      'ID do evento no Google Calendar (para rastreamento de sincronização)'
    `;
    await sql`
      COMMENT ON COLUMN events.sync_source IS
      'Fonte da sincronização: google_calendar | manual | google_drive'
    `;
    await sql`
      COMMENT ON COLUMN events.last_synced_at IS
      'Data/hora da última sincronização com Google Calendar'
    `;
    logger.info('✅ Comentários adicionados');

    logger.info('🎉 Migração concluída com sucesso!');
    logger.info('📌 Próximos passos:');
    logger.info('1. Configure GOOGLE_CALENDAR_CLIENT_ID no .env');
    logger.info('2. Configure GOOGLE_CALENDAR_CLIENT_SECRET no .env');
    logger.info('3. Configure GOOGLE_CALENDAR_REDIRECT_URI no .env');
    logger.info('4. Configure ENCRYPTION_KEY para criptografar tokens (se ainda não configurado)');
  } catch (error) {
    logger.error('❌ Erro na migração', error);
    throw error;
  }
}

migrate().catch(error => {
  logger.error('❌ Erro na migração', error);
  process.exit(1);
});
