/**
 * Focus Guard Component
 * Gerencia foco dentro de elementos modais
 * @module components/accessibility/FocusGuard
 */

import { useEffect, useRef, ReactNode } from 'react';

interface FocusGuardProps {
  /** Conteúdo do guard */
  children: ReactNode;
  /** Se o guard está ativo */
  active?: boolean;
  /** Callback quando usuário tenta sair do guard */
  onEscapeAttempt?: () => void;
  /** Restaurar foco ao desativar */
  restoreFocus?: boolean;
}

/**
 * FocusGuard - Mantém o foco dentro de um elemento
 *
 * Essencial para modais e diálogos acessíveis.
 * Impede que o foco saia do elemento enquanto ativo.
 *
 * @example
 * ```tsx
 * <FocusGuard active={isModalOpen} onEscapeAttempt={closeModal}>
 *   <div className="modal">
 *     <button>Fechar</button>
 *     <input placeholder="Email" />
 *   </div>
 * </FocusGuard>
 * ```
 */
export function FocusGuard({
  children,
  active = true,
  onEscapeAttempt,
  restoreFocus = true,
}: FocusGuardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Salva e restaura foco
  useEffect(() => {
    if (active) {
      // Salvar elemento focado anterior
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focar no primeiro elemento focável
      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    } else if (restoreFocus && previousFocusRef.current) {
      // Restaurar foco ao desativar
      previousFocusRef.current.focus();
    }
  }, [active, restoreFocus]);

  // Listener de teclado para trap de foco
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape - chamar callback
      if (event.key === 'Escape' && onEscapeAttempt) {
        onEscapeAttempt();
        return;
      }

      // Tab - trap de foco
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Shift + Tab no primeiro elemento -> vai para o último
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        // Tab no último elemento -> vai para o primeiro
        else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscapeAttempt]);

  return (
    <div ref={containerRef} data-focus-guard={active ? 'true' : 'false'}>
      {children}
    </div>
  );
}

/**
 * Obtém todos os elementos focáveis dentro de um container
 */
function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];

  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
    el => el.offsetParent !== null
  ); // Filtra elementos visíveis
}

export default FocusGuard;
