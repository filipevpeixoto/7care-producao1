import type { ReactNode } from 'react';
import { Avatar } from './Avatar';

interface GradHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  name?: string | null;
  actions?: ReactNode;
}

export const GradHeader = ({ eyebrow, title, subtitle, name, actions }: GradHeaderProps) => (
  <header
    className="relative overflow-hidden rounded-[var(--r-lg)] px-5 py-5 text-white"
    style={{ background: 'var(--grad-h)', boxShadow: 'var(--shadow-hover)' }}
  >
    <div className="relative z-[1] flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-white/55">
          {eyebrow}
        </div>
        <h1 className="v2-heading mt-1 text-[var(--fs-title)] leading-[var(--lh-tight)]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 max-w-[34ch] text-sm text-white/72">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <Avatar name={name} size="sm" />
      </div>
    </div>
  </header>
);
