/**
 * useTransitionNavigate - Navegação SPA suave sem conteúdo stale
 *
 * Wrapper sobre useNavigate() que adiciona { flushSync: true }.
 *
 * PROBLEMA: React Router v7 envolve navigate() em React.startTransition().
 * Com rotas lazy-loaded, o React mantém o conteúdo ANTIGO visível enquanto
 * o novo componente carrega ("pending UI"). Resultado: URL muda mas a
 * página não troca — fica presa no conteúdo anterior.
 *
 * SOLUÇÃO: { flushSync: true } faz React Router usar ReactDOM.flushSync()
 * em vez de startTransition. Isso força React a desmontar a página antiga
 * imediatamente e mostrar o Suspense fallback enquanto o chunk carrega.
 */

import { useCallback } from 'react';
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';

type ViewTransitionCapableDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
  };
};

export function useTransitionNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      const doc = document as ViewTransitionCapableDocument;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (typeof to === 'number') {
        navigate(to);
        return;
      }

      if (!doc.startViewTransition || prefersReducedMotion) {
        navigate(to, { ...options, flushSync: true });
        return;
      }

      doc.startViewTransition(() => {
        navigate(to, { ...options, flushSync: true });
      });
    },
    [navigate]
  );
}
