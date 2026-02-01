import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardCardSkeletonProps {
  colorClass?: string;
}

export const DashboardCardSkeleton: React.FC<DashboardCardSkeletonProps> = ({
  colorClass = 'from-gray-400 to-gray-600',
}) => {
  return (
    <Card
      className={`group relative overflow-hidden bg-gradient-to-br ${colorClass} border-0 shadow-lg`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
        <Skeleton className="h-4 lg:h-5 w-24 lg:w-32 bg-white/30" />
        <Skeleton className="h-6 w-6 lg:h-8 lg:w-8 rounded-full bg-white/30" />
      </CardHeader>
      <CardContent className="relative z-10 p-3 lg:p-6">
        <Skeleton className="h-8 lg:h-12 w-16 lg:w-24 bg-white/30 mb-2" />
        <Skeleton className="h-3 lg:h-4 w-32 lg:w-40 bg-white/20" />
      </CardContent>
    </Card>
  );
};

// Grid de skeletons para carregamento inicial
export const DashboardSkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => {
  const colors = [
    'from-blue-400 to-blue-600',
    'from-red-400 to-red-600',
    'from-orange-400 to-orange-600',
    'from-green-400 to-green-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <DashboardCardSkeleton key={index} colorClass={colors[index % colors.length]} />
      ))}
    </div>
  );
};

// Skeleton para o número dentro do card (para loading parcial)
export const NumberSkeleton: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'lg' }) => {
  return (
    <Skeleton
      className={`bg-white/30 ${
        size === 'lg' ? 'h-8 lg:h-12 w-12 lg:w-20' : 'h-5 lg:h-7 w-8 lg:w-12'
      }`}
    />
  );
};

export default DashboardCardSkeleton;
