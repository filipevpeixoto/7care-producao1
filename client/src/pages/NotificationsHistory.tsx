import { Bell, Volume2, Image as ImageIcon, Clock, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { createLogger } from '@/lib/logger';
import { useTranslation } from 'react-i18next';

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

interface RawNotification {
  id: number | string;
  title: string;
  message: string;
  type: string;
  created_at?: string;
  createdAt?: string;
  is_read?: boolean;
  isRead?: boolean;
}

export default function NotificationsHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const { t } = useTranslation();

  const notificationsQueryKey = ['notifications', user?.id] as const;

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: notificationsQueryKey,
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        const res = await fetch(`/api/notifications/${user.id}?limit=50`);
        if (res.ok) {
          const dbNotifications: RawNotification[] = await res.json();
          notificationsLogger.debug('Notificações do banco:', dbNotifications.length);

          return dbNotifications.map((notif) => ({
            id: notif.id.toString(),
            title: notif.title,
            message: notif.message,
            type: notif.type,
            hasAudio: false,
            hasImage: false,
            timestamp: notif.created_at || notif.createdAt || '',
            read: notif.is_read || notif.isRead || false,
          }));
        }

        // Fallback para localStorage se API falhar
        const stored = localStorage.getItem(`notifications_${user.id}`);
        if (stored) return JSON.parse(stored) as Notification[];
        return [];
      } catch (error) {
        notificationsLogger.error('Erro ao carregar notificações:', error);

        // Fallback para localStorage
        try {
          const stored = localStorage.getItem(`notifications_${user.id}`);
          if (stored) return JSON.parse(stored) as Notification[];
        } catch (e) {
          notificationsLogger.error('Erro ao carregar do localStorage:', e);
        }
        return [];
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // Listener para novas notificações (local)
  useEffect(() => {
    const handleNewNotification = (event: CustomEvent) => {
      const newNotif = event.detail as Notification;
      queryClient.setQueryData<Notification[]>(notificationsQueryKey, (prev = []) =>
        [newNotif, ...prev].slice(0, 50),
      );
    };

    window.addEventListener('newNotification', handleNewNotification as EventListener);

    return () => {
      window.removeEventListener('newNotification', handleNewNotification as EventListener);
    };
  }, [queryClient, notificationsQueryKey]);

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
          title: t('notificationsHistory.audioPlaybackError'),
          description: t('notificationsHistory.audioPlaybackErrorDesc'),
          variant: 'destructive',
        });
        setPlayingAudioId(null);
        audio.remove();
      });

      audio.play().catch(err => {
        notificationsLogger.error('Erro ao tocar áudio:', err);
        toast({
          title: t('notificationsHistory.playbackError'),
          description: t('notificationsHistory.tryAgain'),
          variant: 'destructive',
        });
        setPlayingAudioId(null);
      });
    } catch (error) {
      notificationsLogger.error('Erro ao criar áudio:', error);
      toast({
        title: t('notificationsHistory.error'),
        description: t('notificationsHistory.audioError'),
        variant: 'destructive',
      });
      setPlayingAudioId(null);
    }
  };

  const deleteNotification = useCallback((id: string) => {
    queryClient.setQueryData<Notification[]>(notificationsQueryKey, (prev = []) => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem(`notifications_${user?.id}`, JSON.stringify(updated));
      return updated;
    });

    toast({
      title: t('notificationsHistory.notificationDeleted'),
      description: t('notificationsHistory.notificationDeletedDesc'),
    });
  }, [queryClient, notificationsQueryKey, user?.id, toast]);

  const clearAll = useCallback(() => {
    if (confirm(t('notificationsHistory.confirmClearAll'))) {
      queryClient.setQueryData<Notification[]>(notificationsQueryKey, []);
      localStorage.removeItem(`notifications_${user?.id}`);
      toast({
        title: t('notificationsHistory.historyCleared'),
        description: t('notificationsHistory.historyClearedDesc'),
      });
    }
  }, [queryClient, notificationsQueryKey, user?.id, toast]);

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return t('notificationsHistory.now');
      if (diffMins < 60) return t('notificationsHistory.minutesAgo', { count: diffMins });
      if (diffHours < 24) return t('notificationsHistory.hoursAgo', { count: diffHours });
      if (diffDays < 7) return t('notificationsHistory.daysAgo', { count: diffDays });

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
                    {t('notificationsHistory.title')}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('notificationsHistory.subtitle')}
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
                  {t('notificationsHistory.clearAll')}
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
                  {t('notificationsHistory.noNotifications')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('notificationsHistory.noNotificationsDesc')}
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
                              {playingAudioId === notification.id ? t('notificationsHistory.playing') : t('notificationsHistory.listenAudio')}
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
                              {t('notificationsHistory.viewImage')}
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
