/**
 * useTransitionNavigate - Navegação com View Transitions API
 *
 * Usa a View Transitions API nativa para transições suaves entre páginas.
 * Fallback para navigate() padrão em browsers sem suporte.
 */

import { useCallback } from 'react';
import { useNavigate, NavigateOptions } from 'react-router-dom';

/**
 * Hook que retorna uma função navigate com transições suaves.
 * Substitui useNavigate() e window.location.href para evitar
 * flashes/piscadas ao trocar de página.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();

  const transitionNavigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      // Tentar usar View Transitions API se disponível
      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        try {
          (document as any).startViewTransition(() => {
            navigate(to, options);
          });
          return;
        } catch {
          // Fallback silencioso
        }
      }
      // Navegação direta como fallback
      navigate(to, options);
    },
    [navigate]
  );

  return transitionNavigate;
}
