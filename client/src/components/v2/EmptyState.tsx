import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { CardV2 } from './CardV2';

interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  copy: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = ({ illustration, title, copy, cta }: EmptyStateProps) => (
  <CardV2 className="text-center">
    <div className="mx-auto flex max-w-[34rem] flex-col items-center gap-3 py-2">
      {illustration ? (
        <div
          className="flex h-14 w-14 items-center justify-center rounded-[1.1rem] text-[var(--v2-blue)]"
          style={{ background: 'color-mix(in oklab, var(--v2-blue) 14%, transparent)' }}
        >
          {illustration}
        </div>
      ) : null}
      <h2 className="v2-heading text-[1.15rem] text-[var(--v2-text)]">{title}</h2>
      <p className="prose-narrow text-sm text-[var(--v2-text-2)]">{copy}</p>
      {cta ? (
        <Button className="mt-1 rounded-full px-4" onClick={cta.onClick}>
          {cta.label}
        </Button>
      ) : null}
    </div>
  </CardV2>
);
