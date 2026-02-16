import { MobileLayout } from '@/components/layout/MobileLayout';
import { hasAdminAccess } from '@/lib/permissions';
import {
  HeaderSection,
  StatsGrid,
  ActionButtons,
  SubscriptionsList,
  NotificationModal,
  AccessDenied,
  usePushNotifications,
} from './push-notifications';

export default function PushNotifications() {
  const {
    user,
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
    showEmojiPicker,
    setShowEmojiPicker,
    toggleSubscription,
    deleteSubscription,
    sendNotification,
  } = usePushNotifications();

  if (!user || !hasAdminAccess(user)) {
    return <AccessDenied />;
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 p-4 md:p-6">
        <HeaderSection />
        <StatsGrid
          subscriptionsCount={subscriptionsList.length}
          usersCount={usersList.length}
        />
        <ActionButtons
          onNewNotification={() => setShowNotificationModal(true)}
          onRefresh={loadSubscriptions}
        />
        <SubscriptionsList
          subscriptions={subscriptionsList}
          onDelete={deleteSubscription}
          onToggle={toggleSubscription}
        />
        <NotificationModal
          open={showNotificationModal}
          onOpenChange={setShowNotificationModal}
          notificationTitle={notificationTitle}
          setNotificationTitle={setNotificationTitle}
          notificationMessage={notificationMessage}
          setNotificationMessage={setNotificationMessage}
          notificationType={notificationType}
          setNotificationType={setNotificationType}
          selectedUserId={selectedUserId}
          setSelectedUserId={setSelectedUserId}
          subscriptionsList={subscriptionsList}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          imagePreview={imagePreview}
          removeImage={removeImage}
          fileInputRef={fileInputRef}
          handleImageSelect={handleImageSelect}
          audioUrl={audioUrl}
          isPlayingAudio={isPlayingAudio}
          pauseAudio={pauseAudio}
          playAudio={playAudio}
          removeAudio={removeAudio}
          isRecording={isRecording}
          startRecording={startRecording}
          stopRecording={stopRecording}
          loading={loading}
          sendNotification={sendNotification}
        />
      </div>
    </MobileLayout>
  );
}
