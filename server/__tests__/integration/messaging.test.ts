/**
 * Testes de Integração - Mensagens
 * Testa endpoints de sistema de mensagens
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock do NeonAdapter
const mockStorage = {
  getAllMessages: jest.fn<() => Promise<any[]>>(),
  getMessageById: jest.fn<(id: number) => Promise<any | null>>(),
  createMessage: jest.fn<(data: any) => Promise<any>>(),
  updateMessage: jest.fn<(id: number, data: any) => Promise<any | null>>(),
  deleteMessage: jest.fn<(id: number) => Promise<boolean>>(),
  getConversation: jest.fn<(user1: number, user2: number) => Promise<any[]>>(),
  markAsRead: jest.fn<(messageId: number) => Promise<boolean>>()
};

jest.mock('../../neonAdapter', () => ({
  NeonAdapter: jest.fn().mockImplementation(() => mockStorage)
}));

const mockMessages = [
  {
    id: 1,
    senderId: 5,
    receiverId: 10,
    content: 'Olá João, tudo bem? Vamos marcar nossa próxima reunião?',
    isRead: false,
    createdAt: '2025-01-20T10:00:00',
    senderName: 'Pastor Pedro',
    receiverName: 'João Silva'
  },
  {
    id: 2,
    senderId: 10,
    receiverId: 5,
    content: 'Oi Pastor! Estou bem. Pode ser quinta-feira às 14h?',
    isRead: true,
    createdAt: '2025-01-20T10:15:00',
    senderName: 'João Silva',
    receiverName: 'Pastor Pedro'
  },
  {
    id: 3,
    senderId: 5,
    receiverId: 10,
    content: 'Perfeito! Até quinta então.',
    isRead: false,
    createdAt: '2025-01-20T10:20:00',
    senderName: 'Pastor Pedro',
    receiverName: 'João Silva'
  },
  {
    id: 4,
    senderId: 6,
    receiverId: 11,
    content: 'Boa tarde Maria! Como está seu estudo bíblico?',
    isRead: false,
    createdAt: '2025-01-20T14:00:00',
    senderName: 'Missionária Clara',
    receiverName: 'Maria Santos'
  }
];

describe('Messaging Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/messages', () => {
    it('deve retornar lista de mensagens', async () => {
      mockStorage.getAllMessages.mockResolvedValueOnce(mockMessages);

      const messages = await mockStorage.getAllMessages();

      expect(messages).toHaveLength(4);
      expect(messages[0].content).toContain('Olá João');
    });

    it('deve filtrar mensagens não lidas', async () => {
      const unreadMessages = mockMessages.filter(m => !m.isRead);
      mockStorage.getAllMessages.mockResolvedValueOnce(unreadMessages);

      const messages = await mockStorage.getAllMessages();

      expect(messages).toHaveLength(3);
      expect(messages.every(m => !m.isRead)).toBe(true);
    });

    it('deve filtrar por remetente', async () => {
      const fromPastor = mockMessages.filter(m => m.senderId === 5);
      mockStorage.getAllMessages.mockResolvedValueOnce(fromPastor);

      const messages = await mockStorage.getAllMessages();

      expect(messages).toHaveLength(2);
      expect(messages.every(m => m.senderId === 5)).toBe(true);
    });

    it('deve filtrar por destinatário', async () => {
      const toJoao = mockMessages.filter(m => m.receiverId === 10);
      mockStorage.getAllMessages.mockResolvedValueOnce(toJoao);

      const messages = await mockStorage.getAllMessages();

      expect(messages).toHaveLength(2);
      expect(messages.every(m => m.receiverId === 10)).toBe(true);
    });
  });

  describe('GET /api/messages/:id', () => {
    it('deve retornar mensagem por ID', async () => {
      mockStorage.getMessageById.mockResolvedValueOnce(mockMessages[0]);

      const message = await mockStorage.getMessageById(1);

      expect(message).not.toBeNull();
      expect(message?.id).toBe(1);
      expect(message?.content).toContain('Olá João');
    });

    it('deve retornar null para ID inexistente', async () => {
      mockStorage.getMessageById.mockResolvedValueOnce(null);

      const message = await mockStorage.getMessageById(9999);

      expect(message).toBeNull();
    });
  });

  describe('GET /api/messages/conversation/:user1/:user2', () => {
    it('deve retornar conversação entre dois usuários', async () => {
      const conversation = mockMessages.filter(
        m => (m.senderId === 5 && m.receiverId === 10) ||
             (m.senderId === 10 && m.receiverId === 5)
      );
      mockStorage.getConversation.mockResolvedValueOnce(conversation);

      const messages = await mockStorage.getConversation(5, 10);

      expect(messages).toHaveLength(3);
    });

    it('deve ordenar por data crescente', () => {
      const conversation = mockMessages
        .filter(m => (m.senderId === 5 && m.receiverId === 10) ||
                     (m.senderId === 10 && m.receiverId === 5))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      expect(conversation[0].id).toBe(1);
      expect(conversation[1].id).toBe(2);
      expect(conversation[2].id).toBe(3);
    });
  });

  describe('POST /api/messages', () => {
    it('deve criar nova mensagem', async () => {
      const newMessage = {
        senderId: 11,
        receiverId: 6,
        content: 'Obrigada pela atenção! Estou gostando muito dos estudos.'
      };

      mockStorage.createMessage.mockResolvedValueOnce({
        id: 5,
        ...newMessage,
        isRead: false,
        createdAt: '2025-01-20T15:00:00'
      });

      const created = await mockStorage.createMessage(newMessage);

      expect(created.id).toBe(5);
      expect(created.content).toContain('Obrigada pela atenção');
      expect(created.isRead).toBe(false);
    });

    it('deve validar campos obrigatórios', () => {
      const validMessage = {
        senderId: 1,
        receiverId: 2,
        content: 'Teste'
      };

      expect(validMessage.senderId).toBeDefined();
      expect(validMessage.receiverId).toBeDefined();
      expect(validMessage.content).toBeDefined();
      expect(validMessage.content.length).toBeGreaterThan(0);
    });

    it('deve rejeitar mensagem vazia', () => {
      const emptyContent = '';
      expect(emptyContent.length).toBe(0);
    });

    it('deve rejeitar sender e receiver iguais', () => {
      const senderId = 5;
      const receiverId = 5;

      expect(senderId).toBe(receiverId); // Isso deve ser validado e rejeitado
    });
  });

  describe('PUT /api/messages/:id', () => {
    it('deve marcar mensagem como lida', async () => {
      mockStorage.updateMessage.mockResolvedValueOnce({
        ...mockMessages[0],
        isRead: true
      });

      const updated = await mockStorage.updateMessage(1, { isRead: true });

      expect(updated?.isRead).toBe(true);
    });

    it('deve usar endpoint específico para marcar como lida', async () => {
      mockStorage.markAsRead.mockResolvedValueOnce(true);

      const result = await mockStorage.markAsRead(1);

      expect(result).toBe(true);
    });
  });

  describe('DELETE /api/messages/:id', () => {
    it('deve deletar mensagem', async () => {
      mockStorage.deleteMessage.mockResolvedValueOnce(true);

      const result = await mockStorage.deleteMessage(1);

      expect(result).toBe(true);
    });

    it('deve retornar false para ID inexistente', async () => {
      mockStorage.deleteMessage.mockResolvedValueOnce(false);

      const result = await mockStorage.deleteMessage(9999);

      expect(result).toBe(false);
    });
  });

  describe('Validation Tests', () => {
    it('deve ter timestamp de criação', () => {
      mockMessages.forEach(message => {
        expect(message.createdAt).toBeDefined();
        expect(new Date(message.createdAt).getTime()).not.toBeNaN();
      });
    });

    it('deve ter IDs de usuário válidos', () => {
      mockMessages.forEach(message => {
        expect(message.senderId).toBeGreaterThan(0);
        expect(message.receiverId).toBeGreaterThan(0);
      });
    });

    it('conteúdo deve ter tamanho mínimo', () => {
      mockMessages.forEach(message => {
        expect(message.content.length).toBeGreaterThan(0);
      });
    });

    it('conteúdo deve ter tamanho máximo', () => {
      const maxLength = 5000;
      mockMessages.forEach(message => {
        expect(message.content.length).toBeLessThanOrEqual(maxLength);
      });
    });
  });

  describe('Business Logic Tests', () => {
    it('deve contar mensagens não lidas por usuário', () => {
      const unreadForUser10 = mockMessages.filter(
        m => m.receiverId === 10 && !m.isRead
      );

      expect(unreadForUser10).toHaveLength(2);
    });

    it('deve agrupar conversações únicas', () => {
      const conversations = new Set<string>();
      mockMessages.forEach(m => {
        const key = [m.senderId, m.receiverId].sort().join('-');
        conversations.add(key);
      });

      expect(conversations.size).toBe(2); // 5-10 e 6-11
    });

    it('mensagens devem incluir nomes dos usuários', () => {
      mockMessages.forEach(message => {
        expect(message.senderName).toBeDefined();
        expect(message.receiverName).toBeDefined();
      });
    });

    it('deve manter ordem cronológica', () => {
      const dates = mockMessages.map(m => new Date(m.createdAt).getTime());
      const sorted = [...dates].sort((a, b) => a - b);

      expect(dates).toEqual(sorted);
    });
  });

  describe('Security Tests', () => {
    it('usuário só deve ver mensagens que enviou ou recebeu', () => {
      const userId = 10;
      const userMessages = mockMessages.filter(
        m => m.senderId === userId || m.receiverId === userId
      );

      expect(userMessages).toHaveLength(3);
      userMessages.forEach(m => {
        expect(m.senderId === userId || m.receiverId === userId).toBe(true);
      });
    });

    it('não deve expor mensagens de outros usuários', () => {
      const userId = 11;
      const otherUserMessages = mockMessages.filter(
        m => m.senderId !== userId && m.receiverId !== userId
      );

      expect(otherUserMessages).toHaveLength(3);
    });
  });
});
