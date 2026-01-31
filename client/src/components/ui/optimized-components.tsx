/**
 * Performance-Optimized Components
 * Componentes otimizados com React.memo, useMemo, e useCallback
 * @module components/ui/optimized
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Skeleton } from './skeleton';

// =============================================================================
// Optimized Card Component
// =============================================================================

interface OptimizedCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const OptimizedCard = React.memo(function OptimizedCard({
  title,
  description,
  children,
  className,
  badge,
  badgeVariant = 'default',
  icon,
  onClick,
}: OptimizedCardProps) {
  const handleClick = React.useCallback(() => {
    onClick?.();
  }, [onClick]);

  const cardContent = React.useMemo(
    () => (
      <>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
        </CardHeader>
        <CardContent>
          {description && <CardDescription className="mb-2">{description}</CardDescription>}
          {children}
        </CardContent>
      </>
    ),
    [title, description, children, badge, badgeVariant, icon]
  );

  return (
    <Card
      className={cn('transition-shadow hover:shadow-md', onClick && 'cursor-pointer', className)}
      onClick={onClick ? handleClick : undefined}
    >
      {cardContent}
    </Card>
  );
});

OptimizedCard.displayName = 'OptimizedCard';

// =============================================================================
// Optimized User Avatar
// =============================================================================

interface OptimizedAvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const statusClasses = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

export const OptimizedAvatar = React.memo(function OptimizedAvatar({
  src,
  name,
  size = 'md',
  showStatus = false,
  status = 'offline',
  className,
}: OptimizedAvatarProps) {
  const initials = React.useMemo(() => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [name]);

  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size], className)}>
        {src && <AvatarImage src={src} alt={name} loading="lazy" />}
        <AvatarFallback delayMs={src ? 600 : 0}>{initials}</AvatarFallback>
      </Avatar>
      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
            size === 'sm' ? 'h-2 w-2' : 'h-3 w-3',
            statusClasses[status]
          )}
        />
      )}
    </div>
  );
});

OptimizedAvatar.displayName = 'OptimizedAvatar';

// =============================================================================
// Optimized List Item
// =============================================================================

interface OptimizedListItemProps {
  id: string | number;
  title: string;
  subtitle?: string;
  avatar?: string | null;
  avatarName?: string;
  rightContent?: React.ReactNode;
  onClick?: (id: string | number) => void;
  className?: string;
  isSelected?: boolean;
}

export const OptimizedListItem = React.memo(
  function OptimizedListItem({
    id,
    title,
    subtitle,
    avatar,
    avatarName,
    rightContent,
    onClick,
    className,
    isSelected = false,
  }: OptimizedListItemProps) {
    const handleClick = React.useCallback(() => {
      onClick?.(id);
    }, [onClick, id]);

    return (
      <div
        className={cn(
          'flex items-center gap-4 rounded-lg border p-4 transition-colors',
          onClick && 'cursor-pointer hover:bg-muted/50',
          isSelected && 'bg-muted border-primary',
          className
        )}
        onClick={onClick ? handleClick : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {(avatar !== undefined || avatarName) && (
          <OptimizedAvatar src={avatar} name={avatarName || title} size="md" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{title}</p>
          {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
        </div>
        {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.id === nextProps.id &&
      prevProps.title === nextProps.title &&
      prevProps.subtitle === nextProps.subtitle &&
      prevProps.avatar === nextProps.avatar &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.rightContent === nextProps.rightContent
    );
  }
);

OptimizedListItem.displayName = 'OptimizedListItem';

// =============================================================================
// Optimized Stats Card
// =============================================================================

interface OptimizedStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
  className?: string;
}

export const OptimizedStatsCard = React.memo(function OptimizedStatsCard({
  title,
  value,
  description,
  icon,
  trend,
  isLoading = false,
  className,
}: OptimizedStatsCardProps) {
  const formattedValue = React.useMemo(() => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('pt-BR').format(value);
    }
    return value;
  }, [value]);

  const trendText = React.useMemo(() => {
    if (!trend) return null;
    const sign = trend.isPositive ? '+' : '';
    return `${sign}${trend.value}%`;
  }, [trend]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {trendText && (
              <span
                className={cn('font-medium', trend?.isPositive ? 'text-green-600' : 'text-red-600')}
              >
                {trendText}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
});

OptimizedStatsCard.displayName = 'OptimizedStatsCard';

// =============================================================================
// Optimized Data Table Row
// =============================================================================

interface OptimizedTableRowProps<T> {
  item: T;
  columns: Array<{
    key: keyof T | string;
    render?: (item: T) => React.ReactNode;
  }>;
  onClick?: (item: T) => void;
  isSelected?: boolean;
  className?: string;
}

export const OptimizedTableRow = React.memo(function OptimizedTableRow<
  T extends Record<string, unknown>,
>({ item, columns, onClick, isSelected = false, className }: OptimizedTableRowProps<T>) {
  const handleClick = React.useCallback(() => {
    onClick?.(item);
  }, [onClick, item]);

  const cells = React.useMemo(
    () =>
      columns.map((col, index) => {
        const value = col.render ? col.render(item) : String(item[col.key as keyof T] ?? '');
        return (
          <td key={index} className="px-4 py-3 text-sm">
            {value}
          </td>
        );
      }),
    [columns, item]
  );

  return (
    <tr
      className={cn(
        'border-b transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50',
        isSelected && 'bg-muted',
        className
      )}
      onClick={onClick ? handleClick : undefined}
    >
      {cells}
    </tr>
  );
}) as <T extends Record<string, unknown>>(props: OptimizedTableRowProps<T>) => React.JSX.Element;

// =============================================================================
// Optimized Search Input with Debounce
// =============================================================================

interface OptimizedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
}

export const OptimizedSearchInput = React.memo(function OptimizedSearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  debounceMs = 300,
  className,
  autoFocus = false,
}: OptimizedSearchInputProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  // Sync local value when external value changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new debounced callback
      timeoutRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn('relative', className)}>
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm',
          'ring-offset-background placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      />
    </div>
  );
});

OptimizedSearchInput.displayName = 'OptimizedSearchInput';

// =============================================================================
// Exports
// =============================================================================

export type {
  OptimizedCardProps,
  OptimizedAvatarProps,
  OptimizedListItemProps,
  OptimizedStatsCardProps,
  OptimizedTableRowProps,
  OptimizedSearchInputProps,
};
