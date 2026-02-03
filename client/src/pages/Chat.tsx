import { useMemo, useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
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
  type: 'direct' | 'group';
  name: string;
  avatar?: string;
  participants: ChatUser[];
  lastMessage: {
    content: string;
    timestamp: string;
    senderId: number;
    senderName: string;
  };
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
}

export default function Chat() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isAdmin = useMemo(() => hasAdminAccess(user), [user]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    name: string;
    avatar?: string;
  } | null>(null);

  // Handle query string parameters for direct chat
  useEffect(() => {
    const userId = searchParams.get('user');
    const userName = searchParams.get('name');

    if (userId && userName && user?.id) {
      // Create a conversation object for the user specified in query params
      const targetUserId = parseInt(userId);
      const conversation: Conversation = {
        id: targetUserId, // Use userId as conversation ID for direct chat
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
      };
      setSelectedConversation(conversation);
    }
  }, [searchParams, user?.id]);
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
      return conversation.participants[0];
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
    } as any);
    setSelectedUser(targetUser);
    setShowNewChat(false);
  };

  return (
    <MobileLayout>
      <div className="p-2 sm:p-4 h-[calc(100vh-120px)] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 h-full">
          {/* Sidebar - Hidden on mobile when conversation is selected */}
          <div
            className={`md:col-span-1 h-full overflow-hidden ${selectedConversation ? 'hidden md:block' : 'block'}`}
          >
            <ChatSidebar
              mode={isAdmin ? 'users' : 'conversations'}
              currentUserId={user?.id as any}
              selectedConversationId={selectedConversation?.id}
              onConversationSelect={handleConversationSelect}
              onSelectUser={handleSelectUserToChat}
              onNewChat={handleNewChat}
            />
          </div>

          {/* Chat Interface - Show back button on mobile */}
          <div
            className={`md:col-span-2 h-full min-h-0 ${!selectedConversation && !showNewChat ? 'hidden md:block' : 'block'}`}
          >
            {selectedConversation ? (
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
                  Voltar
                </button>
                <div className="flex-1 min-h-0">
                  <ChatInterface
                    chatUser={getChatUser(selectedConversation)}
                    conversationId={selectedConversation.id}
                    isGroup={selectedConversation.type === 'group'}
                    groupName={
                      selectedConversation.type === 'group' ? selectedConversation.name : undefined
                    }
                    groupMembers={
                      selectedConversation.type === 'group'
                        ? selectedConversation.participants
                        : undefined
                    }
                  />
                </div>
              </div>
            ) : showNewChat ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nova Conversa</h3>
                  <p className="text-muted-foreground">
                    Funcionalidade em desenvolvimento. Em breve você poderá iniciar novas conversas.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Selecione uma conversa
                  </h3>
                  <p className="text-muted-foreground">
                    Escolha uma conversa da lista para começar a conversar.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
