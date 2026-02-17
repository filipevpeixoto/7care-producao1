/**
 * Migration 010 — Criar tabelas de eleição
 * Anteriormente DDL era executado inline nos handlers de request.
 * Esta migration garante que a estrutura existe antes do app iniciar.
 */
import { neon } from '@neondatabase/serverless';

export async function up() {
  const sql = neon(process.env.DATABASE_URL!);

  // Tabela principal de configurações de eleição
  await sql`
    CREATE TABLE IF NOT EXISTS election_configs (
      id SERIAL PRIMARY KEY,
      church_id INTEGER NOT NULL,
      church_name VARCHAR(255) NOT NULL,
      title VARCHAR(255) DEFAULT '',
      description TEXT DEFAULT '',
      voters INTEGER[] NOT NULL,
      criteria JSONB NOT NULL,
      positions TEXT[] NOT NULL,
      position_descriptions JSONB DEFAULT '{}'::jsonb,
      removed_candidates JSONB DEFAULT '[]'::jsonb,
      current_leaders JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Garantir colunas adicionais para tabelas existentes (idempotente)
  await sql`ALTER TABLE election_configs ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT ''`;
  await sql`ALTER TABLE election_configs ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''`;
  await sql`ALTER TABLE election_configs ADD COLUMN IF NOT EXISTS position_descriptions JSONB DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE election_configs ADD COLUMN IF NOT EXISTS removed_candidates JSONB DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE election_configs ADD COLUMN IF NOT EXISTS current_leaders JSONB DEFAULT '{}'::jsonb`;
}
