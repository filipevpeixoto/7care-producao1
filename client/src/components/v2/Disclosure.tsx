import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DisclosureProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export const Disclosure = ({ title, subtitle, children, defaultOpen = false }: DisclosureProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-[var(--r-sm)] border border-[var(--v2-border)] bg-[var(--v2-card)]"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <div>
          <div className="text-sm font-semibold text-[var(--v2-text)]">{title}</div>
          {subtitle ? (
            <div className="mt-0.5 text-[0.75rem] text-[var(--v2-text-3)]">{subtitle}</div>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-[var(--v2-text-3)] transition-transform duration-200',
            open ? 'rotate-180' : ''
          )}
        />
      </button>
      <div className="disclosure-grid" data-open={open ? 'true' : 'false'}>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
};
