import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { PERFORMANCE_CONFIG } from '@/lib/performance';

// Hook para debounce
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = PERFORMANCE_CONFIG.debounce.search
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

// Hook para throttle
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  limit: number = 100
) => {
  const inThrottle = useRef(false);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args);
        inThrottle.current = true;
        setTimeout(() => {
          inThrottle.current = false;
        }, limit);
      }
    },
    [callback, limit]
  );

  return throttledCallback;
};

// Hook para lazy loading de imagens
export const useLazyImage = (src: string, placeholder?: string) => {
  const [imageSrc, setImageSrc] = useState(placeholder || src);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setError(true);
      setIsLoading(false);
    };
  }, [src]);

  return { imageSrc, isLoading, error };
};

// Hook para otimizar re-renders
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
) => {
  return useCallback(callback, deps);
};

// Hook para otimizar valores computados
export const useOptimizedValue = <T>(value: T, deps: React.DependencyList): T => {
  return useMemo(() => value, deps);
};

// Hook para detectar mudanças de tamanho da tela com throttle
export const useResizeObserver = (callback: (entries: ResizeObserverEntry[]) => void) => {
  const throttledCallback = useThrottle(callback, PERFORMANCE_CONFIG.debounce.resize);
  
  useEffect(() => {
    const resizeObserver = new ResizeObserver(throttledCallback);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [throttledCallback]);
};

// Hook para otimizar scroll com throttle
export const useScrollThrottle = (callback: (event: Event) => void, delay: number = 16) => {
  const throttledCallback = useThrottle(callback, delay);
  
  useEffect(() => {
    window.addEventListener('scroll', throttledCallback, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', throttledCallback);
    };
  }, [throttledCallback]);
};

// Hook para otimizar mudanças de tema
export const useThemeOptimization = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mediaQuery.matches ? 'dark' : 'light');
    
    const handler = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return theme;
};

// Hook para otimizar performance de listas
export const useListOptimization = <T>(
  items: T[],
  itemHeight: number = PERFORMANCE_CONFIG.virtualization.itemHeight,
  overscan: number = PERFORMANCE_CONFIG.virtualization.overscan
) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    
    setVisibleRange({ start: Math.max(0, start - overscan), end });
  }, [items.length, itemHeight, overscan]);
  
  const throttledUpdateRange = useThrottle(updateVisibleRange, 16);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return () => {};
    }

    container.addEventListener('scroll', throttledUpdateRange, { passive: true });
    updateVisibleRange();

    return () => {
      container.removeEventListener('scroll', throttledUpdateRange);
    };
  }, [throttledUpdateRange, updateVisibleRange]);
  
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;
  
  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    visibleRange,
  };
};

