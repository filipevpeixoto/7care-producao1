/**
 * Migration: 001 - Create base schema indexes
 * Adiciona índices de performance para as tabelas principais
 */

import { NeonQueryFunction } from '@neondatabase/serverless';

export async function up(sql: NeonQueryFunction<boolean, boolean>): Promise<void> {
  console.log('📋 Criando índices de performance...');

  // Índices para tabela users
  await sql`CREATE INDEX IF NOT EXISTS idx_users_church ON users(church)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_church_role ON users(church, role)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_church_status ON users(church, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_district_id ON users(district_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;

  // Índices para tabela relationships
  await sql`CREATE INDEX IF NOT EXISTS idx_relationships_missionary ON relationships(missionary_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_relationships_interested ON relationships(interested_id)`;

  // Índices para tabela events
  await sql`CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_church ON events(church_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by)`;

  // Índices para tabela meetings
  await sql`CREATE INDEX IF NOT EXISTS idx_meetings_requester ON meetings(requester_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_meetings_assigned ON meetings(assigned_to_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at)`;

  // Índices para tabela messages
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`;

  // Índices para tabela notifications
  await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read)`;

  console.log('✅ Índices criados com sucesso!');
}

export async function down(sql: NeonQueryFunction<boolean, boolean>): Promise<void> {
  console.log('📋 Removendo índices...');

  // Remover índices de users
  await sql`DROP INDEX IF EXISTS idx_users_church`;
  await sql`DROP INDEX IF EXISTS idx_users_church_role`;
  await sql`DROP INDEX IF EXISTS idx_users_church_status`;
  await sql`DROP INDEX IF EXISTS idx_users_district_id`;
  await sql`DROP INDEX IF EXISTS idx_users_role`;
  await sql`DROP INDEX IF EXISTS idx_users_status`;
  await sql`DROP INDEX IF EXISTS idx_users_email`;

  // Remover índices de relationships
  await sql`DROP INDEX IF EXISTS idx_relationships_missionary`;
  await sql`DROP INDEX IF EXISTS idx_relationships_interested`;

  // Remover índices de events
  await sql`DROP INDEX IF EXISTS idx_events_date`;
  await sql`DROP INDEX IF EXISTS idx_events_church`;
  await sql`DROP INDEX IF EXISTS idx_events_created_by`;

  // Remover índices de meetings
  await sql`DROP INDEX IF EXISTS idx_meetings_requester`;
  await sql`DROP INDEX IF EXISTS idx_meetings_assigned`;
  await sql`DROP INDEX IF EXISTS idx_meetings_status`;
  await sql`DROP INDEX IF EXISTS idx_meetings_scheduled`;

  // Remover índices de messages
  await sql`DROP INDEX IF EXISTS idx_messages_conversation`;
  await sql`DROP INDEX IF EXISTS idx_messages_sender`;

  // Remover índices de notifications
  await sql`DROP INDEX IF EXISTS idx_notifications_user`;
  await sql`DROP INDEX IF EXISTS idx_notifications_read`;

  console.log('✅ Índices removidos com sucesso!');
}
