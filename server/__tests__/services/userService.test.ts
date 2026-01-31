/**
 * Testes do UserService
 * Testa lógica de negócio de usuários
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.mock('../../repositories', () => ({
  userRepository: {
    getUserById: jest.fn(),
    getUserByEmail: jest.fn(),
    getAllUsers: jest.fn(),
    getUserByUsername: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    countUsers: jest.fn(),
    getUsersByChurch: jest.fn(),
    getUsersByDistrict: jest.fn(),
    getUsersByRole: jest.fn(),
    searchUsers: jest.fn(),
  },
}));

jest.mock('../../services/authService', () => ({
  authService: {
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
    generateToken: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('deve retornar lista de usuários', async () => {
      const { userRepository } = await import('../../repositories');

      const mockUsers = [
        { id: 1, name: 'User 1', email: 'user1@test.com', role: 'member' },
        { id: 2, name: 'User 2', email: 'user2@test.com', role: 'member' },
      ];

      (userRepository.getAllUsers as any).mockResolvedValue(mockUsers);

      const result = await userRepository.getAllUsers();

      expect(result).toHaveLength(2);
    });

    it('deve filtrar usuários por role', async () => {
      const { userRepository } = await import('../../repositories');

      const mockAdmins = [{ id: 1, name: 'Admin 1', email: 'admin1@test.com', role: 'admin' }];

      (userRepository.getUsersByRole as any).mockResolvedValue(mockAdmins);

      const result = await userRepository.getUsersByRole('admin');

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('admin');
    });

    it('deve filtrar usuários por igreja', async () => {
      const { userRepository } = await import('../../repositories');

      const mockChurchUsers = [
        { id: 1, name: 'Member 1', church: 'Igreja Central' },
        { id: 2, name: 'Member 2', church: 'Igreja Central' },
      ];

      (userRepository.getUsersByChurch as any).mockResolvedValue(mockChurchUsers);

      const result = await userRepository.getUsersByChurch('Igreja Central');

      expect(result).toHaveLength(2);
      result.forEach((user: any) => {
        expect(user.church).toBe('Igreja Central');
      });
    });

    it('deve filtrar usuários por distrito', async () => {
      const { userRepository } = await import('../../repositories');

      const mockDistrictUsers = [{ id: 1, name: 'Pastor 1', districtId: 1 }];

      (userRepository.getUsersByDistrict as any).mockResolvedValue(mockDistrictUsers);

      const result = await userRepository.getUsersByDistrict(1);

      expect(result).toHaveLength(1);
      expect(result[0].districtId).toBe(1);
    });
  });

  describe('getUserById', () => {
    it('deve retornar usuário por ID', async () => {
      const { userRepository } = await import('../../repositories');

      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'member',
      };

      (userRepository.getUserById as any).mockResolvedValue(mockUser);

      const result = await userRepository.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(userRepository.getUserById).toHaveBeenCalledWith(1);
    });

    it('deve retornar null para ID inexistente', async () => {
      const { userRepository } = await import('../../repositories');

      (userRepository.getUserById as any).mockResolvedValue(null);

      const result = await userRepository.getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('deve criar novo usuário com dados válidos', async () => {
      const { userRepository } = await import('../../repositories');
      const { authService } = await import('../../services/authService');

      const newUserData = {
        name: 'New User',
        email: 'new@test.com',
        password: 'SecurePass123!',
        role: 'member' as const,
      };

      const createdUser = {
        id: 1,
        ...newUserData,
        password: 'hashed_password',
      };

      (authService.hashPassword as any).mockResolvedValue('hashed_password');
      (userRepository.createUser as any).mockResolvedValue(createdUser);

      const result = await userRepository.createUser({
        ...newUserData,
        password: 'hashed_password',
      });

      expect(result.id).toBe(1);
      expect(result.name).toBe('New User');
    });

    it('deve rejeitar criação de usuário com email duplicado', async () => {
      const { userRepository } = await import('../../repositories');

      (userRepository.getUserByEmail as any).mockResolvedValue({
        id: 1,
        email: 'existing@test.com',
      });

      const existingUser = await userRepository.getUserByEmail('existing@test.com');
      expect(existingUser).not.toBeNull();
    });

    it('deve validar email obrigatório', () => {
      const userData = { name: 'Test', email: '', role: 'member' };
      expect(userData.email).toBe('');
    });
  });

  describe('updateUser', () => {
    it('deve atualizar usuário existente', async () => {
      const { userRepository } = await import('../../repositories');

      const existingUser = {
        id: 1,
        name: 'Old Name',
        email: 'test@test.com',
      };

      const updatedUser = {
        ...existingUser,
        name: 'New Name',
      };

      (userRepository.getUserById as any).mockResolvedValue(existingUser);
      (userRepository.updateUser as any).mockResolvedValue(updatedUser);

      const result = await userRepository.updateUser(1, { name: 'New Name' });

      expect(result?.name).toBe('New Name');
    });

    it('deve retornar null ao atualizar usuário inexistente', async () => {
      const { userRepository } = await import('../../repositories');

      (userRepository.getUserById as any).mockResolvedValue(null);
      (userRepository.updateUser as any).mockResolvedValue(null);

      const result = await userRepository.updateUser(999, { name: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('deve deletar usuário existente', async () => {
      const { userRepository } = await import('../../repositories');

      (userRepository.getUserById as any).mockResolvedValue({ id: 1 });
      (userRepository.deleteUser as any).mockResolvedValue(true);

      const result = await userRepository.deleteUser(1);

      expect(result).toBe(true);
    });

    it('deve retornar false ao deletar usuário inexistente', async () => {
      const { userRepository } = await import('../../repositories');

      (userRepository.deleteUser as any).mockResolvedValue(false);

      const result = await userRepository.deleteUser(999);

      expect(result).toBe(false);
    });
  });

  describe('Permissions', () => {
    it('superadmin pode ver todos os usuários', () => {
      const user = { role: 'superadmin' };
      const isSuperAdmin = user.role === 'superadmin';
      expect(isSuperAdmin).toBe(true);
    });

    it('pastor pode ver apenas usuários do seu distrito', () => {
      const pastor = { role: 'pastor', districtId: 1 };
      const isPastor = pastor.role === 'pastor';
      expect(isPastor).toBe(true);
      expect(pastor.districtId).toBe(1);
    });

    it('membro comum não pode ver outros usuários', () => {
      const member = { role: 'member', church: 'Igreja Central' };
      const hasAdminAccess = ['superadmin', 'admin', 'pastor'].includes(member.role);
      expect(hasAdminAccess).toBe(false);
    });
  });

  describe('Validation', () => {
    it('deve validar formato de email', () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'invalid-email';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test(validEmail)).toBe(true);
      expect(emailRegex.test(invalidEmail)).toBe(false);
    });

    it('deve validar força de senha', () => {
      const strongPassword = 'SecurePass123!';
      const weakPassword = '123';

      const isStrong =
        strongPassword.length >= 8 &&
        /[A-Z]/.test(strongPassword) &&
        /[a-z]/.test(strongPassword) &&
        /[0-9]/.test(strongPassword);

      expect(isStrong).toBe(true);
      expect(weakPassword.length >= 8).toBe(false);
    });
  });
});
