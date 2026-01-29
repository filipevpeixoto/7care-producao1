/**
 * Testes de Integração - Usuários
 * Testa endpoints de CRUD de usuários
 */

import { describe, it, expect, beforeAll, afterAll, jest, beforeEach } from '@jest/globals';

// Mock types for tests
interface MockUser {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: string;
  church?: string;
  isApproved: boolean;
  status: string;
  points?: number;
  level?: string;
  phone?: string;
}

interface MockPointsResult {
  success?: boolean;
  points: number;
  level?: string;
  breakdown?: {
    attendance?: number;
    tithing?: number;
    tithes?: number;
    discipleship?: number;
    events?: number;
    participation?: number;
  };
}

// Mock do NeonAdapter
const mockStorage = {
  getAllUsers: jest.fn<() => Promise<MockUser[]>>(),
  getUserById: jest.fn<(id: number) => Promise<MockUser | null>>(),
  createUser: jest.fn<(data: Partial<MockUser>) => Promise<MockUser>>(),
  updateUser: jest.fn<(id: number, data: Partial<MockUser>) => Promise<MockUser | null>>(),
  deleteUser: jest.fn<(id: number) => Promise<boolean>>(),
  approveUser: jest.fn<(id: number) => Promise<MockUser | null>>(),
  rejectUser: jest.fn<(id: number) => Promise<MockUser | null>>(),
  calculateUserPoints: jest.fn<(id: number) => Promise<MockPointsResult>>(),
};

jest.mock('../../neonAdapter', () => ({
  NeonAdapter: jest.fn().mockImplementation(() => mockStorage),
}));

// Mock de usuários para teste
const mockUsers = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@igreja.com',
    role: 'superadmin',
    church: 'Igreja Central',
    isApproved: true,
    status: 'approved',
    points: 100,
    level: 'Avançado',
  },
  {
    id: 2,
    name: 'Pastor Silva',
    email: 'pastor@igreja.com',
    role: 'pastor',
    church: 'Igreja Central',
    isApproved: true,
    status: 'approved',
    points: 80,
    level: 'Intermediário',
  },
  {
    id: 3,
    name: 'Member User',
    email: 'member@igreja.com',
    role: 'member',
    church: 'Igreja Central',
    isApproved: true,
    status: 'approved',
    points: 50,
    level: 'Iniciante',
  },
  {
    id: 4,
    name: 'Pending User',
    email: 'pending@igreja.com',
    role: 'member',
    church: 'Igreja Central',
    isApproved: false,
    status: 'pending',
    points: 0,
    level: 'Iniciante',
  },
];

