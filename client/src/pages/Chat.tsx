import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { EmptyState } from '@/components/v2/EmptyState';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import { PrototypeAvatar, PrototypeStatusBar } from './v2/prototypeShared';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { useSearchParams } from 'react-router-dom';

interface ChatUser {
  id: number;
  name: string;
  avatar?: string;
  role: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface Conversation {
  id: number;
  type: 'direct' | 'group' | 'private' | string;
  name?: string;
  title?: string;
  avatar?: string;
  participants?: ChatUser[];
  lastMessage?: {
    content: string;
    timestamp: string;
    senderId: number;
    senderName: string;
  };
  unreadCount?: number;
  isPinned?: boolean;
  isArchived?: boolean;
}

export default function Chat() {
  const { t } = useTranslation();
  const { skin } = useTheme();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isAdmin = useMemo(() => hasAdminAccess(user), [user]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    name: string;
    avatar?: string;
  } | null>(null);

  const conversationFromParams = useMemo(() => {
    const userId = searchParams.get('user');
    const userName = searchParams.get('name');

    if (!userId || !userName || !user?.id) return null;

    const targetUserId = Number(userId);
    if (Number.isNaN(targetUserId)) return null;

    return {
      id: targetUserId,
      type: 'direct',
      name: decodeURIComponent(userName),
      participants: [
        {
          id: targetUserId,
          name: decodeURIComponent(userName),
          role: 'user',
          isOnline: false,
        },
      ],
      lastMessage: {
        content: '',
        timestamp: new Date().toISOString(),
        senderId: 0,
        senderName: '',
      },
      unreadCount: 0,
      isPinned: false,
      isArchived: false,
    } as Conversation;
  }, [searchParams, user?.id]);
  const activeConversation = selectedConversation ?? conversationFromParams;
  const [showNewChat, setShowNewChat] = useState(false);

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSelectedUser(null);
    setShowNewChat(false);
  };

  const handleNewChat = () => {
    setShowNewChat(true);
    setSelectedConversation(null);
  };

  const getChatUser = (conversation: Conversation): ChatUser | undefined => {
    if (selectedUser) {
      return {
        id: selectedUser.id,
        name: selectedUser.name,
        avatar: selectedUser.avatar,
        role: 'user',
        isOnline: false,
      };
    }
    if (conversation.type === 'direct') {
      return conversation.participants?.[0];
    }
    return undefined;
  };

  const handleSelectUserToChat = async (targetUser: {
    id: number;
    name: string;
    avatar?: string;
  }) => {
    if (!user?.id) return;

    // Criar conversa local diretamente (sem depender de endpoint)
    const conversationId =
      Math.min(Number(user.id), targetUser.id) * 100000 + Math.max(Number(user.id), targetUser.id);

    setSelectedConversation({
      id: conversationId,
      type: 'direct',
      name: targetUser.name,
      participants: [{ id: targetUser.id, name: targetUser.name, role: 'user', isOnline: false }],
      lastMessage: {
        content: '',
        timestamp: new Date().toISOString(),
        senderId: 0,
        senderName: '',
      },
      unreadCount: 0,
      isPinned: false,
      isArchived: false,
    } as Conversation);
    setSelectedUser(targetUser);
    setShowNewChat(false);
  };

