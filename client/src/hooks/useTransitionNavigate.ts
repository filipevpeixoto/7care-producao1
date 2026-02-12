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
import { useNavigate, type NavigateOptions } from 'react-router-dom';

export function useTransitionNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: string, options?: NavigateOptions) => {
      navigate(to, { ...options, flushSync: true });
    },
    [navigate]
  );
}
