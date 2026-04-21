import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { fetchWithAuth } from '@/lib/api';
import { STALE_TIME, GC_TIME } from '@/lib/queryConstants';
import { createLogger } from '@/lib/logger';

const tasksLogger = createLogger('Tasks');

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_by: number;
  assigned_to?: number;
  created_by_name?: string;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  tags?: string[];
}

// Chave para localStorage
const LEGACY_TASKS_CACHE_KEY = '7care_tasks_cache';

function getTasksCacheKey(userId?: number | null): string | null {
  return userId ? `7care_tasks_cache_${userId}` : null;
}

/**
 * Hook simplificado para gerenciar tarefas
 * - React Query para operações de dados
 * - localStorage para cache de leitura
 * - Operações (criar/editar/deletar) requerem conexão
 */
export function useTasks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const tasksCacheKey = useMemo(() => getTasksCacheKey(user?.id), [user?.id]);

  // ========================================
  // MONITORAR CONEXÃO
  // ========================================

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // ========================================
  // BUSCAR TAREFAS (com cache localStorage)
  // ========================================

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      tasksLogger.debug('Carregando tarefas...');

      if (!user?.id) {
        tasksLogger.debug('Sem usuário autenticado - retornando lista vazia');
        return [];
      }

      // 1. SEMPRE tentar carregar do localStorage primeiro (rápido)
      let cachedTasks: Task[] = [];
      try {
        const cached = tasksCacheKey ? localStorage.getItem(tasksCacheKey) : null;
        if (cached) {
          cachedTasks = JSON.parse(cached);
          tasksLogger.debug(`${cachedTasks.length} tarefas do cache local`);
        }
      } catch (error) {
        tasksLogger.warn('Erro ao ler cache:', error);
      }

      // 2. Se conectado e autenticado, buscar do servidor
      if (navigator.onLine && user?.id) {
        try {
          const response = await fetchWithAuth('/api/tasks');

          if (response.ok) {
            const result = await response.json();
            const serverTasks = result.tasks || [];

            tasksLogger.debug(`${serverTasks.length} tarefas do servidor`);

            // Salvar no localStorage para cache
            try {
              if (tasksCacheKey) {
                localStorage.setItem(tasksCacheKey, JSON.stringify(serverTasks));
              }
              localStorage.removeItem(LEGACY_TASKS_CACHE_KEY);
              tasksLogger.debug('Cache atualizado no localStorage');
            } catch (error) {
              tasksLogger.warn('Erro ao salvar cache:', error);
            }

            return serverTasks;
          } else {
            tasksLogger.warn(`Servidor retornou ${response.status}, usando cache`);
          }
        } catch (error) {
          tasksLogger.warn('Erro ao buscar do servidor, usando cache:', error);
        }
      } else {
        tasksLogger.debug('Sem conexão - usando cache local');
      }

      // 3. Retornar cache (se sem conexão ou erro)
      return cachedTasks;
    },
    staleTime: STALE_TIME.SHORT, // 30 seconds
    gcTime: GC_TIME.SHORT, // 5 minutos
    refetchOnWindowFocus: true, // Recarrega ao focar na janela
    refetchOnReconnect: true, // Recarrega ao voltar online
  });

  // ========================================
  // CRIAR TAREFA (requer conexão)
  // ========================================

  const createMutation = useMutation({
    mutationFn: async (newTask: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
      if (!navigator.onLine) {
        throw new Error('Sem conexão - não é possível criar tarefas');
      }
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetchWithAuth('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(newTask),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar tarefa');
      }

      const result = await response.json();
      return result.task || result;
    },
    onSuccess: (newTask) => {
      // Atualizar cache do localStorage
      try {
        const cached = tasksCacheKey ? localStorage.getItem(tasksCacheKey) : null;
        const tasks = cached ? JSON.parse(cached) : [];
        tasks.push(newTask);
        if (tasksCacheKey) {
          localStorage.setItem(tasksCacheKey, JSON.stringify(tasks));
        }
        tasksLogger.debug('Cache atualizado após criação');
      } catch (error) {
        tasksLogger.warn('Erro ao atualizar cache:', error);
      }

      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  // ========================================
  // ATUALIZAR TAREFA (requer conexão)
  // ========================================

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Task> }) => {
      if (!navigator.onLine) {
        throw new Error('Sem conexão - não é possível atualizar tarefas');
      }
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetchWithAuth(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar tarefa');
      }

      const result = await response.json();
      return result.task || result;
    },
    onSuccess: (updatedTask) => {
      // Atualizar cache do localStorage
      try {
        const cached = tasksCacheKey ? localStorage.getItem(tasksCacheKey) : null;
        const tasks = cached ? JSON.parse(cached) : [];
        const index = tasks.findIndex((t: Task) => t.id === updatedTask.id);
        if (index !== -1) {
          tasks[index] = updatedTask;
          if (tasksCacheKey) {
            localStorage.setItem(tasksCacheKey, JSON.stringify(tasks));
          }
          tasksLogger.debug('Cache atualizado após edição');
        }
      } catch (error) {
        tasksLogger.warn('Erro ao atualizar cache:', error);
      }

      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  // ========================================
  // DELETAR TAREFA (requer conexão)
  // ========================================

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!navigator.onLine) {
        throw new Error('Sem conexão - não é possível deletar tarefas');
      }
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetchWithAuth(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar tarefa');
      }

      return { success: true, id };
    },
    onSuccess: (result) => {
      // Remover do cache do localStorage
      try {
        const cached = tasksCacheKey ? localStorage.getItem(tasksCacheKey) : null;
        const tasks = cached ? JSON.parse(cached) : [];
        const filteredTasks = tasks.filter((t: Task) => t.id !== result.id);
        if (tasksCacheKey) {
          localStorage.setItem(tasksCacheKey, JSON.stringify(filteredTasks));
        }
        tasksLogger.debug(
          `Cache atualizado após deleção (${tasks.length} -> ${filteredTasks.length})`
        );
      } catch (error) {
        tasksLogger.warn('Erro ao atualizar cache:', error);
      }

      // Invalidar e refazer a query imediatamente
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      queryClient.refetchQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  // ========================================
  // RETORNO
  // ========================================

  return {
    // Dados
    data: data || [],
    loading: isLoading,
    error,
    isOnline,

    // Mutations
    create: createMutation.mutateAsync,
    update: (id: number, updates: Partial<Task>) => updateMutation.mutateAsync({ id, updates }),
    remove: deleteMutation.mutateAsync,

    // Status
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Sincronização manual
    sync: async () => {
      await queryClient.refetchQueries({ queryKey: ['tasks', user?.id] });
      return { success: true };
    },
  };
}
