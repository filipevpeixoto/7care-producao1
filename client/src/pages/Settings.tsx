import { useEffect, useState } from 'react';
import { settingsLogger } from '@/lib/logger';
import { Bell, Palette, Settings as SettingsIcon, Shield, SlidersHorizontal } from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import { PrototypeAvatar, PrototypeStatusBar } from './v2/prototypeShared';
import { useSystemLogo } from '@/hooks/useSystemLogo';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { SendNotificationModal } from '@/components/settings/SendNotificationModal';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

// Extracted sub-components
import { SettingsData, initialSettings, getTabsConfig } from './settings/types';
import { DesktopTabsList, MobileTabsList } from './settings/TabsNavigation';
import { NotificationsTab } from './settings/NotificationsTab';
import { PrivacyTab } from './settings/PrivacyTab';
import { AppearanceTab } from './settings/AppearanceTab';
import { ActionButtons } from './settings/ActionButtons';
import {
  SystemTab,
  DistrictSettingsTab,
  PointsConfigurationTab,
  ChurchManagementTabSection,
  CalendarManagementTabSection,
  DataManagementTabSection,
} from './settings/AdminTabs';

export default function Settings() {
  const { skin } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsData>(() => {
    try {
      const saved = localStorage.getItem('7care_user_settings');
      return saved ? { ...initialSettings, ...JSON.parse(saved) } : initialSettings;
    } catch {
      return initialSettings;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  // Push notifications hook
  const { isSupported, subscribe, unsubscribe } = usePushNotifications();

  // Estado local para controlar o switch
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  // Função para salvar subscription no backend
  const saveSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      settingsLogger.debug('PUSH: Salvando subscription no servidor para usuário:', user?.id);

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId: user?.id,
        }),
      });

      settingsLogger.debug('PUSH: Resposta do servidor:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        settingsLogger.error('PUSH: Erro na resposta do servidor:', errorText);
        throw new Error('Failed to save subscription');
      }

      const result = await response.json();
      settingsLogger.debug('PUSH: Subscription salva com sucesso:', result);
      return result;
    } catch (error) {
      settingsLogger.error('PUSH: Erro ao salvar subscription:', error);
      throw error;
    }
  };

  // Função para remover subscription do backend
  const removeSubscriptionFromServer = async () => {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription');
      }

      return await response.json();
    } catch (error) {
      settingsLogger.error('Error removing subscription:', error);
      throw error;
    }
  };

  // Estado do distrito do usuário para filtrar dados
  const [userDistrictId, setUserDistrictId] = useState<number | null>(user?.districtId ?? null);
  const [userDistrictName, setUserDistrictName] = useState<string>('');

  // Push notifications management states
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Logo management
  useSystemLogo();

  // Fetch district name via useQuery
  const { data: districtData } = useQuery({
    queryKey: ['/api/districts', user?.districtId],
    queryFn: async () => {
      const res = await fetch(`/api/districts/${user?.districtId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.districtId,
    staleTime: 5 * 60 * 1000,
  });

  // Check push subscription via useQuery
  const { data: pushSubscriptionsData } = useQuery({
    queryKey: ['/api/push/subscriptions', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/push/subscriptions?userId=${user?.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!user?.districtId) return;
    if (districtData?.name) {
      setUserDistrictName(districtData.name);
      if (!userDistrictId) {
        setUserDistrictId(user.districtId);
      }
      return;
    }
    if (districtData === null) {
      setUserDistrictName(t('settings.myDistrict'));
    }
  }, [districtData, t, user?.districtId, userDistrictId]);

  useEffect(() => {
    if (!pushSubscriptionsData?.subscriptions || !user?.id) return;
    const userSubscription = pushSubscriptionsData.subscriptions.find(
      (sub: { user_id: number; is_active?: boolean }) => sub.user_id === user.id
    );
    if (userSubscription?.is_active && !isPushEnabled) {
      setIsPushEnabled(true);
      setSettings((prev) => ({
        ...prev,
        notifications: { ...prev.notifications, pushEnabled: true },
      }));
    }
  }, [isPushEnabled, pushSubscriptionsData, user?.id]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Salvar preferências locais no localStorage
      localStorage.setItem('7care_user_settings', JSON.stringify(settings));
      toast({
        title: t('settings.savedSuccess'),
        description: t('settings.savedSuccessDesc'),
      });
    } catch {
      toast({
        title: t('settings.saveError'),
        description: t('settings.saveErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSettings(initialSettings);
    toast({
      title: t('settings.resetTitle'),
      description: t('settings.resetDesc'),
    });
  };

  const updateSetting = <T extends keyof SettingsData>(
    section: T,
    key: keyof SettingsData[T],
    value: SettingsData[T][keyof SettingsData[T]]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const isMemberOnlyNotifications = user?.role === 'member';
  const isAdmin = hasAdminAccess(user);
  const defaultTab = 'notifications';
  const tabsConfig = getTabsConfig(isMemberOnlyNotifications, isAdmin);
  const summaryTiles = [
    {
      label: 'Notificações',
      value: settings.notifications.pushEnabled ? 'Ativas' : 'Revisar',
      icon: Bell,
      tone: 'navy',
    },
    {
      label: 'Privacidade',
      value: settings.privacy.profileVisible ? 'Aberta' : 'Restrita',
      icon: Shield,
      tone: 'glass',
    },
    {
      label: 'Aparência',
      value:
        settings.appearance.theme === 'system'
          ? 'Sistema'
          : settings.appearance.theme === 'dark'
            ? 'Escuro'
            : 'Claro',
      icon: Palette,
      tone: 'gold',
    },
  ];
  const profileSummary = isAdmin
    ? 'Revise notificações, aparência e módulos administrativos sem navegar por telas espalhadas.'
    : 'Ajuste o jeito como você recebe avisos, protege seus dados e usa o app no dia a dia.';

  if (skin === 'v2') {
    return (
      <MobileLayout variant="prototype">
        <div className="p7-shell">
          <div className="p7-screen">
            <PrototypeStatusBar />
            <div className="p7-grad-header">
              <div className="p7-header-row">
                <div>
                  <div className="p7-header-label">{t('settings.title')}</div>
                  <div className="p7-header-title">Preferências</div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
                </div>
              </div>
            </div>
            <div className="p7-scroll">
              <div className="p7-stats-row" tabIndex={-1} aria-label="Resumo das preferências">
                {summaryTiles.map((tile) => (
                  <div key={tile.label} className={`p7-stat-card ${tile.tone}`}>
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/12">
                      <tile.icon className="h-4 w-4" />
                    </div>
                    <div
                      className={`text-[0.95rem] font-bold ${tile.tone === 'glass' ? 'text-[var(--p7-text)]' : 'text-white'}`}
                    >
                      {tile.value}
                    </div>
                    <div
                      className={`text-[0.72rem] ${tile.tone === 'glass' ? 'text-[var(--p7-text-3)]' : 'text-white/70'}`}
                    >
                      {tile.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                    Central de ajustes
                  </div>
                  <p className="mb-4 text-[0.84rem] leading-[1.58] text-[var(--p7-text-2)]">
                    {profileSummary}
                  </p>

                  <Tabs defaultValue={defaultTab} className="space-y-6">
                    <DesktopTabsList tabs={tabsConfig} />
                    <MobileTabsList tabs={tabsConfig} />

                    <NotificationsTab
                      settings={settings}
                      updateSetting={updateSetting}
                      isPushEnabled={isPushEnabled}
                      isSupported={isSupported}
                      subscribe={subscribe}
                      unsubscribe={unsubscribe}
                      saveSubscriptionToServer={saveSubscriptionToServer}
                      removeSubscriptionFromServer={removeSubscriptionFromServer}
                      setIsPushEnabled={setIsPushEnabled}
                      toast={toast}
                    />

                    {!isMemberOnlyNotifications && (
                      <PrivacyTab settings={settings} updateSetting={updateSetting} />
                    )}

                    {!isMemberOnlyNotifications && (
                      <AppearanceTab
                        settings={settings}
                        updateSetting={updateSetting}
                        user={user}
                        isAdmin={isAdmin}
                      />
                    )}

                    {isAdmin && <SystemTab />}
                    {isAdmin && <DistrictSettingsTab />}
                    {isAdmin && <PointsConfigurationTab />}
                    {isAdmin && (
                      <ChurchManagementTabSection
                        user={user}
                        userDistrictId={userDistrictId}
                        userDistrictName={userDistrictName}
                      />
                    )}
                    {isAdmin && (
                      <CalendarManagementTabSection
                        user={user}
                        userDistrictId={userDistrictId}
                        userDistrictName={userDistrictName}
                      />
                    )}
                    {isAdmin && (
                      <DataManagementTabSection
                        user={user}
                        userDistrictId={userDistrictId}
                        userDistrictName={userDistrictName}
                      />
                    )}
                  </Tabs>
                </div>
              </div>

              {!isMemberOnlyNotifications && (
                <div className="p7-section pb-4">
                  <div className="p7-card p7-card-p">
                    <div className="mb-3 flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-[var(--v2-gold)]" />
                      <div className="p7-card-title">
                        {t('common.actions', { defaultValue: 'Ações' })}
                      </div>
                    </div>
                    <p className="mb-4 text-[0.8rem] leading-[1.55] text-[var(--p7-text-3)]">
                      Salve quando terminar de revisar sua rotina ou restaure o padrão se quiser
                      começar do zero.
                    </p>
                    <ActionButtons
                      isLoading={isLoading}
                      handleSave={handleSave}
                      handleReset={handleReset}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="container mx-auto p-4 space-y-6">
        <>
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
          </div>

          <Tabs defaultValue={defaultTab} className="space-y-6">
            <DesktopTabsList tabs={tabsConfig} />
            <MobileTabsList tabs={tabsConfig} />

            <NotificationsTab
              settings={settings}
              updateSetting={updateSetting}
              isPushEnabled={isPushEnabled}
              isSupported={isSupported}
              subscribe={subscribe}
              unsubscribe={unsubscribe}
              saveSubscriptionToServer={saveSubscriptionToServer}
              removeSubscriptionFromServer={removeSubscriptionFromServer}
              setIsPushEnabled={setIsPushEnabled}
              toast={toast}
            />

            {!isMemberOnlyNotifications && (
              <PrivacyTab settings={settings} updateSetting={updateSetting} />
            )}

            {!isMemberOnlyNotifications && (
              <AppearanceTab
                settings={settings}
                updateSetting={updateSetting}
                user={user}
                isAdmin={isAdmin}
              />
            )}

            {isAdmin && <SystemTab />}
            {isAdmin && <DistrictSettingsTab />}
            {isAdmin && <PointsConfigurationTab />}
            {isAdmin && (
              <ChurchManagementTabSection
                user={user}
                userDistrictId={userDistrictId}
                userDistrictName={userDistrictName}
              />
            )}
            {isAdmin && (
              <CalendarManagementTabSection
                user={user}
                userDistrictId={userDistrictId}
                userDistrictName={userDistrictName}
              />
            )}
            {isAdmin && (
              <DataManagementTabSection
                user={user}
                userDistrictId={userDistrictId}
                userDistrictName={userDistrictName}
              />
            )}
          </Tabs>

          {!isMemberOnlyNotifications && (
            <ActionButtons
              isLoading={isLoading}
              handleSave={handleSave}
              handleReset={handleReset}
            />
          )}
        </>
      </div>

      <SendNotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        user={user as Pick<import('@/types/domain').UserMember, 'id' | 'role'>}
      />
    </MobileLayout>
  );
}
