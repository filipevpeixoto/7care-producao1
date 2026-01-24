import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Phone, 
  Video, 
  MoreVertical,
  Check,
  CheckCheck,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'system';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: number;
}

interface ChatUser {
  id: number;
  name: string;
  avatar?: string;
  role: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface ChatInterfaceProps {
  conversationId?: number;
  chatUser?: ChatUser;
  isGroup?: boolean;
  groupName?: string;
  groupMembers?: ChatUser[];
}

const mockMessages: Message[] = [
  {
    id: 1,
    senderId: 2,
    senderName: "Maria Santos",
    content: "Oi João! Como está indo a preparação do culto de sábado?",
    timestamp: "2025-01-26T14:30:00",
    type: "text",
    status: "read"
  },
  {
    id: 2,
    senderId: 1,
    senderName: "Pastor João Silva",
    content: "Olá Maria! Está indo bem. Já terminei o esboço da pregação. Você conseguiu organizar a Escola Sabatina?",
    timestamp: "2025-01-26T14:32:00",
    type: "text",
    status: "read"
  },
  {
    id: 3,
    senderId: 2,
    senderName: "Maria Santos",
    content: "Sim! Já está tudo pronto. Os professores confirmaram presença e prepararam as lições. Quantas pessoas esperamos para este sábado?",
    timestamp: "2025-01-26T14:35:00",
    type: "text",
    status: "read"
  },
  {
    id: 4,
    senderId: 1,
    senderName: "Pastor João Silva",
    content: "Esperamos cerca de 80-90 pessoas. Ana confirmou que vai trazer 3 interessados do estudo bíblico dela.",
    timestamp: "2025-01-26T14:40:00",
    type: "text",
    status: "delivered"
  }
];

export const ChatInterface = ({ 
  conversationId, 
  chatUser, 
  isGroup = false, 
  groupName, 
  groupMembers 
}: ChatInterfaceProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now(),
      senderId: Number(user?.id) || 1,
      senderName: user?.name || 'Você',
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: 'text',
      status: 'sending'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate message status updates
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === message.id ? { ...msg, status: 'sent' } : msg
      ));
    }, 500);

    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === message.id ? { ...msg, status: 'delivered' } : msg
      ));
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />;
      default:
        return null;
    }
  };

  const isMyMessage = (message: Message) => {
    return message.senderId === (Number(user?.id) || 1);
  };

  const shouldShowSenderInfo = (message: Message, index: number) => {
    if (isMyMessage(message)) return false;
    if (index === 0) return true;
    const prevMessage = messages[index - 1];
    return prevMessage.senderId !== message.senderId;
  };

  const chatTitle = isGroup ? groupName : chatUser?.name;
  const chatSubtitle = isGroup 
    ? `${groupMembers?.length || 0} membros` 
    : chatUser?.isOnline 
      ? 'Online agora' 
      : `Visto por último ${chatUser?.lastSeen || 'há muito tempo'}`;

  return (
    <Card className="h-full min-h-0 flex flex-col">
      {/* Chat Header */}
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={chatUser?.avatar} />
              <AvatarFallback>
                {isGroup ? '👥' : chatUser?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-lg" data-testid="chat-title">
                {chatTitle}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground" data-testid="chat-subtitle">
                  {chatSubtitle}
                </p>
                {!isGroup && chatUser?.isOnline && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isGroup && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  data-testid="button-voice-call"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  data-testid="button-video-call"
                >
                  <Video className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="button-chat-menu"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <ScrollArea 
          className="h-full px-4 py-2"
          ref={scrollAreaRef}
          data-testid="messages-container"
        >
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isMine = isMyMessage(message);
              const showSender = shouldShowSenderInfo(message, index);
              
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    isMine ? "justify-end" : "justify-start"
                  )}
                  data-testid={`message-${message.id}`}
                >
                  <div className={cn(
                    "max-w-[70%] space-y-1",
                    isMine ? "items-end" : "items-start"
                  )}>
                    {showSender && (
                      <div className="flex items-center space-x-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={message.senderAvatar} />
                          <AvatarFallback className="text-xs">
                            {message.senderName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground font-medium">
                          {message.senderName}
                        </span>
                      </div>
                    )}
                    
                    <div className={cn(
                      "rounded-lg px-3 py-2 break-words",
                      isMine 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                    
                    <div className={cn(
                      "flex items-center space-x-1 text-xs text-muted-foreground",
                      isMine ? "justify-end" : "justify-start"
                    )}>
                      <span>{formatTime(message.timestamp)}</span>
                      {isMine && getMessageStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[70%]">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {chatUser?.name} está digitando...
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Message Input */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            data-testid="button-attach"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="pr-10"
              data-testid="input-message"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-1 top-1/2 transform -translate-y-1/2"
              data-testid="button-emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            data-testid="button-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};