import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

/**
 * Spinner de carregamento com tamanhos variáveis
 */
export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

/**
 * Overlay de carregamento para página inteira
 */
export function LoadingOverlay({ 
  message = 'Carregando...', 
  isVisible = true 
}: { 
  message?: string;
  isVisible?: boolean;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-card shadow-lg border animate-scale-in">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Indicador de carregamento inline para botões
 */
export function ButtonSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />;
}

/**
 * Loading com retry para erros de conexão
 */
export function LoadingWithRetry({
  isLoading,
  hasError,
  onRetry,
  loadingMessage = 'Carregando...',
  errorMessage = 'Erro ao carregar',
}: {
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  loadingMessage?: string;
  errorMessage?: string;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground">{loadingMessage}</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <WifiOff className="h-10 w-10 text-destructive" />
        <p className="text-sm text-destructive font-medium">{errorMessage}</p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  return null;
}

/**
 * Indicador de status de conexão
 */
export function ConnectionStatus({ isOnline }: { isOnline: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full transition-all',
        isOnline
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Conectado</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Sem conexão</span>
        </>
      )}
    </div>
  );
}

/**
 * Progress bar indeterminado
 */
export function IndeterminateProgress({ className }: { className?: string }) {
  return (
    <div className={cn('h-1 w-full bg-muted rounded-full overflow-hidden', className)}>
      <div className="h-full w-1/3 bg-primary rounded-full animate-[shimmer_1.5s_infinite]" />
    </div>
  );
}

/**
 * Dots animados para indicar carregamento
 */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

/**
 * Loading state para cards
 */
export function CardLoadingState({ 
  rows = 3,
  showAvatar = false,
  className 
}: { 
  rows?: number;
  showAvatar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('p-4 space-y-4 animate-pulse', className)}>
      {showAvatar && (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="space-y-1">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
        </div>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-muted rounded" style={{ width: `${Math.random() * 40 + 60}%` }} />
      ))}
    </div>
  );
}

export default {
  LoadingSpinner,
  LoadingOverlay,
  ButtonSpinner,
  LoadingWithRetry,
  ConnectionStatus,
  IndeterminateProgress,
  LoadingDots,
  CardLoadingState,
};
