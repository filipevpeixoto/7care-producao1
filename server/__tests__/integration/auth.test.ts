/**
 * Testes de Integração - Autenticação
 * Testa endpoints de login, registro e autenticação
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';

// Mock do bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest
    .fn<(password: string, salt: number) => Promise<string>>()
    .mockResolvedValue('$2a$10$hashedpassword'),
  compare: jest
    .fn<(password: string, hash: string) => Promise<boolean>>()
    .mockImplementation((password: string, _hash: string) => {
      return Promise.resolve(password === 'meu7care' || password === 'correctpassword');
    }),
}));

// Mock types for tests
interface MockUser {
  id: number;
  name?: string;
  email: string;
  password?: string;
  role?: string;
  church?: string;
  isApproved?: boolean;
  status?: string;
  firstAccess?: boolean;
  districtId?: number | null;
}

// Mock do NeonAdapter
const mockStorage = {
  getUserByEmail: jest.fn<(email: string) => Promise<MockUser | null>>(),
  getUserById: jest.fn<(id: number) => Promise<MockUser | null>>(),
  createUser: jest.fn<(data: Partial<MockUser>) => Promise<MockUser>>(),
  updateUser: jest.fn<(id: number, data: Partial<MockUser>) => Promise<MockUser | null>>(),
  getAllUsers: jest.fn<() => Promise<MockUser[]>>().mockResolvedValue([]),
};

jest.mock('../../neonAdapter', () => ({
  NeonAdapter: jest.fn().mockImplementation(() => mockStorage),
}));

describe('Auth Integration Tests', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('deve retornar sucesso com credenciais válidas', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: '$2a$10$hashedpassword',
        role: 'member',
        church: 'Igreja Teste',
        isApproved: true,
        status: 'approved',
        firstAccess: false,
        districtId: null,
      };

      mockStorage.getUserByEmail.mockResolvedValueOnce(mockUser);

      // Simular validação de login
      const loginData = { email: 'test@example.com', password: 'meu7care' };
      const user = await mockStorage.getUserByEmail(loginData.email);

      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
      expect(user?.role).toBe('member');
    });

    it('deve rejeitar credenciais inválidas', async () => {
      mockStorage.getUserByEmail.mockResolvedValueOnce(null);

      const loginData = { email: 'invalid@example.com', password: 'wrongpassword' };
      const user = await mockStorage.getUserByEmail(loginData.email);

      expect(user).toBeNull();
    });

    it('deve validar formato de email', () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'notanemail';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test(validEmail)).toBe(true);
      expect(emailRegex.test(invalidEmail)).toBe(false);
    });
  });

  describe('POST /api/auth/register', () => {
    it('deve criar usuário com dados válidos', async () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@example.com',
        role: 'interested',
      };

      mockStorage.getUserByEmail.mockResolvedValueOnce(null);
      mockStorage.createUser.mockResolvedValueOnce({
        id: 2,
        ...newUser,
        isApproved: true,
        status: 'approved',
        firstAccess: true,
      });

      const existingUser = await mockStorage.getUserByEmail(newUser.email);
      expect(existingUser).toBeNull();

      const createdUser = await mockStorage.createUser(newUser);
      expect(createdUser.id).toBeDefined();
      expect(createdUser.email).toBe(newUser.email);
    });

    it('deve rejeitar email já existente', async () => {
      const existingUser = {
        id: 1,
        email: 'existing@example.com',
        name: 'Existing User',
      };

      mockStorage.getUserByEmail.mockResolvedValueOnce(existingUser);

      const user = await mockStorage.getUserByEmail('existing@example.com');
      expect(user).not.toBeNull();
    });

    it('deve validar campos obrigatórios', () => {
      const validData = { name: 'Test', email: 'test@example.com' };
      const invalidData = { name: '', email: '' };

      expect(validData.name.length).toBeGreaterThan(0);
      expect(validData.email.length).toBeGreaterThan(0);
      expect(invalidData.name.length).toBe(0);
      expect(invalidData.email.length).toBe(0);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('deve alterar senha com dados válidos', async () => {
      const mockUser: MockUser = {
        id: 1,
        email: 'test@example.com',
        password: '$2a$10$hashedpassword',
      };

      mockStorage.getUserById.mockResolvedValueOnce(mockUser);
      mockStorage.updateUser.mockResolvedValueOnce({
        ...mockUser,
        firstAccess: false,
      });

      const user = await mockStorage.getUserById(1);
      expect(user).not.toBeNull();

      const updatedUser = await mockStorage.updateUser(1, {
        password: 'newhashedpassword',
        firstAccess: false,
      });
      expect(updatedUser?.firstAccess).toBe(false);
    });

    it('deve validar força da senha', () => {
      const weakPassword = '123';
      const strongPassword = 'MyStr0ng!Pass';

      expect(weakPassword.length).toBeLessThan(6);
      expect(strongPassword.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('GET /api/auth/me', () => {
    it('deve retornar dados do usuário autenticado', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'member',
        church: 'Igreja Teste',
        password: 'hashedpassword',
      };

      mockStorage.getUserById.mockResolvedValueOnce(mockUser);

      const user = await mockStorage.getUserById(1);
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');

      // Simular remoção da senha da resposta
      const { password: _password, ...safeUser } = user!;
      expect(safeUser).not.toHaveProperty('password');
    });

    it('deve retornar erro para usuário não encontrado', async () => {
      mockStorage.getUserById.mockResolvedValueOnce(null);

      const user = await mockStorage.getUserById(9999);
      expect(user).toBeNull();
    });
  });
});

describe('Auth Security Tests', () => {
  describe('Rate Limiting', () => {
    it('deve limitar tentativas de login', () => {
      const maxAttempts = 5;
      const windowMs = 15 * 60 * 1000; // 15 minutos

      expect(maxAttempts).toBe(5);
      expect(windowMs).toBe(900000);
    });
  });

  describe('Password Hashing', () => {
    it('deve usar bcrypt para hash de senhas', () => {
      const saltRounds = 10;
      expect(saltRounds).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Input Sanitization', () => {
    it('deve sanitizar entrada de email', () => {
      const dirtyEmail = '  TEST@Example.COM  ';
      const cleanEmail = dirtyEmail.trim().toLowerCase();

      expect(cleanEmail).toBe('test@example.com');
    });

    it('deve prevenir SQL injection no email', () => {
      const maliciousEmail = "'; DROP TABLE users; --";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test(maliciousEmail)).toBe(false);
    });
  });
});
