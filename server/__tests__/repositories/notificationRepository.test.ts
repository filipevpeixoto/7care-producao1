/**
 * @fileoverview Testes unitários para NotificationRepository
 * @module server/__tests__/repositories/notificationRepository.test
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock do db
const mockDb: any = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
};

jest.mock('../../neonConfig', () => ({
  db: mockDb,
}));

// Import após os mocks
import { NotificationRepository } from '../../repositories/notificationRepository';

describe('NotificationRepository', () => {
  let notificationRepository: NotificationRepository;

  const mockNotification = {
    id: 1,
    userId: 1,
    title: 'Nova Mensagem',
    message: 'Você recebeu uma nova mensagem',
    type: 'message',
    isRead: false,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    notificationRepository = new NotificationRepository();

    // Reset mock implementations
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.limit.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();
  });

  describe('getAll', () => {
    it('deve retornar todas as notificações ordenadas por data', async () => {
      mockDb.orderBy.mockResolvedValue([mockNotification]);

      const result = await notificationRepository.getAll();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('deve retornar array vazio em caso de erro', async () => {
      mockDb.orderBy.mockRejectedValue(new Error('Database error'));

      const result = await notificationRepository.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('deve retornar notificação por ID', async () => {
      mockDb.limit.mockResolvedValue([mockNotification]);

      const result = await notificationRepository.getById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('deve retornar null se notificação não existe', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await notificationRepository.getById(999);

      expect(result).toBeNull();
    });

    it('deve retornar null em caso de erro', async () => {
      mockDb.limit.mockRejectedValue(new Error('Database error'));

      const result = await notificationRepository.getById(1);

      expect(result).toBeNull();
    });
  });

  describe('getByUserId', () => {
    it('deve retornar notificações do usuário', async () => {
      const notifications = [
        mockNotification,
        { ...mockNotification, id: 2, title: 'Outra notificação' },
      ];
      mockDb.limit.mockResolvedValue(notifications);

      const result = await notificationRepository.getByUserId(1);

      expect(result).toHaveLength(2);
    });

    it('deve respeitar o limite de notificações', async () => {
      mockDb.limit.mockResolvedValue([mockNotification]);

      await notificationRepository.getByUserId(1, 10);

      expect(mockDb.limit).toHaveBeenCalledWith(10);
    });

    it('deve retornar array vazio em caso de erro', async () => {
      mockDb.limit.mockRejectedValue(new Error('Database error'));

      const result = await notificationRepository.getByUserId(1);

      expect(result).toEqual([]);
    });
  });

  describe('countUnread', () => {
    it('deve contar notificações não lidas', async () => {
      const notifications = [
        { ...mockNotification, isRead: false },
        { ...mockNotification, id: 2, isRead: false },
        { ...mockNotification, id: 3, isRead: true },
      ];
      mockDb.where.mockResolvedValue(notifications);

      const result = await notificationRepository.countUnread(1);

      expect(result).toBe(2);
    });

    it('deve retornar 0 em caso de erro', async () => {
      mockDb.where.mockRejectedValue(new Error('Database error'));

      const result = await notificationRepository.countUnread(1);

      expect(result).toBe(0);
    });
  });

  describe('create', () => {
    it('deve criar uma nova notificação', async () => {
      mockDb.returning.mockResolvedValue([mockNotification]);

      const result = await notificationRepository.create({
        userId: 1,
        title: 'Nova Mensagem',
        message: 'Você recebeu uma nova mensagem',
        type: 'message',
        isRead: false,
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result.title).toBe('Nova Mensagem');
    });

    it('deve lançar erro se falhar ao criar', async () => {
      mockDb.returning.mockRejectedValue(new Error('Insert error'));

      await expect(
        notificationRepository.create({
          userId: 1,
          title: 'Test',
          message: 'Test message',
          type: 'general',
          isRead: false,
        })
      ).rejects.toThrow('Insert error');
    });
  });

  describe('markAsRead', () => {
    it('deve marcar notificação como lida', async () => {
      const updated = { ...mockNotification, isRead: true };
      mockDb.returning.mockResolvedValue([updated]);

      const result = await notificationRepository.markAsRead(1);

      expect(result?.isRead).toBe(true);
    });

    it('deve retornar null em caso de erro', async () => {
      mockDb.returning.mockRejectedValue(new Error('Update error'));

      const result = await notificationRepository.markAsRead(1);

      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('deve marcar todas as notificações como lidas', async () => {
      mockDb.where.mockResolvedValue(undefined);

      const result = await notificationRepository.markAllAsRead(1);

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('deve retornar false em caso de erro', async () => {
      mockDb.where.mockRejectedValue(new Error('Update error'));

      const result = await notificationRepository.markAllAsRead(1);

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('deve deletar notificação com sucesso', async () => {
      mockDb.where.mockResolvedValue(undefined);

      const result = await notificationRepository.delete(1);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('deve retornar false em caso de erro', async () => {
      mockDb.where.mockRejectedValue(new Error('Delete error'));

      const result = await notificationRepository.delete(1);

      expect(result).toBe(false);
    });
  });

  describe('deleteAllByUser', () => {
    it('deve deletar todas as notificações do usuário', async () => {
      mockDb.where.mockResolvedValue(undefined);

      const result = await notificationRepository.deleteAllByUser(1);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('deve retornar false em caso de erro', async () => {
      mockDb.where.mockRejectedValue(new Error('Delete error'));

      const result = await notificationRepository.deleteAllByUser(1);

      expect(result).toBe(false);
    });
  });
});
