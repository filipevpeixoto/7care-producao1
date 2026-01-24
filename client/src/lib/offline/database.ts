/**
 * Banco de dados IndexedDB para armazenamento offline
 * Usa Dexie.js para facilitar operações
 *
 * Melhorias:
 * - Sistema de migrations versionado
 * - Transactions para operações atômicas
 * - Conflict resolution com timestamps e checksums
 * - Melhor tipagem
 */

import Dexie, { Table, Transaction } from 'dexie';
import { encryptData, decryptData, hashData } from './crypto';
import type { User, Event, Message } from '@shared/schema';

// ===== TIPOS =====

export interface OfflineUser {
  id: number;
  data: string; // Dados criptografados
  checksum: string; // Hash dos dados originais para detecção de conflitos
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number; // Versão do registro para controle de conflitos
}

export interface OfflineEvent {
  id: number;
  data: string; // JSON string
  checksum: string;
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number;
}

export interface OfflineTask {
  id: number;
  data: string;
  checksum: string;
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number;
}

export interface OfflineMessage {
  id: number;
  conversationId: number;
  data: string; // Dados criptografados
  checksum: string;
  syncedAt: number;
  modifiedAt: number;
  isModified: boolean;
  version: number;
}

export interface SyncQueueItem {
  id?: number;
  type: 'create' | 'update' | 'delete';
  entity: 'users' | 'events' | 'tasks' | 'messages';
  entityId?: number;
  data: string;
  originalChecksum?: string; // Checksum dos dados originais (para detectar conflitos)
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  createdAt: number;
  retryCount: number;
  nextRetryAt?: number; // Timestamp para exponential backoff
  lastError?: string;
  priority: number; // Prioridade na fila (menor = maior prioridade)
}

export interface OfflineMeta {
  key: string;
  value: string;
  updatedAt: number;
}

export interface ConflictRecord {
  id?: number;
  entity: string;
  entityId: number;
  localData: string;
  serverData: string;
  localChecksum: string;
  serverChecksum: string;
  createdAt: number;
  resolvedAt?: number;
  resolution?: 'local' | 'server' | 'merged';
}

// ===== CONFIGURAÇÕES =====

const DB_NAME = '7care_offline';
const TTL_DAYS = 7;
const MAX_STORAGE_MB = 50;

// Roles permitidos para acesso offline completo
const ALLOWED_OFFLINE_ROLES = ['superadmin', 'pastor', 'admin_readonly'] as const;

// ===== CLASSE DO BANCO =====

class OfflineDatabase extends Dexie {
  users!: Table<OfflineUser>;
  events!: Table<OfflineEvent>;
  tasks!: Table<OfflineTask>;
  messages!: Table<OfflineMessage>;
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
      .upgrade((tx) => {
        // Migração: adicionar campos novos aos registros existentes
        return migrateToV2(tx);
      });
  }
}

/**
 * Migração para versão 2 do banco
 */
async function migrateToV2(tx: Transaction): Promise<void> {
  const now = Date.now();

  // Migrar usuários
  await tx.table('users').toCollection().modify((user: OfflineUser) => {
    user.checksum = user.checksum || '';
    user.modifiedAt = user.modifiedAt || user.syncedAt || now;
    user.version = user.version || 1;
  });

  // Migrar eventos
  await tx.table('events').toCollection().modify((event: OfflineEvent) => {
    event.checksum = event.checksum || '';
    event.modifiedAt = event.modifiedAt || event.syncedAt || now;
    event.version = event.version || 1;
  });

  // Migrar tarefas
  await tx.table('tasks').toCollection().modify((task: OfflineTask) => {
    task.checksum = task.checksum || '';
    task.modifiedAt = task.modifiedAt || task.syncedAt || now;
    task.version = task.version || 1;
  });

  // Migrar mensagens
  await tx.table('messages').toCollection().modify((message: OfflineMessage) => {
    message.checksum = message.checksum || '';
    message.modifiedAt = message.modifiedAt || message.syncedAt || now;
    message.version = message.version || 1;
  });

  // Migrar fila de sync
  await tx.table('syncQueue').toCollection().modify((item: SyncQueueItem) => {
    item.priority = item.priority ?? 5;
    item.nextRetryAt = item.nextRetryAt ?? 0;
  });

  console.log('[Database] Migração para v2 concluída');
}

// Instância única do banco
export const db = new OfflineDatabase();

// ===== FUNÇÕES UTILITÁRIAS =====

/**
 * Gera checksum de dados para detecção de conflitos
 */
async function generateChecksum(data: unknown): Promise<string> {
  const jsonString = JSON.stringify(data);
  return hashData(jsonString);
}

