/**
 * Gerenciador de sincronização offline
 * Processa a fila de sync quando volta online
 *
 * Melhorias:
 * - Exponential backoff para retries
 * - Detecção de conflitos
 * - Batch processing opcional
 * - Priorização de operações
 * - Melhor gestão de erros
 */

import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  getPendingSyncCount,
  recordConflict,
  type SyncQueueItem,
} from './database';

// ===== TIPOS =====

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'paused';

export interface SyncProgress {
  status: SyncStatus;
  current: number;
  total: number;
  currentItem?: string;
  lastError?: string;
}

export interface SyncResult {
  success: number;
  failed: number;
  conflicts: number;
  skipped: number;
  errors: Array<{ itemId: number; error: string }>;
}

type SyncListener = (progress: SyncProgress) => void;

// ===== CONFIGURAÇÕES =====

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 1000; // 1 segundo
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutos
const BATCH_SIZE = 10;
const CONNECTION_CHECK_DELAY_MS = 2000;

// ===== ESTADO =====

const listeners: Set<SyncListener> = new Set();
let isSyncing = false;
let isPaused = false;
let currentProgress: SyncProgress = {
  status: 'idle',
  current: 0,
  total: 0,
};

// ===== LISTENERS =====

/**
 * Registra um listener para mudanças de status
 */
export function addSyncListener(listener: SyncListener): () => void {
  listeners.add(listener);
  // Notificar estado atual imediatamente
  listener(currentProgress);
  return () => listeners.delete(listener);
}

function notifyListeners(progress: Partial<SyncProgress>): void {
  currentProgress = { ...currentProgress, ...progress };
  listeners.forEach((listener) => listener(currentProgress));
}

/**
 * Obtém o status atual de sincronização
 */
export function getSyncStatus(): SyncStatus {
  return currentProgress.status;
}

/**
 * Obtém o progresso atual completo
 */
export function getSyncProgress(): SyncProgress {
  return { ...currentProgress };
}

// ===== EXPONENTIAL BACKOFF =====

/**
 * Calcula o delay para retry usando exponential backoff com jitter
 */
function calculateBackoffDelay(retryCount: number): number {
  // Exponential backoff: delay = base * 2^retryCount
  const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);

  // Adicionar jitter (variação aleatória de ±25%)
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

  // Limitar ao máximo configurado
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
}

/**
 * Calcula o timestamp para próxima tentativa
 */
function getNextRetryTimestamp(retryCount: number): number {
  return Date.now() + calculateBackoffDelay(retryCount);
}

// ===== PROCESSAMENTO =====

/**
 * Processa a fila de sincronização
 */
