import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { hasAdminAccess } from '@/lib/permissions';
import { fetchWithAuth } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { pushLogger } from './constants';
import { useMediaHandlers } from './useMediaHandlers';
import type { PushUser, SubscriptionItem } from './types';

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('general');
  const [selectedUserId, setSelectedUserId] = useState<number | string | null>('all');
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const media = useMediaHandlers();
  const queryClient = useQueryClient();

  const isAdmin = !!user && hasAdminAccess(user);

  const { data: usersList = [] } = useQuery<PushUser[]>({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await fetchWithAuth('/api/users');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.data || data?.users || [];
    },
    enabled: isAdmin,
    staleTime: 60_000,
  });

  const { data: subscriptionsList = [] } = useQuery<SubscriptionItem[]>({
    queryKey: ['push-subscriptions'],
    queryFn: async () => {
      const res = await fetch('/api/push/subscriptions');
      if (!res.ok) return [];
      const data = await res.json();
      const allSubscriptions = data.subscriptions || data || [];
      const userMap = new Map();
      allSubscriptions.forEach((sub: { user_id: number; created_at: string }) => {
        if (!userMap.has(sub.user_id) || new Date(sub.created_at) > new Date(userMap.get(sub.user_id).created_at)) {
          userMap.set(sub.user_id, sub);
        }
      });
      return Array.from(userMap.values());
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const loadSubscriptions = () => {
    queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
  };

  // Subscription management
  const toggleSubscription = async (subscriptionId: number, isActive: boolean) => {
    try {
      const res = await fetch(`/api/push/subscriptions/${subscriptionId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!res.ok) {
        throw new Error('Falha ao atualizar subscription');
      }

      toast({
        title: isActive ? t('pushNotifications.subscriptionDeactivated') : t('pushNotifications.subscriptionActivated'),
        description: isActive
          ? t('pushNotifications.subscriptionDeactivatedDesc')
          : t('pushNotifications.subscriptionActivatedDesc'),
      });

      loadSubscriptions();
    } catch {
      toast({
        title: t('pushNotifications.updateError'),
        description: t('pushNotifications.tryAgainLater'),
        variant: 'destructive',
      });
    }
  };

  const deleteSubscription = async (subscriptionId: number, userName: string) => {
    if (!confirm(t('pushNotifications.confirmDeleteSubscription', { name: userName }))) {
      return;
    }

    try {
      const res = await fetch(`/api/push/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Falha ao excluir subscription');
      }

      toast({
        title: t('pushNotifications.subscriptionDeleted'),
        description: t('pushNotifications.userRemovedFromNotifications', { name: userName }),
      });

      loadSubscriptions();
    } catch {
      toast({
        title: t('pushNotifications.deleteError'),
        description: t('pushNotifications.tryAgainLater'),
        variant: 'destructive',
      });
    }
  };

  // Send notification
  const sendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({
        title: t('pushNotifications.requiredFields'),
        description: t('pushNotifications.fillTitleAndMessage'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, string | number | boolean | null> = {
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        userId: selectedUserId === 'all' ? null : Number(selectedUserId),
        hasImage: !!media.selectedImage,
        hasAudio: !!media.audioBlob,
        imageName: media.selectedImage?.name || null,
        audioSize: media.audioBlob?.size || null,
      };

      if (media.audioBlob) {
        const audioBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(media.audioBlob!);
        });
        payload.audioData = audioBase64;

        pushLogger.debug('Áudio convertido para Base64:', {
          size: media.audioBlob.size,
          type: media.audioBlob.type,
          base64Length: audioBase64.length,
        });
      }

      if (media.selectedImage) {
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(media.selectedImage!);
        });
        payload.imageData = imageBase64;

        pushLogger.debug('Imagem convertida para Base64:', {
          name: media.selectedImage.name,
          size: media.selectedImage.size,
          type: media.selectedImage.type,
          base64Length: imageBase64.length,
        });
      }

      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Falha ao enviar notificação');
      }

      const data = await res.json();

      toast({
        title: t('pushNotifications.notificationSent'),
        description: t('pushNotifications.sentToUsers', { count: data.sentTo || subscriptionsList.length }),
      });

      // Clear form
      setNotificationTitle('');
      setNotificationMessage('');
      setNotificationType('general');
      setSelectedUserId('all');
      setShowNotificationModal(false);
      media.removeImage();
      media.removeAudio();
      setShowEmojiPicker(false);
    } catch {
      toast({
        title: t('pushNotifications.sendError'),
        description: t('pushNotifications.tryAgainLater'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAdmin,
    usersList,
    subscriptionsList,
    loadSubscriptions,
    showNotificationModal,
    setShowNotificationModal,
    notificationTitle,
    setNotificationTitle,
    notificationMessage,
    setNotificationMessage,
    notificationType,
    setNotificationType,
    selectedUserId,
    setSelectedUserId,
    loading,
    imagePreview: media.imagePreview,
    removeImage: media.removeImage,
    fileInputRef: media.fileInputRef,
    handleImageSelect: media.handleImageSelect,
    audioUrl: media.audioUrl,
    isPlayingAudio: media.isPlayingAudio,
    pauseAudio: media.pauseAudio,
    playAudio: media.playAudio,
    removeAudio: media.removeAudio,
    isRecording: media.isRecording,
    startRecording: media.startRecording,
    stopRecording: media.stopRecording,
    showEmojiPicker,
    setShowEmojiPicker,
    toggleSubscription,
    deleteSubscription,
    sendNotification,
  };
}
