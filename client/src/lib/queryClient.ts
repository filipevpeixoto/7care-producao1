import { QueryClient } from '@tanstack/react-query';
import { PERFORMANCE_CONFIG } from './performance';

// Helper para adicionar JWT token nas requisições
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('7care_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Configuração otimizada do React Query
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Configurações padrão para todas as queries
        retry: 2,
        refetchOnWindowFocus: PERFORMANCE_CONFIG.queryDefaults.refetchOnWindowFocus,
        staleTime: PERFORMANCE_CONFIG.queryDefaults.staleTime,
        gcTime: PERFORMANCE_CONFIG.queryDefaults.gcTime,
        
        // Configurações adicionais para melhor performance
        refetchOnMount: true,
        refetchOnReconnect: true,
        
        // Configurações de retry inteligente
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Query function padrão
        queryFn: async ({ queryKey }) => {
          const url = queryKey[0] as string;
          const token = localStorage.getItem('7care_token');
          
          const response = await fetch(url, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return response.json();
        },
      },
      mutations: {
        // Configurações para mutations
        retry: 1,
        retryDelay: 1000,
        
        // Configurações de otimistic updates
        onMutate: undefined,
        onError: undefined,
        onSuccess: undefined,
        onSettled: undefined,
      },
    },
  });
};

// Configurações específicas para diferentes tipos de dados
export const queryConfigs = {
  // Configurações para dados do dashboard
  dashboard: {
    staleTime: PERFORMANCE_CONFIG.cacheConfig.dashboard.staleTime,
    gcTime: PERFORMANCE_CONFIG.cacheConfig.dashboard.gcTime,
    refetchInterval: PERFORMANCE_CONFIG.cacheConfig.dashboard.refetchInterval,
    refetchOnWindowFocus: false,
  },
  
  // Configurações para dados do calendário
  calendar: {
    staleTime: PERFORMANCE_CONFIG.cacheConfig.calendar.staleTime,
    gcTime: PERFORMANCE_CONFIG.cacheConfig.calendar.gcTime,
    refetchInterval: PERFORMANCE_CONFIG.cacheConfig.calendar.refetchInterval,
    refetchOnWindowFocus: false,
  },
  
  // Configurações para dados de usuários
  users: {
    staleTime: PERFORMANCE_CONFIG.cacheConfig.users.staleTime,
    gcTime: PERFORMANCE_CONFIG.cacheConfig.users.gcTime,
    refetchInterval: PERFORMANCE_CONFIG.cacheConfig.users.refetchInterval,
    refetchOnWindowFocus: true,
  },
  
  // Configurações para atividades
  activities: {
    staleTime: PERFORMANCE_CONFIG.cacheConfig.activities.staleTime,
    gcTime: PERFORMANCE_CONFIG.cacheConfig.activities.gcTime,
    refetchInterval: PERFORMANCE_CONFIG.cacheConfig.activities.refetchInterval,
    refetchOnWindowFocus: false,
  },
  
  // Configurações para dados que mudam frequentemente
  realtime: {
    staleTime: 0,
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 30000, // 30 segundos
    refetchOnWindowFocus: true,
  },
  
  // Configurações para dados estáticos
  static: {
    staleTime: Infinity,
    gcTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  },
};

// Função para criar uma query com configurações específicas
export const createQueryConfig = (type: keyof typeof queryConfigs) => {
  return queryConfigs[type];
};

// Função para invalidar queries relacionadas
export const invalidateRelatedQueries = (
  queryClient: QueryClient,
  queryKeys: string[]
) => {
  queryKeys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
};

// Função para pré-carregar dados importantes
export const prefetchImportantData = (queryClient: QueryClient) => {
  // Pré-carregar dados do dashboard
  queryClient.prefetchQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
    ...queryConfigs.dashboard,
  });
  
  // Pré-carregar dados de usuários (requer autenticação)
  // Esta query será feita quando o usuário estiver logado
  // queryClient.prefetchQuery({
  //   queryKey: ['/api/users/birthdays'],
  //   queryFn: async () => {
  //     const response = await fetch('/api/users/birthdays');
  //     if (!response.ok) throw new Error('Failed to fetch birthdays');
  //     return response.json();
  //   },
  //   ...queryConfigs.users,
  // });
};

// Função para limpar cache antigo
export const cleanupOldCache = (queryClient: QueryClient) => {
  // Limpar queries que não foram usadas por mais de 1 hora
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  queryClient.getQueryCache().getAll().forEach(query => {
    if (query.state.dataUpdatedAt < oneHourAgo) {
      queryClient.removeQueries({ queryKey: query.queryKey });
    }
  });
};

// Função para configurar listeners de performance
export const setupPerformanceListeners = (queryClient: QueryClient) => {
  // Listener para quando o usuário volta à aba - OTIMIZADO
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Só invalidar queries críticas, não todas
      queryClient.invalidateQueries({ 
        queryKey: ['/api/dashboard/stats'],
        refetchType: 'active'
      });
    }
  });
  
  // Listener para quando o usuário volta online - OTIMIZADO
  window.addEventListener('online', () => {
    // Só refazer queries que falharam, não todas
    queryClient.refetchQueries({ 
      type: 'active',
      exact: false,
      stale: true // Só queries que estão stale
    });
  });
};
