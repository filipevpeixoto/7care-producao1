/**
 * Migração: Adiciona district_id às tabelas meetings, emotional_checkins,
 * relationships e discipleship_requests
 * Isso permite filtrar dados por distrito de forma eficiente a nível de banco
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
  logger.info('🚀 Iniciando migração: Adicionando district_id às tabelas restantes...');

  try {
    // 1. Adicionar district_id à tabela meetings
    logger.info('📝 Adicionando district_id à tabela meetings...');
    await sql`
      ALTER TABLE meetings 
      ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS meetings_district_idx ON meetings(district_id)
    `;
    logger.info('✅ Coluna district_id adicionada à tabela meetings');

    // 2. Adicionar district_id à tabela emotional_checkins
    logger.info('📝 Adicionando district_id à tabela emotional_checkins...');
    await sql`
      ALTER TABLE emotional_checkins 
      ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS emotional_checkins_district_idx ON emotional_checkins(district_id)
    `;
    logger.info('✅ Coluna district_id adicionada à tabela emotional_checkins');

    // 3. Adicionar district_id à tabela relationships
    logger.info('📝 Adicionando district_id à tabela relationships...');
    await sql`
      ALTER TABLE relationships 
      ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS relationships_district_idx ON relationships(district_id)
    `;
    logger.info('✅ Coluna district_id adicionada à tabela relationships');

    // 4. Adicionar district_id à tabela discipleship_requests
    logger.info('📝 Adicionando district_id à tabela discipleship_requests...');
    await sql`
      ALTER TABLE discipleship_requests 
      ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS discipleship_requests_district_idx ON discipleship_requests(district_id)
    `;
    logger.info('✅ Coluna district_id adicionada à tabela discipleship_requests');

    // 5. Backfill: Atualizar meetings existentes com base no requester_id
    logger.info('📝 Atualizando meetings existentes com district_id...');
    await sql`
      UPDATE meetings m
      SET district_id = u.district_id
      FROM users u
      WHERE m.requester_id = u.id AND m.district_id IS NULL AND u.district_id IS NOT NULL
    `;
    logger.info('✅ Meetings atualizadas');

    // 6. Backfill: Atualizar emotional_checkins existentes com base no user_id
    logger.info('📝 Atualizando emotional_checkins existentes com district_id...');
    await sql`
      UPDATE emotional_checkins ec
      SET district_id = u.district_id
      FROM users u
      WHERE ec.user_id = u.id AND ec.district_id IS NULL AND u.district_id IS NOT NULL
    `;
    logger.info('✅ Emotional check-ins atualizados');

    // 7. Backfill: Atualizar relationships existentes com base no interested_id
    logger.info('📝 Atualizando relationships existentes com district_id...');
    await sql`
      UPDATE relationships r
      SET district_id = u.district_id
      FROM users u
      WHERE r.interested_id = u.id AND r.district_id IS NULL AND u.district_id IS NOT NULL
    `;
    logger.info('✅ Relationships atualizadas');

    // 8. Backfill: Atualizar discipleship_requests existentes com base no interested_id
    logger.info('📝 Atualizando discipleship_requests existentes com district_id...');
    await sql`
      UPDATE discipleship_requests dr
      SET district_id = u.district_id
      FROM users u
      WHERE dr.interested_id = u.id AND dr.district_id IS NULL AND u.district_id IS NOT NULL
    `;
    logger.info('✅ Discipleship requests atualizadas');

    logger.info('🎉 Migração concluída com sucesso!');
  } catch (error) {
    logger.error('❌ Erro na migração', error);
    throw error;
  }
}

migrate().catch(error => {
  logger.error('❌ Erro na migração', error);
  process.exit(1);
});
