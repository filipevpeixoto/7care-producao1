import { cn } from '@/lib/utils';

interface AvatarProps {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
} as const;

const getInitials = (name?: string | null) =>
  (name || '7care')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

const getGradient = (name?: string | null) => {
  const value = (name || '7care').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const hueA = 240 + (value % 18);
  const hueB = 70 + (value % 16);

  return `linear-gradient(135deg, oklch(0.34 0.11 ${hueA}) 0%, oklch(0.75 0.12 ${hueB}) 100%)`;
};

export const Avatar = ({ name, size = 'md', className }: AvatarProps) => (
  <div
    className={cn(
      'inline-flex items-center justify-center rounded-full font-bold text-white shadow-sm',
      sizeMap[size],
      className
    )}
    style={{ background: getGradient(name) }}
    aria-label={name || 'Avatar'}
  >
    {getInitials(name)}
  </div>
);
