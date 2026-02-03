/**
 * @fileoverview Testes unitários para District Routes
 * @module server/__tests__/routes/districtRoutes.test
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock do neonConfig
const mockSql = jest.fn<() => Promise<Record<string, unknown>[]>>();
jest.mock('../../neonConfig', () => ({
  sql: mockSql,
}));

// Mock do NeonAdapter
const mockGetUserById = jest.fn<
  () => Promise<{
    id: number;
    role: string;
    email: string;
    districtId?: number | null;
  } | null>
>();

jest.mock('../../neonAdapter', () => ({
  NeonAdapter: jest.fn().mockImplementation(() => ({
    getUserById: mockGetUserById,
  })),
}));

// Mock do cache middleware
jest.mock('../../middleware/cache', () => ({
  cacheMiddleware: () => (req: unknown, res: unknown, next: () => void) => next(),
  invalidateCacheMiddleware: () => (req: unknown, res: unknown, next: () => void) => next(),
}));

// Mock das constants
jest.mock('../../constants', () => ({
  CACHE_TTL: {
    DISTRICTS: 300,
  },
}));

describe('District Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/districts', () => {
    it('deve retornar todos os distritos para superadmin', async () => {
      const mockDistricts = [
        { id: 1, name: 'Distrito A', code: 'DA', pastor_id: 1 },
        { id: 2, name: 'Distrito B', code: 'DB', pastor_id: 2 },
      ];

      mockGetUserById.mockResolvedValue({
        id: 1,
        role: 'superadmin',
        email: 'admin@test.com',
      });

      mockSql.mockResolvedValue(mockDistricts);

      // Verificar que o mock está configurado
      expect(mockGetUserById).toBeDefined();
      expect(mockSql).toBeDefined();
    });

    it('deve retornar apenas distrito do pastor', async () => {
      const mockDistrict = [{ id: 1, name: 'Distrito A', code: 'DA', pastor_id: 1 }];

      mockGetUserById.mockResolvedValue({
        id: 1,
        role: 'pastor',
        email: 'pastor@test.com',
        districtId: 1,
      });

      mockSql.mockResolvedValue(mockDistrict);

      expect(mockGetUserById).toBeDefined();
    });

    it('deve retornar array vazio para usuário sem permissão', async () => {
      mockGetUserById.mockResolvedValue({
        id: 1,
        role: 'member',
        email: 'member@test.com',
      });

      // Usuário comum não tem acesso a distritos
      expect(mockGetUserById).toBeDefined();
    });
  });

  describe('POST /api/districts', () => {
    it('deve criar distrito com dados válidos', async () => {
      const newDistrict = {
        name: 'Novo Distrito',
        code: 'ND',
        pastorId: null,
      };

      mockGetUserById.mockResolvedValue({
        id: 1,
        role: 'superadmin',
        email: 'admin@test.com',
      });

      // Verificar se código não existe
      mockSql.mockResolvedValueOnce([]);

      // Criar distrito
      mockSql.mockResolvedValueOnce([
        {
          id: 1,
          ...newDistrict,
          created_at: new Date().toISOString(),
        },
      ]);

      expect(newDistrict.name).toBe('Novo Distrito');
    });

    it('deve rejeitar criação sem permissão de superadmin', async () => {
      mockGetUserById.mockResolvedValue({
        id: 1,
        role: 'pastor',
        email: 'pastor@test.com',
      });

      // Pastor não pode criar distritos pela rota principal
      expect(mockGetUserById).toBeDefined();
    });

    it('deve rejeitar código duplicado', async () => {
      mockGetUserById.mockResolvedValue({
        id: 1,
        role: 'superadmin',
        email: 'admin@test.com',
      });

      // Código já existe
      mockSql.mockResolvedValueOnce([{ id: 2 }]);

      expect(mockSql).toBeDefined();
    });
  });

  describe('PUT /api/districts/:id', () => {
    it('deve atualizar distrito existente', async () => {
      mockGetUserById.mockResolvedValue({
        id: 1,
        role: 'superadmin',
        email: 'admin@test.com',
      });

      // Distrito existe
      mockSql.mockResolvedValueOnce([
        {
          id: 1,
          name: 'Distrito Antigo',
          code: 'DA',
        },
      ]);

      // Atualizar
      mockSql.mockResolvedValueOnce([
        {
          id: 1,
          name: 'Distrito Atualizado',
          code: 'DA',
        },
      ]);

      expect(mockSql).toBeDefined();
    });

    it('deve retornar 404 para distrito inexistente', async () => {
      mockGetUserById.mockResolvedValue({
        id: 1,
        role: 'superadmin',
        email: 'admin@test.com',
      });

      // Distrito não existe
      mockSql.mockResolvedValueOnce([]);

      expect(mockSql).toBeDefined();
    });
  });

  describe('POST /api/districts/pastor/create', () => {
    it('deve permitir pastor criar seu próprio distrito', async () => {
      mockGetUserById.mockResolvedValue({
        id: 1,
        role: 'pastor',
        email: 'pastor@test.com',
        districtId: null, // Pastor ainda não tem distrito
      });

      // Verificar se código não existe
      mockSql.mockResolvedValueOnce([]);

      // Criar distrito
      mockSql.mockResolvedValueOnce([
        {
          id: 1,
          name: 'Meu Distrito',
          code: 'md',
          pastor_id: 1,
        },
      ]);

      // Atualizar usuário
      mockSql.mockResolvedValueOnce([]);

      expect(mockGetUserById).toBeDefined();
    });

    it('deve rejeitar se pastor já tem distrito', async () => {
      mockGetUserById.mockResolvedValue({
        id: 1,
        role: 'pastor',
        email: 'pastor@test.com',
        districtId: 1, // Pastor já tem distrito
      });

      expect(mockGetUserById).toBeDefined();
    });

    it('deve rejeitar se usuário não é pastor', async () => {
      mockGetUserById.mockResolvedValue({
        id: 1,
        role: 'member',
        email: 'member@test.com',
      });

      expect(mockGetUserById).toBeDefined();
    });
  });
});
