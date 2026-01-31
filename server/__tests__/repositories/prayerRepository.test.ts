/**
 * @jest-environment node
 * @description Tests for PrayerRepository
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
};

jest.mock('../../neonConfig', () => ({
  db: mockDb,
}));

// Import apos os mocks
import { PrayerRepository } from '../../repositories/prayerRepository';

describe('PrayerRepository', () => {
  let repository: PrayerRepository;
  const mockPrayer = {
    id: 1,
    title: 'Oracao por Saude',
    description: 'Peco oracoes pela minha saude',
    userId: 1,
    isPublic: true,
    isAnswered: false,
    answeredAt: null,
    testimony: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    repository = new PrayerRepository();
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
  });

  describe('getAll', () => {
    it('should return all prayers ordered by createdAt', async () => {
      const mockPrayers = [mockPrayer, { ...mockPrayer, id: 2 }];
      mockDb.orderBy.mockResolvedValue(mockPrayers);

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
    it('should return prayer by id', async () => {
      mockDb.limit.mockResolvedValue([mockPrayer]);

      const result = await repository.getById(1);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
      expect(result).toBeDefined();
    });

    it('should return null if prayer not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await repository.getById(999);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockDb.limit.mockRejectedValue(new Error('Database error'));

      const result = await repository.getById(1);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create new prayer', async () => {
      mockDb.returning.mockResolvedValue([mockPrayer]);

      const input = {
        title: 'Oracao por Saude',
        description: 'Peco oracoes pela minha saude',
        userId: 1,
        isPublic: true,
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
        title: 'Oracao',
        description: 'Descricao',
        userId: 1,
        isPublic: true,
      };

      await expect(repository.create(input)).rejects.toThrow();
    });
  });

  describe('markAsAnswered', () => {
    it('should mark prayer as answered', async () => {
      const answeredPrayer = { ...mockPrayer, isAnswered: true };
      mockDb.returning.mockResolvedValue([answeredPrayer]);

      const result = await repository.markAsAnswered(1, 'Deus respondeu!');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return null if prayer not found', async () => {
      mockDb.returning.mockResolvedValue([]);

      const result = await repository.markAsAnswered(999);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockDb.returning.mockRejectedValue(new Error('Update failed'));

      const result = await repository.markAsAnswered(1);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete prayer and its intercessors', async () => {
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

  describe('getIntercessors', () => {
    it('should return intercessors for prayer', async () => {
      const mockIntercessors = [
        { id: 1, name: 'Joao' },
        { id: 2, name: 'Maria' },
      ];
      mockDb.where.mockResolvedValue(mockIntercessors);

      const result = await repository.getIntercessors(1);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return empty array on error', async () => {
      mockDb.where.mockRejectedValue(new Error('Query failed'));

      const result = await repository.getIntercessors(1);

      expect(result).toEqual([]);
    });
  });

  describe('addIntercessor', () => {
    it('should add intercessor to prayer', async () => {
      mockDb.returning.mockResolvedValue([{ prayerId: 1, userId: 2 }]);

      const result = await repository.addIntercessor(1, 2);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('removeIntercessor', () => {
    it('should remove intercessor from prayer', async () => {
      mockDb.where.mockResolvedValue({ rowCount: 1 });

      const result = await repository.removeIntercessor(1, 2);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockDb.where.mockRejectedValue(new Error('Delete failed'));

      const result = await repository.removeIntercessor(1, 2);

      expect(result).toBe(false);
    });
  });
});
