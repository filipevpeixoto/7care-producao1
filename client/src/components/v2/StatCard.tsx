import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatTone = 'navy' | 'soft' | 'gold' | 'red';

const toneMap: Record<StatTone, { className: string; style?: CSSProperties }> = {
  gold: { className: 'text-white', style: { background: 'var(--grad-gold)' } },
  navy: { className: 'text-white', style: { background: 'var(--grad-h)' } },
  red: {
    className: 'text-[var(--v2-danger)]',
    style: { background: 'color-mix(in oklab, var(--v2-danger) 12%, var(--v2-card))' },
  },
  soft: { className: 'text-[var(--v2-text)] bg-[var(--v2-card)]' },
};

interface StatCardProps {
  value: ReactNode;
  label: ReactNode;
  tone?: StatTone;
}

export const StatCard = ({ value, label, tone = 'soft' }: StatCardProps) => (
  <div
    className={cn(
      'min-w-[10rem] rounded-[var(--r-sm)] border border-[var(--v2-border)] px-4 py-3',
      toneMap[tone].className
    )}
    style={{
      boxShadow: 'var(--shadow-card)',
      containerType: 'inline-size',
      ...toneMap[tone].style,
    }}
  >
    <div className="v2-heading text-[1.85rem] leading-none font-extrabold">{value}</div>
    <div
      className={cn(
        'mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.06em]',
        tone === 'soft' || tone === 'red' ? 'text-[var(--v2-text-2)]' : 'text-white/72'
      )}
    >
      {label}
    </div>
  </div>
);

export const StatStrip = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('flex gap-3 overflow-x-auto pb-1 scrollbar-hide', className)}>{children}</div>
);
