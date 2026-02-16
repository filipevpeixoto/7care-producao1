import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const HeaderSection = () => {
  const { t } = useTranslation();
  return (
    <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 shadow-2xl">
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
      <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">{t('pushNotifications.title')}</h1>
        </div>
        <p className="text-blue-100">{t('pushNotifications.subtitle')}</p>
      </div>
    </div>
  );
};
