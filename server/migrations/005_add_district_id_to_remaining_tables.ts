/**
 * Migração: Adiciona district_id às tabelas meetings, emotional_checkins,
 * relationships e discipleship_requests
 * Isso permite filtrar dados por distrito de forma eficiente a nível de banco
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
  console.log('🚀 Iniciando migração: Adicionando district_id às tabelas restantes...');

  try {
    // 1. Adicionar district_id à tabela meetings
    console.log('📝 Adicionando district_id à tabela meetings...');
    await sql`
      ALTER TABLE meetings 
      ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS meetings_district_idx ON meetings(district_id)
    `;
    console.log('✅ Coluna district_id adicionada à tabela meetings');

    // 2. Adicionar district_id à tabela emotional_checkins
    console.log('📝 Adicionando district_id à tabela emotional_checkins...');
    await sql`
      ALTER TABLE emotional_checkins 
      ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS emotional_checkins_district_idx ON emotional_checkins(district_id)
    `;
    console.log('✅ Coluna district_id adicionada à tabela emotional_checkins');

    // 3. Adicionar district_id à tabela relationships
    console.log('📝 Adicionando district_id à tabela relationships...');
    await sql`
      ALTER TABLE relationships 
      ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS relationships_district_idx ON relationships(district_id)
    `;
    console.log('✅ Coluna district_id adicionada à tabela relationships');

    // 4. Adicionar district_id à tabela discipleship_requests
    console.log('📝 Adicionando district_id à tabela discipleship_requests...');
    await sql`
      ALTER TABLE discipleship_requests 
      ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS discipleship_requests_district_idx ON discipleship_requests(district_id)
    `;
    console.log('✅ Coluna district_id adicionada à tabela discipleship_requests');

    // 5. Backfill: Atualizar meetings existentes com base no requester_id
    console.log('📝 Atualizando meetings existentes com district_id...');
    await sql`
      UPDATE meetings m
      SET district_id = u.district_id
      FROM users u
      WHERE m.requester_id = u.id AND m.district_id IS NULL AND u.district_id IS NOT NULL
    `;
    console.log('✅ Meetings atualizadas');

    // 6. Backfill: Atualizar emotional_checkins existentes com base no user_id
    console.log('📝 Atualizando emotional_checkins existentes com district_id...');
    await sql`
      UPDATE emotional_checkins ec
      SET district_id = u.district_id
      FROM users u
      WHERE ec.user_id = u.id AND ec.district_id IS NULL AND u.district_id IS NOT NULL
    `;
    console.log('✅ Emotional check-ins atualizados');

    // 7. Backfill: Atualizar relationships existentes com base no interested_id
    console.log('📝 Atualizando relationships existentes com district_id...');
    await sql`
      UPDATE relationships r
      SET district_id = u.district_id
      FROM users u
      WHERE r.interested_id = u.id AND r.district_id IS NULL AND u.district_id IS NOT NULL
    `;
    console.log('✅ Relationships atualizadas');

    // 8. Backfill: Atualizar discipleship_requests existentes com base no interested_id
    console.log('📝 Atualizando discipleship_requests existentes com district_id...');
    await sql`
      UPDATE discipleship_requests dr
      SET district_id = u.district_id
      FROM users u
      WHERE dr.interested_id = u.id AND dr.district_id IS NULL AND u.district_id IS NOT NULL
    `;
    console.log('✅ Discipleship requests atualizadas');

    console.log('\n🎉 Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

migrate().catch(console.error);
