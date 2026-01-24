import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Plus, 
  Users, 
  MessageCircle,
  MoreHorizontal,
  Pin,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const mockConversations: Conversation[] = [
  {
    id: 1,
    type: 'direct',
    name: 'Pastor João Silva',
    participants: [
      { id: 1, name: 'Pastor João Silva', role: 'admin', isOnline: true }
    ],
    lastMessage: {
      content: 'Esperamos cerca de 80-90 pessoas. Ana confirmou que vai trazer 3 interessados...',
      timestamp: '2025-01-26T14:40:00',
      senderId: 1,
      senderName: 'Pastor João Silva'
    },
    unreadCount: 0,
    isPinned: true,
    isArchived: false
  },
  {
    id: 2,
    type: 'group',
    name: 'Liderança da Igreja',
    participants: [
      { id: 1, name: 'Pastor João Silva', role: 'admin', isOnline: true },
      { id: 2, name: 'Maria Santos', role: 'missionary', isOnline: true },
      { id: 3, name: 'Carlos Oliveira', role: 'member', isOnline: false, lastSeen: '2h atrás' }
    ],
    lastMessage: {
      content: 'Maria Santos: Vou confirmar com todos os departamentos até amanhã',
      timestamp: '2025-01-26T16:15:00',
      senderId: 2,
      senderName: 'Maria Santos'
    },
    unreadCount: 3,
    isPinned: true,
    isArchived: false
  },
  {
    id: 3,
    type: 'direct',
    name: 'Ana Costa',
    participants: [
      { id: 4, name: 'Ana Costa', role: 'interested', isOnline: false, lastSeen: '1h atrás' }
    ],
    lastMessage: {
      content: 'Obrigada pelos estudos! Estou ansiosa para o próximo encontro 🙏',
      timestamp: '2025-01-26T12:30:00',
      senderId: 4,
      senderName: 'Ana Costa'
    },
    unreadCount: 1,
    isPinned: false,
    isArchived: false
  },
  {
    id: 4,
    type: 'group',
    name: 'Jovens da Igreja',
    participants: [
      { id: 3, name: 'Carlos Oliveira', role: 'member', isOnline: false },
      { id: 5, name: 'Pedro Almeida', role: 'member', isOnline: true },
      { id: 6, name: 'Júlia Santos', role: 'member', isOnline: true },
      { id: 7, name: 'Lucas Silva', role: 'member', isOnline: false }
    ],
    lastMessage: {
      content: 'Pedro Almeida: Pessoal, lembrem do encontro de amanhã às 19h!',
      timestamp: '2025-01-26T10:45:00',
      senderId: 5,
      senderName: 'Pedro Almeida'
    },
    unreadCount: 0,
    isPinned: false,
    isArchived: false
  },
  {
    id: 5,
    type: 'direct',
    name: 'Maria Santos',
    participants: [
      { id: 2, name: 'Maria Santos', role: 'missionary', isOnline: true }
    ],
    lastMessage: {
      content: 'Perfeito! Vou preparar os materiais para a Escola Sabatina',
      timestamp: '2025-01-25T20:15:00',
      senderId: 2,
      senderName: 'Maria Santos'
    },
    unreadCount: 0,
    isPinned: false,
    isArchived: false
  }
];

interface ChatSidebarProps {
  mode?: 'conversations' | 'users';
  currentUserId?: number;
  selectedConversationId?: number;
  onConversationSelect: (conversation: Conversation) => void;
  onSelectUser?: (user: { id: number; name: string; avatar?: string }) => void;
  onNewChat: () => void;
}

