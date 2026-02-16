import { settingsLogger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { TabsContent } from '@/components/ui/tabs';
import { Bell } from 'lucide-react';
import type { SettingsData, UpdateSetting, ToastFn } from './types';

interface NotificationsTabProps {
  settings: SettingsData;
  updateSetting: UpdateSetting;
  isPushEnabled: boolean;
  isSupported: boolean;
  subscribe: () => Promise<PushSubscription>;
  unsubscribe: () => Promise<void>;
  saveSubscriptionToServer: (subscription: PushSubscription) => Promise<unknown>;
  removeSubscriptionFromServer: () => Promise<unknown>;
  setIsPushEnabled: (value: boolean) => void;
  toast: ToastFn;
}

export const NotificationsTab = ({
  settings,
  updateSetting,
  isPushEnabled,
  isSupported,
  subscribe,
  unsubscribe,
  saveSubscriptionToServer,
  removeSubscriptionFromServer,
  setIsPushEnabled,
  toast,
}: NotificationsTabProps) => (
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
            <div className="text-xs text-muted-foreground">Receba atualizações por email</div>
          </div>
          <Switch
            checked={settings.notifications.emailEnabled}
            onCheckedChange={(checked) => updateSetting('notifications', 'emailEnabled', checked)}
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
              settingsLogger.debug('Tentando alterar notificações push para:', checked);
              settingsLogger.debug('isSupported:', isSupported);

              try {
                if (checked) {
                  settingsLogger.debug('Ativando push notifications...');

                  if (!isSupported) {
                    settingsLogger.debug('Push notifications não suportadas');
                    toast({
                      title: 'Não suportado',
                      description: 'Seu navegador não suporta notificações push.',
                      variant: 'destructive',
                    });
                    return;
                  }

                  settingsLogger.debug('Solicitando permissão...');
                  const subscription = await subscribe();
                  settingsLogger.debug('Subscription criada:', subscription);

                  settingsLogger.debug('Salvando no servidor...');
                  await saveSubscriptionToServer(subscription);
                  settingsLogger.debug('Subscription salva no servidor');

                  setIsPushEnabled(true);
                  updateSetting('notifications', 'pushEnabled', true);

                  toast({
                    title: 'Notificações ativadas',
                    description: 'Você receberá notificações push no seu dispositivo.',
                  });
                } else {
                  settingsLogger.debug('Desativando push notifications...');

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
                settingsLogger.error('Error toggling push notifications:', error);
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
            onCheckedChange={(checked) => updateSetting('notifications', 'meetingReminders', checked)}
            data-testid="switch-meeting-reminders"
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Alertas de mensagens</div>
            <div className="text-xs text-muted-foreground">Notificações de novas mensagens</div>
          </div>
          <Switch
            checked={settings.notifications.messageAlerts}
            onCheckedChange={(checked) => updateSetting('notifications', 'messageAlerts', checked)}
            data-testid="switch-message-alerts"
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Relatório semanal</div>
            <div className="text-xs text-muted-foreground">Resumo das atividades da semana</div>
          </div>
          <Switch
            checked={settings.notifications.weeklyReport}
            onCheckedChange={(checked) => updateSetting('notifications', 'weeklyReport', checked)}
            data-testid="switch-weekly-report"
          />
        </div>
      </CardContent>
    </Card>
  </TabsContent>
);
