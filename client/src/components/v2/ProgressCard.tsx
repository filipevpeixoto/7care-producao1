import { CardV2 } from './CardV2';

interface ProgressCardProps {
  title: string;
  valueLabel: string;
  helper?: string;
  progress: number;
}

export const ProgressCard = ({ title, valueLabel, helper, progress }: ProgressCardProps) => (
  <CardV2>
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="v2-heading text-sm uppercase tracking-[0.08em] text-[var(--v2-text-2)]">
        {title}
      </h3>
      <span className="text-sm font-semibold text-[var(--v2-blue)]">{valueLabel}</span>
    </div>
    <div className="mt-3 h-2.5 rounded-full bg-[var(--v2-surface-2)]">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(progress, 100))}%`, background: 'var(--grad-h)' }}
      />
    </div>
    {helper ? <p className="mt-2 text-xs text-[var(--v2-text-3)]">{helper}</p> : null}
  </CardV2>
);
