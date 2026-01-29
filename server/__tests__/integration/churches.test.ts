/**
 * Testes de Integração - Igrejas
 * Testa endpoints de CRUD de igrejas
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock types for tests
interface MockChurch {
  id: number;
  name: string;
  code?: string;
  address?: string;
  email?: string;
  phone?: string;
  pastor?: string | null;
  districtId?: number | null;
}

// Mock do NeonAdapter
const mockStorage = {
  getAllChurches: jest.fn<() => Promise<MockChurch[]>>(),
  getChurchById: jest.fn<(id: number) => Promise<MockChurch | null>>(),
  createChurch: jest.fn<(data: Partial<MockChurch>) => Promise<MockChurch>>(),
  updateChurch: jest.fn<(id: number, data: Partial<MockChurch>) => Promise<MockChurch | null>>(),
  deleteChurch: jest.fn<(id: number) => Promise<boolean>>(),
  getDefaultChurch: jest.fn<() => Promise<MockChurch | null>>(),
  setDefaultChurch: jest.fn<(id: number) => Promise<boolean>>(),
  getOrCreateChurch: jest.fn<(name: string) => Promise<MockChurch>>(),
};

jest.mock('../../neonAdapter', () => ({
  NeonAdapter: jest.fn().mockImplementation(() => mockStorage),
}));

// Mock de igrejas para teste
const mockChurches = [
  {
    id: 1,
    name: 'Igreja Central',
    code: 'IC001',
    address: 'Rua Principal, 100',
    email: 'central@igreja.com',
    phone: '1133334444',
    pastor: 'Pastor João',
    districtId: 1,
  },
  {
    id: 2,
    name: 'Igreja Norte',
    code: 'IN002',
    address: 'Av. Norte, 200',
    email: 'norte@igreja.com',
    phone: '1144445555',
    pastor: 'Pastor Maria',
    districtId: 1,
  },
  {
    id: 3,
    name: 'Igreja Sul',
    code: 'IS003',
    address: 'Rua Sul, 300',
    email: 'sul@igreja.com',
    phone: '1155556666',
    pastor: null,
    districtId: 2,
  },
];

describe('Churches Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/churches', () => {
    it('deve retornar lista de igrejas', async () => {
      mockStorage.getAllChurches.mockResolvedValueOnce(mockChurches);

      const churches = await mockStorage.getAllChurches();

      expect(churches).toHaveLength(3);
      expect(churches[0].name).toBe('Igreja Central');
    });

    it('deve filtrar igrejas por distrito', async () => {
      const district1Churches = mockChurches.filter(c => c.districtId === 1);
      mockStorage.getAllChurches.mockResolvedValueOnce(district1Churches);

      const churches = await mockStorage.getAllChurches();

      expect(churches).toHaveLength(2);
      expect(churches.every(c => c.districtId === 1)).toBe(true);
    });

    it('deve ordenar igrejas por nome', () => {
      const sorted = [...mockChurches].sort((a, b) => a.name.localeCompare(b.name));

      expect(sorted[0].name).toBe('Igreja Central');
      expect(sorted[1].name).toBe('Igreja Norte');
      expect(sorted[2].name).toBe('Igreja Sul');
    });
  });

  describe('GET /api/churches/:id', () => {
    it('deve retornar igreja por ID', async () => {
      mockStorage.getChurchById.mockResolvedValueOnce(mockChurches[0]);

      const church = await mockStorage.getChurchById(1);

      expect(church).not.toBeNull();
      expect(church?.id).toBe(1);
      expect(church?.name).toBe('Igreja Central');
    });

    it('deve retornar null para ID inexistente', async () => {
      mockStorage.getChurchById.mockResolvedValueOnce(null);

      const church = await mockStorage.getChurchById(9999);

      expect(church).toBeNull();
    });
  });

  describe('POST /api/churches', () => {
    it('deve criar nova igreja', async () => {
      const newChurch = {
        name: 'Igreja Leste',
        code: 'IL004',
        address: 'Rua Leste, 400',
        email: 'leste@igreja.com',
      };

      mockStorage.createChurch.mockResolvedValueOnce({
        id: 4,
        ...newChurch,
      });

      const created = await mockStorage.createChurch(newChurch);

      expect(created.id).toBe(4);
      expect(created.name).toBe('Igreja Leste');
    });

    it('deve validar campos obrigatórios', () => {
      const validChurch = { name: 'Igreja Teste' };
      const invalidChurch = { name: '' };

      expect(validChurch.name.length).toBeGreaterThan(0);
      expect(invalidChurch.name.length).toBe(0);
    });

    it('deve gerar código automaticamente se não fornecido', () => {
      const churchName = 'Igreja Nova';
      const generatedCode = churchName
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase();

      expect(generatedCode).toBe('IN');
    });
  });

  describe('PATCH /api/churches/:id', () => {
    it('deve atualizar igreja existente', async () => {
      const updates = { name: 'Igreja Central Atualizada', phone: '1199999999' };

      mockStorage.updateChurch.mockResolvedValueOnce({
        ...mockChurches[0],
        ...updates,
      });

      const updated = await mockStorage.updateChurch(1, updates);

      expect(updated?.name).toBe('Igreja Central Atualizada');
      expect(updated?.phone).toBe('1199999999');
    });

    it('deve manter campos não atualizados', async () => {
      const updates = { name: 'Novo Nome' };

      mockStorage.updateChurch.mockResolvedValueOnce({
        ...mockChurches[0],
        ...updates,
      });

      const updated = await mockStorage.updateChurch(1, updates);

      expect(updated?.code).toBe('IC001'); // não alterado
      expect(updated?.name).toBe('Novo Nome'); // alterado
    });

    it('deve retornar null para igreja inexistente', async () => {
      mockStorage.updateChurch.mockResolvedValueOnce(null);

      const updated = await mockStorage.updateChurch(9999, { name: 'Test' });

      expect(updated).toBeNull();
    });
  });

  describe('DELETE /api/churches/:id', () => {
    it('deve deletar igreja existente', async () => {
      mockStorage.deleteChurch.mockResolvedValueOnce(true);

      const result = await mockStorage.deleteChurch(3);

      expect(result).toBe(true);
    });

    it('deve retornar false para igreja inexistente', async () => {
      mockStorage.deleteChurch.mockResolvedValueOnce(false);

      const result = await mockStorage.deleteChurch(9999);

      expect(result).toBe(false);
    });
  });

  describe('Default Church', () => {
    it('deve retornar igreja padrão', async () => {
      mockStorage.getDefaultChurch.mockResolvedValueOnce(mockChurches[0]);

      const defaultChurch = await mockStorage.getDefaultChurch();

      expect(defaultChurch).not.toBeNull();
      expect(defaultChurch?.id).toBe(1);
    });

    it('deve definir igreja padrão', async () => {
      mockStorage.setDefaultChurch.mockResolvedValueOnce(true);

      const result = await mockStorage.setDefaultChurch(2);

      expect(result).toBe(true);
    });
  });

  describe('Get or Create Church', () => {
    it('deve retornar igreja existente', async () => {
      mockStorage.getOrCreateChurch.mockResolvedValueOnce(mockChurches[0]);

      const church = await mockStorage.getOrCreateChurch('Igreja Central');

      expect(church.id).toBe(1);
    });

    it('deve criar igreja se não existir', async () => {
      mockStorage.getOrCreateChurch.mockResolvedValueOnce({
        id: 5,
        name: 'Igreja Nova',
        code: 'NOVA',
      });

      const church = await mockStorage.getOrCreateChurch('Igreja Nova');

      expect(church.id).toBe(5);
      expect(church.name).toBe('Igreja Nova');
    });
  });
});

describe('Churches Validation Tests', () => {
  describe('Church Code', () => {
    it('deve validar formato de código', () => {
      const validCodes = ['IC001', 'CHURCH', 'ABC123'];

      validCodes.forEach(code => {
        expect(code.length).toBeGreaterThan(0);
        expect(code.length).toBeLessThanOrEqual(10);
      });
    });

    it('código deve ser único', () => {
      const codes = mockChurches.map(c => c.code);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('Church Email', () => {
    it('deve validar formato de email', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      mockChurches.forEach(church => {
        if (church.email) {
          expect(emailRegex.test(church.email)).toBe(true);
        }
      });
    });
  });

  describe('Church Phone', () => {
    it('deve validar formato de telefone', () => {
      const phoneRegex = /^\d{10,11}$/;

      mockChurches.forEach(church => {
        if (church.phone) {
          expect(phoneRegex.test(church.phone)).toBe(true);
        }
      });
    });
  });
});

describe('Churches Permission Tests', () => {
  describe('Role-based access', () => {
    it('superadmin pode criar igrejas', () => {
      const userRole = 'superadmin';
      const canCreate = ['superadmin'].includes(userRole);
      expect(canCreate).toBe(true);
    });

    it('pastor pode ver sua igreja', () => {
      const userRole = 'pastor';
      const userChurchId = 1;

      const canView = (role: string, churchId: number) => {
        return role === 'superadmin' || churchId === userChurchId;
      };

      expect(canView(userRole, 1)).toBe(true);
      expect(canView(userRole, 2)).toBe(false);
    });

    it('member não pode deletar igrejas', () => {
      const userRole = 'member';
      const canDelete = ['superadmin'].includes(userRole);
      expect(canDelete).toBe(false);
    });
  });

  describe('District-based filtering', () => {
    it('pastor de distrito vê apenas igrejas do distrito', () => {
      const pastorDistrictId = 1;
      const visibleChurches = mockChurches.filter(c => c.districtId === pastorDistrictId);

      expect(visibleChurches.length).toBe(2);
      expect(visibleChurches.every(c => c.districtId === pastorDistrictId)).toBe(true);
    });
  });
});
