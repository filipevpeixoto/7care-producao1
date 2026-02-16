/**
 * UserService unit tests
 * Tests getUsers, getUserById, createUser, deleteUser with role-based access control.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────
const {
  mockGetUserById,
  mockGetUserByEmail,
  mockGetUsersPaginated,
  mockCreateUser,
  mockUpdateUser,
  mockDeleteUser,
  mockHashPassword,
} = vi.hoisted(() => ({
  mockGetUserById: vi.fn(),
  mockGetUserByEmail: vi.fn(),
  mockGetUsersPaginated: vi.fn(),
  mockCreateUser: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockHashPassword: vi.fn().mockResolvedValue('$2a$12$hashed'),
}));

vi.mock('../repositories', () => ({
  userRepository: {
    getUserById: mockGetUserById,
    getUserByEmail: mockGetUserByEmail,
    getUsersPaginated: mockGetUsersPaginated,
    createUser: mockCreateUser,
    updateUser: mockUpdateUser,
    deleteUser: mockDeleteUser,
  },
}));

vi.mock('../services/authService', () => ({
  authService: {
    hashPassword: mockHashPassword,
  },
}));

vi.mock('../utils/permissions', () => ({
  hasAdminAccess: vi.fn((user: any) =>
    ['superadmin', 'pastor', 'admin'].includes(user?.role)
  ),
  isSuperAdmin: vi.fn((user: any) => user?.role === 'superadmin'),
  canCreateUserWithRole: vi.fn(() => true),
}));

// Import after mocks
import { UserService } from '../services/userService';

// ── Test Data ───────────────────────────────────────────────────
const superAdmin = {
  id: 1,
  name: 'Super Admin',
  email: 'super@test.com',
  role: 'superadmin' as const,
  districtId: null,
  churchCode: null,
};

const pastorUser = {
  id: 2,
  name: 'Pastor João',
  email: 'pastor@test.com',
  role: 'pastor' as const,
  districtId: 1,
  churchCode: 'IGR001',
};

const memberUser = {
  id: 3,
  name: 'Membro Maria',
  email: 'maria@test.com',
  role: 'member' as const,
  districtId: 1,
  churchCode: 'IGR001',
  password: '$2a$12$hash',
  status: 'active',
};

const otherDistrictMember = {
  id: 4,
  name: 'Pedro Outro',
  email: 'pedro@test.com',
  role: 'member' as const,
  districtId: 2,
  churchCode: 'IGR002',
  password: '$2a$12$hash',
  status: 'active',
};

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    vi.clearAllMocks();
  });

  // ── getUsers ──────────────────────────────────────────────────
  describe('getUsers', () => {
    it('should return paginated users with passwords removed', async () => {
      mockGetUsersPaginated.mockResolvedValue({
        data: [memberUser],
        total: 1,
      });

      const result = await userService.getUsers({}, {}, superAdmin);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].password).toBeUndefined();
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should apply districtId filter for non-superadmin', async () => {
      mockGetUsersPaginated.mockResolvedValue({ data: [], total: 0 });

      await userService.getUsers({}, {}, pastorUser);

      expect(mockGetUsersPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ districtId: 1 })
      );
    });

    it('should not restrict districtId for superadmin', async () => {
      mockGetUsersPaginated.mockResolvedValue({ data: [], total: 0 });

      await userService.getUsers({}, {}, superAdmin);

      const call = mockGetUsersPaginated.mock.calls[0][0];
      expect(call.districtId).toBeUndefined();
    });

    it('should apply user-supplied filters', async () => {
      mockGetUsersPaginated.mockResolvedValue({ data: [], total: 0 });

      await userService.getUsers(
        { role: 'member', status: 'active', search: 'João' },
        { page: 2, limit: 10 },
        superAdmin
      );

      expect(mockGetUsersPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'member',
          status: 'active',
          search: 'João',
          page: 2,
          limit: 10,
        })
      );
    });

    it('should filter by churchCode post-query for regular members', async () => {
      mockGetUsersPaginated.mockResolvedValue({
        data: [memberUser, otherDistrictMember],
        total: 2,
      });

      const result = await userService.getUsers({}, {}, memberUser);

      // Regular member should only see users from their own church
      expect(result.data.every((u) => u.churchCode === 'IGR001')).toBe(true);
    });

    it('should calculate totalPages correctly', async () => {
      mockGetUsersPaginated.mockResolvedValue({ data: [], total: 25 });

      const result = await userService.getUsers({}, { page: 1, limit: 10 }, superAdmin);

      expect(result.totalPages).toBe(3);
    });

    it('should propagate DB errors', async () => {
      mockGetUsersPaginated.mockRejectedValue(new Error('Connection lost'));

      await expect(userService.getUsers({}, {}, superAdmin)).rejects.toThrow('Connection lost');
    });
  });

  // ── getUserById ───────────────────────────────────────────────
  describe('getUserById', () => {
    it('should return user without password for superadmin', async () => {
      mockGetUserById.mockResolvedValue(memberUser);

      const result = await userService.getUserById(3, superAdmin);

      expect(result).toBeDefined();
      expect(result?.password).toBeUndefined();
      expect(result?.name).toBe('Membro Maria');
    });

    it('should return null when user not found', async () => {
      mockGetUserById.mockResolvedValue(null);

      const result = await userService.getUserById(999, superAdmin);

      expect(result).toBeNull();
    });

    it('should allow pastor to see user in same district', async () => {
      mockGetUserById.mockResolvedValue(memberUser); // districtId: 1

      const result = await userService.getUserById(3, pastorUser); // districtId: 1

      expect(result).toBeDefined();
    });

    it('should deny pastor access to user in different district', async () => {
      mockGetUserById.mockResolvedValue(otherDistrictMember); // districtId: 2

      const result = await userService.getUserById(4, pastorUser); // districtId: 1

      expect(result).toBeNull();
    });

    it('should allow member to view themselves', async () => {
      mockGetUserById.mockResolvedValue(memberUser);

      const result = await userService.getUserById(3, memberUser); // same id

      expect(result).toBeDefined();
    });

    it('should allow member to view user from same church', async () => {
      const sameChurchUser = { ...otherDistrictMember, churchCode: 'IGR001' };
      mockGetUserById.mockResolvedValue(sameChurchUser);

      const result = await userService.getUserById(4, memberUser);

      expect(result).toBeDefined();
    });

    it('should deny member access to user in different church', async () => {
      mockGetUserById.mockResolvedValue(otherDistrictMember); // churchCode: IGR002

      const result = await userService.getUserById(4, memberUser); // churchCode: IGR001

      expect(result).toBeNull();
    });
  });

  // ── createUser ────────────────────────────────────────────────
  describe('createUser', () => {
    const newUserData = {
      name: 'Novo Membro',
      email: 'novo@test.com',
      password: 'SenhaForte123!',
      role: 'member' as const,
    };

    it('should create user with hashed password', async () => {
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue({ id: 5, ...newUserData, password: '$2a$12$hashed' });

      const result = await userService.createUser(newUserData, superAdmin);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.password).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      mockGetUserByEmail.mockResolvedValue(memberUser);

      const result = await userService.createUser(
        { ...newUserData, email: 'maria@test.com' },
        superAdmin
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ── deleteUser ────────────────────────────────────────────────
  describe('deleteUser', () => {
    it('should delete regular user as superadmin', async () => {
      mockGetUserById.mockResolvedValue(memberUser);
      mockDeleteUser.mockResolvedValue(true);

      const result = await userService.deleteUser(3, superAdmin);

      expect(result.success).toBe(true);
    });

    it('should not delete superadmin user', async () => {
      mockGetUserById.mockResolvedValue({ ...superAdmin, password: '$2a$12$hash' });

      const result = await userService.deleteUser(1, pastorUser);

      expect(result.success).toBe(false);
    });

    it('should return error for nonexistent user', async () => {
      mockGetUserById.mockResolvedValue(null);

      const result = await userService.deleteUser(999, superAdmin);

      expect(result.success).toBe(false);
    });
  });
});
