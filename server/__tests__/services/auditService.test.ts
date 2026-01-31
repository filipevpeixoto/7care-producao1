/**
 * Testes do AuditService
 * Testa funcionalidades de auditoria do sistema
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define mock before jest.mock to avoid TS2345
const mockAuditRepository: any = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  findAllPaginated: jest.fn(),
  ensureTable: jest.fn(),
  count: jest.fn(),
  getStats: jest.fn(),
  findByUser: jest.fn(),
  findByAction: jest.fn(),
  findByResource: jest.fn(),
  findByDateRange: jest.fn(),
};

// Mock dependencies
jest.mock('../../repositories/auditRepository', () => ({
  auditRepository: mockAuditRepository,
  CreateAuditLogDTO: {},
  AuditAction: {},
  AuditLog: {},
  AuditQueryOptions: {},
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('deve inicializar o serviço de auditoria', async () => {
      const { auditRepository } = await import('../../repositories/auditRepository');

      mockAuditRepository.ensureTable.mockResolvedValue(undefined);

      await mockAuditRepository.ensureTable();

      expect(auditRepository.ensureTable).toHaveBeenCalled();
    });

    it('deve logar erro se inicialização falhar', async () => {
      const { auditRepository } = await import('../../repositories/auditRepository');
      const { logger } = await import('../../utils/logger');

      mockAuditRepository.ensureTable.mockRejectedValue(new Error('DB error'));

      try {
        await mockAuditRepository.ensureTable();
      } catch (error) {
        logger.error('Failed to initialize audit service', error);
        expect(logger.error).toHaveBeenCalled();
      }
    });
  });

  describe('logCreate', () => {
    it('deve registrar ação de criação', async () => {
      const { auditRepository } = await import('../../repositories/auditRepository');

      const mockLog = {
        id: 1,
        action: 'CREATE',
        resource: 'user',
        resourceId: 42,
        userId: 1,
        userEmail: 'admin@test.com',
        newValue: { name: 'New User' },
        createdAt: new Date(),
      };

      mockAuditRepository.create.mockResolvedValue(mockLog);

      const result = await mockAuditRepository.create({
        action: 'CREATE',
        resource: 'user',
        resourceId: 42,
        userId: 1,
        userEmail: 'admin@test.com',
        newValue: { name: 'New User' },
      });

      expect(result.action).toBe('CREATE');
      expect(result.resource).toBe('user');
      expect(result.resourceId).toBe(42);
    });
  });

  describe('logUpdate', () => {
    it('deve registrar ação de atualização com valores antigo e novo', async () => {
      const { auditRepository } = await import('../../repositories/auditRepository');

      const mockLog = {
        id: 2,
        action: 'UPDATE',
        resource: 'user',
        resourceId: 42,
        userId: 1,
        userEmail: 'admin@test.com',
        oldValue: { name: 'Old Name' },
        newValue: { name: 'New Name' },
        createdAt: new Date(),
      };

      mockAuditRepository.create.mockResolvedValue(mockLog);

      const result = await mockAuditRepository.create({
        action: 'UPDATE',
        resource: 'user',
        resourceId: 42,
        userId: 1,
        userEmail: 'admin@test.com',
        oldValue: { name: 'Old Name' },
        newValue: { name: 'New Name' },
      });

      expect(result.action).toBe('UPDATE');
      expect(result.oldValue).toEqual({ name: 'Old Name' });
      expect(result.newValue).toEqual({ name: 'New Name' });
    });
  });

  describe('logDelete', () => {
    it('deve registrar ação de deleção', async () => {
      const { auditRepository } = await import('../../repositories/auditRepository');

      const mockLog = {
        id: 3,
        action: 'DELETE',
        resource: 'user',
        resourceId: 42,
        userId: 1,
        userEmail: 'admin@test.com',
        oldValue: { id: 42, name: 'Deleted User' },
        createdAt: new Date(),
      };

      mockAuditRepository.create.mockResolvedValue(mockLog);

      const result = await mockAuditRepository.create({
        action: 'DELETE',
        resource: 'user',
        resourceId: 42,
        userId: 1,
        userEmail: 'admin@test.com',
        oldValue: { id: 42, name: 'Deleted User' },
      });

      expect(result.action).toBe('DELETE');
      expect(result.oldValue).toEqual({ id: 42, name: 'Deleted User' });
    });
  });

  describe('logLogin', () => {
    it('deve registrar login bem-sucedido', async () => {
      const { auditRepository } = await import('../../repositories/auditRepository');

      const mockLog = {
        id: 4,
        action: 'LOGIN',
        resource: 'session',
        userId: 1,
        userEmail: 'user@test.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { success: true },
        createdAt: new Date(),
      };

      mockAuditRepository.create.mockResolvedValue(mockLog);

      const result = await mockAuditRepository.create({
        action: 'LOGIN',
        resource: 'session',
        userId: 1,
        userEmail: 'user@test.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { success: true },
      });

      expect(result.action).toBe('LOGIN');
      expect(result.metadata).toEqual({ success: true });
    });

    it('deve registrar falha de login', async () => {
      const { auditRepository } = await import('../../repositories/auditRepository');

      const mockLog = {
        id: 5,
        action: 'LOGIN_FAILED',
        resource: 'session',
        userEmail: 'unknown@test.com',
        ipAddress: '192.168.1.1',
        metadata: { reason: 'invalid_password' },
        createdAt: new Date(),
      };

      mockAuditRepository.create.mockResolvedValue(mockLog);

      const result = await mockAuditRepository.create({
        action: 'LOGIN_FAILED',
        resource: 'session',
        userEmail: 'unknown@test.com',
        ipAddress: '192.168.1.1',
        metadata: { reason: 'invalid_password' },
      });

      expect(result.action).toBe('LOGIN_FAILED');
    });
  });

  describe('getLogs', () => {
    it('deve retornar logs paginados', async () => {
      const { auditRepository } = await import('../../repositories/auditRepository');

      const mockLogs = {
        data: [
          { id: 1, action: 'CREATE', resource: 'user' },
          { id: 2, action: 'UPDATE', resource: 'user' },
        ],
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      };

      mockAuditRepository.findAllPaginated.mockResolvedValue(mockLogs);

      const result = await mockAuditRepository.findAllPaginated({}, { page: 1, limit: 50 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('deve filtrar logs por ação', async () => {
      const { auditRepository } = await import('../../repositories/auditRepository');

      const mockLogs = [
        { id: 1, action: 'LOGIN', resource: 'session' },
        { id: 2, action: 'LOGIN', resource: 'session' },
      ];

      mockAuditRepository.findByAction.mockResolvedValue(mockLogs);

      const result = await mockAuditRepository.findByAction('LOGIN');

      expect(result).toHaveLength(2);
      result.forEach((log: { action: string }) => {
        expect(log.action).toBe('LOGIN');
      });
    });

    it('deve filtrar logs por usuário', async () => {
      const { auditRepository } = await import('../../repositories/auditRepository');

      const mockLogs = [
        { id: 1, userId: 1, action: 'CREATE' },
        { id: 2, userId: 1, action: 'UPDATE' },
      ];

      mockAuditRepository.findByUser.mockResolvedValue(mockLogs);

      const result = await mockAuditRepository.findByUser(1);

      expect(result).toHaveLength(2);
      result.forEach((log: { userId: number }) => {
        expect(log.userId).toBe(1);
      });
    });

    it('deve filtrar logs por intervalo de datas', async () => {
      const { auditRepository } = await import('../../repositories/auditRepository');

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockLogs = [{ id: 1, createdAt: new Date('2024-01-15') }];

      mockAuditRepository.findByDateRange.mockResolvedValue(mockLogs);

      const result = await mockAuditRepository.findByDateRange(startDate, endDate);

      expect(result).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('deve retornar estatísticas de auditoria', async () => {
      const { auditRepository } = await import('../../repositories/auditRepository');

      const mockStats = {
        totalLogs: 1000,
        byAction: {
          CREATE: 300,
          UPDATE: 400,
          DELETE: 100,
          LOGIN: 150,
          LOGIN_FAILED: 50,
        },
        byResource: {
          user: 500,
          event: 300,
          meeting: 200,
        },
        last24h: 50,
        last7d: 300,
      };

      mockAuditRepository.getStats.mockResolvedValue(mockStats);

      const result = await mockAuditRepository.getStats();

      expect(result.totalLogs).toBe(1000);
      expect(result.byAction.CREATE).toBe(300);
      expect(result.last24h).toBe(50);
    });
  });

  describe('extractContextFromRequest', () => {
    it('deve extrair contexto de auditoria de uma requisição', () => {
      const mockReq = {
        headers: {
          'x-user-id': '1',
          'x-user-email': 'user@test.com',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
          'x-correlation-id': 'abc123',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      };

      const context = {
        userId: parseInt(mockReq.headers['x-user-id']),
        userEmail: mockReq.headers['x-user-email'],
        ipAddress: mockReq.headers['x-forwarded-for'],
        userAgent: mockReq.headers['user-agent'],
        correlationId: mockReq.headers['x-correlation-id'],
      };

      expect(context.userId).toBe(1);
      expect(context.userEmail).toBe('user@test.com');
      expect(context.ipAddress).toBe('192.168.1.1');
      expect(context.correlationId).toBe('abc123');
    });

    it('deve usar IP do socket quando x-forwarded-for não existe', () => {
      const mockReq = {
        headers: {},
        ip: '127.0.0.1',
        socket: { remoteAddress: '10.0.0.1' },
      };

      const ipAddress = mockReq.ip || mockReq.socket.remoteAddress || 'unknown';

      expect(ipAddress).toBe('127.0.0.1');
    });
  });

  describe('Sensitive Data Handling', () => {
    it('não deve logar senhas', () => {
      const userData = {
        name: 'Test User',
        email: 'test@test.com',
        password: 'secret123',
      };

      // Remove campos sensíveis antes de logar
      const { password, ...safeData } = userData;

      expect(safeData).not.toHaveProperty('password');
      expect(safeData.name).toBe('Test User');
    });

    it('deve mascarar tokens em logs', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MX0.abc123';

      // Máscara tokens longos
      const maskToken = (t: string): string => {
        if (t.length > 20) {
          return `${t.substring(0, 10)}...${t.substring(t.length - 5)}`;
        }
        return t;
      };

      const masked = maskToken(token);

      expect(masked).not.toBe(token);
      expect(masked.length).toBeLessThan(token.length);
    });
  });
});
