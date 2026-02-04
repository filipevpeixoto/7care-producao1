/**
 * Migração: Adiciona integração com Google Calendar
 * - Cria tabela google_calendar_tokens para armazenar tokens OAuth2 criptografados
 * - Adiciona campos de rastreamento de sincronização na tabela events
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL não definida');
}

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log('🚀 Iniciando migração: Integração Google Calendar...');

  try {
    // 1. Criar tabela google_calendar_tokens
    console.log('📝 Criando tabela google_calendar_tokens...');
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
    console.log('✅ Tabela google_calendar_tokens criada');

    // 2. Criar índices na tabela google_calendar_tokens
    console.log('📝 Criando índices para google_calendar_tokens...');
    await sql`
      CREATE INDEX IF NOT EXISTS google_calendar_tokens_user_idx
      ON google_calendar_tokens(user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS google_calendar_tokens_district_idx
      ON google_calendar_tokens(district_id)
    `;
    console.log('✅ Índices da tabela google_calendar_tokens criados');

    // 3. Adicionar campos de sincronização à tabela events
    console.log('📝 Adicionando campos de sincronização à tabela events...');
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
    console.log('✅ Campos de sincronização adicionados à tabela events');

    // 4. Criar índice para google_calendar_event_id
    console.log('📝 Criando índice para google_calendar_event_id...');
    await sql`
      CREATE INDEX IF NOT EXISTS events_google_calendar_event_id_idx
      ON events(google_calendar_event_id)
    `;
    console.log('✅ Índice google_calendar_event_id criado');

    // 5. Adicionar comentários às colunas para documentação
    console.log('📝 Adicionando comentários às colunas...');
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
    console.log('✅ Comentários adicionados');

    console.log('\n🎉 Migração concluída com sucesso!');
    console.log('📌 Próximos passos:');
    console.log('   1. Configure GOOGLE_CALENDAR_CLIENT_ID no .env');
    console.log('   2. Configure GOOGLE_CALENDAR_CLIENT_SECRET no .env');
    console.log('   3. Configure GOOGLE_CALENDAR_REDIRECT_URI no .env');
    console.log(
      '   4. Configure ENCRYPTION_KEY para criptografar tokens (se ainda não configurado)'
    );
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

migrate().catch(console.error);
