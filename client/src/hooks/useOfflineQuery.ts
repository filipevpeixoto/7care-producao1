/**
 * Hook para integrar React Query com cache offline
 *
 * Melhorias:
 * - Tipagem forte (removido any)
 * - Integração com novos recursos de offline
 * - Melhor tratamento de erros
 * - Cache optimistic updates
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
  QueryKey,
} from '@tanstack/react-query';
import {
  saveUsersOffline,
  getUsersOffline,
  saveEventsOffline,
  getEventsOffline,
  saveTasksOffline,
  getTasksOffline,
  saveMessagesOffline,
  getMessagesOffline,
  addToSyncQueue,
  canAccessFullOfflineData,
  type TaskData,
} from '@/lib/offline';
import { useAuth } from './useAuth';
import type { User, Event, Message } from '@shared/schema';

// ===== TIPOS =====

type OfflineEntity = 'users' | 'events' | 'tasks' | 'messages';
type OfflineAction = 'create' | 'update' | 'delete';

interface OfflineQueryOptions<TData, TError = Error>
  extends Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'> {
  /** Chave para identificar o cache offline */
  offlineKey?: string;
}

interface OfflineMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> {
  /** Ação a ser executada offline */
  offlineAction?: OfflineAction;
  /** Entidade afetada */
  offlineEntity?: OfflineEntity;
  /** Função para gerar ID optimistico */
  generateOptimisticId?: () => number;
}

// Mapear entidade para endpoint
const entityEndpoints: Record<OfflineEntity, string> = {
  users: '/api/users',
  events: '/api/events',
  tasks: '/api/tasks',
  messages: '/api/messages',
};

// ===== HOOK PARA VERIFICAR ACESSO OFFLINE =====

function useOfflineAccess(): { hasAccess: boolean; userRole: string } {
  const { user } = useAuth();
  const userRole = user?.role || '';
  const hasAccess = canAccessFullOfflineData(userRole);
  return { hasAccess, userRole };
}

// ===== HOOKS DE QUERY =====

/**
 * Hook para buscar usuários com suporte offline
 */
export function useOfflineUsers(options?: OfflineQueryOptions<User[]>) {
  const { hasAccess, userRole } = useOfflineAccess();

  return useQuery<User[], Error>({
    queryKey: ['users'] as const,
    queryFn: async (): Promise<User[]> => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error(`Falha ao buscar usuários: ${response.status}`);
        }

        const data: User[] = await response.json();

        // Salvar no cache offline se tiver permissão
        if (hasAccess && Array.isArray(data)) {
          saveUsersOffline(data, userRole).catch((err) =>
            console.warn('[useOfflineUsers] Erro ao salvar cache:', err)
          );
        }

        return data;
      } catch (error) {
        // Se offline e tem permissão, buscar do cache local
        if (!navigator.onLine && hasAccess) {
          console.log('[useOfflineUsers] Buscando do cache offline');
          const offlineData = await getUsersOffline();
          if (offlineData.length > 0) {
            return offlineData;
          }
        }
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: (failureCount) => {
      // Não retentar se estiver offline
      if (!navigator.onLine) return false;
      return failureCount < 3;
    },
    ...options,
  });
}

/**
 * Hook para buscar eventos com suporte offline
 */
export function useOfflineEvents(options?: OfflineQueryOptions<Event[]>) {
  const { hasAccess } = useOfflineAccess();

  return useQuery<Event[], Error>({
    queryKey: ['events'] as const,
    queryFn: async (): Promise<Event[]> => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error(`Falha ao buscar eventos: ${response.status}`);
        }

        const data: Event[] = await response.json();

        // Salvar no cache offline
        if (hasAccess && Array.isArray(data)) {
          saveEventsOffline(data).catch((err) =>
            console.warn('[useOfflineEvents] Erro ao salvar cache:', err)
          );
        }

        return data;
      } catch (error) {
        // Se offline, buscar do cache local
        if (!navigator.onLine && hasAccess) {
          console.log('[useOfflineEvents] Buscando do cache offline');
          const offlineData = await getEventsOffline();
          if (offlineData.length > 0) {
            return offlineData;
          }
        }
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: (failureCount) => {
      if (!navigator.onLine) return false;
      return failureCount < 3;
    },
    ...options,
  });
}

