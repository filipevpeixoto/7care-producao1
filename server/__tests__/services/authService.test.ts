/**
 * @fileoverview Testes unitários para AuthService
 * @module server/__tests__/services/authService.test
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock do neonConfig ANTES de qualquer outra importação
jest.mock('../../neonConfig', () => ({
  db: {},
}));

// Mock do userRepository
jest.mock('../../repositories/userRepository', () => ({
  userRepository: {
    getUserByEmail: jest.fn(),
    getUserById: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
  },
}));

// Mock do churchRepository para evitar dependência circular
jest.mock('../../repositories/churchRepository', () => ({
  churchRepository: {},
}));

// Mock do bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock do generateTokens
jest.mock('../../middleware/jwtAuth', () => ({
  generateTokens: jest.fn().mockReturnValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  }),
}));

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Importar após os mocks
import { AuthService } from '../../services/authService';
import { userRepository } from '../../repositories/userRepository';
import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password: '$2a$12$hashedPassword',
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
    authService = new AuthService();
  });

  describe('login', () => {
    it('deve retornar erro quando usuário não existe', async () => {
      (userRepository.getUserByEmail as any).mockResolvedValue(null);

      const result = await authService.login('inexistente@test.com', 'senha123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Credenciais inválidas');
    });

    it('deve retornar erro quando usuário está inativo', async () => {
      (userRepository.getUserByEmail as any).mockResolvedValue({
        ...mockUser,
        status: 'inactive',
      });

      const result = await authService.login('inativo@test.com', 'senha123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('desativada');
    });

    it('deve retornar erro quando senha é inválida', async () => {
      (userRepository.getUserByEmail as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const result = await authService.login('test@example.com', 'senhaErrada');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Credenciais inválidas');
    });

    it('deve retornar tokens quando credenciais são válidas', async () => {
      (userRepository.getUserByEmail as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const result = await authService.login('test@example.com', 'senhaCorreta');

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('register', () => {
    it('deve retornar erro quando email já existe', async () => {
      (userRepository.getUserByEmail as any).mockResolvedValue(mockUser);

      const result = await authService.register({
        name: 'Teste',
        email: 'test@example.com',
        password: 'Senha@123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('já cadastrado');
    });

    it('deve retornar erro quando senha é muito fraca', async () => {
      (userRepository.getUserByEmail as any).mockResolvedValue(null);

      const result = await authService.register({
        name: 'Teste',
        email: 'novo@test.com',
        password: '123', // senha muito fraca
      });

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
    });

    it('deve criar usuário com dados válidos', async () => {
      (userRepository.getUserByEmail as any).mockResolvedValue(null);
      (userRepository.createUser as any).mockResolvedValue(mockUser);
      (bcrypt.hash as any).mockResolvedValue('$2a$12$hashedPassword');

      const result = await authService.register({
        name: 'Novo User',
        email: 'novo@test.com',
        password: 'Senha@123Forte',
      });

      expect(result.success).toBe(true);
      expect(userRepository.createUser).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('deve retornar erro quando usuário não existe', async () => {
      (userRepository.getUserById as any).mockResolvedValue(null);

      const result = await authService.changePassword(999, 'senhaAtual', 'novaSenha123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('não encontrado');
    });

    it('deve retornar erro quando senha atual é incorreta', async () => {
      (userRepository.getUserById as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const result = await authService.changePassword(1, 'senhaErrada', 'novaSenha123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('atual incorreta');
    });

    it('deve alterar senha com sucesso', async () => {
      (userRepository.getUserById as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (bcrypt.hash as any).mockResolvedValue('$2a$12$newHashedPassword');
      (userRepository.updateUser as any).mockResolvedValue({
        ...mockUser,
        password: '$2a$12$newHashedPassword',
      });

      const result = await authService.changePassword(1, 'senhaAtual', 'NovaSenha@123');

      expect(result.success).toBe(true);
      expect(userRepository.updateUser).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('deve retornar sucesso mesmo quando email não existe (por segurança)', async () => {
      (userRepository.getUserByEmail as any).mockResolvedValue(null);

      const result = await authService.resetPassword('inexistente@test.com');

      // Por segurança, não revelamos se o usuário existe ou não
      expect(result.success).toBe(true);
      // Não deve retornar tempPassword quando usuário não existe
      expect(result.tempPassword).toBeUndefined();
    });

    it('deve gerar senha temporária com sucesso', async () => {
      (userRepository.getUserByEmail as any).mockResolvedValue(mockUser);
      (bcrypt.hash as any).mockResolvedValue('$2a$12$tempHashedPassword');
      (userRepository.updateUser as any).mockResolvedValue(mockUser);

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(result.tempPassword).toBeDefined();
    });
  });

  describe('hashPassword', () => {
    it('deve fazer hash da senha corretamente', async () => {
      (bcrypt.hash as any).mockResolvedValue('$2a$12$hashedResult');

      const result = await authService.hashPassword('minhasenha123');

      expect(bcrypt.hash).toHaveBeenCalledWith('minhasenha123', 12);
      expect(result).toBe('$2a$12$hashedResult');
    });
  });

  describe('verifyPassword', () => {
    it('deve verificar senha corretamente - match', async () => {
      (bcrypt.compare as any).mockResolvedValue(true);

      const result = await authService.verifyPassword('senha123', '$2a$12$hash');

      expect(result).toBe(true);
    });

    it('deve verificar senha corretamente - no match', async () => {
      (bcrypt.compare as any).mockResolvedValue(false);

      const result = await authService.verifyPassword('senhaErrada', '$2a$12$hash');

      expect(result).toBe(false);
    });
  });
});
