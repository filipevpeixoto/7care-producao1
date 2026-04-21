import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardV2Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export const CardV2 = ({ children, className, padded = true, style, ...props }: CardV2Props) => (
  <section
    className={cn(
      'rounded-[var(--r-md)] border border-[var(--v2-border)] bg-[var(--v2-card)]',
      padded ? 'p-4 md:p-5' : '',
      className
    )}
    style={{ boxShadow: 'var(--shadow-card)', containerType: 'inline-size', ...style }}
    {...props}
  >
    {children}
  </section>
);