/**
 * Hook para buscar tarefas com suporte offline
 */
export function useOfflineTasks(options?: OfflineQueryOptions<TaskData[]>) {
  const { hasAccess } = useOfflineAccess();

  return useQuery<TaskData[], Error>({
    queryKey: ['tasks'] as const,
    queryFn: async (): Promise<TaskData[]> => {
      try {
        const response = await fetch('/api/tasks');
        if (!response.ok) {
          throw new Error(`Falha ao buscar tarefas: ${response.status}`);
        }

        const data: TaskData[] = await response.json();

        // Salvar no cache offline
        if (hasAccess && Array.isArray(data)) {
          saveTasksOffline(data).catch((err) =>
            console.warn('[useOfflineTasks] Erro ao salvar cache:', err)
          );
        }

        return data;
      } catch (error) {
        // Se offline, buscar do cache local
        if (!navigator.onLine && hasAccess) {
          console.log('[useOfflineTasks] Buscando do cache offline');
          const offlineData = await getTasksOffline();
          if (offlineData.length > 0) {
            return offlineData;
          }
        }
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: (failureCount) => {
      if (!navigator.onLine) return false;
      return failureCount < 3;
    },
    ...options,
  });
}

/**
 * Hook para buscar mensagens com suporte offline
 */
export function useOfflineMessages(
  conversationId: number,
  options?: OfflineQueryOptions<Message[]>
) {
  const { hasAccess } = useOfflineAccess();

  return useQuery<Message[], Error>({
    queryKey: ['messages', conversationId] as const,
    queryFn: async (): Promise<Message[]> => {
      try {
        const response = await fetch(`/api/messages?conversationId=${conversationId}`);
        if (!response.ok) {
          throw new Error(`Falha ao buscar mensagens: ${response.status}`);
        }

        const data: Message[] = await response.json();

        // Salvar no cache offline
        if (hasAccess && Array.isArray(data)) {
          saveMessagesOffline(data, conversationId).catch((err) =>
            console.warn('[useOfflineMessages] Erro ao salvar cache:', err)
          );
        }

        return data;
      } catch (error) {
        // Se offline, buscar do cache local
        if (!navigator.onLine && hasAccess) {
          console.log('[useOfflineMessages] Buscando do cache offline');
          const offlineData = await getMessagesOffline(conversationId);
          if (offlineData.length > 0) {
            return offlineData;
          }
        }
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutos para mensagens
    retry: (failureCount) => {
      if (!navigator.onLine) return false;
      return failureCount < 3;
    },
    enabled: conversationId > 0,
    ...options,
  });
}

// ===== HOOKS DE MUTATION =====

/**
 * Hook genérico para mutations com suporte offline
 */
export function useOfflineMutation<TData, TVariables extends Record<string, unknown>>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: OfflineMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient();
  const { hasAccess } = useOfflineAccess();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables): Promise<TData> => {
      try {
        // Tentar executar online
        return await mutationFn(variables);
      } catch (error) {
        // Se offline e tem permissão, adicionar à fila de sync
        if (
          !navigator.onLine &&
          hasAccess &&
          options?.offlineAction &&
          options?.offlineEntity
        ) {
          const method =
            options.offlineAction === 'create'
              ? 'POST'
              : options.offlineAction === 'update'
                ? 'PUT'
                : 'DELETE';

          const entityId = 'id' in variables ? Number(variables.id) : undefined;

          await addToSyncQueue({
            entity: options.offlineEntity,
            type: options.offlineAction,
            entityId,
            data: JSON.stringify(variables),
            endpoint:
              entityId && options.offlineAction !== 'create'
                ? `${entityEndpoints[options.offlineEntity]}/${entityId}`
                : entityEndpoints[options.offlineEntity],
            method,
          });

          // Gerar ID optimistico se for criação
          if (options.offlineAction === 'create' && options.generateOptimisticId) {
            const optimisticId = options.generateOptimisticId();
            return { ...variables, id: optimisticId, _offline: true } as unknown as TData;
          }

          // Retornar dados otimistas
          return { ...variables, _offline: true } as unknown as TData;
        }
        throw error;
      }
    },
    onSuccess: (data, variables, context) => {
      // Invalidar queries relacionadas
      if (options?.offlineEntity) {
        queryClient.invalidateQueries({ queryKey: [options.offlineEntity] });
      }
      // Chamar callback original se existir
      if (options?.onSuccess) {
        (options.onSuccess as (data: TData, variables: TVariables, context: unknown) => void)(
          data,
          variables,
          context
        );
      }
    },
    onError: (error, variables, context) => {
      console.error('[useOfflineMutation] Erro:', error);
      if (options?.onError) {
        (options.onError as (error: Error, variables: TVariables, context: unknown) => void)(
          error,
          variables,
          context
        );
      }
    },
    ...options,
  });
}

