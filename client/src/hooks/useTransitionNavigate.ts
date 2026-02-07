/**
 * useTransitionNavigate - Navegação com View Transitions API
 *
 * Usa a View Transitions API nativa para transições suaves entre páginas.
 * Fallback para navigate() padrão em browsers sem suporte.
 */

import { useCallback } from 'react';
import { useNavigate, NavigateOptions } from 'react-router-dom';

const supportsViewTransitions =
  typeof document !== 'undefined' && 'startViewTransition' in document;

/**
 * Hook que retorna uma função navigate com transições suaves.
 * Substitui useNavigate() e window.location.href para evitar
 * flashes/piscadas ao trocar de página.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();

  const transitionNavigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      if (supportsViewTransitions) {
        (document as any).startViewTransition(() => {
          navigate(to, options);
        });
      } else {
        navigate(to, options);
      }
    },
    [navigate]
  );

  return transitionNavigate;
}