export const ChatSidebar = ({ 
  mode = 'conversations',
  currentUserId,
  selectedConversationId, 
  onConversationSelect, 
  onSelectUser,
  onNewChat 
}: ChatSidebarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{ id: number; name: string; email?: string; profilePhoto?: string }>>([]);

  useEffect(() => {
    if (mode === 'users') {
      fetch('/api/users')
        .then(r => r.json())
        .then((list: any[]) => setAllUsers(list))
        .catch(() => setAllUsers([]));
    }
  }, [mode]);

  const filteredConversations = mockConversations.filter(conversation => {
    const matchesSearch = conversation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conversation.lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchived = showArchived ? conversation.isArchived : !conversation.isArchived;
    return matchesSearch && matchesArchived;
  });

  const pinnedConversations = filteredConversations.filter(c => c.isPinned);
  const unpinnedConversations = filteredConversations.filter(c => !c.isPinned);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 7 * 24) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return '👥';
    }
    return conversation.participants[0]?.name?.charAt(0) || 'U';
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    const { content, senderName } = conversation.lastMessage;
    if (conversation.type === 'group') {
      return `${senderName}: ${content}`;
    }
    return content;
  };

  const totalUnread = filteredConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return allUsers
      .filter(u => u.id !== currentUserId)
      .filter(u => u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
  }, [allUsers, currentUserId, searchTerm]);

  return (
    <Card className="h-full min-h-0 flex flex-col">
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {mode === 'users' ? 'Usuários' : 'Conversas'}
            {mode !== 'users' && totalUnread > 0 && (
              <Badge variant="destructive" className="ml-2" data-testid="badge-total-unread">
                {totalUnread}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              data-testid="button-toggle-archived"
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onNewChat}
              data-testid="button-new-chat"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={mode === 'users' ? 'Buscar usuários...' : 'Buscar conversas...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-conversations"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {mode === 'users' ? (
              <div className="space-y-1">
                {filteredUsers.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSelectUser?.({ id: u.id, name: u.name, avatar: u.profilePhoto ? `/uploads/${u.profilePhoto}` : undefined })}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={u.profilePhoto ? `/uploads/${u.profilePhoto}` : undefined} />
                      <AvatarFallback>
                        {u.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium truncate">{u.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8" data-testid="empty-users">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Nenhum usuário encontrado</h3>
                    <p className="text-muted-foreground">Tente ajustar os termos de busca.</p>
                  </div>
                )}
              </div>
            ) : (
            <>
            {/* Pinned Conversations */}
            {pinnedConversations.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground">
                  <Pin className="h-3 w-3" />
                  Fixadas
                </div>
                {pinnedConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversationId === conversation.id}
                    onClick={() => onConversationSelect(conversation)}
                    formatTime={formatTime}
                    getConversationAvatar={getConversationAvatar}
                    getLastMessagePreview={getLastMessagePreview}
                  />
                ))}
              </>
            )}

            {/* Regular Conversations */}
            {unpinnedConversations.length > 0 && (
              <>
                {pinnedConversations.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground mt-4">
                    <MessageCircle className="h-3 w-3" />
                    Todas as conversas
                  </div>
                )}
                {unpinnedConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversationId === conversation.id}
                    onClick={() => onConversationSelect(conversation)}
                    formatTime={formatTime}
                    getConversationAvatar={getConversationAvatar}
                    getLastMessagePreview={getLastMessagePreview}
                  />
                ))}
              </>
            )}

            {filteredConversations.length === 0 && (
              <div className="text-center py-8" data-testid="empty-conversations">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {showArchived ? 'Nenhuma conversa arquivada' : 'Nenhuma conversa encontrada'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'Tente ajustar os termos de busca.' 
                    : showArchived 
                      ? 'Você não tem conversas arquivadas.'
                      : 'Inicie uma nova conversa para começar.'}
                </p>
              </div>
            )}
            </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  formatTime: (timestamp: string) => string;
  getConversationAvatar: (conversation: Conversation) => string;
  getLastMessagePreview: (conversation: Conversation) => string;
}

const ConversationItem = ({
  conversation,
  isSelected,
  onClick,
  formatTime,
  getConversationAvatar,
  getLastMessagePreview
}: ConversationItemProps) => {
  return (
    <div
      className={cn(
        "flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted"
      )}
      onClick={onClick}
      data-testid={`conversation-${conversation.id}`}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={conversation.avatar} />
          <AvatarFallback>
            {getConversationAvatar(conversation)}
          </AvatarFallback>
        </Avatar>
        {conversation.type === 'direct' && conversation.participants[0]?.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        )}
        {conversation.type === 'group' && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
            {conversation.participants.length}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn(
            "font-medium truncate",
            conversation.unreadCount > 0 && "font-semibold"
          )} data-testid={`conversation-name-${conversation.id}`}>
            {conversation.name}
          </h3>
          <div className="flex items-center space-x-1">
            {conversation.isPinned && (
              <Pin className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {formatTime(conversation.lastMessage.timestamp)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className={cn(
            "text-sm text-muted-foreground truncate",
            conversation.unreadCount > 0 && "font-medium text-foreground"
          )} data-testid={`conversation-preview-${conversation.id}`}>
            {getLastMessagePreview(conversation)}
          </p>
          {conversation.unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid={`conversation-unread-${conversation.id}`}
            >
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};