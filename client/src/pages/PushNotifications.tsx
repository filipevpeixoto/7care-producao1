import { Bell, RefreshCw, Send, Trash2, Zap } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ariaLabels } from '@/lib/accessibility';
import {
  PrototypeAvatar,
  PrototypeHeaderIconButton,
  PrototypeStatusBar,
} from './v2/prototypeShared';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import {
  HeaderSection,
  StatsGrid,
  ActionButtons,
  SubscriptionsList,
  NotificationModal,
  AccessDenied,
  usePushNotifications,
  getDeviceInfo,
} from './push-notifications';

export default function PushNotifications() {
  const { skin } = useTheme();
  const { user } = useAuth();
  const {
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

  const coverage =
    usersList.length > 0 ? Math.round((subscriptionsList.length / usersList.length) * 100) : 0;

  const modal = (
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
  );

  if (skin === 'v2') {
    return (
      <MobileLayout variant="prototype">
        <div className="p7-shell">
          <div className="p7-screen">
            <PrototypeStatusBar />
            <div className="p7-grad-header">
              <div className="p7-header-row">
                <div>
                  <div className="p7-header-label">Mensageria</div>
                  <div className="p7-header-title">Push notifications</div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <PrototypeHeaderIconButton
                    icon={RefreshCw}
                    onClick={loadSubscriptions}
                    label="Atualizar assinaturas push"
                  />
                  <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
                </div>
              </div>
            </div>

            <div className="p7-scroll">
              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                    Entrega pastoral
                  </div>
                  <p className="prose-narrow text-[0.86rem] leading-[1.6] text-[var(--p7-text-2)]">
                    Centralize campanhas, acompanhe quem ainda recebe alertas e faça ajustes rápidos
                    antes de enviar um novo comunicado para a igreja.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setShowNotificationModal(true)}
                      className="flex min-h-[64px] items-center gap-3 rounded-[18px] bg-[var(--grad-h)] px-4 py-3 text-left text-white shadow-[var(--shadow-card)] transition-transform hover:-translate-y-[1px]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/12">
                        <Send className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Nova campanha</div>
                        <div className="text-xs text-white/70">Título, mídia e destinatários</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={loadSubscriptions}
                      className="flex min-h-[64px] items-center gap-3 rounded-[18px] border border-[var(--p7-border)] bg-[var(--p7-card)] px-4 py-3 text-left text-[var(--p7-text)] shadow-[var(--shadow-card)] transition-transform hover:-translate-y-[1px]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[color-mix(in_oklab,var(--v2-blue)_10%,transparent)] text-[var(--v2-blue)]">
                        <RefreshCw className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Atualizar base</div>
                        <div className="text-xs text-[var(--p7-text-3)]">
                          Sincronizar inscrições e status
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p7-section">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p7-stat-card">
                    <div className="p7-stat-num">{subscriptionsList.length}</div>
                    <div className="p7-stat-label">Ativas</div>
                  </div>
                  <div className="p7-stat-card">
                    <div className="p7-stat-num">{usersList.length}</div>
                    <div className="p7-stat-label">Usuários</div>
                  </div>
                  <div className="p7-stat-card">
                    <div className="p7-stat-num">{coverage}%</div>
                    <div className="p7-stat-label">Cobertura</div>
                  </div>
                </div>
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <div className="mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[var(--v2-gold)]" />
                    <span className="p7-card-title">Cobertura atual</span>
                  </div>
                  <p className="mb-3 text-[0.8rem] leading-[1.55] text-[var(--p7-text-2)]">
                    {coverage >= 80
                      ? 'A maioria da base já está pronta para receber campanhas em tempo real.'
                      : 'Ainda há espaço para ampliar o alcance das notificações e reduzir falhas de entrega.'}
                  </p>
                  <div className="rounded-[18px] border border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-4 py-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[0.82rem] font-semibold text-[var(--p7-text)]">
                        Alcance de dispositivos ativos
                      </span>
                      <span className="p7-pill gold">{coverage}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--v2-blue)_10%,transparent)]">
                      <div
                        className="h-full rounded-full bg-[var(--grad-gold)] transition-[width] duration-300"
                        style={{ width: `${coverage}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[0.72rem] text-[var(--p7-text-3)]">
                      <span>{subscriptionsList.length} dispositivos prontos</span>
                      <span>
                        {Math.max(usersList.length - subscriptionsList.length, 0)} sem push
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p7-section pb-4">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div>
                    <div className="text-[0.9rem] font-semibold text-[var(--p7-text)]">
                      Assinaturas ativas
                    </div>
                    <div className="text-[0.76rem] text-[var(--p7-text-3)]">
                      Dispositivos habilitados para receber campanhas e lembretes.
                    </div>
                  </div>
                  <span className="p7-pill soft">{subscriptionsList.length}</span>
                </div>

                {subscriptionsList.length === 0 ? (
                  <div className="p7-card p7-card-p">
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--p7-surface-2)] text-[var(--p7-text-3)]">
                        <Bell className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-[var(--p7-text)]">
                          Nenhuma assinatura ativa
                        </div>
                        <div className="max-w-[34ch] text-xs leading-[1.55] text-[var(--p7-text-3)]">
                          Atualize a base ou aguarde novos dispositivos habilitarem notificações
                          para enviar campanhas com segurança.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p7-card">
                    {subscriptionsList.map((subscription) => {
                      const isActive = subscription.is_active !== false;
                      const device = getDeviceInfo(subscription.user_agent || '');

                      return (
                        <div
                          key={subscription.id}
                          className="border-b border-[var(--p7-border)] px-4 py-3 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--grad-h)] text-sm font-bold text-white shadow-[var(--shadow-card)]">
                              {subscription.user_name?.charAt(0).toUpperCase() || '?'}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-sm font-semibold text-[var(--p7-text)]">
                                  {subscription.user_name}
                                </span>
                                <span className="p7-pill soft">
                                  <span>{device.icon}</span>
                                  <span>{device.name}</span>
                                </span>
                                <span className={isActive ? 'p7-pill green' : 'p7-pill red'}>
                                  {isActive ? 'Ativa' : 'Pausada'}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.74rem] text-[var(--p7-text-3)]">
                                <span className="truncate">{subscription.user_email}</span>
                                <span>
                                  {new Date(subscription.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  deleteSubscription(subscription.id, subscription.user_name || '')
                                }
                                className="h-8 w-8 p-0 text-[var(--p7-text-3)] hover:bg-[color-mix(in_oklab,var(--v2-danger)_10%,transparent)] hover:text-[var(--v2-danger)]"
                                aria-label={ariaLabels.deleteSubscription(
                                  subscription.user_name || 'usuário'
                                )}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Switch
                                checked={isActive}
                                onCheckedChange={() =>
                                  toggleSubscription(subscription.id, isActive)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {modal}
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 p-4 md:p-6">
        <HeaderSection />
        <StatsGrid subscriptionsCount={subscriptionsList.length} usersCount={usersList.length} />
        <ActionButtons
          onNewNotification={() => setShowNotificationModal(true)}
          onRefresh={loadSubscriptions}
        />
        <SubscriptionsList
          subscriptions={subscriptionsList}
          onDelete={deleteSubscription}
          onToggle={toggleSubscription}
        />
        {modal}
      </div>
    </MobileLayout>
  );
}
