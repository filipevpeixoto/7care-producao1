import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  gradient?: boolean;
  className?: string;
}

export const PageHeader = ({
  title,
  subtitle,
  action,
  gradient = false,
  className,
}: PageHeaderProps) => (
  <header
    className={cn(
      'flex items-start justify-between gap-4 rounded-[var(--r-md)] px-5 py-4',
      gradient
        ? 'text-white'
        : 'border border-[var(--v2-border)] bg-[var(--v2-card)] text-[var(--v2-text)]',
      className
    )}
    style={gradient ? { background: 'var(--grad-h)', boxShadow: 'var(--shadow-hover)' } : undefined}
  >
    <div className="min-w-0">
      <h1 className="v2-heading text-[var(--fs-title)] leading-[var(--lh-tight)]">{title}</h1>
      {subtitle ? (
        <p
          className={cn(
            'mt-1 max-w-[65ch] text-sm',
            gradient ? 'text-white/72' : 'text-[var(--v2-text-2)]'
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </header>
);
