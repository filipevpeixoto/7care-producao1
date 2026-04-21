import { Cake } from 'lucide-react';
import { Avatar } from './Avatar';
import { Pill } from './Pill';

interface BirthdayRowProps {
  name?: string | null;
  subtitle?: string;
  age?: number | null;
  onClick?: () => void;
}

export const BirthdayRow = ({ name, subtitle, age, onClick }: BirthdayRowProps) => {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[var(--r-sm)] border border-[var(--v2-border)] bg-[var(--v2-card)] px-4 py-3 text-left"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <Avatar name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--v2-text)]">
          {name || 'Membro'}
        </div>
        <div className="mt-0.5 truncate text-[0.72rem] text-[var(--v2-text-3)]">
          {subtitle || 'Aniversariante do dia'}
        </div>
      </div>
      <Pill tone="gold" className="gap-1.5">
        <Cake className="h-3 w-3" aria-hidden />
        {typeof age === 'number' ? `${age} anos` : 'Hoje'}
      </Pill>
    </Comp>
  );
};
