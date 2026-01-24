import * as React from 'react';
import { cn } from "@/lib/utils"

// Base Skeleton component
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animate = true,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'bg-muted',
        animate && 'animate-pulse',
        variantStyles[variant],
        className
      )}
      style={{
        width: width ?? (variant === 'text' ? '100%' : undefined),
        height: height ?? (variant === 'text' ? '1em' : undefined),
      }}
      {...props}
    />
  );
}

// Card Skeleton
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-3', className)}>
      <div className="flex items-center space-x-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" height={16} width="60%" />
          <Skeleton variant="text" height={12} width="40%" />
        </div>
      </div>
      <Skeleton variant="text" height={14} />
      <Skeleton variant="text" height={14} width="80%" />
    </div>
  );
}

// Table Row Skeleton
function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton variant="text" height={16} width={i === 0 ? '70%' : '50%'} />
        </td>
      ))}
    </tr>
  );
}

// Table Skeleton
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

function SkeletonTable({
  rows = 5,
  columns = 5,
  showHeader = true,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn('w-full', className)}>
      <table className="w-full">
        {showHeader && (
          <thead>
            <tr className="border-b bg-muted/50">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-4 text-left">
                  <Skeleton variant="text" height={14} width="60%" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// User Card Skeleton
function SkeletonUserCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-start space-x-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={18} width="70%" />
          <Skeleton variant="text" height={14} width="50%" />
          <div className="flex space-x-2 mt-3">
            <Skeleton variant="rounded" width={60} height={22} />
            <Skeleton variant="rounded" width={80} height={22} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Form Skeleton
interface SkeletonFormProps {
  fields?: number;
  showTitle?: boolean;
  showButtons?: boolean;
  className?: string;
}

function SkeletonForm({
  fields = 4,
  showTitle = true,
  showButtons = true,
  className,
}: SkeletonFormProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {showTitle && (
        <div className="space-y-2">
          <Skeleton variant="text" height={24} width="40%" />
          <Skeleton variant="text" height={14} width="60%" />
        </div>
      )}
      
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton variant="text" height={14} width="30%" />
            <Skeleton variant="rounded" height={40} />
          </div>
        ))}
      </div>

      {showButtons && (
        <div className="flex space-x-3 pt-4">
          <Skeleton variant="rounded" width={100} height={40} />
          <Skeleton variant="rounded" width={80} height={40} />
        </div>
      )}
    </div>
  );
}

// Dashboard Stats Skeleton
function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" height={14} width="60%" />
            <Skeleton variant="circular" width={24} height={24} />
          </div>
          <Skeleton variant="text" height={32} width="40%" />
          <Skeleton variant="text" height={12} width="80%" />
        </div>
      ))}
    </div>
  );
}

// Chart Skeleton
function SkeletonChart({ 
  height = 300,
  className 
}: { 
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="space-y-2 mb-4">
        <Skeleton variant="text" height={18} width="30%" />
        <Skeleton variant="text" height={12} width="50%" />
      </div>
      <Skeleton variant="rectangular" height={height} />
    </div>
  );
}

// List Skeleton
interface SkeletonListProps {
  count?: number;
  showAvatar?: boolean;
  showActions?: boolean;
  className?: string;
}

function SkeletonList({
  count = 5,
  showAvatar = true,
  showActions = false,
  className,
}: SkeletonListProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3 rounded-lg border">
          {showAvatar && <Skeleton variant="circular" width={40} height={40} />}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={16} width="70%" />
            <Skeleton variant="text" height={12} width="40%" />
          </div>
          {showActions && (
            <div className="flex space-x-2">
              <Skeleton variant="rounded" width={32} height={32} />
              <Skeleton variant="rounded" width={32} height={32} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Profile Header Skeleton
function SkeletonProfileHeader({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center space-x-6">
        <Skeleton variant="circular" width={96} height={96} />
        <div className="space-y-3 flex-1">
          <Skeleton variant="text" height={28} width="40%" />
          <Skeleton variant="text" height={16} width="30%" />
          <div className="flex space-x-2">
            <Skeleton variant="rounded" width={80} height={28} />
            <Skeleton variant="rounded" width={100} height={28} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="text-center space-y-1">
            <Skeleton variant="text" height={24} width="40%" className="mx-auto" />
            <Skeleton variant="text" height={14} width="60%" className="mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Page Header Skeleton
function SkeletonPageHeader({ 
  showBreadcrumb = true,
  showActions = true,
  className 
}: { 
  showBreadcrumb?: boolean;
  showActions?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {showBreadcrumb && (
        <div className="flex items-center space-x-2">
          <Skeleton variant="text" height={14} width={60} />
          <span className="text-muted-foreground">/</span>
          <Skeleton variant="text" height={14} width={80} />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" height={28} width={200} />
          <Skeleton variant="text" height={14} width={300} />
        </div>
        {showActions && (
          <div className="flex space-x-2">
            <Skeleton variant="rounded" width={100} height={40} />
            <Skeleton variant="rounded" width={120} height={40} />
          </div>
        )}
      </div>
    </div>
  );
}

export { 
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonTableRow,
  SkeletonUserCard,
  SkeletonForm,
  SkeletonStats,
  SkeletonChart,
  SkeletonList,
  SkeletonProfileHeader,
  SkeletonPageHeader,
}
