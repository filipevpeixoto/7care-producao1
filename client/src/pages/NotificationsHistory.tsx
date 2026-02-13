import { Bell, Volume2, Image as ImageIcon, Clock, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { createLogger } from '@/lib/logger';

const notificationsLogger = createLogger('Notifications');

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  hasAudio: boolean;
  hasImage: boolean;
  audioData?: string;
  imageData?: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationsHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Carregar notificações do banco de dados E localStorage
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.id) return;

      try {
        // 1. Buscar do banco de dados (fonte principal)
        const res = await fetch(`/api/notifications/${user.id}?limit=50`);
        if (res.ok) {
          const dbNotifications = await res.json();
          notificationsLogger.debug('Notificações do banco:', dbNotifications.length);

          // Converter formato do BD para o formato da interface
          const formattedNotifications = dbNotifications.map((notif: any) => ({
            id: notif.id.toString(),
            title: notif.title,
            message: notif.message,
            type: notif.type,
            hasAudio: false,
            hasImage: false,
            timestamp: notif.created_at || notif.createdAt,
            read: notif.is_read || notif.isRead || false,
          }));

          setNotifications(formattedNotifications);
        } else {
          // Fallback para localStorage se API falhar
          const stored = localStorage.getItem(`notifications_${user.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            setNotifications(parsed);
          }
        }
      } catch (error) {
        notificationsLogger.error('Erro ao carregar notificações:', error);

        // Fallback para localStorage
        try {
          const stored = localStorage.getItem(`notifications_${user.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            setNotifications(parsed);
          }
        } catch (e) {
          notificationsLogger.error('Erro ao carregar do localStorage:', e);
        }
      }
    };

    loadNotifications();

    // Recarregar a cada 30 segundos para pegar novas notificações
    const interval = setInterval(loadNotifications, 30000);

    // Listener para novas notificações (local)
    const handleNewNotification = (event: CustomEvent) => {
      const newNotif = event.detail;
      setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    };

    window.addEventListener('newNotification', handleNewNotification as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('newNotification', handleNewNotification as EventListener);
    };
  }, [user?.id]);

  const playAudio = (notification: Notification) => {
    if (!notification.audioData) return;

    try {
      // Parar áudio anterior se houver
      const existingAudio = document.querySelector('audio.notification-player') as HTMLAudioElement;
      if (existingAudio) {
        existingAudio.pause();
        existingAudio.remove();
      }

      // Criar novo elemento de áudio
      const audio = new Audio(notification.audioData);
      audio.className = 'notification-player';

      // Atributos para iOS
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      audio.preload = 'auto';

      setPlayingAudioId(notification.id);

      audio.addEventListener('ended', () => {
        setPlayingAudioId(null);
        audio.remove();
      });

      audio.addEventListener('error', () => {
        toast({
          title: 'Erro ao reproduzir áudio',
          description: 'Não foi possível reproduzir o áudio desta notificação.',
          variant: 'destructive',
        });
        setPlayingAudioId(null);
        audio.remove();
      });

      audio.play().catch(err => {
        notificationsLogger.error('Erro ao tocar áudio:', err);
        toast({
          title: 'Erro ao reproduzir',
          description: 'Por favor, tente novamente.',
          variant: 'destructive',
        });
        setPlayingAudioId(null);
      });
    } catch (error) {
      notificationsLogger.error('Erro ao criar áudio:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao tentar reproduzir o áudio.',
        variant: 'destructive',
      });
      setPlayingAudioId(null);
    }
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    localStorage.setItem(`notifications_${user?.id}`, JSON.stringify(updated));

    toast({
      title: 'Notificação excluída',
      description: 'A notificação foi removida do histórico.',
    });
  };

  const clearAll = () => {
    if (confirm('Deseja realmente limpar todo o histórico de notificações?')) {
      setNotifications([]);
      localStorage.removeItem(`notifications_${user?.id}`);
      toast({
        title: 'Histórico limpo',
        description: 'Todas as notificações foram removidas.',
      });
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Agora';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours}h`;
      if (diffDays < 7) return `Há ${diffDays}d`;

      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return '🚨';
      case 'reminder':
        return '⏰';
      case 'announcement':
        return '📣';
      default:
        return '📢';
    }
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 pb-24 md:pb-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Notificações
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Histórico de notificações recebidas
                  </p>
                </div>
              </div>
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                >
                  Limpar tudo
                </Button>
              )}
            </div>
          </div>

          {/* Lista de Notificações */}
          {notifications.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Nenhuma notificação
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Você não recebeu notificações ainda
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map(notification => (
                <Card
                  key={notification.id}
                  className="group hover:shadow-lg transition-all duration-200 border-l-4"
                  style={{
                    borderLeftColor:
                      notification.type === 'urgent'
                        ? '#ef4444'
                        : notification.type === 'reminder'
                          ? '#f59e0b'
                          : notification.type === 'announcement'
                            ? '#8b5cf6'
                            : '#3b82f6',
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Ícone do tipo */}
                      <div className="text-2xl mt-1 flex-shrink-0">
                        {getTypeIcon(notification.type)}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatDate(notification.timestamp)}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                          {notification.message}
                        </p>

                        {/* Mídia */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {notification.hasAudio && notification.audioData && (
                            <Button
                              size="sm"
                              variant={playingAudioId === notification.id ? 'default' : 'outline'}
                              onClick={() => playAudio(notification)}
                              className="gap-2"
                            >
                              <Volume2 className="h-4 w-4" />
                              {playingAudioId === notification.id ? 'Tocando...' : 'Ouvir Áudio'}
                            </Button>
                          )}

                          {notification.hasImage && notification.imageData && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Abrir imagem em modal ou nova aba
                                window.open(notification.imageData, '_blank');
                              }}
                              className="gap-2"
                            >
                              <ImageIcon className="h-4 w-4" />
                              Ver Imagem
                            </Button>
                          )}

                          <div className="flex-1" />

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notification.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
