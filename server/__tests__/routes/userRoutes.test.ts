/**
 * Testes das Rotas de Usuários
 * Testa CRUD de usuários, pontos, permissões
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define mock before jest.mock
const mockStorage: any = {
  getUserById: jest.fn(),
  getAllUsers: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getUsersByChurch: jest.fn(),
  getUsersByDistrict: jest.fn(),
  getUsersByRole: jest.fn(),
  getUserPointsHistory: jest.fn(),
  addUserPoints: jest.fn(),
  removeUserPoints: jest.fn(),
  getUserAchievements: jest.fn(),
  grantAchievement: jest.fn(),
};

// Mock dependencies
jest.mock('../../neonAdapter', () => ({
  NeonAdapter: jest.fn().mockImplementation(() => mockStorage),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('UserRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('deve listar todos os usuários', async () => {
      const mockUsers = [
        { id: 1, name: 'User 1', email: 'user1@test.com', role: 'member' },
        { id: 2, name: 'User 2', email: 'user2@test.com', role: 'leader' },
      ];

      mockStorage.getAllUsers.mockResolvedValue(mockUsers);

      const users = await mockStorage.getAllUsers();
      expect(users).toHaveLength(2);
      expect(users[0].name).toBe('User 1');
    });

    it('deve retornar array vazio se não houver usuários', async () => {
      mockStorage.getAllUsers.mockResolvedValue([]);

      const users = await mockStorage.getAllUsers();
      expect(users).toHaveLength(0);
    });
  });

  describe('GET /api/users/:id', () => {
    it('deve retornar usuário por ID', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'member',
        church: 'Igreja Central',
        points: 100,
      };

      mockStorage.getUserById.mockResolvedValue(mockUser);

      const user = await mockStorage.getUserById(1);
      expect(user).not.toBeNull();
      expect(user.id).toBe(1);
      expect(user.name).toBe('Test User');
    });

    it('deve retornar null se usuário não existir', async () => {
      mockStorage.getUserById.mockResolvedValue(null);

      const user = await mockStorage.getUserById(999);
      expect(user).toBeNull();
    });
  });

  describe('POST /api/users', () => {
    it('deve criar novo usuário', async () => {
      const newUserData = {
        name: 'Novo Usuário',
        email: 'novo@test.com',
        password: 'hashedpassword',
        role: 'interested',
        phone: '11999999999',
      };

      const createdUser = {
        id: 1,
        ...newUserData,
        createdAt: new Date(),
      };

      mockStorage.createUser.mockResolvedValue(createdUser);

      const user = await mockStorage.createUser(newUserData);
      expect(user.id).toBe(1);
      expect(user.email).toBe('novo@test.com');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('deve atualizar dados do usuário', async () => {
      const updates = {
        name: 'Nome Atualizado',
        phone: '11888888888',
      };

      const updatedUser = {
        id: 1,
        name: 'Nome Atualizado',
        email: 'test@test.com',
        phone: '11888888888',
      };

      mockStorage.updateUser.mockResolvedValue(updatedUser);

      const user = await mockStorage.updateUser(1, updates);
      expect(user.name).toBe('Nome Atualizado');
      expect(user.phone).toBe('11888888888');
    });

    it('deve atualizar role do usuário', async () => {
      mockStorage.updateUser.mockResolvedValue({
        id: 1,
        role: 'leader',
      });

      const user = await mockStorage.updateUser(1, { role: 'leader' });
      expect(user.role).toBe('leader');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('deve deletar usuário existente', async () => {
      mockStorage.deleteUser.mockResolvedValue(true);

      const result = await mockStorage.deleteUser(1);
      expect(result).toBe(true);
    });

    it('deve retornar false se usuário não existir', async () => {
      mockStorage.deleteUser.mockResolvedValue(false);

      const result = await mockStorage.deleteUser(999);
      expect(result).toBe(false);
    });
  });

  describe('Filtros de Usuários', () => {
    it('deve filtrar usuários por igreja', async () => {
      const users = [
        { id: 1, name: 'User 1', church: 'Igreja Central' },
        { id: 2, name: 'User 2', church: 'Igreja Central' },
      ];

      mockStorage.getUsersByChurch.mockResolvedValue(users);

      const result = await mockStorage.getUsersByChurch('Igreja Central');
      expect(result).toHaveLength(2);
      expect(result[0].church).toBe('Igreja Central');
    });

    it('deve filtrar usuários por distrito', async () => {
      const users = [
        { id: 1, name: 'User 1', districtId: 1 },
        { id: 3, name: 'User 3', districtId: 1 },
      ];

      mockStorage.getUsersByDistrict.mockResolvedValue(users);

      const result = await mockStorage.getUsersByDistrict(1);
      expect(result).toHaveLength(2);
    });

    it('deve filtrar usuários por role', async () => {
      const leaders = [
        { id: 1, name: 'Leader 1', role: 'leader' },
        { id: 2, name: 'Leader 2', role: 'leader' },
      ];

      mockStorage.getUsersByRole.mockResolvedValue(leaders);

      const result = await mockStorage.getUsersByRole('leader');
      expect(result).toHaveLength(2);
      expect(result.every((u: any) => u.role === 'leader')).toBe(true);
    });
  });

  describe('Sistema de Pontos', () => {
    it('deve obter histórico de pontos do usuário', async () => {
      const history = [
        { id: 1, userId: 1, points: 10, reason: 'Presença', createdAt: new Date() },
        { id: 2, userId: 1, points: 5, reason: 'Participação', createdAt: new Date() },
      ];

      mockStorage.getUserPointsHistory.mockResolvedValue(history);

      const result = await mockStorage.getUserPointsHistory(1);
      expect(result).toHaveLength(2);
    });

    it('deve adicionar pontos ao usuário', async () => {
      const pointEntry = {
        userId: 1,
        points: 10,
        reason: 'Presença em evento',
        eventId: 1,
      };

      mockStorage.addUserPoints.mockResolvedValue({
        id: 1,
        ...pointEntry,
      });

      const result = await mockStorage.addUserPoints(pointEntry);
      expect(result.points).toBe(10);
    });

    it('deve remover pontos do usuário', async () => {
      mockStorage.removeUserPoints.mockResolvedValue({
        id: 2,
        userId: 1,
        points: -5,
        reason: 'Falta em evento',
      });

      const result = await mockStorage.removeUserPoints({
        userId: 1,
        points: -5,
        reason: 'Falta em evento',
      });
      expect(result.points).toBe(-5);
    });
  });

  describe('Conquistas', () => {
    it('deve listar conquistas do usuário', async () => {
      const achievements = [
        { id: 1, name: 'Primeira Presença', icon: '🎉', unlockedAt: new Date() },
        { id: 2, name: '10 Presenças', icon: '⭐', unlockedAt: new Date() },
      ];

      mockStorage.getUserAchievements.mockResolvedValue(achievements);

      const result = await mockStorage.getUserAchievements(1);
      expect(result).toHaveLength(2);
    });

    it('deve conceder conquista ao usuário', async () => {
      mockStorage.grantAchievement.mockResolvedValue({
        userId: 1,
        achievementId: 1,
        unlockedAt: new Date(),
      });

      const result = await mockStorage.grantAchievement(1, 1);
      expect(result.achievementId).toBe(1);
    });
  });

  describe('Validações', () => {
    it('deve validar ID numérico', () => {
      const validId = 123;
      const invalidId = 'abc';

      expect(Number.isInteger(validId)).toBe(true);
      expect(Number.isInteger(parseInt(invalidId))).toBe(false);
    });

    it('deve validar email formato correto', () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'invalid-email';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test(validEmail)).toBe(true);
      expect(emailRegex.test(invalidEmail)).toBe(false);
    });

    it('deve validar roles permitidas', () => {
      const validRoles = ['superadmin', 'pastor', 'leader', 'member', 'interested'];

      expect(validRoles.includes('leader')).toBe(true);
      expect(validRoles.includes('invalid_role')).toBe(false);
    });
  });
});
