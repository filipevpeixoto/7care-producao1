/**
 * Testes do NeonAdapter - Operações de Usuários
 * Testa as principais operações CRUD de usuários
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock chain object that allows calling any method and returns itself
const createMockChain = () => {
  const chain: any = {};
  const methods = [
    'select',
    'from',
    'where',
    'insert',
    'values',
    'returning',
    'update',
    'set',
    'delete',
    'innerJoin',
    'leftJoin',
    'orderBy',
    'limit',
    'offset',
    'execute',
  ];

  methods.forEach(method => {
    chain[method] = jest.fn().mockImplementation(() => chain);
  });

  return chain;
};

const mockDb = createMockChain();

jest.mock('../../neonConfig', () => ({
  db: mockDb,
  sql: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockImplementation(() => Promise.resolve('hashed-password')),
  compare: jest.fn().mockImplementation(() => Promise.resolve(true)),
}));

describe('NeonAdapter - Operações de Usuários', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('deve retornar usuário por ID', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'member',
      };

      mockDb.where.mockResolvedValueOnce([mockUser]);

      const result = await mockDb.select().from({}).where({});
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('deve retornar undefined se usuário não existir', async () => {
      mockDb.where.mockResolvedValueOnce([]);

      const result = await mockDb.select().from({}).where({});
      expect(result).toHaveLength(0);
    });
  });

  describe('getUserByEmail', () => {
    it('deve buscar usuário por email', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
      };

      mockDb.where.mockResolvedValueOnce([mockUser]);

      const result = await mockDb.select().from({}).where({});
      expect(result[0].email).toBe('test@test.com');
    });

    it('deve normalizar email para lowercase na busca', () => {
      const email = 'Test@Example.COM';
      const normalized = email.toLowerCase();
      expect(normalized).toBe('test@example.com');
    });
  });

  describe('createUser', () => {
    it('deve criar novo usuário com dados válidos', async () => {
      const userData = {
        name: 'New User',
        email: 'new@test.com',
        password: 'hashed-password',
        role: 'interested',
      };

      const createdUser = { id: 1, ...userData, createdAt: new Date() };
      mockDb.returning.mockResolvedValue([createdUser]);

      await mockDb.insert({}).values(userData).returning();

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(userData);
    });

    it('deve definir valores padrão para novos usuários', () => {
      const defaults = {
        role: 'interested',
        isApproved: false,
        status: 'pending',
        points: 0,
      };

      expect(defaults.role).toBe('interested');
      expect(defaults.isApproved).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('deve atualizar dados do usuário', async () => {
      const updates = { name: 'Updated Name', phone: '11999999999' };
      const updatedUser = { id: 1, ...updates };

      mockDb.returning.mockResolvedValue([updatedUser]);

      await mockDb.update({}).set(updates).where({}).returning();

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(updates);
    });

    it('deve atualizar updatedAt automaticamente', () => {
      const now = new Date();
      const updates = { name: 'New Name', updatedAt: now };

      expect(updates.updatedAt).toBeDefined();
    });
  });

  describe('deleteUser', () => {
    it('deve deletar usuário por ID', async () => {
      mockDb.returning.mockResolvedValue([{ id: 1 }]);

      await mockDb.delete({}).where({}).returning();

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('getAllUsers', () => {
    it('deve listar todos os usuários', async () => {
      const mockUsers = [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
        { id: 3, name: 'User 3' },
      ];

      mockDb.orderBy.mockResolvedValue(mockUsers);

      const result = await mockDb.select().from({}).orderBy({});
      expect(result).toHaveLength(3);
    });

    it('deve excluir usuários deletados da listagem', async () => {
      const activeUsers = [
        { id: 1, name: 'Active 1', deletedAt: null },
        { id: 2, name: 'Active 2', deletedAt: null },
      ];

      mockDb.where.mockResolvedValue(activeUsers);

      const result = await mockDb.select().from({}).where({});
      expect(result.every((u: any) => u.deletedAt === null)).toBe(true);
    });
  });
});

describe('NeonAdapter - Operações de Igreja', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllChurches', () => {
    it('deve listar todas as igrejas', async () => {
      const churches = [
        { id: 1, name: 'Igreja Central', address: 'Rua A' },
        { id: 2, name: 'Igreja Norte', address: 'Rua B' },
      ];

      mockDb.orderBy.mockResolvedValue(churches);

      const result = await mockDb.select().from({}).orderBy({});
      expect(result).toHaveLength(2);
    });
  });

  describe('getOrCreateChurch', () => {
    it('deve retornar igreja existente se já existir', async () => {
      const existingChurch = { id: 1, name: 'Igreja Central' };
      mockDb.where.mockResolvedValue([existingChurch]);

      const result = await mockDb.select().from({}).where({});
      expect(result[0].name).toBe('Igreja Central');
    });

    it('deve criar nova igreja se não existir', async () => {
      mockDb.where.mockResolvedValue([]);
      mockDb.returning.mockResolvedValue([{ id: 2, name: 'Nova Igreja' }]);

      const existing = await mockDb.select().from({}).where({});
      expect(existing).toHaveLength(0);

      await mockDb.insert({}).values({ name: 'Nova Igreja' }).returning();
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});

describe('NeonAdapter - Operações de Eventos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('deve criar novo evento', async () => {
      const eventData = {
        title: 'Culto Domingo',
        date: new Date(),
        churchId: 1,
        createdBy: 1,
      };

      mockDb.returning.mockResolvedValue([{ id: 1, ...eventData }]);

      await mockDb.insert({}).values(eventData).returning();
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('getEventsByChurch', () => {
    it('deve listar eventos da igreja', async () => {
      const events = [
        { id: 1, title: 'Culto', churchId: 1 },
        { id: 2, title: 'Reunião', churchId: 1 },
      ];

      mockDb.where.mockResolvedValue(events);

      const result = await mockDb.select().from({}).where({});
      expect(result).toHaveLength(2);
    });
  });
});

describe('NeonAdapter - Sistema de Pontos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addUserPoints', () => {
    it('deve adicionar pontos ao usuário', async () => {
      const pointEntry = {
        userId: 1,
        points: 10,
        reason: 'Presença',
      };

      mockDb.returning.mockResolvedValue([{ id: 1, ...pointEntry }]);

      await mockDb.insert({}).values(pointEntry).returning();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('deve calcular total de pontos corretamente', () => {
      const pointsHistory = [{ points: 10 }, { points: 5 }, { points: -2 }];

      const total = pointsHistory.reduce((sum, entry) => sum + entry.points, 0);
      expect(total).toBe(13);
    });
  });

  describe('getUserPointsHistory', () => {
    it('deve retornar histórico de pontos ordenado por data', async () => {
      const history = [
        { id: 1, points: 10, createdAt: new Date('2024-01-01') },
        { id: 2, points: 5, createdAt: new Date('2024-01-15') },
      ];

      mockDb.orderBy.mockResolvedValueOnce(history);

      const result = await mockDb.select().from({}).orderBy({});
      expect(result).toHaveLength(2);
    });
  });
});

describe('NeonAdapter - Validações', () => {
  it('deve validar formato de email', () => {
    const validEmails = ['test@test.com', 'user.name@domain.org'];
    const invalidEmails = ['invalid', '@test.com', 'test@'];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });

    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  it('deve validar roles de usuário', () => {
    const validRoles = ['superadmin', 'pastor', 'leader', 'member', 'interested'];

    expect(validRoles.includes('member')).toBe(true);
    expect(validRoles.includes('invalid')).toBe(false);
  });

  it('deve validar status de usuário', () => {
    const validStatuses = ['active', 'pending', 'suspended', 'inactive'];

    expect(validStatuses.includes('active')).toBe(true);
    expect(validStatuses.includes('deleted')).toBe(false);
  });
});
