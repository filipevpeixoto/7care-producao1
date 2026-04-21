/**
 * Page Skeletons - Esqueletos de carregamento específicos por tipo de página
 * Melhora a percepção de velocidade mostrando estrutura antes do conteúdo
 * @module components/ui/page-skeleton
 */

import { Skeleton } from '@/components/ui/skeleton';
import { memo } from 'react';

/**
 * Skeleton para página de Dashboard
 */
export const DashboardSkeleton = memo(() => (
  <div className="flex flex-col gap-6 p-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>

    {/* Stats Cards */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-panel rounded-lg border p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>

    {/* Main Content */}
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  </div>
));
DashboardSkeleton.displayName = 'DashboardSkeleton';

/**
 * Skeleton para página de Calendário
 */
export const CalendarSkeleton = memo(() => (
  <div className="flex flex-col gap-4 p-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-10" />
      </div>
    </div>

    {/* Calendar Grid */}
    <div className="grid grid-cols-7 gap-1">
      {/* Week days */}
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={`day-${i}`} className="h-8" />
      ))}
      {/* Calendar cells */}
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={`cell-${i}`} className="h-24 rounded" />
      ))}
    </div>
  </div>
));
CalendarSkeleton.displayName = 'CalendarSkeleton';

/**
 * Skeleton para página de Lista (Users, Interested, etc)
 */
export const ListSkeleton = memo(() => (
  <div className="flex flex-col gap-4 p-6">
    {/* Header com busca */}
    <div className="flex justify-between items-center gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 flex-1 max-w-md" />
      <Skeleton className="h-10 w-32" />
    </div>

    {/* Filters */}
    <div className="flex gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-24" />
      ))}
    </div>

    {/* Table/List */}
    <div className="skeleton-panel border rounded-lg">
      {/* Table Header */}
      <div className="skeleton-panel flex gap-4 border-b p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Table Rows */}
      {Array.from({ length: 8 }).map((_, row) => (
        <div key={row} className="flex gap-4 p-4 border-b last:border-0">
          <Skeleton className="h-10 w-10 rounded-full" />
          {Array.from({ length: 4 }).map((_, col) => (
            <Skeleton key={col} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
));
ListSkeleton.displayName = 'ListSkeleton';

/**
 * Skeleton para página de Chat
 */
export const ChatSkeleton = memo(() => (
  <div className="flex h-[calc(100vh-4rem)]">
    {/* Sidebar */}
    <div className="skeleton-panel hidden w-80 border-r p-4 md:block">
      <Skeleton className="h-10 w-full mb-4" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3 mb-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>

    {/* Chat Area */}
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="skeleton-panel flex items-center gap-3 border-b p-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'} rounded-lg`} />
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="skeleton-panel border-t p-4">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  </div>
));
ChatSkeleton.displayName = 'ChatSkeleton';

/**
 * Skeleton para página de Configurações
 */
export const SettingsSkeleton = memo(() => (
  <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
    <Skeleton className="h-8 w-48" />

    {/* Settings sections */}
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="skeleton-panel border rounded-lg p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="flex justify-between items-center">
              <div>
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
));
SettingsSkeleton.displayName = 'SettingsSkeleton';

/**
 * Skeleton para página de Gamificação
 */
export const GamificationSkeleton = memo(() => (
  <div className="flex flex-col gap-6 p-6">
    {/* User Profile Card */}
    <div className="skeleton-panel border rounded-lg p-6 flex items-center gap-6">
      <Skeleton className="h-24 w-24 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-3 w-full max-w-md" />
      </div>
      <div className="text-center">
        <Skeleton className="h-12 w-20 mb-1" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>

    {/* Stats */}
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-panel border rounded-lg p-4 text-center">
          <Skeleton className="h-8 w-16 mx-auto mb-2" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </div>
      ))}
    </div>

    {/* Ranking */}
    <Skeleton className="h-6 w-32" />
    <div className="skeleton-panel border rounded-lg">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  </div>
));
GamificationSkeleton.displayName = 'GamificationSkeleton';

/**
 * Skeleton genérico para páginas não mapeadas
 */
export const GenericPageSkeleton = memo(() => (
  <div className="flex flex-col gap-6 p-6">
    <Skeleton className="h-8 w-64" />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  </div>
));
GenericPageSkeleton.displayName = 'GenericPageSkeleton';

/**
 * Mapeamento de rotas para skeletons
 */
export const routeSkeletons: Record<string, React.ComponentType> = {
  '/dashboard': DashboardSkeleton,
  '/calendar': CalendarSkeleton,
  '/users': ListSkeleton,
  '/interested': ListSkeleton,
  '/my-interested': ListSkeleton,
  '/pastors': ListSkeleton,
  '/districts': ListSkeleton,
  '/chat': ChatSkeleton,
  '/settings': SettingsSkeleton,
  '/gamification': GamificationSkeleton,
  '/prayers': ListSkeleton,
  '/tasks': ListSkeleton,
  '/reports': DashboardSkeleton,
  '/elections': ListSkeleton,
};

/**
 * Retorna o skeleton apropriado para uma rota
 */
export function getSkeletonForRoute(path: string): React.ComponentType {
  return routeSkeletons[path] || GenericPageSkeleton;
}
