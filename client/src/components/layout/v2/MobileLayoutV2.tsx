import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Grid2x2, RefreshCw } from 'lucide-react';
import { BottomNavV2 } from './BottomNavV2';
import { useAuth } from '@/hooks/useAuth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import {
  PrototypeAvatar,
  PrototypeHeaderIconButton,
  PrototypeStatusBar,
} from '@/pages/v2/prototypeShared';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { getV2PageMeta } from './pageMeta';

interface MobileLayoutV2Props {
  children: ReactNode;
  title?: string;
  showBottomNav?: boolean;
  fullscreen?: boolean;
  showBreadcrumbs?: boolean;
  variant?: 'bridge' | 'prototype';
}

export const MobileLayoutV2 = ({
  children,
  title,
  showBottomNav = true,
  fullscreen = false,
  showBreadcrumbs: _showBreadcrumbs = true,
  variant = 'bridge',
}: MobileLayoutV2Props) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const meta = getV2PageMeta(location.pathname, title, user?.role);

  const { containerRef, pullDistance, isRefreshing, progress } = usePullToRefresh({
    onRefresh: async () => {
      window.location.reload();
    },
    threshold: 80,
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="space-y-4 text-center">
          <div
            className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-primary/25 border-t-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (fullscreen) {
    return (
      <div ref={containerRef} className="min-h-screen bg-background text-foreground">
        <div
          className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center justify-center transition-all duration-200"
          style={{
            transform: `translateX(-50%) translateY(${pullDistance > 0 ? pullDistance - 24 : -44}px)`,
            opacity: pullDistance > 0 ? Math.min(pullDistance / 80, 1) : 0,
          }}
        >
          <div className="rounded-full border border-border bg-card p-2 text-primary shadow-lg shadow-primary/15">
            <RefreshCw
              className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${progress * 3.6}deg)` }}
            />
          </div>
        </div>

        <div className="min-h-screen animate-fade-in">{children}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground">
      <div
        className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center justify-center transition-all duration-200"
        style={{
          transform: `translateX(-50%) translateY(${pullDistance > 0 ? pullDistance - 24 : -44}px)`,
          opacity: pullDistance > 0 ? Math.min(pullDistance / 80, 1) : 0,
        }}
      >
        <div className="rounded-full border border-border bg-card p-2 text-primary shadow-lg shadow-primary/15">
          <RefreshCw
            className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${progress * 3.6}deg)` }}
          />
        </div>
      </div>

      {variant === 'prototype' ? (
        <div className="p7-stage p7-stage--prototype min-h-screen pb-[72px]">
          <div className="animate-fade-in w-full">{children}</div>
        </div>
      ) : (
        <div className="p7-stage p7-stage--bridge">
          <div className="p7-shell p7-bridge-shell route-page-shell">
            <div className="p7-screen">
              <PrototypeStatusBar />
              <div className="p7-grad-header p7-bridge-header">
                <div className="p7-header-row">
                  <div className="min-w-0">
                    <div className="p7-header-label">{meta.eyebrow}</div>
                    <div className="p7-header-title">{meta.title}</div>
                    <p className="p7-bridge-subtitle">{meta.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <PrototypeHeaderIconButton
                      icon={Grid2x2}
                      onClick={() => navigate('/menu')}
                      label="Abrir menu"
                    />
                    <PrototypeAvatar name={user?.name} className="h-10 w-10 text-[0.82rem]" />
                  </div>
                </div>
              </div>

              <div className="p7-scroll">
                <div className="p7-bridge animate-fade-in">{children}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBottomNav && <BottomNavV2 />}
    </div>
  );
};
