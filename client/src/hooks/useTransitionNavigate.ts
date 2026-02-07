/**
 * useTransitionNavigate - Navegação SPA sem recarregamento
 *
 * Wrapper simples sobre useNavigate() do React Router.
 * Garante navegação SPA (sem page reload) para transições suaves.
 *
 * Nota: View Transitions API (startViewTransition) foi removida
 * porque causa bloqueio de navegação com rotas lazy-loaded + Suspense:
 * quando a transição aborta, o browser restaura o DOM antigo mas o
 * React Router já atualizou a URL, resultando em URL nova + conteúdo antigo.
 */

import { useCallback } from 'react';
import { useNavigate, NavigateOptions } from 'react-router-dom';

/**
 * Hook que retorna uma função navigate para navegação SPA.
 * Substitui window.location.href para evitar page reloads.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: string, options?: NavigateOptions) => {
      navigate(to, options);
    },
    [navigate]
  );
}
