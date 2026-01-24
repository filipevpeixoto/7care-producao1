/**
 * Hook principal para funcionalidade offline
 *
 * Melhorias:
 * - Melhor tipagem
 * - Integração com novas funcionalidades do syncManager
 * - Suporte a conflitos
 * - Estatísticas de sync
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  setupAutoSync,
  teardownAutoSync,
  addSyncListener,
  forceSync,
  pauseSync,
  resumeSync,
  isSyncInProgress,
  isSyncPaused,
  getSyncQueueCount,
  getPendingSyncCount,
  getStorageUsage,
  cleanExpiredData,
  canAccessFullOfflineData,
  getOfflineStats,
  getUnresolvedConflicts,
  getSyncStats,
  type SyncProgress,
  type SyncResult,
  type ConflictRecord,
} from '@/lib/offline';

// ===== TIPOS =====

export interface OfflineState {
  /** Indica se o navegador está online */
  isOnline: boolean;
  /** Indica se está sincronizando */
  isSyncing: boolean;
  /** Indica se a sincronização está pausada */
  isPaused: boolean;
  /** Número total de itens na fila de sync */
  pendingCount: number;
  /** Número de itens prontos para sync (não em retry) */
  readyToSyncCount: number;
  /** Progresso atual da sincronização */
  syncProgress: number;
  /** Total de itens a sincronizar */
  syncTotal: number;
  /** Item atual sendo sincronizado */
  currentSyncItem: string | null;
  /** Armazenamento usado em bytes */
  storageUsed: number;
  /** Limite de armazenamento em bytes */
  storageLimit: number;
  /** Porcentagem de armazenamento usado */
  storagePercentage: number;
  /** Último erro de sincronização */
  lastError: string | null;
  /** Número de conflitos não resolvidos */
  unresolvedConflicts: number;
}

export interface OfflineStats {
  users: number;
  events: number;
  tasks: number;
  messages: number;
  pendingSync: number;
  conflicts: number;
  storage: {
    used: number;
    limit: number;
    percentage: number;
  };
}

export interface UseOfflineReturn extends OfflineState {
  /** Força sincronização manual */
  sync: () => Promise<SyncResult>;
  /** Pausa a sincronização */
  pause: () => void;
  /** Retoma a sincronização */
  resume: () => void;
  /** Limpa dados expirados */
  cleanup: () => Promise<void>;
  /** Obtém estatísticas completas */
  getStats: () => Promise<OfflineStats>;
  /** Obtém conflitos não resolvidos */
  getConflicts: () => Promise<ConflictRecord[]>;
  /** Verifica se usuário tem acesso completo offline */
  canAccessFullData: boolean;
  /** Atualiza estado manualmente */
  refresh: () => Promise<void>;
}

// ===== HOOK =====

