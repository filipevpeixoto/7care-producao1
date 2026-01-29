/**
 * Migration: 002 - Create pastor_invites table
 * Adiciona tabela para sistema de convite self-service de pastores
 */

import { NeonQueryFunction } from '@neondatabase/serverless';

export async function up(sql: NeonQueryFunction<boolean, boolean>): Promise<void> {
  console.log('📋 Criando tabela pastor_invites...');

  await sql`
    CREATE TABLE IF NOT EXISTS pastor_invites (
      id SERIAL PRIMARY KEY,
      token VARCHAR(64) UNIQUE NOT NULL,
      email VARCHAR(255) NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
      onboarding_data JSONB,
      submitted_at TIMESTAMP WITH TIME ZONE,
      reviewed_at TIMESTAMP WITH TIME ZONE,
      reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      rejection_reason TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  console.log('📋 Criando índices para pastor_invites...');

  await sql`CREATE INDEX IF NOT EXISTS idx_pastor_invites_token ON pastor_invites(token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pastor_invites_status ON pastor_invites(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pastor_invites_email ON pastor_invites(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pastor_invites_created_by ON pastor_invites(created_by)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pastor_invites_expires_at ON pastor_invites(expires_at)`;

  console.log('✅ Tabela pastor_invites criada com sucesso!');
}

export async function down(sql: NeonQueryFunction<boolean, boolean>): Promise<void> {
  console.log('📋 Removendo tabela pastor_invites...');

  await sql`DROP INDEX IF EXISTS idx_pastor_invites_token`;
  await sql`DROP INDEX IF EXISTS idx_pastor_invites_status`;
  await sql`DROP INDEX IF EXISTS idx_pastor_invites_email`;
  await sql`DROP INDEX IF EXISTS idx_pastor_invites_created_by`;
  await sql`DROP INDEX IF EXISTS idx_pastor_invites_expires_at`;
  await sql`DROP TABLE IF EXISTS pastor_invites CASCADE`;

  console.log('✅ Tabela pastor_invites removida com sucesso!');
}
