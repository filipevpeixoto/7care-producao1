import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

export const Chip = ({ children, selected = false, onClick }: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'rounded-[var(--r-pill)] border px-3 py-1.5 text-xs font-semibold transition-colors',
      selected
        ? 'border-transparent text-white'
        : 'border-[var(--v2-border)] bg-[var(--v2-card)] text-[var(--v2-text-2)]'
    )}
    style={selected ? { background: 'var(--grad-h)' } : undefined}
  >
    {children}
  </button>
);
