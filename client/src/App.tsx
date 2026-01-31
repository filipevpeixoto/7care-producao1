import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
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
import { useAuth } from './hooks/useAuth';
import {
  enableGlobalOfflineFetch,
  setOfflineUserRole,
  cacheCurrentUser,
  testOfflineData,
} from './lib/offline';
import { SkipLink } from './components/accessibility/SkipLink';

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
const PastorFirstAccess = lazy(() => import('./pages/PastorFirstAccess'));
const PastorOnboarding = lazy(() => import('./pages/PastorOnboarding'));
const Reports = lazy(() => import('./pages/Reports'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Loading component for lazy loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

// Create optimized query client
const queryClient = createQueryClient();

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
                <Suspense fallback={<PageLoader />}>
                  {/* Main content wrapper com id para o skip link */}
                  <main id="main-content" role="main" tabIndex={-1}>
                    <Routes>
                      <Route path="/" element={<Login />} />
                      <Route path="/first-access" element={<FirstAccessWelcome />} />
                      <Route path="/pastor-first-access" element={<PastorFirstAccess />} />
                      <Route path="/pastor-onboarding/:token" element={<PastorOnboarding />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/calendar" element={<Calendar />} />
                      <Route path="/menu" element={<Menu />} />
                      <Route path="/meu-cadastro" element={<MeuCadastro />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/interested" element={<Interested />} />
                      <Route path="/my-interested" element={<MyInterested />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/gamification" element={<Gamification />} />
                      <Route path="/prayers" element={<Prayers />} />
                      <Route path="/push-notifications" element={<PushNotifications />} />
                      <Route path="/notifications" element={<NotificationsHistory />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/tasks" element={<Tasks />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/my-reports" element={<Tasks />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/election-config" element={<ElectionConfig />} />
                      <Route path="/election-voting" element={<ElectionVoting />} />
                      <Route path="/election-dashboard" element={<ElectionDashboard />} />
                      <Route path="/elections" element={<UnifiedElection />} />
                      <Route path="/election-dashboard/:configId" element={<ElectionResults />} />
                      <Route path="/election-manage" element={<ElectionDashboard />} />
                      <Route path="/election-manage/:configId" element={<ElectionManage />} />
                      <Route path="/election-vote/:configId" element={<ElectionVotingMobile />} />
                      <Route path="/districts" element={<Districts />} />
                      <Route path="/pastors" element={<Pastors />} />
                      <Route path="/pastor-invites" element={<PastorInvites />} />
                      <Route path="/termos" element={<Terms />} />
                      <Route path="/privacidade" element={<Privacy />} />
                      {/* <Route path="/test-calendar" element={<TestCalendar />} /> */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
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
