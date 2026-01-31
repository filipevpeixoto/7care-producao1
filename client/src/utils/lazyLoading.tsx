/**
 * Lazy Loading Utilities
 * Utilitários para carregamento preguiçoso de componentes e rotas
 * @module utils/lazyLoading
 */

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// =============================================================================
// Types
// =============================================================================

interface LazyComponentOptions {
  fallback?: React.ReactNode;
  preload?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

type LazyImport<T> = () => Promise<{ default: T }>;

// =============================================================================
// Default Loading Fallbacks
// =============================================================================

/**
 * Loading skeleton for page components
 */
export function PageLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

/**
 * Loading skeleton for card components
 */
export function CardLoadingSkeleton() {
  return (
    <div className="rounded-lg border p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <Skeleton className="h-10 w-24" />
    </div>
  );
}

/**
 * Loading skeleton for list items
 */
export function ListLoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading skeleton for table
 */
export function TableLoadingSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted p-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="p-4 flex gap-4 border-t">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Lazy Component Factory
// =============================================================================

/**
 * Creates a lazy-loaded component with retry logic and custom fallback
 */
export function createLazyComponent<T extends React.ComponentType<unknown>>(
  importFn: LazyImport<T>,
  options: LazyComponentOptions = {}
): React.LazyExoticComponent<T> {
  const { retryCount = 3, retryDelay = 1000, preload = false } = options;

  let importPromise: Promise<{ default: T }> | null = null;

  const retryImport = async (retriesLeft: number): Promise<{ default: T }> => {
    try {
      return await importFn();
    } catch (error) {
      if (retriesLeft > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return retryImport(retriesLeft - 1);
      }
      throw error;
    }
  };

  const lazyComponent = React.lazy(() => {
    if (!importPromise) {
      importPromise = retryImport(retryCount);
    }
    return importPromise;
  });

  // Preload if requested
  if (preload) {
    importPromise = retryImport(retryCount);
  }

  return lazyComponent;
}

// =============================================================================
// Lazy Route Definitions
// =============================================================================

/**
 * Route configuration for lazy loading
 */
interface LazyRouteConfig {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<unknown>>;
  fallback?: React.ReactNode;
  preload?: boolean;
}

/**
 * Creates lazy route configurations
 */
export function createLazyRoutes(
  routes: Array<{
    path: string;
    importFn: LazyImport<React.ComponentType<unknown>>;
    fallback?: React.ReactNode;
    preload?: boolean;
  }>
): LazyRouteConfig[] {
  return routes.map(({ path, importFn, fallback, preload }) => ({
    path,
    component: createLazyComponent(importFn, { preload }),
    fallback: fallback ?? <PageLoadingSkeleton />,
    preload,
  }));
}

// =============================================================================
// Preload Hook
// =============================================================================

/**
 * Hook to preload components on hover or focus
 */
export function usePreloadOnInteraction<T extends React.ComponentType<unknown>>(
  importFn: LazyImport<T>
) {
  const preloadedRef = React.useRef(false);

  const preload = React.useCallback(() => {
    if (!preloadedRef.current) {
      preloadedRef.current = true;
      importFn().catch(() => {
        // Reset on error to allow retry
        preloadedRef.current = false;
      });
    }
  }, [importFn]);

  const handlers = React.useMemo(
    () => ({
      onMouseEnter: preload,
      onFocus: preload,
      onTouchStart: preload,
    }),
    [preload]
  );

  return handlers;
}

// =============================================================================
// Intersection Observer Lazy Loading
// =============================================================================

interface LazyLoadOptions {
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
}

/**
 * Hook for lazy loading content when it enters the viewport
 */
export function useLazyLoad(options: LazyLoadOptions = {}) {
  const { rootMargin = '100px', threshold = 0, triggerOnce = true } = options;
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element || (triggerOnce && hasLoaded)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);
        if (visible && triggerOnce) {
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin, threshold, triggerOnce, hasLoaded]);

  return {
    ref: elementRef,
    isVisible: isVisible || hasLoaded,
    hasLoaded,
  };
}

/**
 * Component wrapper for lazy loading content
 */
interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  options?: LazyLoadOptions;
  className?: string;
  minHeight?: number | string;
}

export function LazyLoadWrapper({
  children,
  fallback,
  options,
  className,
  minHeight = 100,
}: LazyLoadWrapperProps) {
  const { ref, isVisible } = useLazyLoad(options);

  return (
    <div ref={ref} className={className} style={{ minHeight: isVisible ? undefined : minHeight }}>
      {isVisible ? children : fallback}
    </div>
  );
}

// =============================================================================
// Error Boundary for Lazy Components
// =============================================================================

interface LazyErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface LazyErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, retry: () => void) => React.ReactNode);
  onError?: (error: Error) => void;
}

export class LazyErrorBoundary extends React.Component<
  LazyErrorBoundaryProps,
  LazyErrorBoundaryState
> {
  constructor(props: LazyErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LazyErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.retry);
      }

      return (
        fallback ?? (
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-destructive">Erro ao carregar componente</p>
            <button
              onClick={this.retry}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Tentar novamente
            </button>
          </div>
        )
      );
    }

    return children;
  }
}

// =============================================================================
// Suspense Wrapper
// =============================================================================

interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SuspenseWrapper({ children, fallback }: SuspenseWrapperProps) {
  return (
    <LazyErrorBoundary>
      <React.Suspense fallback={fallback ?? <PageLoadingSkeleton />}>{children}</React.Suspense>
    </LazyErrorBoundary>
  );
}

// =============================================================================
// Named Exports for Common Lazy Pages
// =============================================================================

// Example usage:
// export const LazyDashboard = createLazyComponent(
//   () => import('@/pages/Dashboard'),
//   { preload: true }
// );

export default {
  createLazyComponent,
  createLazyRoutes,
  usePreloadOnInteraction,
  useLazyLoad,
  LazyLoadWrapper,
  LazyErrorBoundary,
  SuspenseWrapper,
  PageLoadingSkeleton,
  CardLoadingSkeleton,
  ListLoadingSkeleton,
  TableLoadingSkeleton,
};
