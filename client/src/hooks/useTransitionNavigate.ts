/**
 * useTransitionNavigate - Navegação com View Transitions API
 *
 * Usa a View Transitions API nativa para transições suaves entre páginas.
 * Fallback para navigate() padrão em browsers sem suporte.
 *
 * IMPORTANTE: Usa flushSync para forçar atualização síncrona do DOM
 * dentro do callback do startViewTransition, caso contrário a
 * transição pode travar esperando mudanças no DOM que nunca chegam.
 */

import { useCallback } from 'react';
import { useNavigate, NavigateOptions } from 'react-router-dom';
import { flushSync } from 'react-dom';

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
          const transition = (document as any).startViewTransition(() => {
            // flushSync força o React a atualizar o DOM síncronamente.
            // Sem isso, o React batcha a atualização e a View Transition
            // fica travada esperando mudanças no DOM que nunca acontecem.
            flushSync(() => {
              navigate(to, options);
            });
          });
          // Prevenir que uma transição com erro bloqueie as próximas
          transition.finished?.catch(() => {});
          transition.ready?.catch(() => {});
          return;
        } catch {
          // Fallback: se startViewTransition ou flushSync falharem,
          // navegar diretamente
        }
      }
      // Navegação direta como fallback
      navigate(to, options);
    },
    [navigate]
  );

  return transitionNavigate;
}
