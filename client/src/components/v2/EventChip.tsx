import { Pill } from './Pill';

interface EventChipProps {
  title: string;
  date: Date;
  meta: string;
  tone?: 'blue' | 'gold' | 'neutral';
  onClick?: () => void;
}

export const EventChip = ({ title, date, meta, tone = 'blue', onClick }: EventChipProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-[var(--r-sm)] border border-[var(--v2-border)] bg-[var(--v2-card)] px-4 py-3 text-left"
    style={{ boxShadow: 'var(--shadow-card)' }}
  >
    <div
      className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[1rem] text-white"
      style={{ background: tone === 'gold' ? 'var(--grad-gold)' : 'var(--grad-h)' }}
    >
      <span className="text-sm font-extrabold leading-none">{date.getDate()}</span>
      <span className="text-[0.62rem] uppercase tracking-[0.08em]">
        {date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
      </span>
    </div>
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm font-semibold text-[var(--v2-text)]">{title}</div>
      <div className="truncate text-[0.75rem] text-[var(--v2-text-3)]">{meta}</div>
    </div>
    <Pill tone={tone === 'gold' ? 'gold' : tone === 'blue' ? 'blue' : 'neutral'}>Agenda</Pill>
  </button>
);
