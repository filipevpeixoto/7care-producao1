import type React from 'react';

export interface PushUser {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  profilePhoto?: string;
}

export type SubscriptionItem = {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  user_agent?: string;
  created_at: string;
  is_active?: boolean;
};

export type StatCardProps = {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  iconClassName: string;
};

export type NotificationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationTitle: string;
  setNotificationTitle: (value: string) => void;
  notificationMessage: string;
  setNotificationMessage: (value: string) => void;
  notificationType: string;
  setNotificationType: (value: string) => void;
  selectedUserId: number | string | null;
  setSelectedUserId: (value: number | string | null) => void;
  subscriptionsList: SubscriptionItem[];
  showEmojiPicker: boolean;
  setShowEmojiPicker: (value: boolean) => void;
  imagePreview: string | null;
  removeImage: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  audioUrl: string | null;
  isPlayingAudio: boolean;
  pauseAudio: () => void;
  playAudio: () => void;
  removeAudio: () => void;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  loading: boolean;
  sendNotification: () => void;
};
