/**
 * Componentes e utilitários de acessibilidade WCAG 2.1 AA
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ==================== SKIP LINKS ====================

interface SkipLinksProps {
  links?: Array<{ id: string; label: string }>;
  className?: string;
}

/**
 * Skip Links - Permite usuários de teclado pular para o conteúdo principal
 */
export function SkipLinks({ 
  links = [
    { id: 'main-content', label: 'Ir para o conteúdo principal' },
    { id: 'main-navigation', label: 'Ir para a navegação' },
  ],
  className 
}: SkipLinksProps) {
  return (
    <nav 
      aria-label="Links de atalho"
      className={cn('sr-only focus-within:not-sr-only', className)}
    >
      <ul className="fixed top-0 left-0 z-[9999] flex flex-col gap-1 p-2 bg-background border shadow-lg">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={`#${link.id}`}
              className={cn(
                'block px-4 py-2 text-sm font-medium',
                'bg-primary text-primary-foreground rounded-md',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'transition-colors hover:bg-primary/90'
              )}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ==================== LIVE REGION ====================

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}

/**
 * Live Region - Anuncia mudanças dinâmicas para leitores de tela
 */
export function LiveRegion({ 
  message, 
  politeness = 'polite',
  atomic = true,
  relevant = 'additions'
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className="sr-only"
    >
      {message}
    </div>
  );
}

// ==================== VISUALLY HIDDEN ====================

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Visually Hidden - Esconde visualmente mas mantém acessível
 */
export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
}

// ==================== FOCUS TRAP ====================

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  returnFocusOnDeactivate?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
}

/**
 * Focus Trap - Mantém o foco dentro de um container (modais, dialogs)
 */
export function FocusTrap({ 
  children, 
  active = true,
  returnFocusOnDeactivate = true,
  initialFocus
}: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!active) return;

    // Salva o elemento focado anteriormente
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Move foco para o elemento inicial ou primeiro focável
    const focusFirstElement = () => {
      if (initialFocus?.current) {
        initialFocus.current.focus();
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = getFocusableElements(container);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    };

    focusFirstElement();

    return () => {
      // Retorna foco ao elemento anterior
      if (returnFocusOnDeactivate && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, initialFocus, returnFocusOnDeactivate]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (!active || event.key !== 'Tab') return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift + Tab no primeiro elemento -> vai pro último
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    // Tab no último elemento -> vai pro primeiro
    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }, [active]);

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}

// ==================== ACCESSIBLE ICON ====================

interface AccessibleIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  children: React.ReactNode;
}

/**
 * Accessible Icon - Wrapper que adiciona label acessível a ícones
 */
export function AccessibleIcon({ label, children, ...props }: AccessibleIconProps) {
  return (
    <span {...props} role="img" aria-label={label}>
      {children}
    </span>
  );
}

// ==================== KEYBOARD NAVIGATION ====================

interface UseKeyboardNavigationOptions {
  items: HTMLElement[];
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  onSelect?: (index: number) => void;
}

/**
 * Hook para navegação por teclado em listas
 */
export function useKeyboardNavigation({
  items,
  orientation = 'vertical',
  loop = true,
  onSelect,
}: UseKeyboardNavigationOptions) {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    const { key } = event;
    
    const isVertical = orientation === 'vertical' || orientation === 'both';
    const isHorizontal = orientation === 'horizontal' || orientation === 'both';

    let nextIndex = activeIndex;

    if ((key === 'ArrowDown' && isVertical) || (key === 'ArrowRight' && isHorizontal)) {
      event.preventDefault();
      nextIndex = loop 
        ? (activeIndex + 1) % items.length 
        : Math.min(activeIndex + 1, items.length - 1);
    } else if ((key === 'ArrowUp' && isVertical) || (key === 'ArrowLeft' && isHorizontal)) {
      event.preventDefault();
      nextIndex = loop 
        ? (activeIndex - 1 + items.length) % items.length 
        : Math.max(activeIndex - 1, 0);
    } else if (key === 'Home') {
      event.preventDefault();
      nextIndex = 0;
    } else if (key === 'End') {
      event.preventDefault();
      nextIndex = items.length - 1;
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      onSelect?.(activeIndex);
      return;
    }

    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
      items[nextIndex]?.focus();
    }
  }, [activeIndex, items, orientation, loop, onSelect]);

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
  };
}

// ==================== ANNOUNCE ====================

let announcer: HTMLElement | null = null;

/**
 * Anuncia uma mensagem para leitores de tela
 */
export function announce(message: string, politeness: 'polite' | 'assertive' = 'polite') {
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.setAttribute('aria-live', politeness);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
  }

  // Limpa e atualiza a mensagem
  announcer.textContent = '';
  setTimeout(() => {
    if (announcer) {
      announcer.textContent = message;
    }
  }, 100);
}

// ==================== REDUCEDMOTION ====================

/**
 * Hook para detectar preferência de movimento reduzido
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// ==================== HIGH CONTRAST ====================

/**
 * Hook para detectar modo de alto contraste
 */
export function usePrefersHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
}

// ==================== UTILITÁRIOS ====================

/**
 * Obtém todos os elementos focáveis dentro de um container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'audio[controls]',
    'video[controls]',
    '[contenteditable]:not([contenteditable="false"])',
  ].join(', ');

  const elements = container.querySelectorAll<HTMLElement>(focusableSelectors);
  return Array.from(elements).filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex >= 0
  );
}

/**
 * Gera ID único para associação de labels
 */
export function useId(prefix: string = 'id'): string {
  const id = React.useId();
  return `${prefix}-${id}`;
}

/**
 * HOC para adicionar props de acessibilidade
 */
export function withAccessibility<P extends object>(
  Component: React.ComponentType<P>,
  defaultAriaLabel?: string
) {
  return function AccessibleComponent(props: P & { 'aria-label'?: string }) {
    return (
      <Component 
        {...props} 
        aria-label={props['aria-label'] || defaultAriaLabel}
      />
    );
  };
}

// ==================== ACCESSIBLE TABLE ====================

interface AccessibleTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  caption?: string;
  summary?: string;
}

/**
 * Tabela acessível com caption e summary
 */
export const AccessibleTable = React.forwardRef<HTMLTableElement, AccessibleTableProps>(
  ({ caption, summary, children, ...props }, ref) => {
    return (
      <table ref={ref} {...props} aria-describedby={summary ? 'table-summary' : undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {summary && <p id="table-summary" className="sr-only">{summary}</p>}
        {children}
      </table>
    );
  }
);
AccessibleTable.displayName = 'AccessibleTable';

// ==================== FORM ERROR ====================

interface FormErrorProps {
  id: string;
  message?: string;
}

/**
 * Mensagem de erro de formulário acessível
 */
export function FormError({ id, message }: FormErrorProps) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className="text-sm font-medium text-destructive mt-1"
    >
      {message}
    </p>
  );
}

// ==================== LOADING STATE ====================

interface LoadingStateProps {
  isLoading: boolean;
  loadingMessage?: string;
  children: React.ReactNode;
}

/**
 * Wrapper que anuncia estado de carregamento
 */
export function LoadingState({ 
  isLoading, 
  loadingMessage = 'Carregando...', 
  children 
}: LoadingStateProps) {
  React.useEffect(() => {
    if (isLoading) {
      announce(loadingMessage, 'polite');
    }
  }, [isLoading, loadingMessage]);

  return (
    <>
      {isLoading && (
        <div 
          role="status" 
          aria-live="polite"
          className="sr-only"
        >
          {loadingMessage}
        </div>
      )}
      <div aria-busy={isLoading}>
        {children}
      </div>
    </>
  );
}
