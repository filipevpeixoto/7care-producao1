/**
 * Push Notifications Settings Component
 * Configurações de notificações push
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, Send, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface User {
  id: number;
  name: string;
  email: string;
}

interface PushSubscription {
  id: number;
  userId: number;
  deviceName: string;
  isActive: boolean;
  createdAt: string;
}

export function PushNotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSupported, subscription, subscribe, unsubscribe } = usePushNotifications();
  
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [sendingNotification, setSendingNotification] = useState(false);

  // Carregar usuários
  useEffect(() => {
    loadUsers();
    loadSubscriptions();
  }, [user?.id]);

  // Verificar estado do push
  useEffect(() => {
    setIsPushEnabled(!!subscription);
  }, [subscription]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const response = await fetch('/api/push/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
    }
  };

  const handleTogglePush = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      if (enabled) {
        await subscribe();
        toast({
          title: 'Notificações ativadas',
          description: 'Você receberá notificações push neste dispositivo.',
        });
      } else {
        await unsubscribe();
        toast({
          title: 'Notificações desativadas',
          description: 'Você não receberá mais notificações neste dispositivo.',
        });
      }
      setIsPushEnabled(enabled);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar as configurações de notificação.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o título e a mensagem da notificação.',
        variant: 'destructive',
      });
      return;
    }

    setSendingNotification(true);
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId === 'all' ? null : parseInt(selectedUserId),
          title: notificationTitle,
          body: notificationMessage,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Notificação enviada',
          description: `Enviado para ${data.sent || 0} dispositivo(s).`,
        });
        setNotificationTitle('');
        setNotificationMessage('');
      } else {
        throw new Error(data.error || 'Erro ao enviar');
      }
    } catch (error) {
      toast({
        title: 'Erro ao enviar',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSendingNotification(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações Push
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Seu navegador não suporta notificações push.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Gerencie notificações em tempo real para este dispositivo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle de notificações */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Notificações neste dispositivo</Label>
            <p className="text-sm text-muted-foreground">
              Receba alertas importantes diretamente
            </p>
          </div>
          <Switch
            checked={isPushEnabled}
            onCheckedChange={handleTogglePush}
            disabled={isLoading}
          />
        </div>

        {isPushEnabled && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Notificações ativadas neste dispositivo
            </AlertDescription>
          </Alert>
        )}

        {/* Seção de envio (apenas admin) */}
        {user?.role === 'superadmin' && (
          <>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Enviar Notificação</h4>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Destinatário</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {allUsers.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Título da notificação"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Input
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Corpo da mensagem"
                  />
                </div>

                <Button 
                  onClick={sendNotification} 
                  disabled={sendingNotification}
                  className="w-full"
                >
                  {sendingNotification ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar Notificação
                </Button>
              </div>
            </div>

            {/* Lista de inscrições */}
            {subscriptions.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">
                  Dispositivos Inscritos ({subscriptions.length})
                </h4>
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <div 
                      key={sub.id} 
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <div>
                        <p className="text-sm font-medium">{sub.deviceName}</p>
                        <p className="text-xs text-muted-foreground">
                          Usuário #{sub.userId}
                        </p>
                      </div>
                      <Badge variant={sub.isActive ? 'default' : 'secondary'}>
                        {sub.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PushNotificationSettings;