export function useOffline(userRole?: string): UseOfflineReturn {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    isPaused: false,
    pendingCount: 0,
    readyToSyncCount: 0,
    syncProgress: 0,
    syncTotal: 0,
    currentSyncItem: null,
    storageUsed: 0,
    storageLimit: 50 * 1024 * 1024,
    storagePercentage: 0,
    lastError: null,
    unresolvedConflicts: 0,
  });

  // Verificar permissão de acesso offline
  const canAccessFullData = useMemo(
    () => (userRole ? canAccessFullOfflineData(userRole) : false),
    [userRole]
  );

  // Monitorar conexão
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true, lastError: null }));
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Setup auto sync e listener
  useEffect(() => {
    setupAutoSync();

    // Listener para mudanças de sync
    const unsubscribe = addSyncListener((progress: SyncProgress) => {
      setState((prev) => ({
        ...prev,
        isSyncing: progress.status === 'syncing',
        isPaused: progress.status === 'paused',
        syncProgress: progress.current,
        syncTotal: progress.total,
        currentSyncItem: progress.currentItem || null,
        lastError: progress.lastError || null,
      }));
    });

    return () => {
      unsubscribe();
      teardownAutoSync();
    };
  }, []);

  // Atualizar contagem de pendentes
  useEffect(() => {
    const updateCounts = async () => {
      try {
        const [total, ready, conflicts] = await Promise.all([
          getSyncQueueCount(),
          getPendingSyncCount(),
          getUnresolvedConflicts().then((c) => c.length),
        ]);

        setState((prev) => ({
          ...prev,
          pendingCount: total,
          readyToSyncCount: ready,
          unresolvedConflicts: conflicts,
        }));
      } catch (error) {
        console.warn('[useOffline] Erro ao atualizar contagens:', error);
      }
    };

    updateCounts();
    const interval = setInterval(updateCounts, 5000);

    return () => clearInterval(interval);
  }, []);

  // Atualizar uso de armazenamento
  useEffect(() => {
    const updateStorage = async () => {
      try {
        const { used, limit, percentage } = await getStorageUsage();
        setState((prev) => ({
          ...prev,
          storageUsed: used,
          storageLimit: limit,
          storagePercentage: percentage,
        }));
      } catch (error) {
        console.warn('[useOffline] Erro ao verificar armazenamento:', error);
      }
    };

    updateStorage();
    // Atualizar a cada 30 segundos
    const interval = setInterval(updateStorage, 30000);

    return () => clearInterval(interval);
  }, []);

  // Forçar sincronização
  const sync = useCallback(async (): Promise<SyncResult> => {
    setState((prev) => ({ ...prev, isSyncing: true, lastError: null }));

    try {
      const result = await forceSync();

      if (result.failed > 0) {
        setState((prev) => ({
          ...prev,
          lastError: `${result.failed} itens falharam na sincronização`,
        }));
      }

      // Atualizar contagem após sync
      const count = await getSyncQueueCount();
      setState((prev) => ({ ...prev, pendingCount: count }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setState((prev) => ({ ...prev, lastError: errorMessage }));
      throw error;
    } finally {
      setState((prev) => ({ ...prev, isSyncing: false }));
    }
  }, []);

  // Pausar sincronização
  const pause = useCallback(() => {
    pauseSync();
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  // Retomar sincronização
  const resume = useCallback(() => {
    resumeSync();
    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  // Limpar dados expirados
  const cleanup = useCallback(async () => {
    await cleanExpiredData();
    const { used, limit, percentage } = await getStorageUsage();
    setState((prev) => ({
      ...prev,
      storageUsed: used,
      storageLimit: limit,
      storagePercentage: percentage,
    }));
  }, []);

  // Obter estatísticas completas
  const getStats = useCallback(async (): Promise<OfflineStats> => {
    return getOfflineStats();
  }, []);

  // Obter conflitos não resolvidos
  const getConflicts = useCallback(async (): Promise<ConflictRecord[]> => {
    return getUnresolvedConflicts();
  }, []);

  // Atualizar estado manualmente
  const refresh = useCallback(async () => {
    try {
      const [total, ready, conflicts, storage] = await Promise.all([
        getSyncQueueCount(),
        getPendingSyncCount(),
        getUnresolvedConflicts().then((c) => c.length),
        getStorageUsage(),
      ]);

      setState((prev) => ({
        ...prev,
        pendingCount: total,
        readyToSyncCount: ready,
        unresolvedConflicts: conflicts,
        storageUsed: storage.used,
        storageLimit: storage.limit,
        storagePercentage: storage.percentage,
        isSyncing: isSyncInProgress(),
        isPaused: isSyncPaused(),
      }));
    } catch (error) {
      console.warn('[useOffline] Erro ao atualizar estado:', error);
    }
  }, []);

  return {
    ...state,
    sync,
    pause,
    resume,
    cleanup,
    getStats,
    getConflicts,
    canAccessFullData,
    refresh,
  };
}

// ===== HOOKS AUXILIARES =====

/**
 * Hook simplificado que retorna apenas o status online/offline
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook para monitorar apenas a fila de sync
 */
export function useSyncQueue() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    retrying: 0,
    byEntity: {} as Record<string, number>,
    byType: {} as Record<string, number>,
  });

  useEffect(() => {
    const updateStats = async () => {
      try {
        const syncStats = await getSyncStats();
        setStats(syncStats);
      } catch (error) {
        console.warn('[useSyncQueue] Erro ao obter estatísticas:', error);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 3000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}
