import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CheckinBannerProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  cta: string;
  onClick: () => void;
  tone?: 'soft' | 'gold';
  className?: string;
}

export const CheckinBanner = ({
  icon,
  title,
  subtitle,
  cta,
  onClick,
  tone = 'soft',
  className,
}: CheckinBannerProps) => {
  const bg =
    tone === 'gold'
      ? 'var(--grad-gold)'
      : 'linear-gradient(135deg, color-mix(in oklab, var(--v2-blue) 18%, var(--v2-card)) 0%, var(--v2-card) 70%)';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-[var(--r-md)] border border-[var(--v2-border)] px-4 py-3 text-left transition-transform',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v2-gold)]',
        'hover:-translate-y-[1px]',
        className
      )}
      style={{ background: bg, boxShadow: 'var(--shadow-card)' }}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)]',
          tone === 'gold' ? 'bg-white/20 text-white' : 'bg-[var(--v2-card)] text-[var(--v2-blue)]'
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm font-semibold',
            tone === 'gold' ? 'text-white' : 'text-[var(--v2-text)]'
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            'mt-0.5 block text-[0.75rem]',
            tone === 'gold' ? 'text-white/80' : 'text-[var(--v2-text-3)]'
          )}
        >
          {subtitle}
        </span>
      </span>
      <span
        className={cn(
          'rounded-[var(--r-pill)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] transition-transform group-hover:translate-x-0.5',
          tone === 'gold'
            ? 'bg-white/20 text-white'
            : 'bg-[color-mix(in_oklab,var(--v2-blue)_18%,transparent)] text-[var(--v2-blue)]'
        )}
      >
        {cta}
      </span>
    </button>
  );
};
