/**
 * Migration: Adicionar índices de performance
 *
 * Este script adiciona índices para otimizar as queries mais comuns.
 * Execute com: npx tsx server/migrations/add-performance-indexes.ts
 */

import { neon } from '@neondatabase/serverless';
import { logger } from '../utils/logger';

const indexes = [
  // Índices para tabela users
  'CREATE INDEX IF NOT EXISTS idx_users_church ON users(church)',
  'CREATE INDEX IF NOT EXISTS idx_users_church_role ON users(church, role)',
  'CREATE INDEX IF NOT EXISTS idx_users_church_status ON users(church, status)',
  'CREATE INDEX IF NOT EXISTS idx_users_district_id ON users(district_id)',
  'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
  'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',

  // Índices para tabela relationships
  'CREATE INDEX IF NOT EXISTS idx_relationships_missionary ON relationships(missionary_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_relationships_interested ON relationships(interested_id)',
  'CREATE INDEX IF NOT EXISTS idx_relationships_status ON relationships(status)',

  // Índices para tabela discipleship_requests
  'CREATE INDEX IF NOT EXISTS idx_discipleship_missionary ON discipleship_requests(missionary_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_discipleship_interested ON discipleship_requests(interested_id)',
  'CREATE INDEX IF NOT EXISTS idx_discipleship_status ON discipleship_requests(status)',

  // Índices para tabela events
  'CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC)',
  'CREATE INDEX IF NOT EXISTS idx_events_church ON events(church_id, date DESC)',

  // Índices para tabela notifications
  'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)',

  // Índices para tabela meetings
  'CREATE INDEX IF NOT EXISTS idx_meetings_requester ON meetings(requester_id)',
  'CREATE INDEX IF NOT EXISTS idx_meetings_assigned ON meetings(assigned_to_id)',
  'CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status)',

  // Índices para tabela churches
  'CREATE INDEX IF NOT EXISTS idx_churches_district ON churches(district_id)',

  // Índices para tabela prayers
  'CREATE INDEX IF NOT EXISTS idx_prayers_requester ON prayers(requester_id)',
  'CREATE INDEX IF NOT EXISTS idx_prayers_status ON prayers(status)',

  // Índices para tabela messages
  'CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC)',

  // Índices para tabela push_subscriptions
  'CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id)',
];

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.error('❌ DATABASE_URL não definida');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  logger.info('🚀 Iniciando criação de índices de performance...');

  let success = 0;
  let failed = 0;

  for (const indexQuery of indexes) {
    const indexName = indexQuery.match(/idx_\w+/)?.[0] || 'unknown';
    try {
      logger.info(`📌 Criando: ${indexName}`);
      await sql`${indexQuery}`;
      logger.info('✅ Sucesso!');
      success++;
    } catch (error: unknown) {
      if ((error as Error).message?.includes('already exists')) {
        logger.info('⏭️ Índice já existe');
        success++;
      } else {
        logger.error(`❌ Erro: ${(error as Error).message}`);
        failed++;
      }
    }
  }

  logger.info(`${'='.repeat(50)}`);
  logger.info('📊 Resumo da migração:');
  logger.info(`✅ Sucesso: ${success}`);
  logger.info(`❌ Falhas: ${failed}`);
  logger.info(`${'='.repeat(50)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Executar se chamado diretamente
runMigration().catch(error => {
  logger.error('Erro na migração', error);
  process.exit(1);
});
