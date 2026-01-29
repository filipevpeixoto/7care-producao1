/**
 * Skip Link Component
 * Link de acessibilidade para pular navegação e ir direto ao conteúdo principal
 * @module components/accessibility/SkipLink
 */

import { cn } from '@/lib/utils';

interface SkipLinkProps {
  /** ID do elemento alvo para pular */
  targetId?: string;
  /** Texto do link */
  children?: React.ReactNode;
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * SkipLink - Link de acessibilidade para pular navegação
 *
 * Este componente é essencial para usuários de leitores de tela e
 * navegação por teclado. Permite pular diretamente para o conteúdo
 * principal sem navegar por todos os elementos do header/menu.
 *
 * @example
 * ```tsx
 * <SkipLink targetId="main-content">Pular para o conteúdo</SkipLink>
 * <header>...</header>
 * <main id="main-content">...</main>
 * ```
 */
export function SkipLink({
  targetId = 'main-content',
  children = 'Pular para o conteúdo principal',
  className,
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Posicionamento - escondido por padrão
        'fixed top-0 left-0 z-[9999]',
        // Estilo visual
        'bg-primary text-primary-foreground px-4 py-2 rounded-br-lg',
        'font-medium text-sm',
        // Transição suave
        'transform -translate-y-full transition-transform duration-200',
        // Visível apenas quando focado
        'focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        // Classes customizadas
        className
      )}
      // Acessibilidade
      aria-label={`${children}`}
    >
      {children}
    </a>
  );
}

export default SkipLink;
