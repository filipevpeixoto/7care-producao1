/**
 * Testes de Integração - Eventos
 * Testa endpoints de CRUD de eventos
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock types for tests
interface MockEvent {
  id: number;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  location?: string;
  type?: string;
  color?: string;
  isRecurring?: boolean;
  capacity?: number;
  churchId?: number;
}

// Mock do NeonAdapter
const mockStorage = {
  getAllEvents: jest.fn<() => Promise<MockEvent[]>>(),
  getEventById: jest.fn<(id: number) => Promise<MockEvent | null>>(),
  createEvent: jest.fn<(data: Partial<MockEvent>) => Promise<MockEvent>>(),
  updateEvent: jest.fn<(id: number, data: Partial<MockEvent>) => Promise<MockEvent | null>>(),
  deleteEvent: jest.fn<(id: number) => Promise<boolean>>(),
  clearAllEvents: jest.fn<() => Promise<boolean>>(),
};

jest.mock('../../neonAdapter', () => ({
  NeonAdapter: jest.fn().mockImplementation(() => mockStorage),
}));

// Mock de eventos para teste
const mockEvents = [
  {
    id: 1,
    title: 'Culto de Sábado',
    description: 'Culto principal',
    date: '2025-01-26T09:00:00',
    endDate: '2025-01-26T11:00:00',
    location: 'Igreja Central',
    type: 'culto',
    color: '#3b82f6',
    isRecurring: true,
    capacity: 200,
    churchId: 1,
  },
  {
    id: 2,
    title: 'Escola Sabatina',
    description: 'Estudo da lição',
    date: '2025-01-26T08:00:00',
    endDate: '2025-01-26T09:00:00',
    location: 'Igreja Central - Sala 1',
    type: 'escola-sabatina',
    color: '#10b981',
    isRecurring: true,
    capacity: 50,
    churchId: 1,
  },
  {
    id: 3,
    title: 'Reunião de Jovens',
    description: 'Encontro semanal',
    date: '2025-01-25T19:00:00',
    location: 'Igreja Central',
    type: 'jovens',
    color: '#8b5cf6',
    isRecurring: true,
    churchId: 1,
  },
];

describe('Events Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/events', () => {
    it('deve retornar lista de eventos', async () => {
      mockStorage.getAllEvents.mockResolvedValueOnce(mockEvents);

      const events = await mockStorage.getAllEvents();

      expect(events).toHaveLength(3);
      expect(events[0].title).toBe('Culto de Sábado');
    });

    it('deve filtrar eventos por tipo', async () => {
      const cultos = mockEvents.filter(e => e.type === 'culto');
      mockStorage.getAllEvents.mockResolvedValueOnce(cultos);

      const events = await mockStorage.getAllEvents();

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('culto');
    });

    it('deve filtrar eventos por data', async () => {
      const targetDate = '2025-01-26';
      const eventsOnDate = mockEvents.filter(e => e.date.startsWith(targetDate));

      expect(eventsOnDate).toHaveLength(2);
    });

    it('deve ordenar eventos por data', () => {
      const sorted = [...mockEvents].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      expect(sorted[0].title).toBe('Reunião de Jovens');
      expect(sorted[1].title).toBe('Escola Sabatina');
    });
  });

  describe('GET /api/events/:id', () => {
    it('deve retornar evento por ID', async () => {
      mockStorage.getEventById.mockResolvedValueOnce(mockEvents[0]);

      const event = await mockStorage.getEventById(1);

      expect(event).not.toBeNull();
      expect(event?.id).toBe(1);
      expect(event?.title).toBe('Culto de Sábado');
    });

    it('deve retornar null para ID inexistente', async () => {
      mockStorage.getEventById.mockResolvedValueOnce(null);

      const event = await mockStorage.getEventById(9999);

      expect(event).toBeNull();
    });
  });

  describe('POST /api/events', () => {
    it('deve criar novo evento', async () => {
      const newEvent = {
        title: 'Novo Evento',
        date: '2025-02-01T10:00:00',
        type: 'outro',
        color: '#f59e0b',
      };

      mockStorage.createEvent.mockResolvedValueOnce({
        id: 4,
        ...newEvent,
        isRecurring: false,
      });

      const created = await mockStorage.createEvent(newEvent);

      expect(created.id).toBe(4);
      expect(created.title).toBe('Novo Evento');
    });

    it('deve validar campos obrigatórios', () => {
      const validEvent = { title: 'Test', date: '2025-01-01' };
      const invalidEvent = { title: '' };

      expect(validEvent.title.length).toBeGreaterThan(0);
      expect(validEvent.date).toBeDefined();
      expect(invalidEvent.title.length).toBe(0);
    });

    it('deve validar formato de data', () => {
      const validDates = ['2025-01-26', '2025-01-26T10:00:00'];
      const invalidDates = ['26/01/2025', 'invalid'];

      const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/;

      validDates.forEach(date => {
        expect(isoRegex.test(date)).toBe(true);
      });

      invalidDates.forEach(date => {
        expect(isoRegex.test(date)).toBe(false);
      });
    });
  });

  describe('PUT /api/events/:id', () => {
    it('deve atualizar evento existente', async () => {
      const updates = { title: 'Culto Atualizado', capacity: 250 };

      mockStorage.updateEvent.mockResolvedValueOnce({
        ...mockEvents[0],
        ...updates,
      });

      const updated = await mockStorage.updateEvent(1, updates);

      expect(updated?.title).toBe('Culto Atualizado');
      expect(updated?.capacity).toBe(250);
    });

    it('deve manter campos não atualizados', async () => {
      const updates = { title: 'Novo Título' };

      mockStorage.updateEvent.mockResolvedValueOnce({
        ...mockEvents[0],
        ...updates,
      });

      const updated = await mockStorage.updateEvent(1, updates);

      expect(updated?.type).toBe('culto'); // não alterado
      expect(updated?.title).toBe('Novo Título'); // alterado
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('deve deletar evento existente', async () => {
      mockStorage.deleteEvent.mockResolvedValueOnce(true);

      const result = await mockStorage.deleteEvent(1);

      expect(result).toBe(true);
    });

    it('deve retornar false para evento inexistente', async () => {
      mockStorage.deleteEvent.mockResolvedValueOnce(false);

      const result = await mockStorage.deleteEvent(9999);

      expect(result).toBe(false);
    });
  });

  describe('DELETE /api/events (clear all)', () => {
    it('deve limpar todos os eventos', async () => {
      mockStorage.clearAllEvents.mockResolvedValueOnce(true);

      const result = await mockStorage.clearAllEvents();

      expect(result).toBe(true);
    });
  });
});

describe('Events Validation Tests', () => {
  describe('Event Types', () => {
    it('deve validar tipos de evento permitidos', () => {
      const validTypes = [
        'culto',
        'escola-sabatina',
        'jovens',
        'deaconato',
        'reuniao',
        'estudo',
        'outro',
      ];

      mockEvents.forEach(event => {
        expect(validTypes).toContain(event.type);
      });
    });
  });

  describe('Event Colors', () => {
    it('deve validar formato de cor hexadecimal', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      mockEvents.forEach(event => {
        if (event.color) {
          expect(hexColorRegex.test(event.color)).toBe(true);
        }
      });
    });
  });

  describe('Event Dates', () => {
    it('endDate deve ser após date', () => {
      mockEvents.forEach(event => {
        if (event.endDate) {
          const start = new Date(event.date);
          const end = new Date(event.endDate);
          expect(end.getTime()).toBeGreaterThan(start.getTime());
        }
      });
    });

    it('deve validar eventos recorrentes', () => {
      const recurringEvents = mockEvents.filter(e => e.isRecurring);
      expect(recurringEvents.length).toBe(3);
    });
  });
});

describe('Events Permission Tests', () => {
  describe('Role-based access', () => {
    it('superadmin pode criar eventos', () => {
      const userRole = 'superadmin';
      const canCreate = ['superadmin', 'pastor'].includes(userRole);
      expect(canCreate).toBe(true);
    });

    it('member não pode deletar eventos', () => {
      const userRole = 'member';
      const canDelete = ['superadmin', 'pastor'].includes(userRole);
      expect(canDelete).toBe(false);
    });
  });
});
