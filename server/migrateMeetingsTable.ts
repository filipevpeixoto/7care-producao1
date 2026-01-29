/**
 * Script para migrar a tabela meetings
 * Adiciona as colunas necessárias que estão faltando
 */

import { neon } from '@neondatabase/serverless';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_enihr4YBSDm8@ep-still-glade-ac5u1r48-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(connectionString);

async function migrateMeetingsTable() {
  console.log('🚀 Iniciando migração da tabela meetings...');

  try {
    // Adiciona scheduled_at copiando de date (se existir)
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP`;
    console.log('✅ Coluna scheduled_at adicionada');

    // Copia dados de date para scheduled_at
    await sql`UPDATE meetings SET scheduled_at = date WHERE scheduled_at IS NULL AND date IS NOT NULL`;
    console.log('✅ Dados migrados de date para scheduled_at');

    // Adiciona outras colunas faltantes
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS requester_id INTEGER`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS assigned_to_id INTEGER`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS type_id INTEGER`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS notes TEXT`;
    console.log('✅ Todas as colunas adicionadas');

    // Verifica resultado
    const result =
      await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'meetings'`;
    console.log(
      'Colunas atuais:',
      result.map((r: { column_name: string }) => r.column_name).join(', ')
    );

    console.log('🎉 Migração concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
    throw err;
  }
}

migrateMeetingsTable();
