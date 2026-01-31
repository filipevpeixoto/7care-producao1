/**
 * Testes de Adaptadores - Event Adapter
 * Cobre transformações de dados de eventos
 */

import { describe, it, expect } from '@jest/globals';

describe('Event Adapter', () => {
  interface EventDB {
    id: number;
    church_id: number;
    title: string;
    description: string | null;
    event_type: string;
    start_date: Date;
    end_date: Date;
    location: string | null;
    is_recurring: boolean;
    recurrence_pattern: string | null;
    max_attendees: number | null;
    current_attendees: number;
    is_public: boolean;
    created_by: number;
    created_at: Date;
    updated_at: Date;
  }

  interface EventDTO {
    id: number;
    churchId: number;
    title: string;
    description?: string;
    type: string;
    schedule: {
      start: string;
      end: string;
      duration: number; // minutos
      isAllDay: boolean;
    };
    location?: string;
    recurring: {
      enabled: boolean;
      pattern?: string;
    };
    capacity: {
      max?: number;
      current: number;
      available: number | null;
      isFull: boolean;
    };
    visibility: 'public' | 'private';
    createdBy: number;
    createdAt: string;
    updatedAt: string;
  }

  const toDTO = (db: EventDB): EventDTO => {
    const startDate = new Date(db.start_date);
    const endDate = new Date(db.end_date);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const isAllDay = durationMinutes >= 1440; // 24h ou mais

    return {
      id: db.id,
      churchId: db.church_id,
      title: db.title,
      ...(db.description && { description: db.description }),
      type: db.event_type,
      schedule: {
        start: db.start_date.toISOString(),
        end: db.end_date.toISOString(),
        duration: durationMinutes,
        isAllDay,
      },
      ...(db.location && { location: db.location }),
      recurring: {
        enabled: db.is_recurring,
        ...(db.recurrence_pattern && { pattern: db.recurrence_pattern }),
      },
      capacity: {
        ...(db.max_attendees && { max: db.max_attendees }),
        current: db.current_attendees,
        available: db.max_attendees ? db.max_attendees - db.current_attendees : null,
        isFull: db.max_attendees ? db.current_attendees >= db.max_attendees : false,
      },
      visibility: db.is_public ? 'public' : 'private',
      createdBy: db.created_by,
      createdAt: db.created_at.toISOString(),
      updatedAt: db.updated_at.toISOString(),
    };
  };

  const toDB = (dto: Partial<EventDTO>): Partial<EventDB> => ({
    ...(dto.churchId && { church_id: dto.churchId }),
    ...(dto.title && { title: dto.title }),
    ...(dto.description !== undefined && { description: dto.description || null }),
    ...(dto.type && { event_type: dto.type }),
    ...(dto.schedule?.start && { start_date: new Date(dto.schedule.start) }),
    ...(dto.schedule?.end && { end_date: new Date(dto.schedule.end) }),
    ...(dto.location !== undefined && { location: dto.location || null }),
    ...(dto.recurring && {
      is_recurring: dto.recurring.enabled,
      recurrence_pattern: dto.recurring.pattern || null,
    }),
    ...(dto.capacity?.max !== undefined && { max_attendees: dto.capacity.max || null }),
    ...(dto.visibility && { is_public: dto.visibility === 'public' }),
    ...(dto.createdBy && { created_by: dto.createdBy }),
  });

  describe('toDTO - Database para API', () => {
    const baseEvent: EventDB = {
      id: 1,
      church_id: 5,
      title: 'Culto de Sábado',
      description: 'Culto semanal',
      event_type: 'worship',
      start_date: new Date('2024-01-20T09:00:00Z'),
      end_date: new Date('2024-01-20T12:00:00Z'),
      location: 'Templo Principal',
      is_recurring: true,
      recurrence_pattern: 'weekly',
      max_attendees: 200,
      current_attendees: 150,
      is_public: true,
      created_by: 1,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-15'),
    };

    it('deve converter campos básicos', () => {
      const dto = toDTO(baseEvent);

      expect(dto.id).toBe(1);
      expect(dto.churchId).toBe(5);
      expect(dto.title).toBe('Culto de Sábado');
      expect(dto.type).toBe('worship');
    });

    it('deve calcular duração do evento', () => {
      const dto = toDTO(baseEvent);

      expect(dto.schedule.duration).toBe(180); // 3 horas = 180 minutos
    });

    it('deve detectar evento de dia inteiro', () => {
      const allDayEvent: EventDB = {
        ...baseEvent,
        start_date: new Date('2024-01-20T00:00:00Z'),
        end_date: new Date('2024-01-21T00:00:00Z'),
      };

      const dto = toDTO(allDayEvent);

      expect(dto.schedule.isAllDay).toBe(true);
    });

    it('deve agrupar informações de recorrência', () => {
      const dto = toDTO(baseEvent);

      expect(dto.recurring.enabled).toBe(true);
      expect(dto.recurring.pattern).toBe('weekly');
    });

    it('deve calcular capacidade disponível', () => {
      const dto = toDTO(baseEvent);

      expect(dto.capacity.max).toBe(200);
      expect(dto.capacity.current).toBe(150);
      expect(dto.capacity.available).toBe(50);
      expect(dto.capacity.isFull).toBe(false);
    });

    it('deve detectar evento lotado', () => {
      const fullEvent: EventDB = {
        ...baseEvent,
        current_attendees: 200,
      };

      const dto = toDTO(fullEvent);

      expect(dto.capacity.isFull).toBe(true);
      expect(dto.capacity.available).toBe(0);
    });

    it('deve converter visibilidade', () => {
      const dto = toDTO(baseEvent);
      expect(dto.visibility).toBe('public');

      const privateEvent: EventDB = { ...baseEvent, is_public: false };
      const privateDto = toDTO(privateEvent);
      expect(privateDto.visibility).toBe('private');
    });

    it('deve omitir campos nulos', () => {
      const minimalEvent: EventDB = {
        ...baseEvent,
        description: null,
        location: null,
        recurrence_pattern: null,
        max_attendees: null,
      };

      const dto = toDTO(minimalEvent);

      expect(dto.description).toBeUndefined();
      expect(dto.location).toBeUndefined();
      expect(dto.capacity.max).toBeUndefined();
    });
  });

  describe('toDB - API para Database', () => {
    it('deve converter campos básicos', () => {
      const dto: Partial<EventDTO> = {
        churchId: 3,
        title: 'Novo Evento',
        type: 'meeting',
      };

      const db = toDB(dto);

      expect(db.church_id).toBe(3);
      expect(db.title).toBe('Novo Evento');
      expect(db.event_type).toBe('meeting');
    });

    it('deve converter datas do schedule', () => {
      const dto: Partial<EventDTO> = {
        schedule: {
          start: '2024-02-01T10:00:00Z',
          end: '2024-02-01T12:00:00Z',
          duration: 120,
          isAllDay: false,
        },
      };

      const db = toDB(dto);

      expect(db.start_date).toBeInstanceOf(Date);
      expect(db.end_date).toBeInstanceOf(Date);
    });

    it('deve converter recorrência', () => {
      const dto: Partial<EventDTO> = {
        recurring: {
          enabled: true,
          pattern: 'monthly',
        },
      };

      const db = toDB(dto);

      expect(db.is_recurring).toBe(true);
      expect(db.recurrence_pattern).toBe('monthly');
    });

    it('deve converter visibilidade para boolean', () => {
      const publicDto: Partial<EventDTO> = { visibility: 'public' };
      const privateDto: Partial<EventDTO> = { visibility: 'private' };

      expect(toDB(publicDto).is_public).toBe(true);
      expect(toDB(privateDto).is_public).toBe(false);
    });
  });

  describe('Formatações para Calendário', () => {
    it('deve formatar para FullCalendar', () => {
      const event: EventDTO = {
        id: 1,
        churchId: 1,
        title: 'Culto',
        type: 'worship',
        schedule: {
          start: '2024-01-20T09:00:00Z',
          end: '2024-01-20T12:00:00Z',
          duration: 180,
          isAllDay: false,
        },
        recurring: { enabled: false },
        capacity: { current: 0, available: null, isFull: false },
        visibility: 'public',
        createdBy: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      const toCalendarFormat = (e: EventDTO) => ({
        id: e.id.toString(),
        title: e.title,
        start: e.schedule.start,
        end: e.schedule.end,
        allDay: e.schedule.isAllDay,
        extendedProps: {
          type: e.type,
          churchId: e.churchId,
        },
      });

      const calEvent = toCalendarFormat(event);

      expect(calEvent.id).toBe('1');
      expect(calEvent.allDay).toBe(false);
      expect(calEvent.extendedProps.type).toBe('worship');
    });

    it('deve formatar para iCal', () => {
      const event = {
        id: 1,
        title: 'Reunião',
        start: new Date('2024-01-20T10:00:00Z'),
        end: new Date('2024-01-20T11:00:00Z'),
        location: 'Sala 101',
      };

      const formatDate = (d: Date) => `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

      const icalEvent = [
        'BEGIN:VEVENT',
        `DTSTART:${formatDate(event.start)}`,
        `DTEND:${formatDate(event.end)}`,
        `SUMMARY:${event.title}`,
        `LOCATION:${event.location}`,
        `UID:${event.id}@church-app.com`,
        'END:VEVENT',
      ].join('\r\n');

      expect(icalEvent).toContain('BEGIN:VEVENT');
      expect(icalEvent).toContain('SUMMARY:Reunião');
      expect(icalEvent).toContain('LOCATION:Sala 101');
    });
  });

  describe('Validações de Padrão de Recorrência', () => {
    it('deve validar padrões suportados', () => {
      const validPatterns = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'];

      const isValidPattern = (pattern: string) => validPatterns.includes(pattern);

      expect(isValidPattern('weekly')).toBe(true);
      expect(isValidPattern('invalid')).toBe(false);
    });

    it('deve calcular próximas ocorrências', () => {
      const getNextOccurrence = (start: Date, pattern: string): Date => {
        const next = new Date(start);
        switch (pattern) {
          case 'daily':
            next.setDate(next.getDate() + 1);
            break;
          case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
          case 'biweekly':
            next.setDate(next.getDate() + 14);
            break;
          case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
          case 'yearly':
            next.setFullYear(next.getFullYear() + 1);
            break;
        }
        return next;
      };

      const start = new Date('2024-01-15T12:00:00Z');

      expect(getNextOccurrence(start, 'daily').getUTCDate()).toBe(16);
      expect(getNextOccurrence(start, 'weekly').getUTCDate()).toBe(22);
    });
  });

  describe('Filtros e Ordenação', () => {
    const events: EventDTO[] = [
      {
        id: 1,
        churchId: 1,
        title: 'A',
        type: 'worship',
        schedule: {
          start: '2024-01-20T10:00:00Z',
          end: '2024-01-20T11:00:00Z',
          duration: 60,
          isAllDay: false,
        },
        recurring: { enabled: false },
        capacity: { current: 50, max: 100, available: 50, isFull: false },
        visibility: 'public',
        createdBy: 1,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 2,
        churchId: 1,
        title: 'B',
        type: 'meeting',
        schedule: {
          start: '2024-01-21T10:00:00Z',
          end: '2024-01-21T11:00:00Z',
          duration: 60,
          isAllDay: false,
        },
        recurring: { enabled: true, pattern: 'weekly' },
        capacity: { current: 10, max: 20, available: 10, isFull: false },
        visibility: 'private',
        createdBy: 1,
        createdAt: '',
        updatedAt: '',
      },
    ];

    it('deve filtrar por tipo', () => {
      const filtered = events.filter(e => e.type === 'worship');
      expect(filtered).toHaveLength(1);
    });

    it('deve filtrar por visibilidade', () => {
      const publicEvents = events.filter(e => e.visibility === 'public');
      expect(publicEvents).toHaveLength(1);
    });

    it('deve filtrar por recorrência', () => {
      const recurring = events.filter(e => e.recurring.enabled);
      expect(recurring).toHaveLength(1);
    });

    it('deve ordenar por data', () => {
      const sorted = [...events].sort(
        (a, b) => new Date(a.schedule.start).getTime() - new Date(b.schedule.start).getTime()
      );

      expect(sorted[0].id).toBe(1);
    });

    it('deve filtrar por intervalo de datas', () => {
      const startFilter = new Date('2024-01-20');
      const endFilter = new Date('2024-01-20T23:59:59Z');

      const filtered = events.filter(e => {
        const eventStart = new Date(e.schedule.start);
        return eventStart >= startFilter && eventStart <= endFilter;
      });

      expect(filtered).toHaveLength(1);
    });
  });
});
