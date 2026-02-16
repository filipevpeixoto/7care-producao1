/**
 * @fileoverview Card de estatísticas reutilizável para o Dashboard
 * Evita repetição do padrão de card com gradiente
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string; // e.g. "from-blue-500 to-blue-700"
  gradientOverlay: string; // e.g. "from-blue-600/20 to-blue-800/30"
  gradientHover: string; // e.g. "from-blue-600/30 to-blue-800/40"
  gradientCircle: string; // e.g. "from-blue-400/30 to-blue-600/40"
  isLoading?: boolean;
  actionLabel?: string;
  actionLabelMobile?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  children?: React.ReactNode;
}

export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  gradient,
  gradientOverlay,
  gradientHover,
  gradientCircle,
  isLoading = false,
  actionLabel,
  actionLabelMobile,
  actionIcon,
  onAction,
  children,
}) => {
  return (
    <Card
      className={`group relative overflow-hidden bg-gradient-to-br ${gradient} border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradientOverlay} opacity-100 group-hover:${gradientHover} transition-all duration-300`}
      ></div>
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradientCircle} rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500`}
      ></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
        <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
          {title}
        </CardTitle>
        <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative z-10 p-3 lg:p-6">
        <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
          {isLoading ? '...' : value}
        </div>
        {subtitle && (
          <p className="text-xs lg:text-sm text-white/80 mt-1">{subtitle}</p>
        )}
        {children}
        {onAction && actionLabel && (
          <Button
            onClick={onAction}
            className="mt-2 lg:mt-3 h-7 lg:h-9 px-3 lg:px-4 text-xs lg:text-sm bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
          >
            {actionIcon}
            <span className="hidden sm:inline">{actionLabel}</span>
            {actionLabelMobile && <span className="sm:hidden">{actionLabelMobile}</span>}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
