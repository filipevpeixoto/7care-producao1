/* eslint-disable react-refresh/only-export-components */
import { ChevronRight, Lock, Mail, type LucideIcon } from 'lucide-react';

export const getInitials = (value?: string | null) =>
  (value || '7Care')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

export const formatShortDate = (value?: string | null) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const formatRelativeDate = (value?: string | null) => {
  if (!value) return 'há pouco';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'há pouco';
  const diff = Date.now() - date.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'hoje';
  if (diff < day * 2) return 'há 1 dia';
  if (diff < day * 7) return `há ${Math.floor(diff / day)} dias`;
  if (diff < day * 30)
    {return `há ${Math.floor(diff / (day * 7))} semana${diff >= day * 14 ? 's' : ''}`;}
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const monthLabel = (date: Date) =>
  date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

export const PrototypeStatusBar = (_props: { light?: boolean } = {}) => null;

export const PrototypeAvatar = ({
  name,
  className = '',
  solid = false,
}: {
  name?: string | null;
  className?: string;
  solid?: boolean;
}) => (
  <div className={`p7-avatar ${solid ? 'solid' : ''} ${className}`.trim()}>{getInitials(name)}</div>
);

export const PrototypeHeaderIconButton = ({
  icon: Icon,
  onClick,
  label = 'Ação rápida',
}: {
  icon: LucideIcon;
  onClick?: () => void;
  label?: string;
}) => {
  const className =
    'flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/15 text-white';

  if (!onClick) {
    return (
      <div className={className} aria-hidden="true">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.4} />
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={className}>
      <Icon className="h-[18px] w-[18px]" strokeWidth={2.4} />
    </button>
  );
};

export const PrototypeChevron = () => (
  <ChevronRight className="h-4 w-4 text-[var(--p7-text-3)]" strokeWidth={2} />
);

export const PrototypeInputGhost = ({
  icon: Icon,
  label,
}: {
  icon: typeof Mail | typeof Lock;
  label: string;
}) => (
  <div className="p7-search">
    <Icon className="h-4 w-4 text-white/50" strokeWidth={2} />
    <span className="text-[0.9rem] text-white/55">{label}</span>
  </div>
);
