import { createLogger } from '@/lib/logger';
import { db } from './database-core';
import { hashData } from './crypto';
import type { SyncQueueItem, ConflictRecord } from './database-types';

const offlineLogger = createLogger('Offline');

type SyncQueueInput = Omit<
  SyncQueueItem,
  'id' | 'createdAt' | 'retryCount' | 'priority' | 'nextRetryAt'
>;

export async function addToSyncQueue(item: SyncQueueInput): Promise<number> {
  const priorityMap: Record<string, number> = {
    delete: 1,
    create: 3,
    update: 5,
  };

  const queueItem: SyncQueueItem = {
    ...item,
    createdAt: Date.now(),
    retryCount: 0,
    priority: priorityMap[item.type] || 5,
    nextRetryAt: 0,
  };

  const id = await db.syncQueue.add(queueItem);
  offlineLogger.debug(`Adicionado à fila de sync: ${item.entity} ${item.type}`);
  return id as number;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const now = Date.now();
  const all = await db.syncQueue.toArray();
  return all
    .filter((item) => (item.nextRetryAt ?? 0) <= now)
    .sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5) || a.createdAt - b.createdAt);
}

export async function getAllSyncQueue(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy('createdAt').toArray();
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  await db.syncQueue.delete(id);
}

export async function updateSyncQueueItem(
  id: number,
  updates: Partial<SyncQueueItem>
): Promise<void> {
  await db.syncQueue.update(id, updates);
}

export async function getSyncQueueCount(): Promise<number> {
  return db.syncQueue.count();
}

export async function getPendingSyncCount(): Promise<number> {
  const now = Date.now();
  const all = await db.syncQueue.toArray();
  return all.filter((item) => (item.nextRetryAt ?? 0) <= now).length;
}

export async function recordConflict(
  entity: string,
  entityId: number,
  localData: string,
  serverData: string
): Promise<number> {
  const conflict: ConflictRecord = {
    entity,
    entityId,
    localData,
    serverData,
    localChecksum: await hashData(localData),
    serverChecksum: await hashData(serverData),
    createdAt: Date.now(),
  };

  const id = await db.conflicts.add(conflict);
  offlineLogger.debug(`Conflito registrado: ${entity} #${entityId}`);
  return id as number;
}

export async function getUnresolvedConflicts(): Promise<ConflictRecord[]> {
  try {
    const conflicts = await db.conflicts.toArray();
    return conflicts.filter(c => !c.resolvedAt);
  } catch (error) {
    offlineLogger.error('Erro ao buscar conflitos:', error);
    return [];
  }
}

export async function resolveConflict(
  conflictId: number,
  resolution: 'local' | 'server' | 'merged',
  mergedData?: string
): Promise<void> {
  const conflict = await db.conflicts.get(conflictId);
  if (!conflict) {
    throw new Error(`Conflito ${conflictId} não encontrado`);
  }

  await db.transaction('rw', db.conflicts, db.users, db.events, db.tasks, async () => {
    await db.conflicts.update(conflictId, {
      resolvedAt: Date.now(),
      resolution,
    });

    const dataToApply =
      resolution === 'local'
        ? conflict.localData
        : resolution === 'server'
          ? conflict.serverData
          : mergedData;

    if (!dataToApply) {
      throw new Error('Dados para aplicar não fornecidos');
    }

    const table = db.table(conflict.entity);

    await table.update(conflict.entityId, {
      data: dataToApply,
      checksum: await hashData(dataToApply),
      modifiedAt: Date.now(),
      isModified: false,
    });

    offlineLogger.debug(`Conflito ${conflictId} resolvido: ${resolution}`);
  });
}
