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
import { SkipLink } from './components/accessibility/SkipLink';
import { RouteAnnouncer } from './components/accessibility/RouteAnnouncer';
import { getSkeletonForRoute } from './components/ui/page-skeleton';
import { usePrefetchOnMount } from './hooks/usePrefetch';

// View Transitions CSS
import './styles/view-transitions.css';

// Retry wrapper for lazy imports — if a chunk fails to load (e.g. after deploy),
// retry once and then force-reload the page so the browser fetches the new assets.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(() =>
    importFn().catch((err) => {
      console.error('[LazyLoad] Chunk load failed, retrying…', err);
      return importFn().catch((retryErr) => {
        console.error('[LazyLoad] Retry also failed — reloading page', retryErr);
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
    console.error('🚨 Erro na rota:', error, info.componentStack);
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
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/first-access" element={<FirstAccessWelcome />} />
            <Route path="/pastor-onboarding/:token" element={<PastorOnboarding />} />
            {/* Rotas protegidas — requerem autenticação */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/menu"
              element={
                <ProtectedRoute>
                  <Menu />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meu-cadastro"
              element={
                <ProtectedRoute>
                  <MeuCadastro />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interested"
              element={
                <ProtectedRoute>
                  <Interested />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-interested"
              element={
                <ProtectedRoute>
                  <MyInterested />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gamification"
              element={
                <ProtectedRoute>
                  <Gamification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prayers"
              element={
                <ProtectedRoute>
                  <Prayers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/push-notifications"
              element={
                <ProtectedRoute>
                  <PushNotifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contact"
              element={
                <ProtectedRoute>
                  <Contact />
                </ProtectedRoute>
              }
            />
            <Route
              path="/election-config"
              element={
                <ProtectedRoute>
                  <ElectionConfig />
                </ProtectedRoute>
              }
            />
            <Route
              path="/election-voting"
              element={
                <ProtectedRoute>
                  <ElectionVoting />
                </ProtectedRoute>
              }
            />
            <Route
              path="/election-dashboard"
              element={
                <ProtectedRoute>
                  <ElectionDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/elections"
              element={
                <ProtectedRoute>
                  <UnifiedElection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/election-dashboard/:configId"
              element={
                <ProtectedRoute>
                  <ElectionResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/election-manage"
              element={
                <ProtectedRoute>
                  <ElectionDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/election-manage/:configId"
              element={
                <ProtectedRoute>
                  <ElectionManage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/election-vote/:configId"
              element={
                <ProtectedRoute>
                  <ElectionVotingMobile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/districts"
              element={
                <ProtectedRoute>
                  <Districts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pastors"
              element={
                <ProtectedRoute>
                  <Pastors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pastor-invites"
              element={
                <ProtectedRoute>
                  <PastorInvites />
                </ProtectedRoute>
              }
            />
            <Route path="/termos" element={<Terms />} />
            <Route path="/privacidade" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Suspense>
    </RouteErrorBoundary>
  );
};

// Create optimized query client - exportado para uso global (ex: limpar cache no login/logout)
// eslint-disable-next-line react-refresh/only-export-components
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
        console.warn('🔇 Erro de extensão do Chrome suprimido:', event.reason?.message);
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
        console.warn('🔇 Erro de extensão do Chrome suprimido:', event.message);
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
              <SkipLink targetId="main-content">Pular para o conteúdo principal</SkipLink>
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
