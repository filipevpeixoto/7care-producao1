/**
 * Utilidades de Acessibilidade
 * Helpers para melhorar a acessibilidade da aplicação
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook para gerenciar foco em modais
 * Trap de foco dentro do modal e restaura foco ao fechar
 */
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Salvar elemento com foco anterior
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focar no primeiro elemento focável do modal
      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    } else {
      // Restaurar foco ao fechar
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    
    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (!focusableElements || focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  return { containerRef, handleKeyDown };
}

/**
 * Hook para navegação por teclado em listas
 */
export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  onSelect?: (index: number) => void
) {
  const currentIndex = useRef(0);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        currentIndex.current = Math.min(currentIndex.current + 1, items.length - 1);
        items[currentIndex.current]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        currentIndex.current = Math.max(currentIndex.current - 1, 0);
        items[currentIndex.current]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        currentIndex.current = 0;
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        currentIndex.current = items.length - 1;
        items[items.length - 1]?.focus();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.(currentIndex.current);
        break;
    }
  }, [items, onSelect]);

  return { currentIndex, handleKeyDown };
}

/**
 * Hook para anunciar mudanças para leitores de tela
 */
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.setAttribute('class', 'sr-only');
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    // Remover após anúncio
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }, []);

  return { announce };
}

/**
 * Hook para detectar preferência de movimento reduzido
 */
export function usePrefersReducedMotion(): boolean {
  const mediaQuery = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  return mediaQuery?.matches ?? false;
}

/**
 * Props de acessibilidade para botões
 */
export interface AccessibleButtonProps {
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-controls'?: string;
  role?: 'button' | 'menuitem' | 'tab';
  tabIndex?: number;
}

/**
 * Gera props de acessibilidade para botões de ação
 */
export function getButtonA11yProps(options: {
  label: string;
  description?: string;
  isToggle?: boolean;
  isPressed?: boolean;
  controls?: string;
  hasPopup?: boolean | 'menu' | 'listbox' | 'dialog';
  isExpanded?: boolean;
}): AccessibleButtonProps {
  const props: AccessibleButtonProps = {
    'aria-label': options.label,
    tabIndex: 0,
  };

  if (options.description) {
    props['aria-describedby'] = options.description;
  }

  if (options.isToggle) {
    props['aria-pressed'] = options.isPressed;
  }

  if (options.controls) {
    props['aria-controls'] = options.controls;
  }

  if (options.hasPopup) {
    props['aria-haspopup'] = options.hasPopup;
  }

  if (options.isExpanded !== undefined) {
    props['aria-expanded'] = options.isExpanded;
  }

  return props;
}

/**
 * Props de acessibilidade para listas
 */
export function getListA11yProps(options: {
  label: string;
  multiselectable?: boolean;
  orientation?: 'horizontal' | 'vertical';
}) {
  return {
    role: 'listbox' as const,
    'aria-label': options.label,
    'aria-multiselectable': options.multiselectable,
    'aria-orientation': options.orientation || 'vertical',
  };
}

/**
 * Props de acessibilidade para item de lista
 */
export function getListItemA11yProps(options: {
  isSelected?: boolean;
  position: number;
  setSize: number;
  label?: string;
}) {
  return {
    role: 'option' as const,
    'aria-selected': options.isSelected,
    'aria-posinset': options.position,
    'aria-setsize': options.setSize,
    'aria-label': options.label,
    tabIndex: options.isSelected ? 0 : -1,
  };
}

/**
 * Skip link para navegação por teclado
 */
export function SkipLink({ href = '#main-content', children = 'Pular para o conteúdo principal' }: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
    >
      {children}
    </a>
  );
}

/**
 * Componente para texto visível apenas para leitores de tela
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}

/**
 * Componente de região live para anúncios
 */
export function LiveRegion({ 
  children, 
  priority = 'polite',
  atomic = true 
}: { 
  children: React.ReactNode;
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
}) {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
}

export default {
  useFocusTrap,
  useKeyboardNavigation,
  useAnnounce,
  usePrefersReducedMotion,
  getButtonA11yProps,
  getListA11yProps,
  getListItemA11yProps,
  SkipLink,
  VisuallyHidden,
  LiveRegion,
};
