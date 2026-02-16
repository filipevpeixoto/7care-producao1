import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StatCardProps } from './types';

export const StatCard = ({ title, value, icon: Icon, className, iconClassName }: StatCardProps) => (
  <Card
    className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}
  >
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-4 rounded-xl ${iconClassName}`}>
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const StatsGrid = ({
  subscriptionsCount,
  usersCount,
}: {
  subscriptionsCount: number;
  usersCount: number;
}) => {
  const { t } = useTranslation();
  const coverage = usersCount > 0 ? Math.round((subscriptionsCount / usersCount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <StatCard
        title={t('pushNotifications.activeSubscriptions')}
        value={subscriptionsCount}
        icon={Users}
        className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30"
        iconClassName="bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
      />
      <StatCard
        title={t('pushNotifications.registeredUsers')}
        value={usersCount}
        icon={TrendingUp}
        className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30"
        iconClassName="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
      />
      <StatCard
        title={t('pushNotifications.coverageRate')}
        value={`${coverage}%`}
        icon={Zap}
        className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30"
        iconClassName="bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400"
      />
    </div>
  );
};
