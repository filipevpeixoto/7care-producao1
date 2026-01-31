import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        data-slot="textarea"
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 transition-all duration-200',
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
Textarea.displayName = 'Textarea';

export { Textarea };
