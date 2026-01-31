/**
 * @fileoverview Testes unitários para PushSubscriptionRepository
 * @module server/__tests__/repositories/pushSubscriptionRepository.test
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
import { PushSubscriptionRepository } from '../../repositories/pushSubscriptionRepository';

describe('PushSubscriptionRepository', () => {
  let pushSubscriptionRepository: PushSubscriptionRepository;

  const mockSubscription = {
    id: 1,
    userId: 1,
    endpoint: 'https://push.example.com/endpoint/123',
    p256dh: 'p256dhKey123',
    auth: 'authKey123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deviceName: 'Chrome Desktop',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    pushSubscriptionRepository = new PushSubscriptionRepository();

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
    it('deve retornar todas as push subscriptions', async () => {
      mockDb.orderBy.mockResolvedValue([mockSubscription]);

      const result = await pushSubscriptionRepository.getAll();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('deve retornar array vazio em caso de erro', async () => {
      mockDb.orderBy.mockRejectedValue(new Error('Database error'));

      const result = await pushSubscriptionRepository.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getByUserId', () => {
    it('deve retornar subscriptions do usuário', async () => {
      const subscriptions = [
        mockSubscription,
        { ...mockSubscription, id: 2, deviceName: 'Firefox Mobile' },
      ];
      mockDb.orderBy.mockResolvedValue(subscriptions);

      const result = await pushSubscriptionRepository.getByUserId(1);

      expect(result).toHaveLength(2);
    });

    it('deve retornar array vazio em caso de erro', async () => {
      mockDb.orderBy.mockRejectedValue(new Error('Database error'));

      const result = await pushSubscriptionRepository.getByUserId(1);

      expect(result).toEqual([]);
    });
  });

  describe('getActiveByUserIds', () => {
    it('deve retornar subscriptions ativas por IDs de usuários', async () => {
      const subscriptions = [
        { ...mockSubscription, userId: 1, isActive: true },
        { ...mockSubscription, id: 2, userId: 2, isActive: true },
      ];
      mockDb.where.mockResolvedValue(subscriptions);

      const result = await pushSubscriptionRepository.getActiveByUserIds([1, 2]);

      expect(result).toHaveLength(2);
    });

    it('deve retornar array vazio em caso de erro', async () => {
      mockDb.where.mockRejectedValue(new Error('Database error'));

      const result = await pushSubscriptionRepository.getActiveByUserIds([1, 2]);

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('deve retornar subscription por ID', async () => {
      mockDb.limit.mockResolvedValue([mockSubscription]);

      const result = await pushSubscriptionRepository.getById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('deve retornar null se subscription não existe', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await pushSubscriptionRepository.getById(999);

      expect(result).toBeNull();
    });

    it('deve retornar null em caso de erro', async () => {
      mockDb.limit.mockRejectedValue(new Error('Database error'));

      const result = await pushSubscriptionRepository.getById(1);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('deve criar uma nova subscription', async () => {
      // Mock para não encontrar subscription existente
      mockDb.limit.mockResolvedValueOnce([]);
      // Mock para retornar a subscription criada
      mockDb.returning.mockResolvedValue([mockSubscription]);

      const result = await pushSubscriptionRepository.create({
        userId: 1,
        subscription: {
          endpoint: 'https://push.example.com/endpoint/123',
          keys: {
            p256dh: 'p256dhKey123',
            auth: 'authKey123',
          },
        },
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result.endpoint).toBe('https://push.example.com/endpoint/123');
    });

    it('deve atualizar subscription existente com mesmo endpoint', async () => {
      // Mock para encontrar subscription existente
      mockDb.limit.mockResolvedValueOnce([mockSubscription]);
      // Mock para retornar a subscription atualizada
      mockDb.returning.mockResolvedValue([{ ...mockSubscription, updatedAt: new Date() }]);

      const result = await pushSubscriptionRepository.create({
        userId: 1,
        subscription: {
          endpoint: 'https://push.example.com/endpoint/123',
          keys: {
            p256dh: 'newP256dhKey',
            auth: 'newAuthKey',
          },
        },
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('deve lançar erro se falhar ao criar', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.returning.mockRejectedValue(new Error('Insert error'));

      await expect(
        pushSubscriptionRepository.create({
          userId: 1,
          subscription: {
            endpoint: 'https://push.example.com/endpoint/123',
            keys: {
              p256dh: 'p256dhKey123',
              auth: 'authKey123',
            },
          },
        })
      ).rejects.toThrow('Insert error');
    });
  });

  describe('toggle', () => {
    it('deve alternar status de subscription ativa para inativa', async () => {
      mockDb.limit.mockResolvedValueOnce([{ ...mockSubscription, isActive: true }]);
      mockDb.returning.mockResolvedValue([{ ...mockSubscription, isActive: false }]);

      const result = await pushSubscriptionRepository.toggle(1);

      expect(result?.isActive).toBe(false);
    });

    it('deve alternar status de subscription inativa para ativa', async () => {
      mockDb.limit.mockResolvedValueOnce([{ ...mockSubscription, isActive: false }]);
      mockDb.returning.mockResolvedValue([{ ...mockSubscription, isActive: true }]);

      const result = await pushSubscriptionRepository.toggle(1);

      expect(result?.isActive).toBe(true);
    });

    it('deve retornar null se subscription não existe', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await pushSubscriptionRepository.toggle(999);

      expect(result).toBeNull();
    });

    it('deve retornar null em caso de erro', async () => {
      mockDb.limit.mockRejectedValue(new Error('Database error'));

      const result = await pushSubscriptionRepository.toggle(1);

      expect(result).toBeNull();
    });
  });

  describe('deactivate', () => {
    it('deve desativar subscription com sucesso', async () => {
      mockDb.where.mockResolvedValue(undefined);

      const result = await pushSubscriptionRepository.deactivate(1);

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('deve retornar false em caso de erro', async () => {
      mockDb.where.mockRejectedValue(new Error('Update error'));

      const result = await pushSubscriptionRepository.deactivate(1);

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('deve deletar subscription com sucesso', async () => {
      mockDb.where.mockResolvedValue(undefined);

      const result = await pushSubscriptionRepository.delete(1);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('deve retornar false em caso de erro', async () => {
      mockDb.where.mockRejectedValue(new Error('Delete error'));

      const result = await pushSubscriptionRepository.delete(1);

      expect(result).toBe(false);
    });
  });

  describe('deleteByUserId', () => {
    it('deve deletar todas as subscriptions do usuário', async () => {
      mockDb.where.mockResolvedValue(undefined);

      const result = await pushSubscriptionRepository.deleteByUserId(1);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('deve retornar false em caso de erro', async () => {
      mockDb.where.mockRejectedValue(new Error('Delete error'));

      const result = await pushSubscriptionRepository.deleteByUserId(1);

      expect(result).toBe(false);
    });
  });
});
