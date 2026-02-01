import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Bell, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationsSettingsProps {
  settings: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    meetingReminders: boolean;
    messageAlerts: boolean;
    weeklyReport: boolean;
  };
  onUpdate: (key: string, value: boolean) => void;
  isAdmin: boolean;
  userId?: number;
}

export function NotificationsSettings({
  settings,
  onUpdate,
  isAdmin,
  userId,
}: NotificationsSettingsProps) {
  const { toast } = useToast();
  const { isSupported, isSubscribed, requestPermission, subscribe, unsubscribe } =
    usePushNotifications();

  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('general');
  const [selectedUserId, setSelectedUserId] = useState<number | string | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setIsPushEnabled(isSubscribed);
  }, [isSubscribed]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadSubscriptions();
    }
  }, [isAdmin]);

  const saveSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  };

  const removeSubscriptionFromServer = async () => {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
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

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsersList(data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const response = await fetch('/api/push/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionsList(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const handlePushToggle = async (checked: boolean) => {
    try {
      if (checked) {
        if (!isSupported) {
          toast({
            title: 'Não suportado',
            description: 'Notificações push não são suportadas neste navegador.',
            variant: 'destructive',
          });
          return;
        }

        const permission = await requestPermission();
        if (!permission) {
          toast({
            title: 'Permissão negada',
            description: 'Você precisa permitir notificações para usar este recurso.',
            variant: 'destructive',
          });
          return;
        }

        const subscription = await subscribe();
        if (subscription) {
          await saveSubscriptionToServer(subscription);
          setIsPushEnabled(true);
          toast({
            title: 'Notificações ativadas',
            description: 'Você receberá notificações push.',
          });
        }
      } else {
        await unsubscribe();
        await removeSubscriptionFromServer();
        setIsPushEnabled(false);
        toast({
          title: 'Notificações desativadas',
          description: 'Você não receberá mais notificações push.',
        });
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar as notificações push.',
        variant: 'destructive',
      });
    }
  };

  const sendNotification = async () => {
    try {
      if (!notificationTitle || !notificationMessage) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Título e mensagem são obrigatórios.',
          variant: 'destructive',
        });
        return;
      }

      setIsSending(true);

      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
          userId: selectedUserId === 'all' ? null : selectedUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      const data = await response.json();

      toast({
        title: 'Notificação enviada',
        description: `Enviada para ${data.sentTo} usuário(s).`,
      });

      setNotificationTitle('');
      setNotificationMessage('');
      setNotificationType('general');
      setSelectedUserId(null);
      setShowNotificationModal(false);

      await loadSubscriptions();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a notificação.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
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
              checked={settings.emailEnabled}
              onCheckedChange={checked => onUpdate('emailEnabled', checked)}
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
              onCheckedChange={handlePushToggle}
              data-testid="switch-push-notifications"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Lembretes de reuniões</div>
              <div className="text-xs text-muted-foreground">
                Receba lembretes antes das reuniões
              </div>
            </div>
            <Switch
              checked={settings.meetingReminders}
              onCheckedChange={checked => onUpdate('meetingReminders', checked)}
              data-testid="switch-meeting-reminders"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Alertas de mensagens</div>
              <div className="text-xs text-muted-foreground">Receba alertas de novas mensagens</div>
            </div>
            <Switch
              checked={settings.messageAlerts}
              onCheckedChange={checked => onUpdate('messageAlerts', checked)}
              data-testid="switch-message-alerts"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Relatório semanal</div>
              <div className="text-xs text-muted-foreground">
                Receba um resumo semanal de atividades
              </div>
            </div>
            <Switch
              checked={settings.weeklyReport}
              onCheckedChange={checked => onUpdate('weeklyReport', checked)}
              data-testid="switch-weekly-report"
            />
          </div>
        </CardContent>
      </Card>

      {/* Admin Push Management */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Gerenciar Notificações Push
            </CardTitle>
            <CardDescription>Envie notificações para usuários do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  {subscriptionsList.length} usuário(s) com notificações ativas
                </p>
              </div>
              <Button onClick={() => setShowNotificationModal(true)}>
                <Send className="h-4 w-4 mr-2" />
                Enviar Notificação
              </Button>
            </div>

            {subscriptionsList.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionsList.map((sub: any) => (
                    <TableRow key={sub.id}>
                      <TableCell>{sub.userName || 'Usuário'}</TableCell>
                      <TableCell>{sub.userEmail || '-'}</TableCell>
                      <TableCell>
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Send Notification Modal */}
      <Dialog open={showNotificationModal} onOpenChange={setShowNotificationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Notificação Push</DialogTitle>
            <DialogDescription>
              Envie uma notificação para todos os usuários ou para um usuário específico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Destinatário</Label>
              <Select
                value={selectedUserId?.toString() || 'all'}
                onValueChange={val => setSelectedUserId(val === 'all' ? 'all' : parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destinatário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {usersList.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={notificationType} onValueChange={setNotificationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de notificação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="alert">Alerta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                placeholder="Título da notificação"
                value={notificationTitle}
                onChange={e => setNotificationTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                placeholder="Mensagem da notificação"
                value={notificationMessage}
                onChange={e => setNotificationMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNotificationModal(false)}>
                Cancelar
              </Button>
              <Button onClick={sendNotification} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
