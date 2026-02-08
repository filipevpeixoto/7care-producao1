/**
 * Migration: 004 - Create tasks table
 * Tarefas salvas no banco de dados, isoladas por pastor/distrito
 * Substitui Google Sheets como fonte de dados
 */

import { NeonQueryFunction } from '@neondatabase/serverless';

export async function up(sql: NeonQueryFunction<boolean, boolean>): Promise<void> {
  console.log('📋 Criando tabela tasks...');

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending' NOT NULL
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
      priority VARCHAR(10) DEFAULT 'medium' NOT NULL
        CHECK (priority IN ('low', 'medium', 'high')),
      due_date DATE,
      created_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
      church TEXT,
      tags JSONB DEFAULT '[]'::jsonb,
      completed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  console.log('📋 Criando índices para tasks...');

  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_district ON tasks(district_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)`;

  console.log('✅ Tabela tasks criada com sucesso!');
}

export async function down(sql: NeonQueryFunction<boolean, boolean>): Promise<void> {
  console.log('🗑️ Removendo tabela tasks...');

  await sql`DROP TABLE IF EXISTS tasks CASCADE`;

  console.log('✅ Tabela tasks removida!');
}
