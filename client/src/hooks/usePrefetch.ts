/**
 * usePrefetch Hook - Pré-carrega páginas para navegação mais rápida
 *
 * @module hooks/usePrefetch
 * @description
 * - Prefetch no hover/focus de links
 * - Prefetch de rotas críticas no idle
 * - Cache inteligente para evitar refetch desnecessário
 */

import { useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';

// Mapeamento de rotas para seus imports dinâmicos
const routeImports: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/pages/Dashboard'),
  '/calendar': () => import('@/pages/Calendar'),
  '/users': () => import('@/pages/Users'),
  '/interested': () => import('@/pages/Interested'),
  '/my-interested': () => import('@/pages/MyInterested'),
  '/chat': () => import('@/pages/Chat'),
  '/settings': () => import('@/pages/Settings'),
  '/gamification': () => import('@/pages/Gamification'),
  '/prayers': () => import('@/pages/Prayers'),
  '/tasks': () => import('@/pages/Tasks'),
  '/reports': () => import('@/pages/Reports'),
  '/elections': () => import('@/pages/UnifiedElection'),
  '/districts': () => import('@/pages/Districts'),
  '/pastors': () => import('@/pages/Pastors'),
  '/menu': () => import('@/pages/Menu'),
  '/meu-cadastro': () => import('@/pages/MeuCadastro'),
  '/contact': () => import('@/pages/Contact'),
};

// Rotas críticas que devem ser pré-carregadas no idle
const criticalRoutes = ['/dashboard', '/calendar', '/users', '/menu'];

// Cache de rotas já carregadas
const loadedRoutes = new Set<string>();

/**
 * Hook para prefetch de rotas
 */
export function usePrefetch() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  /**
   * Pré-carrega uma rota específica
   */
  const prefetchRoute = useCallback((path: string) => {
    // Não recarregar se já foi carregado
    if (loadedRoutes.has(path)) return;

    const importFn = routeImports[path];
    if (importFn) {
      importFn()
        .then(() => {
          loadedRoutes.add(path);
        })
        .catch(() => {
          // Silently fail - não é crítico
        });
    }
  }, []);

  /**
   * Pré-carrega uma rota após delay (para hover)
   */
  const prefetchOnHover = useCallback(
    (path: string, delay = 150) => {
      // Cancelar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        prefetchRoute(path);
      }, delay);
    },
    [prefetchRoute]
  );

  /**
   * Cancela prefetch pendente
   */
  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Pré-carrega dados da API para uma rota
   */
  const prefetchData = useCallback(
    (queryKey: string[], queryFn: () => Promise<unknown>) => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 5 * 60 * 1000, // 5 minutos
      });
    },
    [queryClient]
  );

  /**
   * Pré-carrega rotas críticas quando o browser está idle
   */
  const prefetchCriticalRoutes = useCallback(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(
        () => {
          criticalRoutes.forEach(route => {
            if (!loadedRoutes.has(route)) {
              prefetchRoute(route);
            }
          });
        },
        { timeout: 2000 }
      );
    } else {
      // Fallback para browsers sem requestIdleCallback
      setTimeout(() => {
        criticalRoutes.forEach(route => {
          if (!loadedRoutes.has(route)) {
            prefetchRoute(route);
          }
        });
      }, 2000);
    }
  }, [prefetchRoute]);

  /**
   * Pré-carrega dados específicos do Dashboard
   */
  const prefetchDashboardData = useCallback(
    (userId?: number, userRole?: string) => {
      if (!userId) return;

      // Prefetch dos dados unificados do dashboard (para superadmin)
      if (userRole === 'superadmin') {
        queryClient.prefetchQuery({
          queryKey: ['/api/dashboard/unified', userId],
          queryFn: async () => {
            const response = await fetchWithAuth('/api/dashboard/unified');
            if (!response.ok) throw new Error('Failed to prefetch');
            return response.json();
          },
          staleTime: 2 * 60 * 1000,
        });
      }

      // Prefetch das stats gerais
      queryClient.prefetchQuery({
        queryKey: ['/api/dashboard/stats', userId],
        queryFn: async () => {
          const response = await fetchWithAuth('/api/dashboard/stats');
          if (!response.ok) throw new Error('Failed to prefetch');
          return response.json();
        },
        staleTime: 2 * 60 * 1000,
      });

      // Prefetch dos aniversariantes
      queryClient.prefetchQuery({
        queryKey: ['/api/users/birthdays', userId, userRole],
        queryFn: async () => {
          const response = await fetchWithAuth('/api/users/birthdays');
          if (!response.ok) throw new Error('Failed to prefetch');
          return response.json();
        },
        staleTime: 4 * 60 * 1000,
      });
    },
    [queryClient]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    prefetchRoute,
    prefetchOnHover,
    cancelPrefetch,
    prefetchData,
    prefetchCriticalRoutes,
    prefetchDashboardData,
    isRouteLoaded: (path: string) => loadedRoutes.has(path),
  };
}

/**
 * Hook para prefetch automático no mount do app
 */
export function usePrefetchOnMount() {
  const { prefetchCriticalRoutes } = usePrefetch();

  useEffect(() => {
    // Aguarda o app estar estável antes de prefetch
    const timer = setTimeout(() => {
      prefetchCriticalRoutes();
    }, 1000);

    return () => clearTimeout(timer);
  }, [prefetchCriticalRoutes]);
}
