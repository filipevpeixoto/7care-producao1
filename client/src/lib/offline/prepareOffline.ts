/**
 * Módulo para preparar dados para uso offline
 * Baixa todos os dados principais de uma vez
 */

import {
  saveUsersOffline,
  saveEventsOffline,
  saveTasksOffline,
  canAccessFullOfflineData,
} from '@/lib/offline';
import { createLogger } from '@/lib/logger';

const offlineLogger = createLogger('Offline');

export interface PrepareOfflineProgress {
  step: string;
  current: number;
  total: number;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

export type ProgressCallback = (progress: PrepareOfflineProgress) => void;

interface PrepareOfflineResult {
  success: boolean;
  usersCount: number;
  eventsCount: number;
  tasksCount: number;
  errors: string[];
}

const ENDPOINTS = [
  { key: 'users', url: '/api/users', label: 'Usuários' },
  { key: 'events', url: '/api/events', label: 'Eventos' },
  { key: 'tasks', url: '/api/tasks', label: 'Tarefas' },
] as const;

/**
 * Prepara todos os dados para uso offline
 */
export async function prepareForOffline(
  userRole: string,
  onProgress?: ProgressCallback
): Promise<PrepareOfflineResult> {
  const result: PrepareOfflineResult = {
    success: true,
    usersCount: 0,
    eventsCount: 0,
    tasksCount: 0,
    errors: [],
  };

  // Verificar permissão
  if (!canAccessFullOfflineData(userRole)) {
    result.success = false;
    result.errors.push('Você não tem permissão para cache completo de dados');
    return result;
  }

  const total = ENDPOINTS.length;

  for (let i = 0; i < ENDPOINTS.length; i++) {
    const endpoint = ENDPOINTS[i];
    
    // Notificar progresso
    onProgress?.({
      step: endpoint.label,
      current: i + 1,
      total,
      status: 'loading',
    });

    try {
      // Buscar dados com skipOfflineCache para não duplicar
      const response = await fetch(endpoint.url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        offlineLogger.warn(`${endpoint.key}: dados não são array`);
        continue;
      }

      // Salvar no IndexedDB
      switch (endpoint.key) {
        case 'users':
          offlineLogger.debug(`Salvando ${data.length} usuários...`);
          await saveUsersOffline(data, userRole);
          result.usersCount = data.length;
          offlineLogger.debug(`${data.length} usuários salvos`);
          break;
        case 'events':
          offlineLogger.debug(`Salvando ${data.length} eventos...`);
          await saveEventsOffline(data);
          result.eventsCount = data.length;
          offlineLogger.debug(`${data.length} eventos salvos`);
          break;
        case 'tasks':
          offlineLogger.debug(`Salvando ${data.length} tarefas...`);
          await saveTasksOffline(data);
          result.tasksCount = data.length;
          offlineLogger.debug(`${data.length} tarefas salvas`);
          break;
      }

      onProgress?.({
        step: endpoint.label,
        current: i + 1,
        total,
        status: 'success',
      });

      offlineLogger.debug(`${endpoint.label}: ${data.length} itens`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      result.errors.push(`${endpoint.label}: ${errorMsg}`);
      result.success = false;

      onProgress?.({
        step: endpoint.label,
        current: i + 1,
        total,
        status: 'error',
        error: errorMsg,
      });

      offlineLogger.error(`${endpoint.label}:`, error);
    }
  }

  // Cache do Service Worker para arquivos estáticos
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_URLS',
        urls: [
          '/',
          '/dashboard',
          '/calendar',
          '/tasks',
          '/users',
        ],
      });
      offlineLogger.debug('Service Worker notificado para cachear páginas');
    } catch (error) {
      offlineLogger.warn('Erro ao notificar SW:', error);
    }
  }

  return result;
}

/**
 * Verifica quanto de dados offline está disponível
 */
export async function getOfflineDataStatus(): Promise<{
  users: number;
  events: number;
  tasks: number;
  lastSync: Date | null;
}> {
  try {
    const { db } = await import('@/lib/offline/database');
    
    const [usersCount, eventsCount, tasksCount] = await Promise.all([
      db.users.count(),
      db.events.count(),
      db.tasks.count(),
    ]);

    // Buscar última sincronização
    const meta = await db.meta.get('users_last_sync');
    const lastSync = meta?.value ? new Date(parseInt(meta.value, 10)) : null;

    return {
      users: usersCount,
      events: eventsCount,
      tasks: tasksCount,
      lastSync,
    };
  } catch (error) {
    offlineLogger.warn('Erro ao verificar status:', error);
    return {
      users: 0,
      events: 0,
      tasks: 0,
      lastSync: null,
    };
  }
}
