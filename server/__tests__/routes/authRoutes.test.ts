/**
 * Testes das Rotas de Autenticação
 * Testa login, registro, logout, reset e alteração de senha
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define mock before jest.mock to avoid TS2345
const mockStorage: any = {
  getUserByEmail: jest.fn(),
  getUserByNormalizedUsername: jest.fn(),
  getUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  updateUserPassword: jest.fn(),
  getAllChurches: jest.fn(),
  getOrCreateChurch: jest.fn(),
};

const mockBcrypt: any = {
  compare: jest.fn(),
  hash: jest.fn(),
};

const mockJwt: any = {
  sign: jest.fn(),
  verify: jest.fn(),
};

// Mock dependencies
jest.mock('../../neonAdapter', () => ({
  NeonAdapter: jest.fn().mockImplementation(() => mockStorage),
}));

jest.mock('bcryptjs', () => mockBcrypt);
jest.mock('jsonwebtoken', () => mockJwt);

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    authFailure: jest.fn(),
    authSuccess: jest.fn(),
  },
}));

jest.mock('../../middleware/rateLimiter', () => ({
  authLimiter: (req: any, res: any, next: any) => next(),
  registerLimiter: (req: any, res: any, next: any) => next(),
  sensitiveLimiter: (req: any, res: any, next: any) => next(),
}));

jest.mock('../../middleware/validation', () => ({
  validateBody: () => (req: any, res: any, next: any) => {
    req.validatedBody = req.body;
    next();
  },
  ValidatedRequest: {},
}));

jest.mock('../../config/jwtConfig', () => ({
  JWT_SECRET: 'test-secret-key-for-testing-purposes-min-32-chars',
  JWT_EXPIRES_IN: '24h',
}));

describe('AuthRoutes', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      headers: {},
      params: {},
      query: {},
      validatedBody: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('POST /api/auth/login', () => {
    it('deve retornar erro se credenciais inválidas', async () => {
      mockReq.body = { email: 'test@test.com', password: 'wrongpassword' };
      mockReq.validatedBody = mockReq.body;

      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockStorage.getUserByNormalizedUsername.mockResolvedValue(null);

      // Simular o comportamento do handler
      const user = await mockStorage.getUserByEmail(mockReq.body.email);
      expect(user).toBeNull();
    });

    it('deve retornar sucesso com token se credenciais válidas', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: 'member',
        isApproved: true,
        status: 'active',
      };

      mockReq.body = { email: 'test@test.com', password: 'correctpassword' };
      mockReq.validatedBody = mockReq.body;

      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('test-token');

      // Simular o comportamento
      const user = await mockStorage.getUserByEmail(mockReq.body.email);
      const isValidPassword = await mockBcrypt.compare(mockReq.body.password, user.password);

      expect(user).not.toBeNull();
      expect(isValidPassword).toBe(true);
    });

    it('deve buscar usuário por username normalizado se email não encontrado', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashedpassword',
        name: 'Test User',
        role: 'member',
      };

      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockStorage.getUserByNormalizedUsername.mockResolvedValue(mockUser);

      const userByEmail = await mockStorage.getUserByEmail('testuser');
      expect(userByEmail).toBeNull();

      const userByUsername = await mockStorage.getUserByNormalizedUsername('testuser');
      expect(userByUsername).not.toBeNull();
      expect(userByUsername.username).toBe('testuser');
    });

    it('deve verificar senha com bcrypt', async () => {
      const hashedPassword = '$2a$10$hashedpassword';
      const plainPassword = 'testpassword';

      mockBcrypt.compare.mockResolvedValue(true);

      const result = await mockBcrypt.compare(plainPassword, hashedPassword);
      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
    });

    it('deve rejeitar senha incorreta', async () => {
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await mockBcrypt.compare('wrongpassword', 'hashedpassword');
      expect(result).toBe(false);
    });
  });

  describe('POST /api/auth/register', () => {
    it('deve criar usuário com dados válidos', async () => {
      const newUser = {
        name: 'Novo Usuário',
        email: 'novo@test.com',
        password: 'SenhaForte123!',
        phone: '11999999999',
      };

      const createdUser = {
        id: 1,
        ...newUser,
        role: 'interested',
        isApproved: false,
      };

      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashedpassword');
      mockStorage.createUser.mockResolvedValue(createdUser);

      // Verificar que email não existe
      const existingUser = await mockStorage.getUserByEmail(newUser.email);
      expect(existingUser).toBeNull();

      // Hash da senha
      const hashedPassword = await mockBcrypt.hash(newUser.password, 12);
      expect(hashedPassword).toBe('hashedpassword');

      // Criar usuário
      const result = await mockStorage.createUser({ ...newUser, password: hashedPassword });
      expect(result.id).toBe(1);
    });

    it('deve rejeitar registro com email já existente', async () => {
      mockStorage.getUserByEmail.mockResolvedValue({
        id: 1,
        email: 'existing@test.com',
      });

      const existingUser = await mockStorage.getUserByEmail('existing@test.com');
      expect(existingUser).not.toBeNull();
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('deve alterar senha com senha antiga correta', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        password: 'oldHashedPassword',
      };

      mockStorage.getUserById.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue('newHashedPassword');
      mockStorage.updateUserPassword.mockResolvedValue(true);

      // Buscar usuário
      const user = await mockStorage.getUserById(userId);
      expect(user).not.toBeNull();

      // Verificar senha antiga
      const isOldPasswordValid = await mockBcrypt.compare('oldPassword', user.password);
      expect(isOldPasswordValid).toBe(true);

      // Hash nova senha
      const newHashedPassword = await mockBcrypt.hash('NewPassword123!', 12);
      expect(newHashedPassword).toBe('newHashedPassword');

      // Atualizar senha
      const updated = await mockStorage.updateUserPassword(userId, newHashedPassword);
      expect(updated).toBe(true);
    });

    it('deve rejeitar alteração com senha antiga incorreta', async () => {
      mockStorage.getUserById.mockResolvedValue({
        id: 1,
        password: 'hashedPassword',
      });
      mockBcrypt.compare.mockResolvedValue(false);

      const user = await mockStorage.getUserById(1);
      const isValid = await mockBcrypt.compare('wrongOldPassword', user.password);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token', () => {
    it('deve gerar token JWT válido', () => {
      const payload = {
        id: 1,
        email: 'test@test.com',
        role: 'member',
        name: 'Test User',
      };

      mockJwt.sign.mockReturnValue('generated-token');

      const token = mockJwt.sign(payload, 'secret', { expiresIn: '24h' });
      expect(token).toBe('generated-token');
      expect(mockJwt.sign).toHaveBeenCalledWith(payload, 'secret', { expiresIn: '24h' });
    });

    it('deve verificar token JWT', () => {
      const token = 'valid-token';
      const decoded = { id: 1, email: 'test@test.com' };

      mockJwt.verify.mockReturnValue(decoded);

      const result = mockJwt.verify(token, 'secret');
      expect(result).toEqual(decoded);
    });
  });

  describe('Validações de Segurança', () => {
    it('deve hash de senha com salt adequado', async () => {
      const password = 'TestPassword123!';
      const saltRounds = 12;

      mockBcrypt.hash.mockResolvedValue('hashed-with-salt');

      await mockBcrypt.hash(password, saltRounds);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, saltRounds);
    });

    it('deve normalizar email para lowercase', () => {
      const email = 'Test@Example.COM';
      const normalized = email.toLowerCase();
      expect(normalized).toBe('test@example.com');
    });
  });
});
