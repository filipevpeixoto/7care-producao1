/**
 * @fileoverview Testes unitários para AchievementRepository
 * @module server/__tests__/repositories/achievementRepository.test
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
import { AchievementRepository } from '../../repositories/achievementRepository';

describe('AchievementRepository', () => {
  let achievementRepository: AchievementRepository;

  const mockAchievement = {
    id: 1,
    name: 'Primeiro Login',
    description: 'Realizou o primeiro login no sistema',
    icon: '🎉',
    pointsRequired: 0,
    requiredConditions: null,
    badgeColor: '#FFD700',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    achievementRepository = new AchievementRepository();

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
    it('deve retornar todas as conquistas', async () => {
      mockDb.from.mockResolvedValue([mockAchievement]);

      const result = await achievementRepository.getAll();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Primeiro Login');
    });

    it('deve retornar array vazio em caso de erro', async () => {
      mockDb.from.mockRejectedValue(new Error('Database error'));

      const result = await achievementRepository.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getActive', () => {
    it('deve retornar apenas conquistas ativas', async () => {
      const achievements = [
        { ...mockAchievement, isActive: true },
        { ...mockAchievement, id: 2, isActive: false },
      ];
      mockDb.from.mockResolvedValue(achievements);

      const result = await achievementRepository.getActive();

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('deve retornar array vazio em caso de erro', async () => {
      mockDb.from.mockRejectedValue(new Error('Database error'));

      const result = await achievementRepository.getActive();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('deve retornar conquista por ID', async () => {
      mockDb.limit.mockResolvedValue([mockAchievement]);

      const result = await achievementRepository.getById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('deve retornar null se conquista não existe', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await achievementRepository.getById(999);

      expect(result).toBeNull();
    });

    it('deve retornar null em caso de erro', async () => {
      mockDb.limit.mockRejectedValue(new Error('Database error'));

      const result = await achievementRepository.getById(1);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('deve criar uma nova conquista', async () => {
      mockDb.returning.mockResolvedValue([mockAchievement]);

      const result = await achievementRepository.create({
        name: 'Primeiro Login',
        description: 'Realizou o primeiro login no sistema',
        icon: '🎉',
        pointsRequired: 0,
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result.name).toBe('Primeiro Login');
    });

    it('deve lançar erro se falhar ao criar', async () => {
      mockDb.returning.mockRejectedValue(new Error('Insert error'));

      await expect(
        achievementRepository.create({
          name: 'Conquista',
        })
      ).rejects.toThrow('Insert error');
    });
  });

  describe('update', () => {
    it('deve atualizar uma conquista existente', async () => {
      const updated = { ...mockAchievement, name: 'Nova Conquista' };
      mockDb.returning.mockResolvedValue([updated]);

      const result = await achievementRepository.update(1, { name: 'Nova Conquista' });

      expect(mockDb.update).toHaveBeenCalled();
      expect(result?.name).toBe('Nova Conquista');
    });

    it('deve retornar null se conquista não existe', async () => {
      mockDb.returning.mockResolvedValue([]);

      const result = await achievementRepository.update(999, { name: 'Test' });

      expect(result).toBeNull();
    });

    it('deve retornar null em caso de erro', async () => {
      mockDb.returning.mockRejectedValue(new Error('Update error'));

      const result = await achievementRepository.update(1, { name: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('deve deletar conquista com sucesso', async () => {
      mockDb.where.mockResolvedValue(undefined);

      const result = await achievementRepository.delete(1);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('deve retornar false em caso de erro', async () => {
      mockDb.where.mockRejectedValue(new Error('Delete error'));

      const result = await achievementRepository.delete(1);

      expect(result).toBe(false);
    });
  });
});
