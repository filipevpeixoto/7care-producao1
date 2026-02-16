import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface SettingsData {
  notifications: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    meetingReminders: boolean;
    messageAlerts: boolean;
    weeklyReport: boolean;
  };
  privacy: {
    profileVisible: boolean;
    contactInfoVisible: boolean;
    attendanceVisible: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    language: 'pt' | 'en' | 'es';
    dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
  };
  church: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    meetingDays: string[];
  };
}

export type UpdateSetting = <T extends keyof SettingsData>(
  section: T,
  key: keyof SettingsData[T],
  value: SettingsData[T][keyof SettingsData[T]]
) => void;

export type TabConfig = {
  value: string;
  label: string;
};

export type AuthUser = ReturnType<typeof useAuth>['user'];
export type ToastFn = ReturnType<typeof useToast>['toast'];

export const initialSettings: SettingsData = {
  notifications: {
    emailEnabled: true,
    pushEnabled: true,
    meetingReminders: true,
    messageAlerts: true,
    weeklyReport: false,
  },
  privacy: {
    profileVisible: true,
    contactInfoVisible: false,
    attendanceVisible: true,
  },
  appearance: {
    theme: 'system',
    language: 'pt',
    dateFormat: 'dd/mm/yyyy',
  },
  church: {
    name: 'Igreja Adventista Central',
    address: 'Rua das Flores, 123 - Centro',
    phone: '(11) 3333-4444',
    email: 'contato@igrejacentral.org',
    website: 'www.igrejacentral.org',
    meetingDays: ['saturday', 'wednesday'],
  },
};

export const getTabsConfig = (isMemberOnlyNotifications: boolean, isAdmin: boolean): TabConfig[] => {
  const tabs: TabConfig[] = [{ value: 'notifications', label: 'Notificações' }];

  if (!isMemberOnlyNotifications) {
    tabs.push(
      { value: 'privacy', label: 'Privacidade' },
      { value: 'appearance', label: 'Aparência' }
    );
  }

  if (isAdmin) {
    tabs.push(
      { value: 'calendar', label: 'Calendário' },
      { value: 'district-settings', label: 'Meu Distrito' },
      { value: 'points-config', label: 'Base de Cálculo' },
      { value: 'system', label: 'Sistema' },
      { value: 'church', label: 'Igreja' },
      { value: 'data-management', label: 'Gestão de Dados' }
    );
  }

  return tabs;
};
