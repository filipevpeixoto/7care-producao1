/**
 * @jest-environment node
 * @description Tests for MessageRepository
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock do db - usando any para evitar problemas de tipagem
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
  innerJoin: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
};

jest.mock('../../neonConfig', () => ({
  db: mockDb,
}));

// Import apos os mocks
import { MessageRepository } from '../../repositories/messageRepository';

describe('MessageRepository', () => {
  let repository: MessageRepository;
  const mockMessage = {
    id: 1,
    content: 'Ola, tudo bem?',
    senderId: 1,
    conversationId: 1,
    createdAt: new Date(),
  };

  beforeEach(() => {
    repository = new MessageRepository();
    jest.clearAllMocks();
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
    mockDb.innerJoin.mockReturnThis();
    mockDb.leftJoin.mockReturnThis();
  });

  describe('getAll', () => {
    it('should return all messages ordered by createdAt', async () => {
      const mockMessages = [mockMessage, { ...mockMessage, id: 2 }];
      mockDb.orderBy.mockResolvedValue(mockMessages);

      const result = await repository.getAll();

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should return empty array on error', async () => {
      mockDb.orderBy.mockRejectedValue(new Error('Database error'));

      const result = await repository.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return message by id', async () => {
      mockDb.limit.mockResolvedValue([mockMessage]);

      const result = await repository.getById(1);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return null if message not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await repository.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('getByConversationId', () => {
    it('should return messages for conversation', async () => {
      const mockMessages = [mockMessage, { ...mockMessage, id: 2 }];
      mockDb.orderBy.mockResolvedValue(mockMessages);

      const result = await repository.getByConversationId(1);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should return empty array on error', async () => {
      mockDb.orderBy.mockRejectedValue(new Error('Query failed'));

      const result = await repository.getByConversationId(1);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create new message', async () => {
      mockDb.returning.mockResolvedValue([mockMessage]);

      const input = {
        content: 'Ola, tudo bem?',
        senderId: 1,
        conversationId: 1,
      };

      const result = await repository.create(input);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error on creation failure', async () => {
      mockDb.returning.mockRejectedValue(new Error('Insert failed'));

      const input = {
        content: 'Mensagem',
        senderId: 1,
        conversationId: 1,
      };

      await expect(repository.create(input)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete message', async () => {
      mockDb.where.mockResolvedValue({ rowCount: 1 });

      const result = await repository.delete(1);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false on delete error', async () => {
      mockDb.where.mockRejectedValue(new Error('Delete failed'));

      const result = await repository.delete(1);

      expect(result).toBe(false);
    });
  });
});