/**
 * Verifica se o usuário tem permissão para acesso offline
 */
export function hasOfflinePermission(role: string): boolean {
  return ALLOWED_OFFLINE_ROLES.includes(role as typeof ALLOWED_OFFLINE_ROLES[number]);
}

// ===== FUNÇÕES PARA USUÁRIOS (CRIPTOGRAFADOS) =====

export async function saveUsersOffline(users: User[], userRole: string): Promise<void> {
  if (!hasOfflinePermission(userRole)) {
    console.log('[Offline] Usuário não tem permissão para cache de usuários');
    return;
  }

  const now = Date.now();

  console.log(`[Offline] Preparando ${users.length} usuários para salvar...`);
  
  // IMPORTANTE: Preparar TODOS os dados ANTES de abrir a transaction
  // para evitar que a transaction expire durante operações assíncronas
  const offlineUsers: OfflineUser[] = await Promise.all(
    users.map(async (user) => ({
      id: user.id,
      data: await encryptData(user),
      checksum: await generateChecksum(user),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  console.log(`[Offline] Dados preparados, salvando no IndexedDB...`);

  // Agora fazer a transaction com dados já preparados
  await db.transaction('rw', db.users, db.meta, async () => {
    await db.users.bulkPut(offlineUsers);
    await db.meta.put({ key: 'users_last_sync', value: now.toString(), updatedAt: now });
  });

  console.log(`[Offline] ✅ ${users.length} usuários salvos (criptografados)`);
}

export async function getUsersOffline(): Promise<User[]> {
  console.log('[Offline] Buscando usuários do IndexedDB...');
  const offlineUsers = await db.users.toArray();
  console.log(`[Offline] Encontrados ${offlineUsers.length} registros de usuários`);

  if (offlineUsers.length === 0) {
    console.warn('[Offline] ⚠️ Nenhum usuário encontrado no cache!');
    return [];
  }

  const users = await Promise.all(
    offlineUsers.map(async (ou) => {
      try {
        return await decryptData<User>(ou.data);
      } catch (error) {
        console.warn(`[Offline] Falha ao descriptografar usuário ${ou.id}:`, error);
        return null;
      }
    })
  );

  const validUsers = users.filter((u): u is User => u !== null);
  console.log(`[Offline] Retornando ${validUsers.length} usuários descriptografados`);
  return validUsers;
}

export async function saveCurrentUserOffline(user: User): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.users, db.meta, async () => {
    const offlineUser: OfflineUser = {
      id: user.id,
      data: await encryptData(user),
      checksum: await generateChecksum(user),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    };

    await db.users.put(offlineUser);
    await db.meta.put({ key: 'current_user_id', value: user.id.toString(), updatedAt: now });
  });
}

export async function getCurrentUserOffline(): Promise<User | null> {
  const userIdStr = await getMeta('current_user_id');
  if (!userIdStr) return null;

  const userId = parseInt(userIdStr, 10);
  const offlineUser = await db.users.get(userId);
  if (!offlineUser) return null;

  try {
    return await decryptData<User>(offlineUser.data);
  } catch {
    return null;
  }
}

/**
 * Atualiza um usuário localmente (marca como modificado)
 */
export async function updateUserOffline(userId: number, userData: Partial<User>): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.users, async () => {
    const existing = await db.users.get(userId);
    if (!existing) {
      throw new Error(`Usuário ${userId} não encontrado no cache`);
    }

    const currentData = await decryptData<User>(existing.data);
    const updatedData = { ...currentData, ...userData };

    await db.users.update(userId, {
      data: await encryptData(updatedData),
      checksum: await generateChecksum(updatedData),
      modifiedAt: now,
      isModified: true,
      version: existing.version + 1,
    });
  });
}

// ===== FUNÇÕES PARA EVENTOS =====

