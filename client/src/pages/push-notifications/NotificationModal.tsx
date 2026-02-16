import { Button } from '@/components/ui/button';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  Send,
  RefreshCw,
  Smile,
  Image,
  Mic,
  Play,
  Pause,
  Trash2,
  X,
} from 'lucide-react';
import { ariaLabels } from '@/lib/accessibility';
import { useTranslation } from 'react-i18next';
import { POPULAR_EMOJIS } from './constants';
import type { NotificationModalProps } from './types';

export const NotificationModal = ({
  open,
  onOpenChange,
  notificationTitle,
  setNotificationTitle,
  notificationMessage,
  setNotificationMessage,
  notificationType,
  setNotificationType,
  selectedUserId,
  setSelectedUserId,
  subscriptionsList,
  showEmojiPicker,
  setShowEmojiPicker,
  imagePreview,
  removeImage,
  fileInputRef,
  handleImageSelect,
  audioUrl,
  isPlayingAudio,
  pauseAudio,
  playAudio,
  removeAudio,
  isRecording,
  startRecording,
  stopRecording,
  loading,
  sendNotification,
}: NotificationModalProps) => {
  const { t } = useTranslation();
  return (
    <DialogWithModalTracking
      modalId="push-notification-modal"
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            {t('pushNotifications.richNotification')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-sm font-semibold">{t('pushNotifications.notificationTitleLabel')}</Label>
            <Input
              value={notificationTitle}
              onChange={(event) => setNotificationTitle(event.target.value)}
              placeholder={t('pushNotifications.titlePlaceholder')}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold flex items-center justify-between">
              <span>{t('pushNotifications.messageLabel')}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="h-8 px-2"
              >
                <Smile className="h-4 w-4 mr-1" />
                {t('pushNotifications.emojis')}
              </Button>
            </Label>

            {showEmojiPicker && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                <div className="flex flex-wrap gap-2">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setNotificationMessage(notificationMessage + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-2xl hover:bg-white p-2 rounded transition-colors"
                      aria-label={ariaLabels.emojiButton(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Textarea
              value={notificationMessage}
              onChange={(event) => setNotificationMessage(event.target.value)}
              placeholder={t('pushNotifications.messagePlaceholder')}
              className="mt-1.5 min-h-[100px]"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold">{t('pushNotifications.imageOptional')}</Label>
            <div className="mt-1.5">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removeImage}
                    className="absolute top-2 right-2"
                    aria-label={ariaLabels.removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <Image className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">{t('pushNotifications.clickToSelectImage')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('pushNotifications.imageLimit')}</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold">{t('pushNotifications.audioOptional')}</Label>
            <div className="mt-1.5 space-y-2">
              {audioUrl ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={isPlayingAudio ? pauseAudio : playAudio}
                    aria-label={isPlayingAudio ? ariaLabels.pauseAudio : ariaLabels.playAudio}
                  >
                    {isPlayingAudio ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('pushNotifications.audioRecorded')}</p>
                    <p className="text-xs text-gray-500">{t('pushNotifications.clickToListen')}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeAudio}
                    aria-label={ariaLabels.removeAudio}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant={isRecording ? 'destructive' : 'outline'}
                  onClick={isRecording ? stopRecording : startRecording}
                  className="w-full"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  {isRecording ? t('pushNotifications.stopRecording') : t('pushNotifications.recordAudio')}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold">{t('pushNotifications.typeLabel')}</Label>
              <Select value={notificationType} onValueChange={setNotificationType}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t('pushNotifications.typeGeneral')}</SelectItem>
                  <SelectItem value="announcement">{t('pushNotifications.typeAnnouncement')}</SelectItem>
                  <SelectItem value="reminder">{t('pushNotifications.typeReminder')}</SelectItem>
                  <SelectItem value="urgent">{t('pushNotifications.typeUrgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold">{t('pushNotifications.recipientLabel')}</Label>
              <Select
                value={String(selectedUserId)}
                onValueChange={(val) => setSelectedUserId(val === 'all' ? 'all' : Number(val))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('pushNotifications.allRecipients', { count: subscriptionsList.length })}</SelectItem>
                  {subscriptionsList.map((sub) => (
                    <SelectItem key={sub.id} value={String(sub.user_id)}>
                      {sub.user_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t('pushNotifications.cancel')}
            </Button>
            <Button
              onClick={sendNotification}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('pushNotifications.sending')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('pushNotifications.sendNotification')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogWithModalTracking>
  );
};
