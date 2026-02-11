/* eslint-disable no-console, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
// TODO: Remove eslint-disable once Settings.tsx is fully decomposed (Action #6)
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Palette,
  Save,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { PointsConfiguration } from '@/components/settings/PointsConfiguration';
import { DistrictSettings } from '@/components/settings/DistrictSettings';
import { useSystemLogo } from '@/hooks/useSystemLogo';
import { usePushNotifications } from '@/hooks/usePushNotifications';

import { SendNotificationModal } from '@/components/settings/SendNotificationModal';
import { ChurchManagementTab } from '@/components/settings/ChurchManagementTab';
import { CalendarManagementTab } from '@/components/settings/CalendarManagementTab';
import { DataManagementTab } from '@/components/settings/DataManagementTab';
import { MobileHeaderLayoutEditor } from '@/components/settings/MobileHeaderLayoutEditor';

interface SettingsData {
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

const initialSettings: SettingsData = {
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

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsData>(initialSettings);
  const [isLoading, setIsLoading] = useState(false);

  // Push notifications hook
  const { isSupported, isSubscribed, requestPermission, subscribe, unsubscribe } =
    usePushNotifications();

  // Estado local para controlar o switch
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  // Função para salvar subscription no backend
  const saveSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      console.log('💾 PUSH: Salvando subscription no servidor para usuário:', user?.id);

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId: user?.id,
        }),
      });

      console.log('📡 PUSH: Resposta do servidor:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ PUSH: Erro na resposta do servidor:', errorText);
        throw new Error('Failed to save subscription');
      }

      const result = await response.json();
      console.log('✅ PUSH: Subscription salva com sucesso:', result);
      return result;
    } catch (error) {
      console.error('❌ PUSH: Erro ao salvar subscription:', error);
      throw error;
    }
  };

  // Função para remover subscription do backend
  const removeSubscriptionFromServer = async () => {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription');
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing subscription:', error);
      throw error;
    }
  };

  // Estado do distrito do usuário para filtrar dados
  const [userDistrictId, setUserDistrictId] = useState<number | null>(null);
  const [userDistrictName, setUserDistrictName] = useState<string>('');

  // Push notifications management states
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Logo management states
  const [currentLogo, setCurrentLogo] = useState<string>('');
  const { refreshLogo, clearLogoSystem } = useSystemLogo();

  // Inicializar userDistrictId a partir do user autenticado
  useEffect(() => {
    if (user?.districtId && !userDistrictId) {
      setUserDistrictId(user.districtId);
      // Buscar nome do distrito
      fetch(`/api/districts/${user.districtId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.name) setUserDistrictName(data.name);
          else setUserDistrictName('Meu Distrito');
        })
        .catch(() => setUserDistrictName('Meu Distrito'));
    }
  }, [user?.districtId]);

  // Load current system logo from localStorage
  useEffect(() => {
    const savedLogo = localStorage.getItem('systemLogo');
    if (savedLogo && savedLogo !== '') {
      setCurrentLogo(savedLogo);
    }
  }, []);

  // Verificar subscription do usuário atual ao carregar
  useEffect(() => {
    const checkUserSubscription = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/push/subscriptions?userId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            const userSubscription = data.subscriptions?.find(
              (sub: any) => sub.user_id === user.id
            );
            if (userSubscription && userSubscription.is_active) {
              // Se o usuário tem subscription ativa, atualizar o estado local
              setIsPushEnabled(true);
              setSettings((prev) => ({
                ...prev,
                notifications: {
                  ...prev.notifications,
                  pushEnabled: true,
                },
              }));
            }
          }
        } catch (error) {
          console.error('Erro ao verificar subscription do usuário:', error);
        }
      }
    };

    checkUserSubscription();
  }, [user?.id]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Configurações salvas',
        description: 'Suas configurações foram atualizadas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSettings(initialSettings);
    toast({
      title: 'Configurações restauradas',
      description: 'Todas as configurações foram restauradas aos valores padrão.',
    });
  };

  const updateSetting = <T extends keyof SettingsData>(
    section: T,
    key: keyof SettingsData[T],
    value: SettingsData[T][keyof SettingsData[T]]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const isMemberOnlyNotifications = user?.role === 'member';
  const defaultTab = 'notifications';

  return (
    <MobileLayout>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          {/* Desktop Tabs */}
          <TabsList className="hidden md:grid w-full grid-cols-11">
            <TabsTrigger value="notifications" className="text-xs">
              Notificações
            </TabsTrigger>
            {!isMemberOnlyNotifications && (
              <>
                <TabsTrigger value="privacy" className="text-xs">
                  Privacidade
                </TabsTrigger>
                <TabsTrigger value="appearance" className="text-xs">
                  Aparência
                </TabsTrigger>
              </>
            )}

            {hasAdminAccess(user) && (
              <TabsTrigger value="calendar" className="text-xs">
                Calendário
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="district-settings" className="text-xs">
                Meu Distrito
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="points-config" className="text-xs">
                Base de Cálculo
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="system" className="text-xs">
                Sistema
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="church" className="text-xs">
                Igreja
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="data-management" className="text-xs">
                Gestão de Dados
              </TabsTrigger>
            )}
          </TabsList>

          {/* Mobile Tabs - Scrollable */}
          <TabsList className="md:hidden flex w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger value="notifications" className="text-xs flex-shrink-0 px-2">
              Notificações
            </TabsTrigger>
            {!isMemberOnlyNotifications && (
              <>
                <TabsTrigger value="privacy" className="text-xs flex-shrink-0 px-2">
                  Privacidade
                </TabsTrigger>
                <TabsTrigger value="appearance" className="text-xs flex-shrink-0 px-2">
                  Aparência
                </TabsTrigger>
              </>
            )}

            {hasAdminAccess(user) && (
              <TabsTrigger value="calendar" className="text-xs flex-shrink-0 px-2">
                Calendário
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="district-settings" className="text-xs flex-shrink-0 px-2">
                Meu Distrito
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="points-config" className="text-xs flex-shrink-0 px-2">
                Base de Cálculo
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="system" className="text-xs flex-shrink-0 px-2">
                Sistema
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="church" className="text-xs flex-shrink-0 px-2">
                Igreja
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="data-management" className="text-xs flex-shrink-0 px-2">
                Gestão de Dados
              </TabsTrigger>
            )}
          </TabsList>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificações
                </CardTitle>
                <CardDescription>Configure como você quer receber notificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Notificações por email</div>
                    <div className="text-xs text-muted-foreground">
                      Receba atualizações por email
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.emailEnabled}
                    onCheckedChange={(checked) =>
                      updateSetting('notifications', 'emailEnabled', checked)
                    }
                    data-testid="switch-email-notifications"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Notificações push</div>
                    <div className="text-xs text-muted-foreground">Notificações no dispositivo</div>
                  </div>
                  <Switch
                    checked={isPushEnabled}
                    onCheckedChange={async (checked) => {
                      console.log('🔄 Tentando alterar notificações push para:', checked);
                      console.log('🔍 isSupported:', isSupported);

                      try {
                        if (checked) {
                          // Ativar push notifications
                          console.log('📱 Ativando push notifications...');

                          if (!isSupported) {
                            console.log('❌ Push notifications não suportadas');
                            toast({
                              title: 'Não suportado',
                              description: 'Seu navegador não suporta notificações push.',
                              variant: 'destructive',
                            });
                            return;
                          }

                          console.log('🔑 Solicitando permissão...');
                          const subscription = await subscribe();
                          console.log('✅ Subscription criada:', subscription);

                          console.log('💾 Salvando no servidor...');
                          await saveSubscriptionToServer(subscription);
                          console.log('✅ Subscription salva no servidor');

                          setIsPushEnabled(true);
                          updateSetting('notifications', 'pushEnabled', true);

                          toast({
                            title: 'Notificações ativadas',
                            description: 'Você receberá notificações push no seu dispositivo.',
                          });
                        } else {
                          // Desativar push notifications
                          console.log('📱 Desativando push notifications...');

                          await unsubscribe();
                          await removeSubscriptionFromServer();

                          setIsPushEnabled(false);
                          updateSetting('notifications', 'pushEnabled', false);

                          toast({
                            title: 'Notificações desativadas',
                            description: 'As notificações push foram desativadas.',
                          });
                        }
                      } catch (error) {
                        console.error('❌ Error toggling push notifications:', error);
                        toast({
                          title: 'Erro',
                          description: `Não foi possível alterar as configurações de notificação: ${(error as Error).message}`,
                          variant: 'destructive',
                        });
                      }
                    }}
                    data-testid="switch-push-notifications"
                    disabled={!isSupported}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Lembretes de reuniões</div>
                    <div className="text-xs text-muted-foreground">Avisos antes dos eventos</div>
                  </div>
                  <Switch
                    checked={settings.notifications.meetingReminders}
                    onCheckedChange={(checked) =>
                      updateSetting('notifications', 'meetingReminders', checked)
                    }
                    data-testid="switch-meeting-reminders"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Alertas de mensagens</div>
                    <div className="text-xs text-muted-foreground">
                      Notificações de novas mensagens
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.messageAlerts}
                    onCheckedChange={(checked) =>
                      updateSetting('notifications', 'messageAlerts', checked)
                    }
                    data-testid="switch-message-alerts"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Relatório semanal</div>
                    <div className="text-xs text-muted-foreground">
                      Resumo das atividades da semana
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.weeklyReport}
                    onCheckedChange={(checked) =>
                      updateSetting('notifications', 'weeklyReport', checked)
                    }
                    data-testid="switch-weekly-report"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          {!isMemberOnlyNotifications && (
            <TabsContent value="privacy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacidade
                  </CardTitle>
                  <CardDescription>Controle a visibilidade das suas informações</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Perfil visível</div>
                      <div className="text-xs text-muted-foreground">
                        Outros membros podem ver seu perfil
                      </div>
                    </div>
                    <Switch
                      checked={settings.privacy.profileVisible}
                      onCheckedChange={(checked) =>
                        updateSetting('privacy', 'profileVisible', checked)
                      }
                      data-testid="switch-profile-visible"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Informações de contato</div>
                      <div className="text-xs text-muted-foreground">
                        Mostrar telefone e email no perfil
                      </div>
                    </div>
                    <Switch
                      checked={settings.privacy.contactInfoVisible}
                      onCheckedChange={(checked) =>
                        updateSetting('privacy', 'contactInfoVisible', checked)
                      }
                      data-testid="switch-contact-visible"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Frequência visível</div>
                      <div className="text-xs text-muted-foreground">
                        Mostrar sua frequência nos eventos
                      </div>
                    </div>
                    <Switch
                      checked={settings.privacy.attendanceVisible}
                      onCheckedChange={(checked) =>
                        updateSetting('privacy', 'attendanceVisible', checked)
                      }
                      data-testid="switch-attendance-visible"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Appearance Settings */}
          {!isMemberOnlyNotifications && (
            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Aparência
                  </CardTitle>
                  <CardDescription>Personalize a interface do aplicativo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Tema</Label>
                    <Select
                      value={settings.appearance.theme}
                      onValueChange={(value: 'light' | 'dark' | 'system') =>
                        updateSetting('appearance', 'theme', value)
                      }
                    >
                      <SelectTrigger data-testid="select-theme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Escuro</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Idioma</Label>
                    <Select
                      value={settings.appearance.language}
                      onValueChange={(value: 'pt' | 'en' | 'es') =>
                        updateSetting('appearance', 'language', value)
                      }
                    >
                      <SelectTrigger data-testid="select-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt">Português</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Formato de data</Label>
                    <Select
                      value={settings.appearance.dateFormat}
                      onValueChange={(value: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd') =>
                        updateSetting('appearance', 'dateFormat', value)
                      }
                    >
                      <SelectTrigger data-testid="select-date-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/mm/yyyy">DD/MM/AAAA</SelectItem>
                        <SelectItem value="mm/dd/yyyy">MM/DD/AAAA</SelectItem>
                        <SelectItem value="yyyy-mm-dd">AAAA-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Botão para rever tutorial (apenas para pastores) */}
                  {user?.role === 'pastor' && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium">Tutorial de Boas-vindas</div>
                          <div className="text-xs text-muted-foreground">
                            Reveja o tutorial que apresenta as funcionalidades do sistema
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Remove a flag do localStorage para permitir rever
                            localStorage.removeItem(`7care_welcome_tour_completed_${user.id}`);
                            // Recarrega a página para mostrar o tour
                            window.location.reload();
                          }}
                          className="gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Rever Tutorial
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Mobile Header Layout Editor */}
              {hasAdminAccess(user) && <MobileHeaderLayoutEditor />}
            </TabsContent>
          )}

          {/* System Settings (Admin only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Configurações do Sistema
                  </CardTitle>
                  <CardDescription>Gerencie as configurações globais do sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Conteúdo de Sistema (sem layout do mobile header) */}
                  {/* Notificações Push foram movidas para página própria de administração */}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* District Settings (Pastor only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="district-settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Configurações do Distrito
                  </CardTitle>
                  <CardDescription>
                    Configure as preferências específicas do seu distrito. Essas configurações
                    afetam apenas os membros e igrejas do seu distrito.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DistrictSettings />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Points Configuration (Admin only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="points-config" className="space-y-4">
              <PointsConfiguration />
            </TabsContent>
          )}

          {/* Church Management (Admin only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="church" className="space-y-4">
              <ChurchManagementTab user={user} userDistrictId={userDistrictId} userDistrictName={userDistrictName} />
            </TabsContent>
          )}

          {/* Calendar Management (Admin only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="calendar" className="space-y-4">
              <CalendarManagementTab user={user} userDistrictId={userDistrictId} userDistrictName={userDistrictName} />
            </TabsContent>
          )}

          {/* Data Management (Admin only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="data-management" className="space-y-4">
              <DataManagementTab user={user} userDistrictId={userDistrictId} userDistrictName={userDistrictName} />
            </TabsContent>
          )}
        </Tabs>

        {/* Action Buttons */}
        {!isMemberOnlyNotifications && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1"
              data-testid="button-save"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
              data-testid="button-reset"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restaurar Padrão
            </Button>
          </div>
        )}
      </div>

      {/* Modal de Envio de Notificações */}
      <SendNotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        user={user}
      />
    </MobileLayout>
  );
}
