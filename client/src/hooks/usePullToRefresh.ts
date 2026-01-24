import { useEffect, useState, useCallback, useRef } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  enabled?: boolean;
}

export const usePullToRefresh = ({ 
  onRefresh, 
  threshold = 80,
  enabled = true 
}: PullToRefreshOptions) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startY = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return;
    
    // Verificar se o toque foi no menu inferior (não interferir)
    const target = e.target as HTMLElement;
    if (target.closest('nav') || target.closest('[role="navigation"]')) {
      return; // Ignorar toques no menu
    }
    
    // Só ativar se estiver no topo da página
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || !enabled || isRefreshing) return;
    
    // Verificar se o toque foi no menu inferior (não interferir)
    const target = e.target as HTMLElement;
    if (target.closest('nav') || target.closest('[role="navigation"]')) {
      setIsPulling(false);
      setPullDistance(0);
      return; // Ignorar toques no menu
    }
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;
    
    // Só permitir arrasto para baixo
    if (distance > 0) {
      // Aplicar resistência (quanto mais puxa, mais difícil fica)
      const resistance = distance < threshold ? distance : threshold + (distance - threshold) * 0.3;
      setPullDistance(resistance);
      
      // Prevenir scroll padrão quando está puxando
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, threshold, enabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || !enabled || isRefreshing) return;
    
    setIsPulling(false);
    
    // Se ultrapassou o threshold, executar refresh
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Erro ao atualizar:', error);
      } finally {
        // Delay para mostrar animação
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      // Voltar suavemente se não atingiu o threshold
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, onRefresh, enabled, isRefreshing]);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current || document.body;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enabled]);

  return {
    containerRef,
    isPulling,
    pullDistance,
    isRefreshing,
    // Calcular progresso em porcentagem
    progress: Math.min((pullDistance / threshold) * 100, 100),
  };
};

