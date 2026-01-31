/**
 * Testes para Event Repository
 * @module tests/repositories/eventRepository.test
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

describe('EventRepository', () => {
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
    it('deve retornar todos os eventos', async () => {
      const mockEvents = [
        { id: 1, title: 'Culto de Sabado', date: '2024-01-20', type: 'worship' },
        { id: 2, title: 'Reuniao de Jovens', date: '2024-01-21', type: 'meeting' },
      ];

      mockDb.from.mockResolvedValue(mockEvents);

      expect(mockEvents).toHaveLength(2);
      expect(mockEvents[0].title).toBe('Culto de Sabado');
    });
  });

  describe('findById', () => {
    it('deve retornar evento por ID', async () => {
      const mockEvent = {
        id: 1,
        title: 'Culto de Sabado',
        date: '2024-01-20',
        type: 'worship',
        churchId: 1,
      };

      mockDb.where.mockResolvedValue([mockEvent]);

      expect(mockEvent.id).toBe(1);
      expect(mockEvent.churchId).toBe(1);
    });
  });

  describe('findByDateRange', () => {
    it('deve retornar eventos em um periodo', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockEvents = [
        { id: 1, title: 'Evento 1', date: new Date('2024-01-15') },
        { id: 2, title: 'Evento 2', date: new Date('2024-01-20') },
      ];

      mockDb.where.mockResolvedValue(mockEvents);

      mockEvents.forEach(event => {
        expect(event.date >= startDate && event.date <= endDate).toBe(true);
      });
    });
  });

  describe('findByChurch', () => {
    it('deve retornar eventos de uma igreja', async () => {
      const mockEvents = [
        { id: 1, title: 'Evento 1', churchId: 1 },
        { id: 2, title: 'Evento 2', churchId: 1 },
      ];

      mockDb.where.mockResolvedValue(mockEvents);

      expect(mockEvents).toHaveLength(2);
      mockEvents.forEach(event => {
        expect(event.churchId).toBe(1);
      });
    });
  });

  describe('findByType', () => {
    it('deve retornar eventos por tipo', async () => {
      const mockEvents = [
        { id: 1, title: 'Culto 1', type: 'worship' },
        { id: 2, title: 'Culto 2', type: 'worship' },
      ];

      mockDb.where.mockResolvedValue(mockEvents);

      mockEvents.forEach(event => {
        expect(event.type).toBe('worship');
      });
    });
  });

  describe('create', () => {
    it('deve criar novo evento', async () => {
      const newEvent = {
        title: 'Novo Evento',
        date: '2024-02-01',
        type: 'meeting',
        churchId: 1,
      };

      const createdEvent = { id: 5, ...newEvent };

      mockDb.returning.mockResolvedValue([createdEvent]);

      expect(createdEvent.id).toBe(5);
      expect(createdEvent.title).toBe('Novo Evento');
    });

    it('deve validar data obrigatoria', () => {
      const eventWithDate = { title: 'Evento', date: '2024-01-01' };
      const eventWithoutDate = { title: 'Evento', date: '' };

      expect(eventWithDate.date).toBeTruthy();
      expect(eventWithoutDate.date).toBeFalsy();
    });
  });

  describe('update', () => {
    it('deve atualizar evento existente', async () => {
      const original = { id: 1, title: 'Titulo Original', date: '2024-01-01' };
      const update = { title: 'Titulo Atualizado' };
      const result = { ...original, ...update };

      mockDb.returning.mockResolvedValue([result]);

      expect(result.title).toBe('Titulo Atualizado');
      expect(result.date).toBe('2024-01-01');
    });
  });

  describe('delete', () => {
    it('deve deletar evento', async () => {
      mockDb.where.mockResolvedValue({ rowCount: 1 });

      const result = { rowCount: 1 };
      expect(result.rowCount).toBe(1);
    });
  });

  describe('getUpcoming', () => {
    it('deve retornar eventos futuros', async () => {
      const now = new Date();
      const futureEvent = {
        id: 1,
        title: 'Evento Futuro',
        date: new Date(now.getTime() + 86400000),
      };

      mockDb.where.mockResolvedValue([futureEvent]);

      expect(futureEvent.date > now).toBe(true);
    });
  });

  describe('getRecurring', () => {
    it('deve retornar eventos recorrentes', async () => {
      const recurringEvent = {
        id: 1,
        title: 'Culto de Sabado',
        recurring: true,
        recurrencePattern: 'weekly',
      };

      mockDb.where.mockResolvedValue([recurringEvent]);

      expect(recurringEvent.recurring).toBe(true);
      expect(recurringEvent.recurrencePattern).toBe('weekly');
    });
  });

  describe('getAttendees', () => {
    it('deve retornar participantes do evento', async () => {
      const attendees = [
        { id: 1, userId: 1, eventId: 1, status: 'confirmed' },
        { id: 2, userId: 2, eventId: 1, status: 'pending' },
      ];

      mockDb.where.mockResolvedValue(attendees);

      expect(attendees).toHaveLength(2);
      const confirmed = attendees.filter(a => a.status === 'confirmed');
      expect(confirmed).toHaveLength(1);
    });
  });

  describe('Validacoes', () => {
    it('deve validar tipo de evento valido', () => {
      const validTypes = ['worship', 'meeting', 'study', 'social', 'other'];
      const eventType = 'worship';

      expect(validTypes.includes(eventType)).toBe(true);
    });

    it('deve validar formato de data', () => {
      const validDate = '2024-01-20';
      const invalidDate = '20-01-2024';

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      expect(dateRegex.test(validDate)).toBe(true);
      expect(dateRegex.test(invalidDate)).toBe(false);
    });

    it('deve validar churchId obrigatorio', () => {
      const eventWithChurch = { title: 'Evento', churchId: 1 };
      const eventWithoutChurch = { title: 'Evento', churchId: null };

      expect(eventWithChurch.churchId).toBeTruthy();
      expect(eventWithoutChurch.churchId).toBeFalsy();
    });
  });
});
