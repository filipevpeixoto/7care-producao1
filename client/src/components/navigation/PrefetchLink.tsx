/**
 * PrefetchLink - Link com prefetch no hover para navegação mais rápida
 *
 * @module components/navigation/PrefetchLink
 * @description
 * - Pré-carrega a página ao hover (150ms delay)
 * - Suporta View Transitions API quando disponível
 * - Mantém compatibilidade com react-router-dom
 */

import { memo, useCallback, forwardRef } from 'react';
import { Link, type LinkProps, useNavigate } from 'react-router-dom';
import { usePrefetch } from '@/hooks/usePrefetch';
import { cn } from '@/lib/utils';

interface PrefetchLinkProps extends Omit<LinkProps, 'to'> {
  /** Rota de destino */
  to: string;
  /** Delay antes do prefetch (ms) */
  prefetchDelay?: number;
  /** Usar View Transitions API */
  viewTransition?: boolean;
  /** Classes adicionais */
  className?: string;
  /** Filhos do link */
  children: React.ReactNode;
}

/**
 * Verifica se o browser suporta View Transitions API
 */
const supportsViewTransitions = () =>
  typeof document !== 'undefined' && 'startViewTransition' in document;

/**
 * Link com prefetch automático no hover
 */
export const PrefetchLink = memo(
  forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
    (
      { to, prefetchDelay = 150, viewTransition = true, className, children, onClick, ...props },
      ref
    ) => {
      const { prefetchOnHover, cancelPrefetch } = usePrefetch();
      const navigate = useNavigate();

      const handleMouseEnter = useCallback(() => {
        prefetchOnHover(to, prefetchDelay);
      }, [to, prefetchDelay, prefetchOnHover]);

      const handleMouseLeave = useCallback(() => {
        cancelPrefetch();
      }, [cancelPrefetch]);

      const handleFocus = useCallback(() => {
        prefetchOnHover(to, prefetchDelay);
      }, [to, prefetchDelay, prefetchOnHover]);

      const handleClick = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement>) => {
          // Se houver onClick customizado, chamar primeiro
          if (onClick) {
            onClick(e);
          }

          // Se o evento foi prevenido, não navegar
          if (e.defaultPrevented) return;

          // Se View Transitions está habilitado e suportado
          if (viewTransition && supportsViewTransitions()) {
            e.preventDefault();

            // Usar View Transitions API
            (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
              navigate(to);
            });
          }
          // Caso contrário, deixar o Link normal fazer a navegação
        },
        [onClick, viewTransition, navigate, to]
      );

      return (
        <Link
          ref={ref}
          to={to}
          className={cn(className)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onClick={handleClick}
          {...props}
        >
          {children}
        </Link>
      );
    }
  )
);

PrefetchLink.displayName = 'PrefetchLink';

/**
 * NavLink com prefetch (para menus de navegação)
 */
interface PrefetchNavLinkProps extends PrefetchLinkProps {
  /** Classe quando ativo */
  activeClassName?: string;
  /** Verificar se está ativo */
  isActive?: boolean;
}

export const PrefetchNavLink = memo(
  forwardRef<HTMLAnchorElement, PrefetchNavLinkProps>(
    ({ activeClassName, isActive, className, ...props }, ref) => {
      return (
        <PrefetchLink ref={ref} className={cn(className, isActive && activeClassName)} {...props} />
      );
    }
  )
);

PrefetchNavLink.displayName = 'PrefetchNavLink';

export default PrefetchLink;