  if (skin === 'v2') {
    return (
      <MobileLayout variant="prototype">
        <div className="p7-shell">
          <div className="p7-screen">
            <PrototypeStatusBar />
            <div className="p7-grad-header">
              <div className="p7-header-row">
                <div>
                  <div className="p7-header-label">{t('chat.title', { defaultValue: 'Chat' })}</div>
                  <div className="p7-header-title">
                    {t('chat.title', { defaultValue: 'Chat pastoral' })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
                </div>
              </div>
            </div>
            <div className="p7-scroll">
              <div className="p7-section pb-4">
                <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-3 md:grid-cols-[minmax(260px,_320px)_1fr] md:gap-4">
                  <aside
                    className={`flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-[var(--p7-border)] bg-[var(--p7-card)] ${activeConversation ? 'hidden md:flex' : 'flex'}`}
                    style={{ boxShadow: 'var(--shadow-card)' }}
                  >
                    <ChatSidebar
                      mode={isAdmin ? 'users' : 'conversations'}
                      currentUserId={user?.id}
                      selectedConversationId={activeConversation?.id}
                      onConversationSelect={handleConversationSelect}
                      onSelectUser={handleSelectUserToChat}
                      onNewChat={handleNewChat}
                    />
                  </aside>

                  <section
                    className={`flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-[var(--p7-border)] bg-[var(--p7-card)] ${!activeConversation && !showNewChat ? 'hidden md:flex' : 'flex'}`}
                    style={{ boxShadow: 'var(--shadow-card)' }}
                  >
                    {activeConversation ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedConversation(null)}
                          className="mx-3 mt-3 flex items-center gap-2 self-start rounded-full border border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-3 py-1.5 text-sm text-[var(--p7-muted)] transition-colors hover:text-[var(--p7-text)] md:hidden"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                          {t('chat.back')}
                        </button>
                        <div className="min-h-0 flex-1">
                          <ChatInterface
                            chatUser={getChatUser(activeConversation)}
                            conversationId={activeConversation.id}
                            isGroup={activeConversation.type === 'group'}
                            groupName={
                              activeConversation.type === 'group'
                                ? activeConversation.name
                                : undefined
                            }
                            groupMembers={
                              activeConversation.type === 'group'
                                ? activeConversation.participants
                                : undefined
                            }
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
                        <EmptyState
                          illustration={<MessageCircle className="h-7 w-7" />}
                          title={
                            showNewChat
                              ? t('chat.newConversation', { defaultValue: 'Começar uma conversa' })
                              : t('chat.selectConversation', {
                                  defaultValue: 'Escolha alguém para conversar',
                                })
                          }
                          copy={
                            showNewChat
                              ? t('chat.newConversationDescription', {
                                  defaultValue:
                                    'Encontre alguém na lista ao lado e envie a primeira mensagem para iniciar o cuidado.',
                                })
                              : t('chat.selectConversationDescription', {
                                  defaultValue:
                                    'Abra uma conversa na lateral e acompanhe a troca sem sair do fluxo da rotina pastoral.',
                                })
                          }
                          cta={
                            isAdmin && !showNewChat
                              ? {
                                  label: t('chat.startNew', { defaultValue: 'Nova conversa' }),
                                  onClick: handleNewChat,
                                }
                              : undefined
                          }
                        />
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-2 sm:p-4 h-[calc(100vh-120px)] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 h-full">
          {/* Sidebar - Hidden on mobile when conversation is selected */}
          <div
            className={`md:col-span-1 h-full overflow-hidden ${activeConversation ? 'hidden md:block' : 'block'}`}
          >
            <ChatSidebar
              mode={isAdmin ? 'users' : 'conversations'}
              currentUserId={user?.id}
              selectedConversationId={activeConversation?.id}
              onConversationSelect={handleConversationSelect}
              onSelectUser={handleSelectUserToChat}
              onNewChat={handleNewChat}
            />
          </div>

          {/* Chat Interface - Show back button on mobile */}
          <div
            className={`md:col-span-2 h-full min-h-0 ${!activeConversation && !showNewChat ? 'hidden md:block' : 'block'}`}
          >
            {activeConversation ? (
              <div className="h-full flex flex-col">
                {/* Mobile back button */}
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden flex items-center gap-2 p-2 text-sm text-muted-foreground hover:text-foreground mb-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  {t('chat.back')}
                </button>
                <div className="flex-1 min-h-0">
                  <ChatInterface
                    chatUser={getChatUser(activeConversation)}
                    conversationId={activeConversation.id}
                    isGroup={activeConversation.type === 'group'}
                    groupName={
                      activeConversation.type === 'group' ? activeConversation.name : undefined
                    }
                    groupMembers={
                      activeConversation.type === 'group'
                        ? activeConversation.participants
                        : undefined
                    }
                  />
                </div>
              </div>
            ) : showNewChat ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {t('chat.newConversation')}
                  </h3>
                  <p className="text-muted-foreground">{t('chat.newConversationDescription')}</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {t('chat.selectConversation')}
                  </h3>
                  <p className="text-muted-foreground">{t('chat.selectConversationDescription')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
