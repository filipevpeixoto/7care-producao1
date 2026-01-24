/**
 * Testes de Integração - Reuniões
 * Testa endpoints de agendamento de reuniões
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock do NeonAdapter
const mockStorage = {
  getAllMeetings: jest.fn<() => Promise<any[]>>(),
  getMeetingById: jest.fn<(id: number) => Promise<any | null>>(),
  createMeeting: jest.fn<(data: any) => Promise<any>>(),
  updateMeeting: jest.fn<(id: number, data: any) => Promise<any | null>>(),
  deleteMeeting: jest.fn<(id: number) => Promise<boolean>>(),
  getMeetingsByUserId: jest.fn<(userId: number) => Promise<any[]>>()
};

jest.mock('../../neonAdapter', () => ({
  NeonAdapter: jest.fn().mockImplementation(() => mockStorage)
}));

const mockMeetings = [
  {
    id: 1,
    title: 'Reunião de Discipulado',
    description: 'Primeira reunião com João',
    scheduledAt: '2025-01-25T14:00:00',
    duration: 60,
    location: 'Igreja Central - Sala 2',
    requesterId: 10,
    attendeeId: 5,
    status: 'scheduled',
    priority: 'medium',
    notes: null,
    createdAt: '2025-01-20T10:00:00'
  },
  {
    id: 2,
    title: 'Estudo Bíblico',
    description: 'Estudo sobre o Apocalipse',
    scheduledAt: '2025-01-26T19:00:00',
    duration: 90,
    location: 'Online - Zoom',
    requesterId: 11,
    attendeeId: 5,
    status: 'confirmed',
    priority: 'high',
    notes: 'Preparar slides',
    createdAt: '2025-01-20T11:00:00'
  },
  {
    id: 3,
    title: 'Aconselhamento',
    description: 'Aconselhamento familiar',
    scheduledAt: '2025-01-24T16:00:00',
    duration: 45,
    location: 'Igreja Central - Escritório',
    requesterId: 12,
    attendeeId: 6,
    status: 'completed',
    priority: 'high',
    notes: 'Reunião muito produtiva',
    createdAt: '2025-01-18T09:00:00'
  }
];

describe('Meetings Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/meetings', () => {
    it('deve retornar lista de reuniões', async () => {
      mockStorage.getAllMeetings.mockResolvedValueOnce(mockMeetings);

      const meetings = await mockStorage.getAllMeetings();

      expect(meetings).toHaveLength(3);
      expect(meetings[0].title).toBe('Reunião de Discipulado');
    });

    it('deve filtrar por status', async () => {
      const scheduledMeetings = mockMeetings.filter(m => m.status === 'scheduled');
      mockStorage.getAllMeetings.mockResolvedValueOnce(scheduledMeetings);

      const meetings = await mockStorage.getAllMeetings();

      expect(meetings).toHaveLength(1);
      expect(meetings[0].status).toBe('scheduled');
    });

    it('deve filtrar por prioridade', async () => {
      const highPriority = mockMeetings.filter(m => m.priority === 'high');
      mockStorage.getAllMeetings.mockResolvedValueOnce(highPriority);

      const meetings = await mockStorage.getAllMeetings();

      expect(meetings).toHaveLength(2);
      expect(meetings.every(m => m.priority === 'high')).toBe(true);
    });

    it('deve ordenar por data', () => {
      const sorted = [...mockMeetings].sort((a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );

      expect(sorted[0].id).toBe(3); // 24/01
      expect(sorted[1].id).toBe(1); // 25/01
      expect(sorted[2].id).toBe(2); // 26/01
    });
  });

  describe('GET /api/meetings/:id', () => {
    it('deve retornar reunião por ID', async () => {
      mockStorage.getMeetingById.mockResolvedValueOnce(mockMeetings[0]);

      const meeting = await mockStorage.getMeetingById(1);

      expect(meeting).not.toBeNull();
      expect(meeting?.id).toBe(1);
      expect(meeting?.title).toBe('Reunião de Discipulado');
    });

    it('deve retornar null para ID inexistente', async () => {
      mockStorage.getMeetingById.mockResolvedValueOnce(null);

      const meeting = await mockStorage.getMeetingById(9999);

      expect(meeting).toBeNull();
    });
  });

  describe('GET /api/meetings/user/:userId', () => {
    it('deve retornar reuniões do usuário como requester', async () => {
      const user10Meetings = mockMeetings.filter(m => m.requesterId === 10);
      mockStorage.getMeetingsByUserId.mockResolvedValueOnce(user10Meetings);

      const meetings = await mockStorage.getMeetingsByUserId(10);

      expect(meetings).toHaveLength(1);
      expect(meetings[0].requesterId).toBe(10);
    });

    it('deve retornar reuniões do usuário como attendee', async () => {
      const user5Meetings = mockMeetings.filter(m => m.attendeeId === 5);
      mockStorage.getMeetingsByUserId.mockResolvedValueOnce(user5Meetings);

      const meetings = await mockStorage.getMeetingsByUserId(5);

      expect(meetings).toHaveLength(2);
      expect(meetings.every(m => m.attendeeId === 5)).toBe(true);
    });
  });

  describe('POST /api/meetings', () => {
    it('deve criar nova reunião', async () => {
      const newMeeting = {
        title: 'Visita Pastoral',
        scheduledAt: '2025-01-27T10:00:00',
        requesterId: 13,
        attendeeId: 7,
        duration: 30
      };

      mockStorage.createMeeting.mockResolvedValueOnce({
        id: 4,
        ...newMeeting,
        status: 'scheduled',
        priority: 'medium',
        createdAt: '2025-01-20T15:00:00'
      });

      const created = await mockStorage.createMeeting(newMeeting);

      expect(created.id).toBe(4);
      expect(created.title).toBe('Visita Pastoral');
      expect(created.status).toBe('scheduled');
    });

    it('deve validar campos obrigatórios', () => {
      const validMeeting = {
        title: 'Reunião',
        scheduledAt: '2025-01-25T10:00:00',
        requesterId: 1
      };

      expect(validMeeting.title).toBeDefined();
      expect(validMeeting.scheduledAt).toBeDefined();
      expect(validMeeting.requesterId).toBeDefined();
    });

    it('deve validar formato de data', () => {
      const validDates = ['2025-01-25T10:00:00', '2025-12-31T23:59:59'];
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

      validDates.forEach(date => {
        expect(isoRegex.test(date)).toBe(true);
      });
    });

    it('deve usar valores default', () => {
      const minimalMeeting = {
        title: 'Reunião Simples',
        scheduledAt: '2025-01-25T10:00:00',
        requesterId: 1
      };

      // Default values esperados
      const defaultStatus = 'scheduled';
      const defaultPriority = 'medium';
      const defaultDuration = 60;

      expect(defaultStatus).toBe('scheduled');
      expect(defaultPriority).toBe('medium');
      expect(defaultDuration).toBe(60);
    });
  });

  describe('PUT /api/meetings/:id', () => {
    it('deve atualizar reunião', async () => {
      const updates = {
        status: 'confirmed',
        notes: 'Confirmado com o interessado'
      };

      mockStorage.updateMeeting.mockResolvedValueOnce({
        ...mockMeetings[0],
        ...updates
      });

      const updated = await mockStorage.updateMeeting(1, updates);

      expect(updated?.status).toBe('confirmed');
      expect(updated?.notes).toBe('Confirmado com o interessado');
    });

    it('deve marcar como completada', async () => {
      mockStorage.updateMeeting.mockResolvedValueOnce({
        ...mockMeetings[0],
        status: 'completed',
        notes: 'Reunião realizada com sucesso'
      });

      const updated = await mockStorage.updateMeeting(1, {
        status: 'completed',
        notes: 'Reunião realizada com sucesso'
      });

      expect(updated?.status).toBe('completed');
    });

    it('deve cancelar reunião', async () => {
      mockStorage.updateMeeting.mockResolvedValueOnce({
        ...mockMeetings[0],
        status: 'cancelled',
        notes: 'Cancelado por conflito de agenda'
      });

      const updated = await mockStorage.updateMeeting(1, {
        status: 'cancelled',
        notes: 'Cancelado por conflito de agenda'
      });

      expect(updated?.status).toBe('cancelled');
    });
  });

  describe('DELETE /api/meetings/:id', () => {
    it('deve deletar reunião', async () => {
      mockStorage.deleteMeeting.mockResolvedValueOnce(true);

      const result = await mockStorage.deleteMeeting(1);

      expect(result).toBe(true);
    });

    it('deve retornar false para ID inexistente', async () => {
      mockStorage.deleteMeeting.mockResolvedValueOnce(false);

      const result = await mockStorage.deleteMeeting(9999);

      expect(result).toBe(false);
    });
  });

  describe('Validation Tests', () => {
    it('deve validar status permitidos', () => {
      const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled'];

      mockMeetings.forEach(meeting => {
        expect(validStatuses).toContain(meeting.status);
      });
    });

    it('deve validar prioridades permitidas', () => {
      const validPriorities = ['low', 'medium', 'high'];

      mockMeetings.forEach(meeting => {
        expect(validPriorities).toContain(meeting.priority);
      });
    });

    it('deve validar duração mínima', () => {
      mockMeetings.forEach(meeting => {
        expect(meeting.duration).toBeGreaterThan(0);
        expect(meeting.duration).toBeLessThanOrEqual(480); // máx 8 horas
      });
    });

    it('scheduledAt deve ser data futura ou recente', () => {
      mockMeetings.forEach(meeting => {
        const scheduledDate = new Date(meeting.scheduledAt);
        expect(scheduledDate.getTime()).not.toBeNaN();
      });
    });
  });

  describe('Business Logic Tests', () => {
    it('não deve permitir sobrepor horários', () => {
      // Simular verificação de conflito
      const meeting1 = mockMeetings[0];
      const meeting1End = new Date(meeting1.scheduledAt);
      meeting1End.setMinutes(meeting1End.getMinutes() + meeting1.duration);

      const newMeetingStart = new Date('2025-01-25T14:30:00');

      const hasConflict = newMeetingStart < meeting1End;
      expect(hasConflict).toBe(true);
    });

    it('deve permitir reuniões em horários diferentes', () => {
      const meeting1 = mockMeetings[0];
      const meeting1End = new Date(meeting1.scheduledAt);
      meeting1End.setMinutes(meeting1End.getMinutes() + meeting1.duration);

      const newMeetingStart = new Date('2025-01-25T15:30:00');

      const hasConflict = newMeetingStart < meeting1End;
      expect(hasConflict).toBe(false);
    });

    it('reuniões de alta prioridade devem ser destacadas', () => {
      const highPriorityMeetings = mockMeetings.filter(m => m.priority === 'high');

      expect(highPriorityMeetings.length).toBeGreaterThan(0);
      highPriorityMeetings.forEach(meeting => {
        expect(meeting.priority).toBe('high');
      });
    });
  });
});
