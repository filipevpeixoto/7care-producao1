import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { useAuth } from '@/hooks/useAuth';
import { WelcomeTour } from '@/components/welcome-tour';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const TOUR_COMPLETED_KEY = '7care_welcome_tour_completed';

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showTour, setShowTour] = useState(false);

  // Check if user should see the welcome tour
  useEffect(() => {
    if (user && user.role === 'pastor') {
      const tourCompleted = localStorage.getItem(`${TOUR_COMPLETED_KEY}_${user.id}`);
      if (!tourCompleted) {
        // Small delay to let the dashboard render first
        const timer = setTimeout(() => {
          setShowTour(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const handleTourComplete = () => {
    if (user) {
      localStorage.setItem(`${TOUR_COMPLETED_KEY}_${user.id}`, 'true');
    }
    setShowTour(false);
  };

  const handleTourSkip = () => {
    if (user) {
      localStorage.setItem(`${TOUR_COMPLETED_KEY}_${user.id}`, 'true');
    }
    setShowTour(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <div className="animate-fade-in">{children}</div>
          </main>
        </div>
      </div>

      {/* Welcome Tour for new pastors */}
      {showTour && (
        <WelcomeTour
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
          userName={user?.name}
        />
      )}
    </SidebarProvider>
  );
};
