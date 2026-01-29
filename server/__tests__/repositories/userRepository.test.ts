/**
 * @fileoverview Testes unitários para UserRepository
 * @module server/__tests__/repositories/userRepository.test
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

// Mock simplificado do db - usando any para evitar problemas de tipagem

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
import { UserRepository } from '../../repositories/userRepository';

describe('UserRepository', () => {
  let userRepository: UserRepository;

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: 'member' as const,
    church: 'Igreja Teste',
    churchCode: 'IT01',
    districtId: 1,
    points: 100,
    status: 'active',
    isApproved: true,
    firstAccess: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository = new UserRepository();

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

  describe('getAllUsers', () => {
    it('deve retornar todos os usuários ordenados por nome', async () => {
      mockDb.orderBy.mockResolvedValue([mockUser]);

      const result = await userRepository.getAllUsers();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('deve retornar array vazio em caso de erro', async () => {
      mockDb.orderBy.mockRejectedValue(new Error('Database error'));

      const result = await userRepository.getAllUsers();

      expect(result).toEqual([]);
    });
  });

  describe('getUserById', () => {
    it('deve retornar usuário por ID', async () => {
      mockDb.limit.mockResolvedValue([mockUser]);

      const result = await userRepository.getUserById(1);

      expect(result).toBeTruthy();
      expect(result?.id).toBe(1);
    });

    it('deve retornar null quando usuário não existe', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await userRepository.getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('deve retornar usuário por email', async () => {
      mockDb.limit.mockResolvedValue([mockUser]);

      const result = await userRepository.getUserByEmail('test@example.com');

      expect(result).toBeTruthy();
      expect(result?.email).toBe('test@example.com');
    });

    it('deve retornar null quando email não existe', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await userRepository.getUserByEmail('inexistente@test.com');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('deve criar usuário com dados válidos', async () => {
      mockDb.returning.mockResolvedValue([mockUser]);

      const result = await userRepository.createUser({
        name: 'Novo User',
        email: 'novo@test.com',
        password: 'senha123',
        role: 'member',
        church: 'Igreja Teste',
        churchCode: 'IT01',
        districtId: 1,
        points: 0,
        status: 'active',
        isApproved: false,
        firstAccess: true,
      });

      expect(result).toBeTruthy();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('deve lançar erro quando criação falha', async () => {
      mockDb.returning.mockRejectedValue(new Error('Constraint violation'));

      await expect(
        userRepository.createUser({
          name: 'Novo User',
          email: 'novo@test.com',
          password: 'senha123',
          role: 'member',
          church: 'Igreja Teste',
          churchCode: 'IT01',
          districtId: 1,
          points: 0,
          status: 'active',
          isApproved: false,
          firstAccess: true,
        })
      ).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('deve atualizar usuário existente', async () => {
      mockDb.returning.mockResolvedValue([{ ...mockUser, name: 'Updated Name' }]);

      const result = await userRepository.updateUser(1, { name: 'Updated Name' });

      expect(result).toBeTruthy();
      expect(result?.name).toBe('Updated Name');
    });

    it('deve retornar null quando usuário não existe', async () => {
      mockDb.returning.mockResolvedValue([]);

      const result = await userRepository.updateUser(999, { name: 'Updated Name' });

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('deve deletar usuário existente', async () => {
      mockDb.where.mockResolvedValue({ rowCount: 1 });

      const result = await userRepository.deleteUser(1);

      expect(result).toBe(true);
    });
  });

  describe('countUsers', () => {
    it('deve contar total de usuários', async () => {
      mockDb.from.mockResolvedValue([{ count: 10 }]);

      const result = await userRepository.countUsers();

      expect(result).toBe(10);
    });
  });

  describe('getUsersByRole', () => {
    it('deve filtrar usuários por role', async () => {
      mockDb.orderBy.mockResolvedValue([mockUser]);

      const result = await userRepository.getUsersByRole('member');

      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('getUsersByChurch', () => {
    it('deve filtrar usuários por igreja', async () => {
      mockDb.orderBy.mockResolvedValue([mockUser]);

      const result = await userRepository.getUsersByChurch('Igreja Teste');

      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('getUsersByDistrict', () => {
    it('deve filtrar usuários por distrito', async () => {
      mockDb.orderBy.mockResolvedValue([mockUser]);

      const result = await userRepository.getUsersByDistrict(1);

      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('searchUsers', () => {
    it('deve buscar usuários por termo', async () => {
      mockDb.limit.mockResolvedValue([mockUser]);

      const result = await userRepository.searchUsers('Test');

      expect(result).toHaveLength(1);
    });
  });

  describe('updateUserPoints', () => {
    it('deve atualizar pontos do usuário', async () => {
      mockDb.returning.mockResolvedValue([{ ...mockUser, points: 200 }]);

      const result = await userRepository.updateUserPoints(1, 200);

      expect(result?.points).toBe(200);
    });
  });
});
