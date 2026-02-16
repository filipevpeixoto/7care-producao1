import { Button } from '@/components/ui/button';
import { Bell, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ActionButtons = ({
  onNewNotification,
  onRefresh,
}: {
  onNewNotification: () => void;
  onRefresh: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Button
        onClick={onNewNotification}
        size="lg"
        className="h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 text-lg font-semibold"
      >
        <Bell className="h-6 w-6 mr-3" />
        {t('pushNotifications.newNotification')}
      </Button>
      <Button
        onClick={onRefresh}
        variant="outline"
        size="lg"
        className="h-16 border-2 hover:bg-gray-50 transition-all duration-300 text-lg font-semibold"
      >
        <RefreshCw className="h-6 w-6 mr-3" />
        {t('pushNotifications.refreshList')}
      </Button>
    </div>
  );
};
