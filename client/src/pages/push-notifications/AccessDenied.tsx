import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTranslation } from 'react-i18next';

export const AccessDenied = () => {
  const { t } = useTranslation();
  return (
    <MobileLayout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('pushNotifications.restrictedAccess')}
            </h3>
            <p className="text-sm text-gray-600">{t('pushNotifications.adminOnly')}</p>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};
