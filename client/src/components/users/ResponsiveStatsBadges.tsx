import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, User, Heart, UserCheck } from 'lucide-react';

interface ResponsiveStatsBadgesProps {
  roleFilter: string;
  setRoleFilter: (filter: string) => void;
  users: any[];
  userRole?: string;
}

export const ResponsiveStatsBadges: React.FC<ResponsiveStatsBadgesProps> = ({
  roleFilter,
  setRoleFilter,
  users,
  userRole,
}) => {
  if (userRole === 'missionary') {
    return (
      <Badge
        variant="secondary"
        className="text-[10px] sm:text-sm px-1.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border-purple-300/50 dark:from-purple-900/50 dark:to-blue-900/50 dark:text-purple-300 dark:border-purple-500/30"
      >
        <Heart className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-2" />
        <span className="font-semibold">0 vinculados</span>
      </Badge>
    );
  }

  return (
    <>
      <Badge
        variant={roleFilter === 'superadmin' || roleFilter === 'pastor' ? 'default' : 'outline'}
        className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg text-[10px] sm:text-sm px-1.5 sm:px-3 py-1 sm:py-1.5 ${
          roleFilter === 'superadmin' || roleFilter === 'pastor'
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 border-0'
            : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-300/50 hover:from-blue-100 hover:to-blue-200 hover:border-blue-400 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-300 dark:border-blue-500/30 dark:hover:from-blue-800/50 dark:hover:to-blue-700/50'
        }`}
        onClick={() => {
          if (roleFilter === 'superadmin' || roleFilter === 'pastor') {
            setRoleFilter('all');
          } else {
            setRoleFilter('superadmin');
          }
        }}
        data-testid="stat-admin"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <Shield className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-2 drop-shadow-sm" />
        <span className="font-semibold tracking-wide hidden sm:inline">Administradores</span>
        <span className="font-semibold tracking-wide sm:hidden">Admins</span>
        <span className="ml-0.5 sm:ml-2 px-1 sm:px-2 py-0.5 bg-white/20 rounded-full text-[10px] sm:text-sm font-bold">
          {users.filter((u: any) => u.role === 'superadmin' || u.role === 'pastor').length}
        </span>
      </Badge>

      <Badge
        variant={roleFilter === 'member' ? 'default' : 'outline'}
        className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg text-[10px] sm:text-sm px-1.5 sm:px-3 py-1 sm:py-1.5 ${
          roleFilter === 'member'
            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 border-0'
            : 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-300/50 hover:from-emerald-100 hover:to-emerald-200 hover:border-emerald-400 dark:from-emerald-900/50 dark:to-emerald-800/50 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:from-emerald-800/50 dark:hover:to-emerald-700/50'
        }`}
        onClick={() => setRoleFilter(roleFilter === 'member' ? 'all' : 'member')}
        data-testid="stat-member"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <User className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-2 drop-shadow-sm" />
        <span className="font-semibold tracking-wide">Membros</span>
        <span className="ml-0.5 sm:ml-2 px-1 sm:px-2 py-0.5 bg-white/20 rounded-full text-[10px] sm:text-sm font-bold">
          {users.filter((u: any) => u.role.includes('member')).length}
        </span>
      </Badge>

      <Badge
        variant={roleFilter === 'missionary' ? 'default' : 'outline'}
        className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg text-[10px] sm:text-sm px-1.5 sm:px-3 py-1 sm:py-1.5 ${
          roleFilter === 'missionary'
            ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-lg shadow-violet-500/25 border-0'
            : 'bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 border-violet-300/50 hover:from-violet-100 hover:to-violet-200 hover:border-violet-400 dark:from-violet-900/50 dark:to-violet-800/50 dark:text-violet-300 dark:border-violet-500/30 dark:hover:from-violet-800/50 dark:hover:to-violet-700/50'
        }`}
        onClick={() => setRoleFilter(roleFilter === 'missionary' ? 'all' : 'missionary')}
        data-testid="stat-missionary"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <Heart className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-2 drop-shadow-sm" />
        <span className="font-semibold tracking-wide hidden sm:inline">Missionários</span>
        <span className="font-semibold tracking-wide sm:hidden">Miss.</span>
        <span className="ml-0.5 sm:ml-2 px-1 sm:px-2 py-0.5 bg-white/20 rounded-full text-[10px] sm:text-sm font-bold">
          {users.filter((u: any) => u.role.includes('missionary')).length}
        </span>
      </Badge>

      <Badge
        variant={roleFilter === 'interested' ? 'default' : 'outline'}
        className={`group relative cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg text-[10px] sm:text-sm px-1.5 sm:px-3 py-1 sm:py-1.5 ${
          roleFilter === 'interested'
            ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-500/25 border-0'
            : 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-300/50 hover:from-amber-100 hover:to-amber-200 hover:border-amber-400 dark:from-amber-900/50 dark:to-amber-800/50 dark:text-amber-300 dark:border-amber-500/30 dark:hover:from-amber-800/50 dark:hover:to-amber-700/50'
        }`}
        onClick={() => setRoleFilter(roleFilter === 'interested' ? 'all' : 'interested')}
        data-testid="stat-interested"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <UserCheck className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-2 drop-shadow-sm" />
        <span className="font-semibold tracking-wide hidden sm:inline">Amigos</span>
        <span className="font-semibold tracking-wide sm:hidden">Int.</span>
        <span className="ml-0.5 sm:ml-2 px-1 sm:px-2 py-0.5 bg-white/20 rounded-full text-[10px] sm:text-sm font-bold">
          {users.filter((u: any) => u.role === 'interested').length}
        </span>
      </Badge>
    </>
  );
};
