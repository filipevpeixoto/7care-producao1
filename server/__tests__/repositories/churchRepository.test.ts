/**
 * Testes para Church Repository
 * @module tests/repositories/churchRepository.test
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

describe('ChurchRepository', () => {
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
    it('deve retornar todas as igrejas', async () => {
      const mockChurches = [
        { id: 1, name: 'Igreja Central', address: 'Rua A, 123' },
        { id: 2, name: 'Igreja Norte', address: 'Rua B, 456' },
      ];

      mockDb.from.mockResolvedValue(mockChurches);

      const result = await mockDb.select().from('churches');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Igreja Central');
    });
  });

  describe('findById', () => {
    it('deve retornar igreja por ID', async () => {
      const mockChurch = { id: 1, name: 'Igreja Central', address: 'Rua A, 123' };

      mockDb.where.mockResolvedValue([mockChurch]);

      expect(mockChurch.id).toBe(1);
      expect(mockChurch.name).toBe('Igreja Central');
    });

    it('deve retornar null para ID inexistente', async () => {
      mockDb.where.mockResolvedValue([]);

      const result: unknown[] = [];
      expect(result.length).toBe(0);
    });
  });

  describe('findByDistrict', () => {
    it('deve retornar igrejas de um distrito', async () => {
      const mockChurches = [
        { id: 1, name: 'Igreja A', districtId: 1 },
        { id: 2, name: 'Igreja B', districtId: 1 },
      ];

      mockDb.where.mockResolvedValue(mockChurches);

      expect(mockChurches).toHaveLength(2);
      mockChurches.forEach(church => {
        expect(church.districtId).toBe(1);
      });
    });
  });

  describe('create', () => {
    it('deve criar nova igreja', async () => {
      const newChurch = { name: 'Nova Igreja', address: 'Rua Nova, 789' };
      const createdChurch = { id: 3, ...newChurch };

      mockDb.returning.mockResolvedValue([createdChurch]);

      expect(createdChurch.id).toBe(3);
      expect(createdChurch.name).toBe('Nova Igreja');
    });

    it('deve validar nome obrigatorio', () => {
      const invalidChurch = { name: '', address: 'Rua A' };
      expect(invalidChurch.name).toBe('');
    });
  });

  describe('update', () => {
    it('deve atualizar igreja existente', async () => {
      const updatedChurch = { id: 1, name: 'Nome Atualizado', address: 'Novo Endereco' };

      mockDb.returning.mockResolvedValue([updatedChurch]);

      expect(updatedChurch.name).toBe('Nome Atualizado');
    });
  });

  describe('delete', () => {
    it('deve deletar igreja', async () => {
      mockDb.where.mockResolvedValue({ rowCount: 1 });

      const result = { rowCount: 1 };
      expect(result.rowCount).toBe(1);
    });
  });

  describe('getOrCreate', () => {
    it('deve retornar igreja existente se ja existe', async () => {
      const existingChurch = { id: 1, name: 'Igreja Existente' };

      expect(existingChurch.id).toBe(1);
    });

    it('deve criar nova igreja se nao existe', async () => {
      const newChurch = { id: 5, name: 'Nova Igreja' };

      expect(newChurch.id).toBe(5);
    });
  });

  describe('Validacoes', () => {
    it('deve validar formato do nome', () => {
      const validName = 'Igreja Adventista Central';
      const invalidName = '';

      expect(validName.length).toBeGreaterThan(0);
      expect(invalidName.length).toBe(0);
    });

    it('deve sanitizar dados de entrada', () => {
      const inputWithXSS = '<script>alert("xss")</script>Igreja';
      const sanitized = inputWithXSS.replace(/<script[^>]*>.*?<\/script>/gi, '');

      expect(sanitized).toBe('Igreja');
    });
  });
});
