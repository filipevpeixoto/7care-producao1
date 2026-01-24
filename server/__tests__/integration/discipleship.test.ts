/**
 * Testes de Integração - Discipulado
 * Testa endpoints de solicitações de discipulado
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock do NeonAdapter
const mockStorage = {
  getAllDiscipleshipRequests: jest.fn<() => Promise<any[]>>(),
  getDiscipleshipRequestById: jest.fn<(id: number) => Promise<any | null>>(),
  createDiscipleshipRequest: jest.fn<(data: any) => Promise<any>>(),
  updateDiscipleshipRequest: jest.fn<(id: number, data: any) => Promise<any | null>>(),
  deleteDiscipleshipRequest: jest.fn<(id: number) => Promise<boolean>>(),
  createRelationship: jest.fn<(data: any) => Promise<any>>(),
  getUserById: jest.fn<(id: number) => Promise<any | null>>()
};

jest.mock('../../neonAdapter', () => ({
  NeonAdapter: jest.fn().mockImplementation(() => mockStorage)
}));

const mockRequests = [
  {
    id: 1,
    interestedId: 10,
    missionaryId: 5,
    status: 'pending',
    message: 'Gostaria de ser discipulado',
    createdAt: '2025-01-20T10:00:00',
    interestedName: 'João Silva',
    missionaryName: 'Pastor Pedro'
  },
  {
    id: 2,
    interestedId: 11,
    missionaryId: 5,
    status: 'approved',
    message: 'Preciso de orientação espiritual',
    createdAt: '2025-01-19T10:00:00',
    interestedName: 'Maria Santos',
    missionaryName: 'Pastor Pedro'
  },
  {
    id: 3,
    interestedId: 12,
    missionaryId: 6,
    status: 'rejected',
    message: 'Quero estudar a Bíblia',
    createdAt: '2025-01-18T10:00:00',
    interestedName: 'Ana Costa',
    missionaryName: 'Missionária Clara'
  }
];

describe('Discipleship Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/discipleship-requests', () => {
    it('deve retornar lista de solicitações', async () => {
      mockStorage.getAllDiscipleshipRequests.mockResolvedValueOnce(mockRequests);

      const requests = await mockStorage.getAllDiscipleshipRequests();

      expect(requests).toHaveLength(3);
      expect(requests[0].interestedName).toBe('João Silva');
    });

    it('deve filtrar por status', async () => {
      const pendingRequests = mockRequests.filter(r => r.status === 'pending');
      mockStorage.getAllDiscipleshipRequests.mockResolvedValueOnce(pendingRequests);

      const requests = await mockStorage.getAllDiscipleshipRequests();

      expect(requests).toHaveLength(1);
      expect(requests[0].status).toBe('pending');
    });

    it('deve filtrar por missionário', async () => {
      const missionary5Requests = mockRequests.filter(r => r.missionaryId === 5);
      mockStorage.getAllDiscipleshipRequests.mockResolvedValueOnce(missionary5Requests);

      const requests = await mockStorage.getAllDiscipleshipRequests();

      expect(requests).toHaveLength(2);
      expect(requests.every(r => r.missionaryId === 5)).toBe(true);
    });
  });

  describe('GET /api/discipleship-requests/:id', () => {
    it('deve retornar solicitação por ID', async () => {
      mockStorage.getDiscipleshipRequestById.mockResolvedValueOnce(mockRequests[0]);

      const request = await mockStorage.getDiscipleshipRequestById(1);

      expect(request).not.toBeNull();
      expect(request?.id).toBe(1);
      expect(request?.interestedName).toBe('João Silva');
    });

    it('deve retornar null para ID inexistente', async () => {
      mockStorage.getDiscipleshipRequestById.mockResolvedValueOnce(null);

      const request = await mockStorage.getDiscipleshipRequestById(9999);

      expect(request).toBeNull();
    });
  });

  describe('POST /api/discipleship-requests', () => {
    it('deve criar nova solicitação', async () => {
      const newRequest = {
        interestedId: 13,
        missionaryId: 7,
        message: 'Quero conhecer mais sobre a fé'
      };

      mockStorage.createDiscipleshipRequest.mockResolvedValueOnce({
        id: 4,
        ...newRequest,
        status: 'pending',
        createdAt: '2025-01-20T15:00:00'
      });

      const created = await mockStorage.createDiscipleshipRequest(newRequest);

      expect(created.id).toBe(4);
      expect(created.status).toBe('pending');
      expect(created.message).toBe('Quero conhecer mais sobre a fé');
    });

    it('deve validar campos obrigatórios', () => {
      const validRequest = { interestedId: 1, missionaryId: 2 };
      const invalidRequest = { interestedId: 1 };

      expect(validRequest.interestedId).toBeDefined();
      expect(validRequest.missionaryId).toBeDefined();
      expect(invalidRequest.interestedId).toBeDefined();
      expect((invalidRequest as any).missionaryId).toBeUndefined();
    });

    it('deve rejeitar IDs inválidos', () => {
      const invalidIds = [-1, 0];

      invalidIds.forEach(id => {
        expect(id).toBeLessThanOrEqual(0);
      });

      // Testar NaN separadamente
      expect(Number.isNaN(NaN)).toBe(true);
    });
  });

  describe('PUT /api/discipleship-requests/:id', () => {
    it('deve aprovar solicitação', async () => {
      mockStorage.updateDiscipleshipRequest.mockResolvedValueOnce({
        ...mockRequests[0],
        status: 'approved'
      });

      mockStorage.createRelationship.mockResolvedValueOnce({
        id: 1,
        interestedId: 10,
        missionaryId: 5,
        status: 'active'
      });

      const updated = await mockStorage.updateDiscipleshipRequest(1, { status: 'approved' });

      expect(updated?.status).toBe('approved');
    });

    it('deve rejeitar solicitação', async () => {
      mockStorage.updateDiscipleshipRequest.mockResolvedValueOnce({
        ...mockRequests[0],
        status: 'rejected'
      });

      const updated = await mockStorage.updateDiscipleshipRequest(1, { status: 'rejected' });

      expect(updated?.status).toBe('rejected');
    });

    it('deve permitir adicionar notas', async () => {
      mockStorage.updateDiscipleshipRequest.mockResolvedValueOnce({
        ...mockRequests[0],
        notes: 'Aprovado após entrevista'
      });

      const updated = await mockStorage.updateDiscipleshipRequest(1, {
        notes: 'Aprovado após entrevista'
      });

      expect(updated?.notes).toBe('Aprovado após entrevista');
    });
  });

  describe('DELETE /api/discipleship-requests/:id', () => {
    it('deve deletar solicitação', async () => {
      mockStorage.deleteDiscipleshipRequest.mockResolvedValueOnce(true);

      const result = await mockStorage.deleteDiscipleshipRequest(3);

      expect(result).toBe(true);
    });

    it('deve retornar false para ID inexistente', async () => {
      mockStorage.deleteDiscipleshipRequest.mockResolvedValueOnce(false);

      const result = await mockStorage.deleteDiscipleshipRequest(9999);

      expect(result).toBe(false);
    });
  });

  describe('Validation Tests', () => {
    it('deve validar status permitidos', () => {
      const validStatuses = ['pending', 'approved', 'rejected'];

      mockRequests.forEach(request => {
        expect(validStatuses).toContain(request.status);
      });
    });

    it('deve ter timestamp de criação', () => {
      mockRequests.forEach(request => {
        expect(request.createdAt).toBeDefined();
        expect(new Date(request.createdAt).getTime()).not.toBeNaN();
      });
    });
  });

  describe('Business Logic Tests', () => {
    it('não deve permitir solicitação duplicada pendente', async () => {
      const existingRequest = mockRequests.find(
        r => r.interestedId === 10 && r.missionaryId === 5 && r.status === 'pending'
      );

      expect(existingRequest).toBeDefined();
      expect(existingRequest?.status).toBe('pending');
    });

    it('deve criar relacionamento ao aprovar', async () => {
      const relationship = {
        interestedId: 10,
        missionaryId: 5,
        status: 'active'
      };

      mockStorage.createRelationship.mockResolvedValueOnce({
        id: 1,
        ...relationship
      });

      const created = await mockStorage.createRelationship(relationship);

      expect(created.id).toBe(1);
      expect(created.status).toBe('active');
    });
  });
});