export async function processQueue(): Promise<SyncResult> {
  if (isSyncing) {
    console.log('[Sync] Já está sincronizando...');
    return { success: 0, failed: 0, conflicts: 0, skipped: 0, errors: [] };
  }

  if (isPaused) {
    console.log('[Sync] Sincronização pausada');
    return { success: 0, failed: 0, conflicts: 0, skipped: 0, errors: [] };
  }

  if (!navigator.onLine) {
    console.log('[Sync] Sem conexão, adiando sincronização');
    notifyListeners({ status: 'idle', lastError: 'Sem conexão' });
    return { success: 0, failed: 0, conflicts: 0, skipped: 0, errors: [] };
  }

  isSyncing = true;
  const result: SyncResult = {
    success: 0,
    failed: 0,
    conflicts: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const queue = await getSyncQueue();
    const total = queue.length;

    if (total === 0) {
      console.log('[Sync] Fila vazia');
      notifyListeners({ status: 'idle', current: 0, total: 0 });
      return result;
    }

    console.log(`[Sync] Processando ${total} itens...`);
    notifyListeners({ status: 'syncing', current: 0, total });

    // Processar em batches para não sobrecarregar
    for (let i = 0; i < queue.length; i++) {
      // Verificar se foi pausado
      if (isPaused) {
        console.log('[Sync] Sincronização pausada pelo usuário');
        result.skipped = queue.length - i;
        break;
      }

      // Verificar conexão periodicamente
      if (!navigator.onLine) {
        console.log('[Sync] Conexão perdida durante sincronização');
        result.skipped = queue.length - i;
        notifyListeners({ status: 'error', lastError: 'Conexão perdida' });
        break;
      }

      const item = queue[i];
      notifyListeners({
        current: i + 1,
        total,
        currentItem: `${item.entity} ${item.type}`,
      });

      try {
        const processResult = await processQueueItem(item);

        if (processResult.conflict) {
          result.conflicts++;
          console.log(`[Sync] ⚡ Conflito detectado: ${item.entity} ${item.type}`);
        } else {
          await removeSyncQueueItem(item.id!);
          result.success++;
          console.log(`[Sync] ✓ ${item.entity} ${item.type} (${i + 1}/${total})`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        result.errors.push({ itemId: item.id!, error: errorMessage });

        if (item.retryCount >= MAX_RETRIES) {
          result.failed++;
          console.error(`[Sync] ✗ ${item.entity} ${item.type} - Máximo de tentativas atingido`);
          // Mover para "dead letter" ou remover
          await removeSyncQueueItem(item.id!);
        } else {
          const nextRetry = getNextRetryTimestamp(item.retryCount + 1);
          console.warn(
            `[Sync] ⚠ ${item.entity} ${item.type} - Tentativa ${item.retryCount + 1}/${MAX_RETRIES}, ` +
            `próxima em ${Math.round((nextRetry - Date.now()) / 1000)}s`
          );

          await updateSyncQueueItem(item.id!, {
            retryCount: item.retryCount + 1,
            nextRetryAt: nextRetry,
            lastError: errorMessage,
          });
        }
      }

      // Pequeno delay entre operações para não sobrecarregar o servidor
      if (i < queue.length - 1 && (i + 1) % BATCH_SIZE === 0) {
        await sleep(100);
      }
    }

    const finalStatus = result.failed > 0 || result.conflicts > 0 ? 'error' : 'idle';
    notifyListeners({
      status: finalStatus,
      current: result.success + result.failed,
      total,
      lastError: result.failed > 0 ? `${result.failed} itens falharam` : undefined,
    });

    console.log(
      `[Sync] Concluído: ${result.success} sucesso, ${result.failed} falhas, ` +
      `${result.conflicts} conflitos, ${result.skipped} pulados`
    );
  } catch (error) {
    console.error('[Sync] Erro fatal:', error);
    notifyListeners({
      status: 'error',
      lastError: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  } finally {
    isSyncing = false;
  }

  return result;
}

interface ProcessResult {
  success: boolean;
  conflict: boolean;
  data?: unknown;
}

/**
 * Processa um item individual da fila
 */
async function processQueueItem(item: SyncQueueItem): Promise<ProcessResult> {
  const token = localStorage.getItem('7care_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Adicionar header para detecção de conflitos
  if (item.originalChecksum) {
    headers['X-Expected-Checksum'] = item.originalChecksum;
  }

  const options: RequestInit = {
    method: item.method,
    headers,
  };

  if (item.method !== 'DELETE' && item.data) {
    options.body = item.data;
  }

  const response = await fetch(item.endpoint, options);

  // Detectar conflito (409 Conflict)
  if (response.status === 409) {
    const serverData = await response.json().catch(() => ({}));

    // Registrar conflito no banco
    if (item.entityId && serverData) {
      await recordConflict(
        item.entity,
        item.entityId,
        item.data,
        JSON.stringify(serverData.currentData || serverData)
      );
    }

    return { success: false, conflict: true, data: serverData };
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json().catch(() => ({}));
  return { success: true, conflict: false, data };
}

// ===== CONTROLE =====

/**
 * Pausa a sincronização
 */
export function pauseSync(): void {
  isPaused = true;
  if (isSyncing) {
    notifyListeners({ status: 'paused' });
  }
  console.log('[Sync] Sincronização pausada');
}

/**
 * Retoma a sincronização
 */
export function resumeSync(): void {
  isPaused = false;
  console.log('[Sync] Sincronização retomada');

  // Se estava sincronizando, o processo vai continuar
  // Se não, verificar se há itens pendentes
  if (!isSyncing) {
    getPendingSyncCount().then((count) => {
      if (count > 0 && navigator.onLine) {
        processQueue();
      }
    });
  }
}

/**
 * Verifica se está sincronizando
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}

/**
 * Verifica se está pausado
 */
export function isSyncPaused(): boolean {
  return isPaused;
}

// ===== AUTO SYNC =====

let autoSyncSetup = false;

/**
 * Inicia sincronização automática quando volta online
 */
export function setupAutoSync(): void {
  if (autoSyncSetup) {
    console.log('[Sync] Auto sync já configurado');
    return;
  }

  autoSyncSetup = true;

  // Listener para quando volta online
  window.addEventListener('online', handleOnline);

  // Listener para quando fica offline
  window.addEventListener('offline', handleOffline);

  // Verificar se há itens pendentes ao iniciar
  checkPendingOnStartup();

  console.log('[Sync] Auto sync configurado');
}

async function handleOnline(): Promise<void> {
  console.log('[Sync] Conexão restaurada');
  notifyListeners({ lastError: undefined });

  // Aguardar um pouco para garantir que a conexão está estável
  await sleep(CONNECTION_CHECK_DELAY_MS);

  if (navigator.onLine && !isPaused) {
    const count = await getPendingSyncCount();
    if (count > 0) {
      console.log(`[Sync] ${count} itens pendentes, iniciando sync...`);
      processQueue();
    }
  }
}

function handleOffline(): void {
  console.log('[Sync] Conexão perdida');
  notifyListeners({ status: 'idle', lastError: 'Sem conexão' });
}

async function checkPendingOnStartup(): Promise<void> {
  try {
    const count = await getPendingSyncCount();
    if (count > 0 && navigator.onLine) {
      console.log(`[Sync] ${count} itens pendentes ao iniciar`);
      // Pequeno delay para não interferir no carregamento inicial
      await sleep(3000);
      if (navigator.onLine && !isPaused) {
        processQueue();
      }
    }
  } catch (error) {
    console.warn('[Sync] Erro ao verificar itens pendentes:', error);
  }
}

/**
 * Remove listeners de auto sync
 */
export function teardownAutoSync(): void {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  autoSyncSetup = false;
  console.log('[Sync] Auto sync removido');
}

// ===== SYNC MANUAL =====

/**
 * Força uma sincronização manual
 */
export async function forceSync(): Promise<SyncResult> {
  // Retomar se estava pausado
  if (isPaused) {
    isPaused = false;
  }
  return processQueue();
}

/**
 * Sincroniza um item específico imediatamente
 */
export async function syncItem(itemId: number): Promise<ProcessResult> {
  const queue = await getSyncQueue();
  const item = queue.find((i) => i.id === itemId);

  if (!item) {
    throw new Error(`Item ${itemId} não encontrado na fila`);
  }

  const result = await processQueueItem(item);

  if (result.success && !result.conflict) {
    await removeSyncQueueItem(itemId);
  }

  return result;
}

// ===== UTILITÁRIOS =====

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Obtém estatísticas da fila de sync
 */
export async function getSyncStats(): Promise<{
  total: number;
  pending: number;
  retrying: number;
  byEntity: Record<string, number>;
  byType: Record<string, number>;
}> {
  const queue = await getSyncQueue();
  const now = Date.now();

  const stats = {
    total: queue.length,
    pending: 0,
    retrying: 0,
    byEntity: {} as Record<string, number>,
    byType: {} as Record<string, number>,
  };

  for (const item of queue) {
    // Contar pendentes vs em retry
    if (item.nextRetryAt && item.nextRetryAt > now) {
      stats.retrying++;
    } else {
      stats.pending++;
    }

    // Contar por entidade
    stats.byEntity[item.entity] = (stats.byEntity[item.entity] || 0) + 1;

    // Contar por tipo
    stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
  }

  return stats;
}

/**
 * Limpa itens com muitas falhas (dead letters)
 */
export async function clearFailedItems(): Promise<number> {
  const queue = await getSyncQueue();
  let cleared = 0;

  for (const item of queue) {
    if (item.retryCount >= MAX_RETRIES) {
      await removeSyncQueueItem(item.id!);
      cleared++;
    }
  }

  console.log(`[Sync] ${cleared} itens com falhas removidos`);
  return cleared;
}
