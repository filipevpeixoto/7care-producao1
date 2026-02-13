/* eslint-disable @typescript-eslint/no-explicit-any, no-nested-ternary, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Bell, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { hasAdminAccess } from '@/lib/permissions';
import { fetchWithAuth } from '@/lib/api';

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export function SendNotificationModal({ isOpen, onClose, user }: SendNotificationModalProps) {
  const { toast } = useToast();

  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('general');
  const [isSending, setIsSending] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | string | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [_subscriptionsList, setSubscriptionsList] = useState<any[]>([]);

  const loadUsers = async () => {
    try {
      const response = await fetchWithAuth('/api/users');
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

  const sendNotification = async () => {
    if (isSending) return;
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
        headers: { 'Content-Type': 'application/json' },
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
      onClose();

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

  useEffect(() => {
    if (isOpen && hasAdminAccess(user)) {
      loadUsers();
      loadSubscriptions();
    }
  }, [isOpen, user?.role]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Enviar Notificação Push
          </DialogTitle>
          <DialogDescription>
            Envie uma notificação personalizada para os usuários
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notification-title">Título</Label>
            <Input
              id="notification-title"
              placeholder="Digite o título da notificação"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-message">Mensagem</Label>
            <textarea
              id="notification-message"
              className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite a mensagem da notificação"
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-type">Tipo</Label>
            <Select value={notificationType} onValueChange={setNotificationType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Geral</SelectItem>
                <SelectItem value="announcement">Anúncio</SelectItem>
                <SelectItem value="reminder">Lembrete</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-user">Destinatário (opcional)</Label>
            <Select
              value={selectedUserId?.toString() || ''}
              onValueChange={(value) =>
                setSelectedUserId(value === 'all' ? 'all' : value ? parseInt(value) : null)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os usuários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {usersList.map((u) => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Preview:</strong>
            </div>
            <div className="text-sm text-blue-700 mt-1">
              <div className="font-medium">{notificationTitle || 'Título da notificação'}</div>
              <div className="text-xs">{notificationMessage || 'Mensagem da notificação'}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={sendNotification}
            disabled={!notificationTitle || !notificationMessage || isSending}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
