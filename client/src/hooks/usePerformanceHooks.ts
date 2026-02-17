/**
 * React Performance Hooks
 * Hooks otimizados para melhorar performance do frontend
 *
 * @module hooks/usePerformance
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { performanceLogger } from '@/lib/logger';

/**
 * Hook para debounce de valores
 * Útil para inputs de busca, filtros, etc.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para throttle de funções
 * Limita a frequência de execução
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  const throttled = useCallback(
    (...args: Parameters<T>) => {
      lastArgsRef.current = args;

      if (timeoutRef.current) return;

      timeoutRef.current = setTimeout(() => {
        const lastArgs = lastArgsRef.current;
        if (lastArgs) {
          fn(...lastArgs);
        }
        timeoutRef.current = null;
      }, delay);
    },
    [fn, delay]
  );

  return throttled as T;
}

/**
 * Hook para lazy loading de componentes pesados
 * Carrega apenas quando visível no viewport
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Desestruturar primitivos para deps estáveis (evita recriar observer a cada render)
  const { threshold = 0.1, rootMargin = '100px' } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, isIntersecting];
}

/**
 * Hook para detectar se componente está montado
 * Previne updates em componentes desmontados
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * Hook para memoização profunda
 * Compara objetos por valor usando referência estável
 */
export function useDeepMemo<T>(value: T): T {
  const serialized = JSON.stringify(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => value, [serialized]);
}

/**
 * Hook para previous value
 * Mantém o valor anterior de um state (sem re-render extra)
 */
export function usePrevious<T>(value: T): T | undefined {
  const [prev, setPrev] = useState<T | undefined>(undefined);
  const [current, setCurrent] = useState(value);

  if (!Object.is(current, value)) {
    setPrev(current);
    setCurrent(value);
  }

  return prev;
}

/**
 * Hook para window size com debounce
 */
export function useWindowSize(debounceMs: number = 100) {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, debounceMs);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [debounceMs]);

  return size;
}

/**
 * Hook para local storage com SSR safety
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      performanceLogger.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        performanceLogger.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

/**
 * Hook para media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Hook para prefetch de dados
 * Pré-carrega dados ao hover
 */
export function usePrefetch<T>(
  fetcher: () => Promise<T>,
  enabled: boolean = true
): { prefetch: () => void; data: T | null; isLoading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef(false);

  const prefetch = useCallback(() => {
    if (!enabled || fetchedRef.current || isLoading) return;

    setIsLoading(true);
    fetchedRef.current = true;

    fetcher()
      .then(setData)
      .catch(performanceLogger.error)
      .finally(() => setIsLoading(false));
  }, [fetcher, enabled, isLoading]);

  return { prefetch, data, isLoading };
}

/**
 * Hook para requestAnimationFrame
 * Útil para animações suaves (callback estável via ref)
 */
export function useAnimationFrame(callback: (deltaTime: number) => void): void {
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  // Atualiza a ref do callback sem recriar o loop de animação
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callbackRef.current(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);
}

// Constantes para breakpoints
export const BREAKPOINTS = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;

// Hook para breakpoints — usa um único listener de resize em vez de 5 matchMedia
export function useBreakpoint() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setWidth(window.innerWidth));
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return useMemo(
    () => ({
      isSm: width >= 640,
      isMd: width >= 768,
      isLg: width >= 1024,
      isXl: width >= 1280,
      is2Xl: width >= 1536,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
    }),
    [width]
  );
}

export default {
  useDebounce,
  useThrottle,
  useIntersectionObserver,
  useIsMounted,
  useDeepMemo,
  usePrevious,
  useWindowSize,
  useLocalStorage,
  useMediaQuery,
  usePrefetch,
  useAnimationFrame,
  useBreakpoint,
};
