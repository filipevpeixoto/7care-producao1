/**
 * Migração: Adiciona district_id às tabelas prayers, conversations e activities
 * Isso permite filtrar dados por distrito para pastores
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
  console.log('🚀 Iniciando migração: Adicionando district_id às tabelas...');

  try {
    // 1. Adicionar district_id à tabela prayers
    console.log('📝 Adicionando district_id à tabela prayers...');
    await sql`
      ALTER TABLE prayers 
      ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)
    `;
    console.log('✅ Coluna district_id adicionada à tabela prayers');

    // 2. Adicionar district_id à tabela conversations
    console.log('📝 Adicionando district_id à tabela conversations...');
    await sql`
      ALTER TABLE conversations 
      ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)
    `;
    console.log('✅ Coluna district_id adicionada à tabela conversations');

    // 3. Adicionar district_id à tabela activities (se existir)
    console.log('📝 Verificando tabela activities...');
    const activitiesTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'activities'
      )
    `;

    if (activitiesTable[0]?.exists) {
      await sql`
        ALTER TABLE activities 
        ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)
      `;
      console.log('✅ Coluna district_id adicionada à tabela activities');
    } else {
      console.log('⚠️ Tabela activities não existe, pulando...');
    }

    // 4. Adicionar district_id à tabela events
    console.log('📝 Adicionando district_id à tabela events...');
    await sql`
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)
    `;
    console.log('✅ Coluna district_id adicionada à tabela events');

    // 5. Criar índices para melhorar performance
    console.log('📝 Criando índices...');

    await sql`
      CREATE INDEX IF NOT EXISTS prayers_district_idx ON prayers(district_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS conversations_district_idx ON conversations(district_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS events_district_idx ON events(district_id)
    `;

    console.log('✅ Índices criados com sucesso');

    // 6. Atualizar prayers existentes com base no requester_id
    console.log('📝 Atualizando prayers existentes com district_id...');
    await sql`
      UPDATE prayers p
      SET district_id = u.district_id
      FROM users u
      WHERE p.requester_id = u.id AND p.district_id IS NULL AND u.district_id IS NOT NULL
    `;
    console.log('✅ Prayers atualizadas');

    // 7. Atualizar conversations existentes com base no created_by
    console.log('📝 Atualizando conversations existentes com district_id...');
    await sql`
      UPDATE conversations c
      SET district_id = u.district_id
      FROM users u
      WHERE c.created_by = u.id AND c.district_id IS NULL AND u.district_id IS NOT NULL
    `;
    console.log('✅ Conversations atualizadas');

    // 8. Atualizar events existentes com base no created_by
    console.log('📝 Atualizando events existentes com district_id...');
    await sql`
      UPDATE events e
      SET district_id = u.district_id
      FROM users u
      WHERE e.created_by = u.id AND e.district_id IS NULL AND u.district_id IS NOT NULL
    `;
    console.log('✅ Events atualizados');

    console.log('\n🎉 Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

migrate().catch(console.error);
