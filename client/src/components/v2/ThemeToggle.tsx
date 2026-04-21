import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  tone?: 'onDark' | 'onLight';
  className?: string;
}

export const ThemeToggle = ({ tone = 'onDark', className }: ThemeToggleProps) => {
  const { isDark, toggleTheme } = useTheme();
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? 'Mudar para claro' : 'Mudar para escuro';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors',
        tone === 'onDark'
          ? 'bg-white/15 text-white hover:bg-white/25'
          : 'bg-[var(--p7-surface-2)] text-[var(--p7-text)] hover:bg-[var(--p7-surface-3)]',
        className
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
    </button>
  );
};
