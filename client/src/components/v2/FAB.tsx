import type { ButtonHTMLAttributes } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FAB = ({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    className={cn(
      'fixed bottom-24 right-5 z-40 inline-flex h-14 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white lg:bottom-8',
      className
    )}
    style={{ background: 'var(--grad-h)', boxShadow: 'var(--shadow-hover)' }}
    {...props}
  >
    <Plus className="h-4 w-4" />
    {children}
  </button>
);
