/**
 * AuthService unit tests
 * Tests login, register, changePassword, resetPassword, and password utilities.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────
const {
  mockGetUserByEmail,
  mockGetUserById,
  mockGetUserByNormalizedUsername,
  mockCreateUser,
  mockUpdateUser,
  mockGenerateTokens,
  mockValidatePasswordStrength,
  mockGetPasswordSuggestions,
  mockBcryptHash,
  mockBcryptCompare,
} = vi.hoisted(() => ({
  mockGetUserByEmail: vi.fn(),
  mockGetUserById: vi.fn(),
  mockGetUserByNormalizedUsername: vi.fn(),
  mockCreateUser: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockGenerateTokens: vi.fn(),
  mockValidatePasswordStrength: vi.fn(),
  mockGetPasswordSuggestions: vi.fn(),
  mockBcryptHash: vi.fn().mockResolvedValue('$2a$12$hashed'),
  mockBcryptCompare: vi.fn().mockResolvedValue(false),
}));

vi.mock('../repositories', () => ({
  userRepository: {
    getUserByEmail: mockGetUserByEmail,
    getUserById: mockGetUserById,
    getUserByNormalizedUsername: mockGetUserByNormalizedUsername,
    createUser: mockCreateUser,
    updateUser: mockUpdateUser,
  },
}));

vi.mock('../middleware/jwtAuth', () => ({
  generateTokens: mockGenerateTokens,
}));

vi.mock('../utils/passwordValidator', () => ({
  validatePasswordStrength: mockValidatePasswordStrength,
  getPasswordSuggestions: mockGetPasswordSuggestions,
}));

vi.mock('bcryptjs', () => ({
  hash: mockBcryptHash,
  compare: mockBcryptCompare,
  default: {
    hash: mockBcryptHash,
    compare: mockBcryptCompare,
  },
}));

// Import after mocks
import { AuthService } from '../services/authService';

// ── Test Data ───────────────────────────────────────────────────
const mockUser = {
  id: 1,
  name: 'João Silva',
  email: 'joao@test.com',
  password: '$2a$12$existingHash',
  role: 'member' as const,
  status: 'active' as const,
  church: 'Igreja Central',
  districtId: 1,
  firstAccess: false,
  lastLogin: null,
  lastAccess: null,
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();

    // Default mock returns
    mockGenerateTokens.mockReturnValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });
    mockValidatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
    mockGetPasswordSuggestions.mockReturnValue(['Use letras maiúsculas']);
    mockBcryptHash.mockResolvedValue('$2a$12$hashed');
    mockBcryptCompare.mockResolvedValue(false);
  });

  // ── login ───────────────────────────────────────────────────
  describe('login', () => {
    it('should return success with tokens for valid credentials', async () => {
      mockGetUserByEmail.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValueOnce(true);

      const result = await authService.login('joao@test.com', 'correctPassword');

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user).toBeDefined();
      expect(result.user?.password).toBeUndefined();
    });

    it('should return error when user not found', async () => {
      mockGetUserByEmail.mockResolvedValue(null);
      mockGetUserByNormalizedUsername.mockResolvedValue(null);

      const result = await authService.login('unknown@test.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Credenciais inválidas');
    });

    it('should return error for inactive user', async () => {
      mockGetUserByEmail.mockResolvedValue({ ...mockUser, status: 'inactive' });

      const result = await authService.login('joao@test.com', 'correctPassword');

      expect(result.success).toBe(false);
      expect(result.error).toContain('desativada');
    });

    it('should return error for wrong password', async () => {
      mockGetUserByEmail.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValueOnce(false);

      const result = await authService.login('joao@test.com', 'wrongPassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Credenciais inválidas');
    });

    it('should fallback to normalized username when email not found', async () => {
      mockGetUserByEmail.mockResolvedValue(null);
      mockGetUserByNormalizedUsername.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValueOnce(true);

      const result = await authService.login('joaosilva', 'correctPassword');

      expect(mockGetUserByNormalizedUsername).toHaveBeenCalledWith('joaosilva');
      expect(result.success).toBe(true);
    });

    it('should set requirePasswordChange for firstAccess users', async () => {
      mockGetUserByEmail.mockResolvedValue({ ...mockUser, firstAccess: true });
      mockBcryptCompare.mockResolvedValueOnce(true);

      const result = await authService.login('joao@test.com', 'correctPassword');

      expect(result.success).toBe(true);
      expect(result.requirePasswordChange).toBe(true);
    });

    it('should update lastLogin on successful login', async () => {
      mockGetUserByEmail.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValueOnce(true);

      await authService.login('joao@test.com', 'correctPassword');

      expect(mockUpdateUser).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          lastLogin: expect.any(String),
          lastAccess: expect.any(String),
        })
      );
    });

    it('should handle unexpected errors gracefully', async () => {
      mockGetUserByEmail.mockRejectedValue(new Error('DB connection failed'));

      const result = await authService.login('joao@test.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Erro interno no servidor');
    });
  });

  // ── register ────────────────────────────────────────────────
  describe('register', () => {
    const registerData = {
      name: 'Maria Santos',
      email: 'maria@test.com',
      password: 'SenhaForte123!',
      role: 'member',
      churchCode: 'IGR001',
    };

    it('should create user with hashed password', async () => {
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue({ ...mockUser, id: 2, email: 'maria@test.com' });

      const result = await authService.register(registerData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.password).toBeUndefined();
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          password: '$2a$12$hashed',
          status: 'pending',
          firstAccess: true,
          isApproved: false,
        })
      );
    });

    it('should reject duplicate email', async () => {
      mockGetUserByEmail.mockResolvedValue(mockUser);

      const result = await authService.register(registerData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email já cadastrado');
      expect(result.validationErrors).toBeDefined();
    });

    it('should reject weak password', async () => {
      mockGetUserByEmail.mockResolvedValue(null);
      mockValidatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Senha deve ter pelo menos 8 caracteres'],
      });

      const result = await authService.register({ ...registerData, password: '123' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requisitos');
      expect(result.validationErrors).toHaveLength(1);
    });

    it('should default role to member', async () => {
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue({ ...mockUser, id: 3 });

      await authService.register({ name: 'Test', email: 'test@t.com', password: 'Forte123!!' });

      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'member' })
      );
    });

    it('should handle DB errors gracefully', async () => {
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockRejectedValue(new Error('constraint violation'));

      const result = await authService.register(registerData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Erro ao criar conta');
    });
  });

  // ── changePassword ──────────────────────────────────────────
  describe('changePassword', () => {
    it('should change password when current password matches', async () => {
      mockGetUserById.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValueOnce(true);

      const result = await authService.changePassword(1, 'correctPassword', 'NewStrong123!');

      expect(result.success).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ password: '$2a$12$hashed' })
      );
    });

    it('should reject when user not found', async () => {
      mockGetUserById.mockResolvedValue(null);

      const result = await authService.changePassword(999, 'old', 'new');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuário não encontrado');
    });

    it('should reject wrong current password', async () => {
      mockGetUserById.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValueOnce(false);

      const result = await authService.changePassword(1, 'wrongPassword', 'NewStrong123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Senha atual incorreta');
    });

    it('should reject weak new password with suggestions', async () => {
      mockGetUserById.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValueOnce(true);
      mockValidatePasswordStrength.mockReturnValueOnce({
        isValid: false,
        errors: ['Muito curta'],
      });

      const result = await authService.changePassword(1, 'correctPassword', '123');

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
    });
  });

  // ── hashPassword / verifyPassword ───────────────────────────
  describe('password utilities', () => {
    it('hashPassword should return a hash', async () => {
      const hash = await authService.hashPassword('test');
      expect(hash).toBe('$2a$12$hashed');
    });

    it('verifyPassword should delegate to bcrypt.compare', async () => {
      mockBcryptCompare.mockResolvedValueOnce(true);

      const result = await authService.verifyPassword('test', '$2a$12$hash');
      expect(result).toBe(true);
    });
  });

  // ── generateTempPassword ────────────────────────────────────
  describe('generateTempPassword', () => {
    it('should generate password of specified length', () => {
      const password = authService.generateTempPassword(16);
      expect(password).toHaveLength(16);
    });

    it('should generate password with default length of 12', () => {
      const password = authService.generateTempPassword();
      expect(password).toHaveLength(12);
    });

    it('should generate different passwords each time', () => {
      const p1 = authService.generateTempPassword();
      const p2 = authService.generateTempPassword();
      expect(p1).not.toBe(p2);
    });
  });
});
