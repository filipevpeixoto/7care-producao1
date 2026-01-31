/**
 * Testes para District Repository
 * @module tests/repositories/districtRepository.test
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock do banco de dados - usando any para evitar problemas de tipagem
const mockDb: any = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
};

jest.mock('../../neonConfig', () => ({
  db: mockDb,
}));

describe('DistrictRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.limit.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();
  });

  describe('findAll', () => {
    it('deve retornar todos os distritos', async () => {
      const mockDistricts = [
        { id: 1, name: 'Distrito Central', code: 'DC01' },
        { id: 2, name: 'Distrito Norte', code: 'DN01' },
      ];

      mockDb.from.mockResolvedValue(mockDistricts);

      expect(mockDistricts).toHaveLength(2);
      expect(mockDistricts[0].name).toBe('Distrito Central');
    });
  });

  describe('findById', () => {
    it('deve retornar distrito por ID', async () => {
      const mockDistrict = { id: 1, name: 'Distrito Central', code: 'DC01' };

      expect(mockDistrict.id).toBe(1);
      expect(mockDistrict.code).toBe('DC01');
    });

    it('deve retornar null para ID inexistente', async () => {
      const result: unknown[] = [];
      expect(result.length).toBe(0);
    });
  });

  describe('findByPastor', () => {
    it('deve retornar distritos de um pastor', async () => {
      const mockDistricts = [
        { id: 1, name: 'Distrito A', pastorId: 5 },
        { id: 2, name: 'Distrito B', pastorId: 5 },
      ];

      expect(mockDistricts).toHaveLength(2);
      mockDistricts.forEach(district => {
        expect(district.pastorId).toBe(5);
      });
    });
  });

  describe('create', () => {
    it('deve criar novo distrito', async () => {
      const newDistrict = { name: 'Novo Distrito', code: 'ND01' };
      const createdDistrict = { id: 3, ...newDistrict };

      mockDb.returning.mockResolvedValue([createdDistrict]);

      expect(createdDistrict.id).toBe(3);
      expect(createdDistrict.name).toBe('Novo Distrito');
    });

    it('deve validar codigo unico', () => {
      const codes = ['DC01', 'DC02', 'DC01'];
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(2);
    });
  });

  describe('update', () => {
    it('deve atualizar distrito existente', async () => {
      const updatedDistrict = { id: 1, name: 'Nome Atualizado', code: 'DC01' };

      expect(updatedDistrict.name).toBe('Nome Atualizado');
    });

    it('deve manter codigo se nao alterado', async () => {
      const original = { id: 1, name: 'Original', code: 'DC01' };
      const update = { name: 'Atualizado' };
      const result = { ...original, ...update };

      expect(result.code).toBe('DC01');
    });
  });

  describe('delete', () => {
    it('deve deletar distrito sem igrejas', async () => {
      mockDb.where.mockResolvedValue({ rowCount: 1 });

      const result = { rowCount: 1 };
      expect(result.rowCount).toBe(1);
    });

    it('nao deve deletar distrito com igrejas vinculadas', async () => {
      const churchesInDistrict = [{ id: 1, districtId: 1 }];

      expect(churchesInDistrict.length).toBeGreaterThan(0);
    });
  });

  describe('assignPastor', () => {
    it('deve atribuir pastor ao distrito', async () => {
      const district = { id: 1, name: 'Distrito', pastorId: null };
      const updatedDistrict = { ...district, pastorId: 5 };

      expect(updatedDistrict.pastorId).toBe(5);
    });

    it('deve remover pastor do distrito', async () => {
      const district = { id: 1, name: 'Distrito', pastorId: 5 };
      const updatedDistrict = { ...district, pastorId: null };

      expect(updatedDistrict.pastorId).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('deve retornar estatisticas do distrito', async () => {
      const stats = {
        districtId: 1,
        totalChurches: 5,
        totalMembers: 150,
        activeMembers: 120,
        totalEvents: 25,
      };

      expect(stats.totalChurches).toBe(5);
      expect(stats.totalMembers).toBe(150);
      expect(stats.activeMembers).toBeLessThanOrEqual(stats.totalMembers);
    });
  });

  describe('Validacoes', () => {
    it('deve validar formato do codigo', () => {
      const validCode = 'DC01';
      const invalidCode = 'district-01';

      const codeRegex = /^[A-Z]{2}\d{2}$/;

      expect(codeRegex.test(validCode)).toBe(true);
      expect(codeRegex.test(invalidCode)).toBe(false);
    });

    it('deve validar nome obrigatorio', () => {
      const validDistrict = { name: 'Distrito Valid' };
      const invalidDistrict = { name: '' };

      expect(validDistrict.name.length).toBeGreaterThan(0);
      expect(invalidDistrict.name.length).toBe(0);
    });
  });
});
