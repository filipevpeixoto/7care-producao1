import { createLogger } from '@/lib/logger';
import { db, TTL_DAYS, MAX_STORAGE_MB, ALLOWED_OFFLINE_ROLES } from './database-core';
import { hashData } from './crypto';
import { getSyncQueueCount } from './database-sync';

const offlineLogger = createLogger('Offline');

export async function generateChecksum(data: unknown): Promise<string> {
  const jsonString = JSON.stringify(data);
  return hashData(jsonString);
}

export function hasOfflinePermission(role: string): boolean {
  return ALLOWED_OFFLINE_ROLES.includes(role as (typeof ALLOWED_OFFLINE_ROLES)[number]);
}

async function updateMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value, updatedAt: Date.now() });
}

async function getMeta(key: string): Promise<string | null> {
  const meta = await db.meta.get(key);
  return meta?.value ?? null;
}

export async function getLastSyncTime(entity: string): Promise<number | null> {
  const value = await getMeta(`${entity}_last_sync`);
  return value ? parseInt(value, 10) : null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await updateMeta(key, value);
}

export async function cleanExpiredData(): Promise<{
  users: number;
  events: number;
  tasks: number;
  messages: number;
}> {
  const ttlMs = TTL_DAYS * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - ttlMs;

  const result = await db.transaction(
    'rw',
    db.users,
    db.events,
    db.tasks,
    db.messages,
    async () => {
      const deletedUsers = await db.users
        .where('syncedAt')
        .below(cutoff)
        .and(u => !u.isModified)
        .delete();

      const deletedEvents = await db.events
        .where('syncedAt')
        .below(cutoff)
        .and(e => !e.isModified)
        .delete();

      const deletedTasks = await db.tasks
        .where('syncedAt')
        .below(cutoff)
        .and(t => !t.isModified)
        .delete();

      const deletedMessages = await db.messages
        .where('syncedAt')
        .below(cutoff)
        .and(m => !m.isModified)
        .delete();

      return {
        users: deletedUsers,
        events: deletedEvents,
        tasks: deletedTasks,
        messages: deletedMessages,
      };
    }
  );

  offlineLogger.debug(
    `Limpeza: ${result.users} usuários, ${result.events} eventos, ${result.tasks} tarefas, ${result.messages} mensagens`
  );
  return result;
}

export async function clearAllOfflineData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.users, db.events, db.tasks, db.messages, db.syncQueue, db.meta, db.conflicts],
    async () => {
      await db.users.clear();
      await db.events.clear();
      await db.tasks.clear();
      await db.messages.clear();
      await db.syncQueue.clear();
      await db.meta.clear();
      await db.conflicts.clear();
    }
  );
  offlineLogger.debug('Todos os dados offline limpos');
}

export async function getStorageUsage(): Promise<{
  used: number;
  limit: number;
  percentage: number;
}> {
  const limit = MAX_STORAGE_MB * 1024 * 1024;

  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    return {
      used,
      limit,
      percentage: Math.round((used / limit) * 100),
    };
  }

  return { used: 0, limit, percentage: 0 };
}

export async function getOfflineStats(): Promise<{
  users: number;
  events: number;
  tasks: number;
  messages: number;
  pendingSync: number;
  conflicts: number;
  storage: { used: number; limit: number; percentage: number };
}> {
  const [users, events, tasks, messages, pendingSync, conflicts, storage] = await Promise.all([
    db.users.count(),
    db.events.count(),
    db.tasks.count(),
    db.messages.count(),
    getSyncQueueCount(),
    db.conflicts.where('resolvedAt').equals(0).count(),
    getStorageUsage(),
  ]);

  return { users, events, tasks, messages, pendingSync, conflicts, storage };
}

export async function verifyDatabaseIntegrity(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const tables = ['users', 'events', 'tasks', 'messages', 'syncQueue', 'meta', 'conflicts'];
    for (const table of tables) {
      try {
        await db.table(table).count();
      } catch {
        errors.push(`Tabela '${table}' não acessível`);
      }
    }

    const users = await db.users.toArray();
    for (const user of users) {
      if (!user.data || !user.checksum) {
        errors.push(`Usuário ${user.id}: dados ou checksum ausente`);
      }
    }

    const syncItems = await db.syncQueue.toArray();
    for (const item of syncItems) {
      if (!item.endpoint || !item.method) {
        errors.push(`SyncQueue item ${item.id}: endpoint ou método ausente`);
      }
    }
  } catch (error) {
    errors.push(
      `Erro ao verificar integridade: ${error instanceof Error ? error.message : 'Desconhecido'}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
