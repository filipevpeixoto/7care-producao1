import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PillTone = 'red' | 'gold' | 'blue' | 'neutral' | 'green';

const toneMap: Record<PillTone, string> = {
  blue: 'bg-[color-mix(in_oklab,var(--v2-blue)_14%,transparent)] text-[var(--v2-blue)]',
  gold: 'bg-[color-mix(in_oklab,var(--v2-gold)_16%,transparent)] text-[var(--v2-gold)]',
  green: 'bg-[color-mix(in_oklab,var(--v2-success)_16%,transparent)] text-[var(--v2-success)]',
  neutral: 'bg-[var(--v2-surface-2)] text-[var(--v2-text-2)]',
  red: 'bg-[color-mix(in_oklab,var(--v2-danger)_14%,transparent)] text-[var(--v2-danger)]',
};

export interface PillProps {
  children: ReactNode;
  tone?: PillTone;
  className?: string;
}

export const Pill = ({ children, tone = 'neutral', className }: PillProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-[var(--r-pill)] px-2.5 py-1 text-[0.7rem] font-semibold',
      toneMap[tone],
      className
    )}
  >
    {children}
  </span>
);
