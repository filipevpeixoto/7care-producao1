import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Users, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ariaLabels } from '@/lib/accessibility';
import { getDeviceInfo } from './utils';
import type { SubscriptionItem } from './types';

export const SubscriptionsList = ({
  subscriptions,
  onDelete,
  onToggle,
}: {
  subscriptions: SubscriptionItem[];
  onDelete: (subscriptionId: number, userName: string) => void;
  onToggle: (subscriptionId: number, isActive: boolean) => void;
}) => {
  const { t } = useTranslation();
  if (subscriptions.length === 0) return null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          {t('pushNotifications.activeSubscriptionsCount', { count: subscriptions.length })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {subscriptions.map((subscription) => {
            const isActive = subscription.is_active !== false;
            const device = getDeviceInfo(subscription.user_agent || '');

            return (
              <div
                key={subscription.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {subscription.user_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {subscription.user_name}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs font-medium rounded-full flex items-center gap-1">
                        <span>{device.icon}</span>
                        <span>{device.name}</span>
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{subscription.user_email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-400">
                    {new Date(subscription.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(subscription.id, subscription.user_name || '')}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label={ariaLabels.deleteSubscription(subscription.user_name || 'usuário')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => onToggle(subscription.id, isActive)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