// ===== HOOKS ESPECÍFICOS =====

interface CreateUserData {
  name: string;
  email: string;
  role?: string;
  [key: string]: unknown;
}

interface UpdateUserData extends CreateUserData {
  id: number;
}

/**
 * Hook para criar usuário com suporte offline
 */
export function useCreateUserOffline(
  options?: Omit<OfflineMutationOptions<User, CreateUserData>, 'offlineAction' | 'offlineEntity'>
) {
  return useOfflineMutation<User, CreateUserData>(
    async (userData) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Falha ao criar usuário');
      }
      return response.json();
    },
    {
      offlineAction: 'create',
      offlineEntity: 'users',
      generateOptimisticId: () => -Date.now(), // ID negativo para identificar como optimístico
      ...options,
    }
  );
}

/**
 * Hook para atualizar usuário com suporte offline
 */
export function useUpdateUserOffline(
  options?: Omit<OfflineMutationOptions<User, UpdateUserData>, 'offlineAction' | 'offlineEntity'>
) {
  return useOfflineMutation<User, UpdateUserData>(
    async (userData) => {
      const response = await fetch(`/api/users/${userData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Falha ao atualizar usuário');
      }
      return response.json();
    },
    {
      offlineAction: 'update',
      offlineEntity: 'users',
      ...options,
    }
  );
}

/**
 * Hook para deletar usuário com suporte offline
 */
export function useDeleteUserOffline(
  options?: Omit<OfflineMutationOptions<void, { id: number }>, 'offlineAction' | 'offlineEntity'>
) {
  return useOfflineMutation<void, { id: number }>(
    async ({ id }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Falha ao deletar usuário');
      }
    },
    {
      offlineAction: 'delete',
      offlineEntity: 'users',
      ...options,
    }
  );
}

interface CreateEventData {
  title: string;
  description?: string;
  date: string;
  [key: string]: unknown;
}

/**
 * Hook para criar evento com suporte offline
 */
export function useCreateEventOffline(
  options?: Omit<OfflineMutationOptions<Event, CreateEventData>, 'offlineAction' | 'offlineEntity'>
) {
  return useOfflineMutation<Event, CreateEventData>(
    async (eventData) => {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Falha ao criar evento');
      }
      return response.json();
    },
    {
      offlineAction: 'create',
      offlineEntity: 'events',
      generateOptimisticId: () => -Date.now(),
      ...options,
    }
  );
}

interface CreateTaskData {
  title: string;
  description?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Hook para criar tarefa com suporte offline
 */
export function useCreateTaskOffline(
  options?: Omit<OfflineMutationOptions<TaskData, CreateTaskData>, 'offlineAction' | 'offlineEntity'>
) {
  return useOfflineMutation<TaskData, CreateTaskData>(
    async (taskData) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Falha ao criar tarefa');
      }
      return response.json();
    },
    {
      offlineAction: 'create',
      offlineEntity: 'tasks',
      generateOptimisticId: () => -Date.now(),
      ...options,
    }
  );
}

/**
 * Hook para atualizar tarefa com suporte offline
 */
export function useUpdateTaskOffline(
  options?: Omit<
    OfflineMutationOptions<TaskData, TaskData>,
    'offlineAction' | 'offlineEntity'
  >
) {
  return useOfflineMutation<TaskData, TaskData>(
    async (taskData) => {
      const response = await fetch(`/api/tasks/${taskData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Falha ao atualizar tarefa');
      }
      return response.json();
    },
    {
      offlineAction: 'update',
      offlineEntity: 'tasks',
      ...options,
    }
  );
}
