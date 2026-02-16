import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import React, { Suspense, lazy, useEffect, Component, type ErrorInfo, type ReactNode } from 'react';
import { Login } from './pages/Login';
import { FirstAccessWelcome } from './components/auth/FirstAccessWelcome';
import {
  createQueryClient,
  setupPerformanceListeners,
  prefetchImportantData,
} from './lib/queryClient';
import { cleanConsoleInProduction } from './lib/performance';
import { OfflineIndicator } from './components/offline/OfflineIndicator';
import { ModalProvider } from './contexts/ModalContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import {
  enableGlobalOfflineFetch,
  setOfflineUserRole,
  cacheCurrentUser,
  testOfflineData,
} from './lib/offline';
import { SkipLink } from './components/ui/accessibility';
import { RouteAnnouncer } from './components/accessibility/RouteAnnouncer';
import { getSkeletonForRoute } from './components/ui/page-skeleton';
import { usePrefetchOnMount } from './hooks/usePrefetch';
import { uiLogger } from '@/lib/logger';

// View Transitions CSS
import './styles/view-transitions.css';

// Retry wrapper for lazy imports — if a chunk fails to load (e.g. after deploy),
// retry once and then force-reload the page so the browser fetches the new assets.
function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) {
  return lazy(() =>
    importFn().catch((err) => {
      uiLogger.error('[LazyLoad] Chunk load failed, retrying…', err);
      return importFn().catch((retryErr) => {
        uiLogger.error('[LazyLoad] Retry also failed — reloading page', retryErr);
        // Avoid infinite reload loop by checking a sessionStorage flag
        const key = `chunk_reload_${window.location.pathname}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          window.location.reload();
        }
        throw retryErr;
      });
    })
  );
}

// Lazy load all pages for better performance
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Calendar = lazyWithRetry(() => import('./pages/Calendar'));
const Menu = lazyWithRetry(() => import('./pages/Menu'));
const MeuCadastro = lazyWithRetry(() => import('./pages/MeuCadastro'));
const Users = lazyWithRetry(() => import('./pages/Users'));
const Interested = lazyWithRetry(() => import('./pages/Interested'));
const Chat = lazyWithRetry(() => import('./pages/Chat'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Tasks = lazyWithRetry(() => import('./pages/Tasks'));
const MyInterested = lazyWithRetry(() => import('./pages/MyInterested'));
const Gamification = lazyWithRetry(() => import('./pages/Gamification'));
const Prayers = lazyWithRetry(() => import('./pages/Prayers'));
const PushNotifications = lazyWithRetry(() => import('./pages/PushNotifications'));
const NotificationsHistory = lazyWithRetry(() => import('./pages/NotificationsHistory'));
// const TestCalendar = lazyWithRetry(() => import("./pages/TestCalendar")); // Arquivo removido
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const ElectionConfig = lazyWithRetry(() => import('./pages/ElectionConfig'));
const ElectionVoting = lazyWithRetry(() => import('./pages/ElectionVoting'));
const ElectionDashboard = lazyWithRetry(() => import('./pages/ElectionDashboard'));
const ElectionResults = lazyWithRetry(() => import('./pages/ElectionResults'));
const ElectionManage = lazyWithRetry(() => import('./pages/ElectionManage'));
const ElectionVotingMobile = lazyWithRetry(() => import('./pages/ElectionVotingMobile'));
const UnifiedElection = lazyWithRetry(() => import('./pages/UnifiedElection'));
const Districts = lazyWithRetry(() => import('./pages/Districts'));
const Pastors = lazyWithRetry(() => import('./pages/Pastors'));
const PastorInvites = lazyWithRetry(() => import('./pages/PastorInvites'));
const PastorOnboarding = lazyWithRetry(() => import('./pages/PastorOnboarding'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const Terms = lazyWithRetry(() => import('./pages/Terms'));
const Privacy = lazyWithRetry(() => import('./pages/Privacy'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));

// Loading component for lazy loaded pages - com skeleton específico por rota
const PageLoader = () => {
  const location = useLocation();
  const SkeletonComponent = getSkeletonForRoute(location.pathname);
  return <div className="page-loading-fallback">{React.createElement(SkeletonComponent)}</div>;
};

// Fallback simples para rotas sem skeleton mapeado
const SimpleLoader = () => (
  <div
    className="page-loading-fallback flex items-center justify-center min-h-screen"
    role="status"
    aria-live="polite"
  >
    <div
      className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
      aria-hidden="true"
    ></div>
    <span className="sr-only">Carregando...</span>
  </div>
);

/**
 * RouteErrorBoundary — Error Boundary que reseta automaticamente na troca de rota.
 *
 * Quando usado com key={location.pathname}, React desmonta e remonta este
 * componente a cada navegação, limpando qualquer estado de erro anterior.
 * Também força o Suspense interno a mostrar o fallback (e não conteúdo antigo/stale)
 * quando o React Router v7 usa startTransition para navegação.
 */
interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    uiLogger.error('Erro na rota:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Algo deu errado ao carregar esta página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Componente para prefetch de rotas críticas
const PrefetchManager = () => {
  usePrefetchOnMount();
  return null;
};

type RouteConfig = {
  path: string;
  element: JSX.Element;
};

const publicRoutes: RouteConfig[] = [
  { path: '/', element: <Login /> },
  { path: '/login', element: <Login /> },
  { path: '/first-access', element: <FirstAccessWelcome /> },
  { path: '/pastor-onboarding/:token', element: <PastorOnboarding /> },
  { path: '/termos', element: <Terms /> },
  { path: '/privacidade', element: <Privacy /> },
  { path: '*', element: <NotFound /> },
];

const protectedRoutes: RouteConfig[] = [
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/calendar', element: <Calendar /> },
  { path: '/menu', element: <Menu /> },
  { path: '/meu-cadastro', element: <MeuCadastro /> },
  { path: '/users', element: <Users /> },
  { path: '/interested', element: <Interested /> },
  { path: '/my-interested', element: <MyInterested /> },
  { path: '/chat', element: <Chat /> },
  { path: '/gamification', element: <Gamification /> },
  { path: '/prayers', element: <Prayers /> },
  { path: '/push-notifications', element: <PushNotifications /> },
  { path: '/notifications', element: <NotificationsHistory /> },
  { path: '/settings', element: <Settings /> },
  { path: '/tasks', element: <Tasks /> },
  { path: '/reports', element: <Reports /> },
  { path: '/my-reports', element: <Tasks /> },
  { path: '/contact', element: <Contact /> },
  { path: '/election-config', element: <ElectionConfig /> },
  { path: '/election-voting', element: <ElectionVoting /> },
  { path: '/election-dashboard', element: <ElectionDashboard /> },
  { path: '/elections', element: <UnifiedElection /> },
  { path: '/election-dashboard/:configId', element: <ElectionResults /> },
  { path: '/election-manage', element: <ElectionDashboard /> },
  { path: '/election-manage/:configId', element: <ElectionManage /> },
  { path: '/election-vote/:configId', element: <ElectionVotingMobile /> },
  { path: '/districts', element: <Districts /> },
  { path: '/pastors', element: <Pastors /> },
  { path: '/pastor-invites', element: <PastorInvites /> },
];

/**
 * RoutesWrapper — Componente que envolve Routes com ErrorBoundary e transição.
 *
 * A navegação SPA funciona sem problemas porque useTransitionNavigate
 * usa { flushSync: true }, que impede o React Router v7 de usar
 * startTransition (que mantinha conteúdo stale de rotas lazy-loaded).
 */
const RoutesWrapper = () => {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <div className="route-transition-wrapper">
          <Routes>
            {publicRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            {protectedRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<ProtectedRoute>{route.element}</ProtectedRoute>}
              />
            ))}
          </Routes>
        </div>
      </Suspense>
    </RouteErrorBoundary>
  );
};

// Create optimized query client - exportado para uso global (ex: limpar cache no login/logout)
export const queryClient = createQueryClient();

// Wrapper para sincronização do role do usuário com o sistema offline
function OfflineUserSync() {
  const { user } = useAuth();

  // Atualizar role do usuário para o sistema offline
  useEffect(() => {
    if (user) {
      setOfflineUserRole(user.role);
      cacheCurrentUser(user);
    } else {
      setOfflineUserRole(null);
    }
  }, [user]);

  return null; // Componente invisível, apenas para sincronização
}

// Export para uso no Header mobile
export { OfflineIndicator };

const App = () => {
  // Setup performance optimizations
  useEffect(() => {
    // Habilitar fetch offline global
    enableGlobalOfflineFetch();

    // Interceptar e suprimir erros de extensões do Chrome
    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      if (
        event.reason?.message?.includes('message channel closed') ||
        event.reason?.message?.includes('listener indicated an asynchronous response') ||
        event.reason?.message?.includes('Extension context invalidated')
      ) {
        uiLogger.warn('Erro de extensão do Chrome suprimido:', event.reason?.message);
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Interceptar erros globais de extensões
    const handleError = (event: ErrorEvent): void => {
      if (
        event.message?.includes('message channel closed') ||
        event.message?.includes('listener indicated an asynchronous response') ||
        event.message?.includes('Extension context invalidated')
      ) {
        uiLogger.warn('Erro de extensão do Chrome suprimido:', event.message);
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Adicionar listeners globais
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Clean console logs in production
    cleanConsoleInProduction();

    // Setup performance listeners
    setupPerformanceListeners(queryClient);

    // Prefetch important data
    prefetchImportantData(queryClient);

    // Cleanup old cache every 30 minutes
    const cleanupInterval = setInterval(
      () => {
        // Limpar queries antigas do cache
        queryClient
          .getQueryCache()
          .getAll()
          .forEach((query) => {
            const queryAge = Date.now() - query.state.dataUpdatedAt;
            // Se a query tem mais de 30 minutos e não está sendo usada, remover
            if (queryAge > 30 * 60 * 1000 && query.getObserversCount() === 0) {
              queryClient.removeQueries({ queryKey: query.queryKey });
            }
          });
      },
      30 * 60 * 1000
    );

    // Expor função de teste offline no window para debug
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).testOfflineData = testOfflineData;
    }

    return () => {
      // Remover listeners
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      clearInterval(cleanupInterval);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ModalProvider>
              {/* Skip Link para acessibilidade - permite pular navegação */}
              <SkipLink targetId="main-content" />
              <Sonner />
              <OfflineUserSync />
              <BrowserRouter>
                {/* Prefetch de rotas críticas */}
                <PrefetchManager />
                {/* Anunciador de rota para leitores de tela */}
                <RouteAnnouncer />
                <Suspense fallback={<SimpleLoader />}>
                  {/* Main content wrapper com id para o skip link */}
                  <main id="main-content" role="main" tabIndex={-1}>
                    <RoutesWrapper />
                  </main>
                </Suspense>
              </BrowserRouter>
            </ModalProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