export async function saveEventsOffline(events: Event[]): Promise<void> {
  const now = Date.now();

  console.log(`[Offline] Preparando ${events.length} eventos para salvar...`);

  // Preparar TODOS os dados ANTES de abrir a transaction
  const offlineEvents: OfflineEvent[] = await Promise.all(
    events.map(async (event) => ({
      id: event.id,
      data: JSON.stringify(event),
      checksum: await generateChecksum(event),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  console.log(`[Offline] Dados preparados, salvando no IndexedDB...`);

  // Transaction com dados já preparados
  await db.transaction('rw', db.events, db.meta, async () => {
    await db.events.bulkPut(offlineEvents);
    await db.meta.put({ key: 'events_last_sync', value: now.toString(), updatedAt: now });
  });

  console.log(`[Offline] ✅ ${events.length} eventos salvos`);
}

export async function getEventsOffline(): Promise<Event[]> {
  console.log('[Offline] Buscando eventos do IndexedDB...');
  const offlineEvents = await db.events.toArray();
  console.log(`[Offline] Encontrados ${offlineEvents.length} eventos`);
  
  if (offlineEvents.length === 0) {
    console.warn('[Offline] ⚠️ Nenhum evento encontrado no cache!');
  }
  
  return offlineEvents.map((oe) => JSON.parse(oe.data) as Event);
}

export async function updateEventOffline(eventId: number, eventData: Partial<Event>): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.events, async () => {
    const existing = await db.events.get(eventId);
    if (!existing) {
      throw new Error(`Evento ${eventId} não encontrado no cache`);
    }

    const currentData = JSON.parse(existing.data) as Event;
    const updatedData = { ...currentData, ...eventData };

    await db.events.update(eventId, {
      data: JSON.stringify(updatedData),
      checksum: await generateChecksum(updatedData),
      modifiedAt: now,
      isModified: true,
      version: existing.version + 1,
    });
  });
}

// ===== FUNÇÕES PARA TAREFAS =====

export interface TaskData {
  id: number;
  [key: string]: unknown;
}

export async function saveTasksOffline(tasks: TaskData[]): Promise<void> {
  const now = Date.now();

  console.log(`[Offline] Preparando ${tasks.length} tarefas para salvar...`);

  // Preparar TODOS os dados ANTES de abrir a transaction
  const offlineTasks: OfflineTask[] = await Promise.all(
    tasks.map(async (task) => ({
      id: task.id,
      data: JSON.stringify(task),
      checksum: await generateChecksum(task),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  console.log(`[Offline] Dados preparados, salvando no IndexedDB...`);

  // Transaction com dados já preparados
  await db.transaction('rw', db.tasks, db.meta, async () => {
    await db.tasks.bulkPut(offlineTasks);
    await db.meta.put({ key: 'tasks_last_sync', value: now.toString(), updatedAt: now });
  });

  console.log(`[Offline] ✅ ${tasks.length} tarefas salvas`);
}

export async function getTasksOffline(): Promise<TaskData[]> {
  console.log('[Offline] Buscando tarefas do IndexedDB...');
  const offlineTasks = await db.tasks.toArray();
  console.log(`[Offline] Encontradas ${offlineTasks.length} tarefas`);
  
  if (offlineTasks.length === 0) {
    console.warn('[Offline] ⚠️ Nenhuma tarefa encontrada no cache!');
  }
  
  return offlineTasks.map((ot) => JSON.parse(ot.data) as TaskData);
}

export async function updateTaskOffline(taskId: number, taskData: Partial<TaskData>): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.tasks, async () => {
    const existing = await db.tasks.get(taskId);
    if (!existing) {
      throw new Error(`Tarefa ${taskId} não encontrada no cache`);
    }

    const currentData = JSON.parse(existing.data) as TaskData;
    const updatedData = { ...currentData, ...taskData };

    await db.tasks.update(taskId, {
      data: JSON.stringify(updatedData),
      checksum: await generateChecksum(updatedData),
      modifiedAt: now,
      isModified: true,
      version: existing.version + 1,
    });
  });
}

// ===== FUNÇÕES PARA MENSAGENS (CRIPTOGRAFADAS) =====

export async function saveMessagesOffline(messages: Message[], conversationId: number): Promise<void> {
  const now = Date.now();

  // Preparar TODOS os dados ANTES de abrir a transaction
  const offlineMessages: OfflineMessage[] = await Promise.all(
    messages.map(async (msg) => ({
      id: msg.id,
      conversationId,
      data: await encryptData(msg),
      checksum: await generateChecksum(msg),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  // Transaction com dados já preparados
  await db.transaction('rw', db.messages, async () => {
    await db.messages.bulkPut(offlineMessages);
  });

  console.log(`[Offline] ${messages.length} mensagens salvas (criptografadas)`);
}

export async function getMessagesOffline(conversationId: number): Promise<Message[]> {
  const offlineMessages = await db.messages
    .where('conversationId')
    .equals(conversationId)
    .toArray();

  const messages = await Promise.all(
    offlineMessages.map(async (om) => {
      try {
        return await decryptData<Message>(om.data);
      } catch {
        return null;
      }
    })
  );

  return messages.filter((m): m is Message => m !== null);
}

// ===== SYNC QUEUE =====

type SyncQueueInput = Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount' | 'priority' | 'nextRetryAt'>;

export async function addToSyncQueue(item: SyncQueueInput): Promise<number> {
  // Calcular prioridade: deletes > creates > updates
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
  console.log(`[Offline] Adicionado à fila de sync: ${item.entity} ${item.type}`);
  return id as number;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const now = Date.now();

  // Retornar apenas itens que podem ser processados (nextRetryAt <= now)
  return db.syncQueue
    .where('nextRetryAt')
    .belowOrEqual(now)
    .sortBy('priority');
}

export async function getAllSyncQueue(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy('createdAt').toArray();
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  await db.syncQueue.delete(id);
}

export async function updateSyncQueueItem(id: number, updates: Partial<SyncQueueItem>): Promise<void> {
  await db.syncQueue.update(id, updates);
}

export async function getSyncQueueCount(): Promise<number> {
  return db.syncQueue.count();
}

export async function getPendingSyncCount(): Promise<number> {
  const now = Date.now();
  return db.syncQueue.where('nextRetryAt').belowOrEqual(now).count();
}

// ===== CONFLICT RESOLUTION =====

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
  console.log(`[Offline] Conflito registrado: ${entity} #${entityId}`);
  return id as number;
}

export async function getUnresolvedConflicts(): Promise<ConflictRecord[]> {
  try {
    // Buscar conflitos não resolvidos (onde resolvedAt é null ou undefined)
    const conflicts = await db.conflicts.toArray();
    return conflicts.filter(c => !c.resolvedAt);
  } catch (error) {
    console.error('[Offline] Erro ao buscar conflitos:', error);
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
    // Atualizar registro de conflito
    await db.conflicts.update(conflictId, {
      resolvedAt: Date.now(),
      resolution,
    });

    // Aplicar resolução à entidade
    const dataToApply = resolution === 'local'
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

    console.log(`[Offline] Conflito ${conflictId} resolvido: ${resolution}`);
  });
}

// ===== META =====

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

// ===== LIMPEZA =====

export async function cleanExpiredData(): Promise<{
  users: number;
  events: number;
  tasks: number;
  messages: number;
}> {
  const ttlMs = TTL_DAYS * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - ttlMs;

  const result = await db.transaction('rw', db.users, db.events, db.tasks, db.messages, async () => {
    // Não excluir itens modificados localmente (não sincronizados)
    const deletedUsers = await db.users
      .where('syncedAt')
      .below(cutoff)
      .and((u) => !u.isModified)
      .delete();

    const deletedEvents = await db.events
      .where('syncedAt')
      .below(cutoff)
      .and((e) => !e.isModified)
      .delete();

    const deletedTasks = await db.tasks
      .where('syncedAt')
      .below(cutoff)
      .and((t) => !t.isModified)
      .delete();

    const deletedMessages = await db.messages
      .where('syncedAt')
      .below(cutoff)
      .and((m) => !m.isModified)
      .delete();

    return {
      users: deletedUsers,
      events: deletedEvents,
      tasks: deletedTasks,
      messages: deletedMessages,
    };
  });

  console.log(`[Offline] Limpeza: ${result.users} usuários, ${result.events} eventos, ${result.tasks} tarefas, ${result.messages} mensagens`);
  return result;
}

export async function clearAllOfflineData(): Promise<void> {
  await db.transaction('rw', [db.users, db.events, db.tasks, db.messages, db.syncQueue, db.meta, db.conflicts], async () => {
    await db.users.clear();
    await db.events.clear();
    await db.tasks.clear();
    await db.messages.clear();
    await db.syncQueue.clear();
    await db.meta.clear();
    await db.conflicts.clear();
  });
  console.log('[Offline] Todos os dados offline limpos');
}

export async function getStorageUsage(): Promise<{ used: number; limit: number; percentage: number }> {
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

// ===== ESTATÍSTICAS =====

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

/**
 * Verifica integridade do banco de dados
 */
export async function verifyDatabaseIntegrity(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Verificar se as tabelas existem
    const tables = ['users', 'events', 'tasks', 'messages', 'syncQueue', 'meta', 'conflicts'];
    for (const table of tables) {
      try {
        await db.table(table).count();
      } catch {
        errors.push(`Tabela '${table}' não acessível`);
      }
    }

    // Verificar dados corrompidos em usuários
    const users = await db.users.toArray();
    for (const user of users) {
      if (!user.data || !user.checksum) {
        errors.push(`Usuário ${user.id}: dados ou checksum ausente`);
      }
    }

    // Verificar fila de sync sem endpoint
    const syncItems = await db.syncQueue.toArray();
    for (const item of syncItems) {
      if (!item.endpoint || !item.method) {
        errors.push(`SyncQueue item ${item.id}: endpoint ou método ausente`);
      }
    }
  } catch (error) {
    errors.push(`Erro ao verificar integridade: ${error instanceof Error ? error.message : 'Desconhecido'}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
