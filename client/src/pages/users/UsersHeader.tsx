import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExportMenu } from '@/components/users/ExportMenu';
import { hasAdminAccess } from '@/lib/permissions';
import { User as UserIcon, UserPlus } from 'lucide-react';
import type { AuthUser } from '@/../../shared/types/user';
import { useTranslation } from 'react-i18next';

import type { UserMember } from '@/types/domain';

interface UsersHeaderProps {
  user: AuthUser | null | undefined;
  pendingCount: number;
  filteredAndSortedUsers: UserMember[];
  isRecalculating: boolean;
  recalculationProgress: number;
  recalculationMessage: string;
  onCreateUser: () => void;
  compact?: boolean;
}

export const UsersHeader = ({
  user,
  pendingCount,
  filteredAndSortedUsers,
  isRecalculating,
  recalculationProgress,
  recalculationMessage,
  onCreateUser,
  compact = false,
}: UsersHeaderProps) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <UserIcon className={`${compact ? 'h-4 w-4' : 'h-4 w-4 sm:h-6 sm:w-6'} text-primary`} />
          {compact ? (
            <div>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[var(--v2-text-3)]">
                {t('users.quickActions', { defaultValue: 'Acoes de gestao' })}
              </div>
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                {user?.role === 'missionary' ? t('users.friends') : t('users.title')}
              </h2>
            </div>
          ) : (
            <h1 className="text-base font-bold text-foreground sm:text-2xl">
              {user?.role === 'missionary' ? t('users.friends') : t('users.title')}
            </h1>
          )}
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs px-1.5 py-0.5"
              data-testid="badge-pending-count"
            >
              {pendingCount}
            </Badge>
          )}
          {user?.role === 'missionary' && (
            <Badge
              variant="secondary"
              className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs px-1.5 py-0.5"
            >
              0
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ExportMenu data={filteredAndSortedUsers} />
          {hasAdminAccess(user) && (
            <Button
              size="sm"
              className="bg-primary hover:bg-primary-dark text-[10px] sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
              data-testid="button-new-user"
              onClick={onCreateUser}
              aria-label={t('users.add')}
            >
              <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-1">{t('common.new')}</span>
            </Button>
          )}
        </div>
      </div>

      {isRecalculating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-md animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-sm font-medium text-blue-900">{recalculationMessage}</p>
            </div>
            <p className="text-sm font-bold text-blue-900">{Math.round(recalculationProgress)}%</p>
          </div>

          <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
              style={{ width: `${recalculationProgress}%` }}
            >
              {recalculationProgress > 10 && (
                <span className="text-[10px] font-bold text-white drop-shadow">
                  {Math.round(recalculationProgress)}%
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-blue-700 mt-2">{t('users.recalcHint')}</p>
        </div>
      )}
    </>
  );
};