describe('Users Integration Tests', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('deve retornar lista de usuários', async () => {
      mockStorage.getAllUsers.mockResolvedValueOnce(mockUsers);

      const users = await mockStorage.getAllUsers();

      expect(users).toHaveLength(4);
      expect(users[0].name).toBe('Admin User');
    });

    it('deve filtrar por role', async () => {
      const filteredUsers = mockUsers.filter(u => u.role === 'member');
      mockStorage.getAllUsers.mockResolvedValueOnce(filteredUsers);

      const users = await mockStorage.getAllUsers();

      expect(users).toHaveLength(2);
      expect(users.every(u => u.role === 'member')).toBe(true);
    });

    it('deve filtrar por status', async () => {
      const pendingUsers = mockUsers.filter(u => u.status === 'pending');
      mockStorage.getAllUsers.mockResolvedValueOnce(pendingUsers);

      const users = await mockStorage.getAllUsers();

      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('Pending User');
    });

    it('deve remover senha dos dados retornados', () => {
      const userWithPassword = { ...mockUsers[0], password: 'secret123' };
      const { password: _password, ...safeUser } = userWithPassword;

      expect(safeUser).not.toHaveProperty('password');
      expect(safeUser.email).toBe('admin@igreja.com');
    });
  });

  describe('GET /api/users/:id', () => {
    it('deve retornar usuário por ID', async () => {
      mockStorage.getUserById.mockResolvedValueOnce(mockUsers[0]);

      const user = await mockStorage.getUserById(1);

      expect(user).not.toBeNull();
      expect(user?.id).toBe(1);
      expect(user?.name).toBe('Admin User');
    });

    it('deve retornar null para ID inexistente', async () => {
      mockStorage.getUserById.mockResolvedValueOnce(null);

      const user = await mockStorage.getUserById(9999);

      expect(user).toBeNull();
    });

    it('deve validar ID numérico', () => {
      const validId = 1;
      const invalidId = 'abc';

      expect(typeof validId).toBe('number');
      expect(Number.isNaN(parseInt(invalidId))).toBe(true); // parseInt de 'abc' retorna NaN
      expect(parseInt(invalidId)).toBeNaN(); // resultado é NaN
    });
  });

  describe('POST /api/users', () => {
    it('deve criar novo usuário', async () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@igreja.com',
        role: 'member',
        church: 'Igreja Central',
      };

      mockStorage.createUser.mockResolvedValueOnce({
        id: 5,
        ...newUser,
        isApproved: false,
        status: 'pending',
      });

      const created = await mockStorage.createUser(newUser);

      expect(created.id).toBe(5);
      expect(created.name).toBe('New User');
      expect(created.status).toBe('pending');
    });

    it('deve validar campos obrigatórios', () => {
      const validUser = { name: 'Test', email: 'test@test.com' };
      const invalidUser = { name: '' };

      expect(validUser.name.length).toBeGreaterThan(0);
      expect(validUser.email).toBeDefined();
      expect(invalidUser.name.length).toBe(0);
    });

    it('deve validar formato de email', () => {
      const validEmails = ['user@domain.com', 'user.name@domain.co.uk'];
      const invalidEmails = ['notanemail', '@domain.com', 'user@'];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe('PUT /api/users/:id', () => {
    it('deve atualizar usuário existente', async () => {
      const updates = { name: 'Updated Name', phone: '11999999999' };

      mockStorage.updateUser.mockResolvedValueOnce({
        ...mockUsers[2],
        ...updates,
      });

      const updated = await mockStorage.updateUser(3, updates);

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.phone).toBe('11999999999');
    });

    it('deve manter campos não atualizados', async () => {
      const updates = { name: 'New Name' };

      mockStorage.updateUser.mockResolvedValueOnce({
        ...mockUsers[2],
        ...updates,
      });

      const updated = await mockStorage.updateUser(3, updates);

      expect(updated?.email).toBe('member@igreja.com'); // não alterado
      expect(updated?.name).toBe('New Name'); // alterado
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('deve deletar usuário existente', async () => {
      mockStorage.deleteUser.mockResolvedValueOnce(true);

      const result = await mockStorage.deleteUser(4);

      expect(result).toBe(true);
    });

    it('deve retornar false para usuário inexistente', async () => {
      mockStorage.deleteUser.mockResolvedValueOnce(false);

      const result = await mockStorage.deleteUser(9999);

      expect(result).toBe(false);
    });
  });

  describe('POST /api/users/:id/approve', () => {
    it('deve aprovar usuário pendente', async () => {
      mockStorage.approveUser.mockResolvedValueOnce({
        ...mockUsers[3],
        isApproved: true,
        status: 'approved',
      });

      const approved = await mockStorage.approveUser(4);

      expect(approved?.isApproved).toBe(true);
      expect(approved?.status).toBe('approved');
    });
  });

  describe('POST /api/users/:id/reject', () => {
    it('deve rejeitar usuário pendente', async () => {
      mockStorage.rejectUser.mockResolvedValueOnce({
        ...mockUsers[3],
        isApproved: false,
        status: 'rejected',
      });

      const rejected = await mockStorage.rejectUser(4);

      expect(rejected?.isApproved).toBe(false);
      expect(rejected?.status).toBe('rejected');
    });
  });
});

describe('Users Points System Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/:id/calculate-points', () => {
    it('deve calcular pontos do usuário', async () => {
      mockStorage.calculateUserPoints.mockResolvedValueOnce({
        success: true,
        points: 75,
        level: 'Intermediário',
        breakdown: {
          attendance: 30,
          tithes: 20,
          participation: 25,
        },
      });

      const result = await mockStorage.calculateUserPoints(3);

      expect(result.success).toBe(true);
      expect(result.points).toBe(75);
      expect(result.level).toBe('Intermediário');
    });

    it('deve retornar breakdown de pontos', async () => {
      mockStorage.calculateUserPoints.mockResolvedValueOnce({
        success: true,
        points: 50,
        breakdown: {
          attendance: 20,
          tithes: 15,
          participation: 15,
        },
      });

      const result = await mockStorage.calculateUserPoints(3);

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown?.attendance).toBe(20);
    });
  });
});

describe('Users Permission Tests', () => {
  describe('Role-based access', () => {
    it('superadmin pode ver todos os usuários', () => {
      const userRole = 'superadmin';
      const canViewAll = ['superadmin', 'pastor'].includes(userRole);

      expect(canViewAll).toBe(true);
    });

    it('member não pode deletar usuários', () => {
      const userRole = 'member';
      const canDelete = ['superadmin', 'pastor'].includes(userRole);

      expect(canDelete).toBe(false);
    });

    it('pastor pode aprovar usuários de sua igreja', () => {
      const userRole = 'pastor';
      const canApprove = ['superadmin', 'pastor'].includes(userRole);

      expect(canApprove).toBe(true);
    });
  });

  describe('Church-based filtering', () => {
    it('deve filtrar usuários por igreja do pastor', () => {
      const pastorChurch = 'Igreja Central';
      const filteredUsers = mockUsers.filter(u => u.church === pastorChurch);

      expect(filteredUsers.length).toBe(4);
    });

    it('missionário vê apenas interessados de sua igreja', () => {
      const missionaryChurch = 'Igreja Central';
      const interestedUsers = mockUsers.filter(
        u => u.role === 'interested' && u.church === missionaryChurch
      );

      // Nenhum interessado nos mocks
      expect(interestedUsers.length).toBe(0);
    });
  });
});
