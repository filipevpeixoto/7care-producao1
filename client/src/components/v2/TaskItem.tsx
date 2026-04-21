import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pill } from './Pill';

interface TaskItemProps {
  title: string;
  meta: string;
  checked?: boolean;
  tone?: 'red' | 'gold' | 'blue' | 'neutral';
  onClick?: () => void;
}

export const TaskItem = ({
  title,
  meta,
  checked = false,
  tone = 'neutral',
  onClick,
}: TaskItemProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-start gap-3 rounded-[var(--r-sm)] border border-[var(--v2-border)] bg-[var(--v2-card)] px-4 py-3 text-left"
    style={{ boxShadow: 'var(--shadow-card)' }}
  >
    <span
      className={cn(
        'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[0.45rem] border text-white',
        checked ? 'border-transparent' : 'border-[var(--v2-border)] bg-transparent text-transparent'
      )}
      style={checked ? { background: 'var(--grad-h)' } : undefined}
    >
      <Check className="h-3.5 w-3.5" />
    </span>
    <div className="min-w-0 flex-1">
      <div
        className={cn(
          'text-sm font-semibold text-[var(--v2-text)]',
          checked ? 'line-through opacity-60' : ''
        )}
      >
        {title}
      </div>
      <div className="mt-0.5 text-[0.75rem] text-[var(--v2-text-3)]">{meta}</div>
    </div>
    <Pill tone={tone}>{tone === 'neutral' ? 'Tarefa' : tone}</Pill>
  </button>
);
