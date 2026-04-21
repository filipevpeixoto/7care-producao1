import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RowItemProps {
  avatar?: ReactNode;
  title: string;
  sub?: string;
  right?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export const RowItem = ({ avatar, title, sub, right, onClick, className }: RowItemProps) => {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[var(--r-sm)] border border-[var(--v2-border)] bg-[var(--v2-card)] px-4 py-3 text-left',
        className
      )}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {avatar ? <div className="shrink-0">{avatar}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[var(--v2-text)]">{title}</div>
        {sub ? <div className="mt-0.5 text-[0.75rem] text-[var(--v2-text-3)]">{sub}</div> : null}
      </div>
      {right ?? (onClick ? <ChevronRight className="h-4 w-4 text-[var(--v2-text-3)]" /> : null)}
    </Comp>
  );
};
