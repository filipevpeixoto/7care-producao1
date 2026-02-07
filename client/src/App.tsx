import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useMemo } from 'react';
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

// Lazy load all pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Menu = lazy(() => import('./pages/Menu'));
const MeuCadastro = lazy(() => import('./pages/MeuCadastro'));
const Users = lazy(() => import('./pages/Users'));
const Interested = lazy(() => import('./pages/Interested'));
const Chat = lazy(() => import('./pages/Chat'));
const Settings = lazy(() => import('./pages/Settings'));
const Tasks = lazy(() => import('./pages/Tasks'));
const MyInterested = lazy(() => import('./pages/MyInterested'));
const Gamification = lazy(() => import('./pages/Gamification'));
const Prayers = lazy(() => import('./pages/Prayers'));
const PushNotifications = lazy(() => import('./pages/PushNotifications'));
const NotificationsHistory = lazy(() => import('./pages/NotificationsHistory'));
// const TestCalendar = lazy(() => import("./pages/TestCalendar")); // Arquivo removido
const Contact = lazy(() => import('./pages/Contact'));
const ElectionConfig = lazy(() => import('./pages/ElectionConfig'));
const ElectionVoting = lazy(() => import('./pages/ElectionVoting'));
const ElectionDashboard = lazy(() => import('./pages/ElectionDashboard'));
const ElectionResults = lazy(() => import('./pages/ElectionResults'));
const ElectionManage = lazy(() => import('./pages/ElectionManage'));
const ElectionVotingMobile = lazy(() => import('./pages/ElectionVotingMobile'));
const UnifiedElection = lazy(() => import('./pages/UnifiedElection'));
const Districts = lazy(() => import('./pages/Districts'));
const Pastors = lazy(() => import('./pages/Pastors'));
const PastorInvites = lazy(() => import('./pages/PastorInvites'));
const PastorOnboarding = lazy(() => import('./pages/PastorOnboarding'));
const Reports = lazy(() => import('./pages/Reports'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Loading component for lazy loaded pages - com skeleton específico por rota
const PageLoader = () => {
  const location = useLocation();
  const SkeletonComponent = useMemo(
    () => getSkeletonForRoute(location.pathname),
    [location.pathname]
  );
  return (
    <div className="page-loading-fallback">
      <SkeletonComponent />
    </div>
  );
};

// Fallback simples para rotas sem skeleton mapeado
const SimpleLoader = () => (
  <div className="page-loading-fallback flex items-center justify-center min-h-screen" role="status" aria-live="polite">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-hidden="true"></div>
    <span className="sr-only">Carregando...</span>
  </div>
);

// Componente para prefetch de rotas críticas
const PrefetchManager = () => {
  usePrefetchOnMount();
  return null;
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
          .forEach(query => {
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
      (window as any).testOfflineData = testOfflineData;
      console.log(
        '🔍 Debug disponível: execute window.testOfflineData() para testar dados offline'
      );
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
              <Toaster />
              <Sonner />
              <OfflineUserSync />
              <BrowserRouter>
                {/* Prefetch de rotas críticas */}
                <PrefetchManager />
                {/* Anunciador de rota para leitores de tela */}
                <RouteAnnouncer />
                <Suspense fallback={<SimpleLoader />}>
                  {/* Main content wrapper com id para o skip link e View Transition */}
                  <main
                    id="main-content"
                    role="main"
                    tabIndex={-1}
                    data-view-transition="main-content"
                  >
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Login />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/first-access" element={<FirstAccessWelcome />} />
                        <Route path="/pastor-onboarding/:token" element={<PastorOnboarding />} />
                        {/* Rotas protegidas — requerem autenticação */}
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                        <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
                        <Route path="/meu-cadastro" element={<ProtectedRoute><MeuCadastro /></ProtectedRoute>} />
                        <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
                        <Route path="/interested" element={<ProtectedRoute><Interested /></ProtectedRoute>} />
                        <Route path="/my-interested" element={<ProtectedRoute><MyInterested /></ProtectedRoute>} />
                        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                        <Route path="/gamification" element={<ProtectedRoute><Gamification /></ProtectedRoute>} />
                        <Route path="/prayers" element={<ProtectedRoute><Prayers /></ProtectedRoute>} />
                        <Route path="/push-notifications" element={<ProtectedRoute><PushNotifications /></ProtectedRoute>} />
                        <Route path="/notifications" element={<ProtectedRoute><NotificationsHistory /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                        <Route path="/my-reports" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                        <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
                        <Route path="/election-config" element={<ProtectedRoute><ElectionConfig /></ProtectedRoute>} />
                        <Route path="/election-voting" element={<ProtectedRoute><ElectionVoting /></ProtectedRoute>} />
                        <Route path="/election-dashboard" element={<ProtectedRoute><ElectionDashboard /></ProtectedRoute>} />
                        <Route path="/elections" element={<ProtectedRoute><UnifiedElection /></ProtectedRoute>} />
                        <Route path="/election-dashboard/:configId" element={<ProtectedRoute><ElectionResults /></ProtectedRoute>} />
                        <Route path="/election-manage" element={<ProtectedRoute><ElectionDashboard /></ProtectedRoute>} />
                        <Route path="/election-manage/:configId" element={<ProtectedRoute><ElectionManage /></ProtectedRoute>} />
                        <Route path="/election-vote/:configId" element={<ProtectedRoute><ElectionVotingMobile /></ProtectedRoute>} />
                        <Route path="/districts" element={<ProtectedRoute><Districts /></ProtectedRoute>} />
                        <Route path="/pastors" element={<ProtectedRoute><Pastors /></ProtectedRoute>} />
                        <Route path="/pastor-invites" element={<ProtectedRoute><PastorInvites /></ProtectedRoute>} />
                        <Route path="/termos" element={<Terms />} />
                        <Route path="/privacidade" element={<Privacy />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
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
