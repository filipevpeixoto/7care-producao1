/**
 * Configuração principal do banco de dados IndexedDB offline
 */

import Dexie, { type Table, type Transaction } from 'dexie';
import { createLogger } from '@/lib/logger';
import type {
  OfflineUser,
  OfflineEvent,
  OfflineTask,
  OfflineMessage,
  OfflineRelationship,
  OfflinePrayer,
  OfflineMeeting,
  OfflineEmotionalCheckin,
  OfflineDiscipleshipRequest,
  OfflineNotification,
  SyncQueueItem,
  OfflineMeta,
  ConflictRecord,
} from './database-types';

const offlineLogger = createLogger('Offline');

export const DB_NAME = '7care_offline';
export const TTL_DAYS = 7;
export const MAX_STORAGE_MB = 50;

export const ALLOWED_OFFLINE_ROLES = ['superadmin', 'pastor', 'admin_readonly'] as const;

export class OfflineDatabase extends Dexie {
  users!: Table<OfflineUser>;
  events!: Table<OfflineEvent>;
  tasks!: Table<OfflineTask>;
  messages!: Table<OfflineMessage>;
  relationships!: Table<OfflineRelationship>;
  prayers!: Table<OfflinePrayer>;
  meetings!: Table<OfflineMeeting>;
  emotionalCheckins!: Table<OfflineEmotionalCheckin>;
  discipleshipRequests!: Table<OfflineDiscipleshipRequest>;
  notifications!: Table<OfflineNotification>;
  syncQueue!: Table<SyncQueueItem>;
  meta!: Table<OfflineMeta>;
  conflicts!: Table<ConflictRecord>;

  constructor() {
    super(DB_NAME);

    // Versão 1 - Schema original
    this.version(1).stores({
      users: 'id, syncedAt, isModified',
      events: 'id, syncedAt, isModified',
      tasks: 'id, syncedAt, isModified',
      messages: 'id, conversationId, syncedAt, isModified',
      syncQueue: '++id, entity, entityId, createdAt',
      meta: 'key, updatedAt',
    });

    // Versão 2 - Com conflitos, checksums e prioridade
    this.version(2)
      .stores({
        users: 'id, syncedAt, modifiedAt, isModified, version',
        events: 'id, syncedAt, modifiedAt, isModified, version',
        tasks: 'id, syncedAt, modifiedAt, isModified, version',
        messages: 'id, conversationId, syncedAt, modifiedAt, isModified, version',
        syncQueue: '++id, entity, entityId, createdAt, nextRetryAt, priority',
        meta: 'key, updatedAt',
        conflicts: '++id, entity, entityId, createdAt, resolvedAt',
      })
      .upgrade(tx => {
        return migrateToV2(tx);
      });

    // Versão 3 - Adiciona suporte a relationships (discipulado)
    this.version(3).stores({
      users: 'id, syncedAt, modifiedAt, isModified, version',
      events: 'id, syncedAt, modifiedAt, isModified, version',
      tasks: 'id, syncedAt, modifiedAt, isModified, version',
      messages: 'id, conversationId, syncedAt, modifiedAt, isModified, version',
      relationships: 'id, syncedAt, modifiedAt, isModified, version',
      syncQueue: '++id, entity, entityId, createdAt, nextRetryAt, priority',
      meta: 'key, updatedAt',
      conflicts: '++id, entity, entityId, createdAt, resolvedAt',
    });

    // Versão 4 - Adiciona suporte completo para pastores offline
    this.version(4).stores({
      users: 'id, syncedAt, modifiedAt, isModified, version',
      events: 'id, syncedAt, modifiedAt, isModified, version',
      tasks: 'id, syncedAt, modifiedAt, isModified, version',
      messages: 'id, conversationId, syncedAt, modifiedAt, isModified, version',
      relationships: 'id, syncedAt, modifiedAt, isModified, version',
      prayers: 'id, syncedAt, modifiedAt, isModified, version',
      meetings: 'id, syncedAt, modifiedAt, isModified, version',
      emotionalCheckins: 'id, userId, syncedAt, modifiedAt, isModified, version',
      discipleshipRequests: 'id, syncedAt, modifiedAt, isModified, version',
      notifications: 'id, userId, syncedAt, modifiedAt, isModified, version',
      syncQueue: '++id, entity, entityId, createdAt, nextRetryAt, priority',
      meta: 'key, updatedAt',
      conflicts: '++id, entity, entityId, createdAt, resolvedAt',
    });
  }
}

async function migrateToV2(tx: Transaction): Promise<void> {
  const now = Date.now();

  await tx
    .table('users')
    .toCollection()
    .modify((user: OfflineUser) => {
      user.checksum = user.checksum || '';
      user.modifiedAt = user.modifiedAt || user.syncedAt || now;
      user.version = user.version || 1;
    });

  await tx
    .table('events')
    .toCollection()
    .modify((event: OfflineEvent) => {
      event.checksum = event.checksum || '';
      event.modifiedAt = event.modifiedAt || event.syncedAt || now;
      event.version = event.version || 1;
    });

  await tx
    .table('tasks')
    .toCollection()
    .modify((task: OfflineTask) => {
      task.checksum = task.checksum || '';
      task.modifiedAt = task.modifiedAt || task.syncedAt || now;
      task.version = task.version || 1;
    });

  await tx
    .table('messages')
    .toCollection()
    .modify((message: OfflineMessage) => {
      message.checksum = message.checksum || '';
      message.modifiedAt = message.modifiedAt || message.syncedAt || now;
      message.version = message.version || 1;
    });

  await tx
    .table('syncQueue')
    .toCollection()
    .modify((item: SyncQueueItem) => {
      item.priority = item.priority ?? 5;
      item.nextRetryAt = item.nextRetryAt ?? 0;
    });

  offlineLogger.debug('Migração para v2 concluída');
}

export const db = new OfflineDatabase();
