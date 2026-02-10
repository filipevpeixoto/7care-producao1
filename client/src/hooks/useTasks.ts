import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

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
const TASKS_CACHE_KEY = '7care_tasks_cache';

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
    queryKey: ['tasks'],
    queryFn: async () => {
      console.log('📖 Carregando tarefas...');
      
      // 1. SEMPRE tentar carregar do localStorage primeiro (rápido)
      let cachedTasks: Task[] = [];
      try {
        const cached = localStorage.getItem(TASKS_CACHE_KEY);
        if (cached) {
          cachedTasks = JSON.parse(cached);
          console.log(`💾 ${cachedTasks.length} tarefas do cache local`);
        }
      } catch (error) {
        console.warn('⚠️ Erro ao ler cache:', error);
      }
      
      // 2. Se conectado e autenticado, buscar do servidor
      if (navigator.onLine && user?.id) {
        try {
          const response = await fetch('/api/tasks', {
            headers: { 'x-user-id': String(user.id) }
          });
          
          if (response.ok) {
            const result = await response.json();
            const serverTasks = result.tasks || [];
            
            console.log(`🌐 ${serverTasks.length} tarefas do servidor`);
            
            // Salvar no localStorage para cache
            try {
              localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(serverTasks));
              console.log('💾 Cache atualizado no localStorage');
            } catch (error) {
              console.warn('⚠️ Erro ao salvar cache:', error);
            }
            
            return serverTasks;
          } else {
            console.warn(`⚠️ Servidor retornou ${response.status}, usando cache`);
          }
        } catch (error) {
          console.warn('⚠️ Erro ao buscar do servidor, usando cache:', error);
        }
      } else {
        console.log('📴 Sem conexão - usando cache local');
      }
      
      // 3. Retornar cache (se sem conexão ou erro)
      return cachedTasks;
    },
    staleTime: 5000, // Cache válido por 5 segundos
    gcTime: 1000 * 60 * 5, // Mantém cache por 5 minutos
    refetchOnWindowFocus: true, // Recarrega ao focar na janela
    refetchOnReconnect: true // Recarrega ao voltar online
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
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id)
        },
        body: JSON.stringify(newTask)
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
        const cached = localStorage.getItem(TASKS_CACHE_KEY);
        const tasks = cached ? JSON.parse(cached) : [];
        tasks.push(newTask);
        localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks));
        console.log('💾 Cache atualizado após criação');
      } catch (error) {
        console.warn('⚠️ Erro ao atualizar cache:', error);
      }
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
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
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id)
        },
        body: JSON.stringify(updates)
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
        const cached = localStorage.getItem(TASKS_CACHE_KEY);
        const tasks = cached ? JSON.parse(cached) : [];
        const index = tasks.findIndex((t: Task) => t.id === updatedTask.id);
        if (index !== -1) {
          tasks[index] = updatedTask;
          localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks));
          console.log('💾 Cache atualizado após edição');
        }
      } catch (error) {
        console.warn('⚠️ Erro ao atualizar cache:', error);
      }
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
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
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': String(user.id) }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao deletar tarefa');
      }
      
      return { success: true, id };
    },
    onSuccess: (result) => {
      // Remover do cache do localStorage
      try {
        const cached = localStorage.getItem(TASKS_CACHE_KEY);
        const tasks = cached ? JSON.parse(cached) : [];
        const filteredTasks = tasks.filter((t: Task) => t.id !== result.id);
        localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(filteredTasks));
        console.log(`💾 Cache atualizado após deleção (${tasks.length} -> ${filteredTasks.length})`);
      } catch (error) {
        console.warn('⚠️ Erro ao atualizar cache:', error);
      }
      
      // Invalidar e refazer a query imediatamente
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['tasks'] });
    }
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
      await queryClient.refetchQueries({ queryKey: ['tasks'] });
      return { success: true };
    }
  };
}

