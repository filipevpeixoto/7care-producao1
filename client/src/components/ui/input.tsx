import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          'flex h-10 w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 md:text-sm transition-all duration-200',
          // Dark mode elegante
          'dark:bg-slate-800/50 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus-visible:ring-blue-500/50 dark:focus-visible:border-blue-500 dark:disabled:bg-slate-800',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
