/**
 * Notification Settings Component
 * Configurações de notificações por email e outras
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Calendar, MessageSquare, FileText } from 'lucide-react';

interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  meetingReminders: boolean;
  messageAlerts: boolean;
  weeklyReport: boolean;
}

interface NotificationSettingsProps {
  settings: NotificationSettings;
  onChange: (settings: NotificationSettings) => void;
}

export function NotificationSettingsCard({ settings, onChange }: NotificationSettingsProps) {
  const handleChange = (key: keyof NotificationSettings, value: boolean) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const notificationOptions = [
    {
      key: 'emailEnabled' as const,
      icon: Mail,
      label: 'Notificações por email',
      description: 'Receber atualizações importantes por email',
    },
    {
      key: 'pushEnabled' as const,
      icon: Bell,
      label: 'Notificações push',
      description: 'Notificações em tempo real no navegador',
    },
    {
      key: 'meetingReminders' as const,
      icon: Calendar,
      label: 'Lembretes de reuniões',
      description: 'Avisos antes de eventos e reuniões',
    },
    {
      key: 'messageAlerts' as const,
      icon: MessageSquare,
      label: 'Alertas de mensagens',
      description: 'Notificar sobre novas mensagens',
    },
    {
      key: 'weeklyReport' as const,
      icon: FileText,
      label: 'Relatório semanal',
      description: 'Resumo semanal de atividades',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações
        </CardTitle>
        <CardDescription>
          Gerencie como e quando você recebe notificações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {notificationOptions.map(({ key, icon: Icon, label, description }) => (
          <div key={key} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </Label>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Switch
              checked={settings[key]}
              onCheckedChange={(value) => handleChange(key, value)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default NotificationSettingsCard;
