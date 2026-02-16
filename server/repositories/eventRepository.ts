/**
 * Event Repository
 * Métodos relacionados a eventos extraídos do NeonAdapter
 */

import { eq, desc, and, gte, lte, count } from 'drizzle-orm';
import { db } from '../neonConfig';
import * as schema from '../schema';
import type { Event, InsertEvent, UpdateEvent } from '../../shared/schema';
import type { CreateEventInput, UpdateEventInput } from '../types/storage';
import { logger } from '../utils/logger';

export class EventRepository {
  /**
   * Busca todos os eventos
   */
  async getAllEvents(): Promise<Event[]> {
    try {
      const events = await db.select().from(schema.events).orderBy(desc(schema.events.date));
      return events.map(this.mapEventRecord);
    } catch (error) {
      logger.error('Erro ao buscar eventos', error);
      return [];
    }
  }

  /**
   * Busca eventos por distrito
   */
  async getEventsByDistrict(districtId: number): Promise<Event[]> {
    try {
      const events = await db
        .select()
        .from(schema.events)
        .where(eq(schema.events.districtId, districtId))
        .orderBy(desc(schema.events.date));
      return events.map(this.mapEventRecord);
    } catch (error) {
      logger.error('Erro ao buscar eventos por distrito', error);
      return [];
    }
  }

  /**
   * Busca evento por ID
   */
  async getEventById(id: number): Promise<Event | null> {
    try {
      const [event] = await db
        .select()
        .from(schema.events)
        .where(eq(schema.events.id, id))
        .limit(1);
      return event ? this.mapEventRecord(event) : null;
    } catch (error) {
      logger.error('Erro ao buscar evento por ID', error);
      return null;
    }
  }

  /**
   * Cria novo evento
   */
  async createEvent(eventData: InsertEvent): Promise<Event> {
    try {
      // Construir dados de inserção tipados
      const insertData: Record<string, unknown> = {
        title: eventData.title ?? 'Evento',
        type: eventData.type ?? 'general',
        date: eventData.date ? new Date(String(eventData.date)) : new Date(),
        description: eventData.description ?? null,
        endDate: eventData.endDate ? new Date(String(eventData.endDate)) : null,
        location: eventData.location ?? null,
        churchId: eventData.churchId ?? null,
        districtId: (eventData as Record<string, unknown>).districtId ?? null,
        createdBy: eventData.createdBy ?? null,
        isRecurring: eventData.isRecurring ?? false,
        recurrencePattern: eventData.recurrencePattern ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [event] = await db
        .insert(schema.events)
        .values(insertData as typeof schema.events.$inferInsert)
        .returning();
      return this.mapEventRecord(event);
    } catch (error) {
      logger.error('Erro ao criar evento', error);
      throw error;
    }
  }

  /**
   * Atualiza evento
   */
  async updateEvent(id: number, eventData: UpdateEvent): Promise<Event | null> {
    try {
      const { createdAt: _createdAt, ...data } = eventData as Record<string, unknown>;
      // Converter date se for string
      if (data.date && typeof data.date === 'string') {
        data.date = new Date(data.date);
      }
      const [event] = await db
        .update(schema.events)
        .set({
          ...data,
          updatedAt: new Date(),
        } as Record<string, unknown>)
        .where(eq(schema.events.id, id))
        .returning();
      return event ? this.mapEventRecord(event) : null;
    } catch (error) {
      logger.error('Erro ao atualizar evento', error);
      return null;
    }
  }

  /**
   * Deleta evento
   */
  async deleteEvent(id: number): Promise<boolean> {
    try {
      const result = await db.delete(schema.events).where(eq(schema.events.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Erro ao deletar evento', error);
      return false;
    }
  }

  /**
   * Busca eventos por período
   */
  async getEventsByDateRange(startDate: string, endDate: string): Promise<Event[]> {
    try {
      const events = await db
        .select()
        .from(schema.events)
        .where(
          and(
            gte(schema.events.date, new Date(startDate)),
            lte(schema.events.date, new Date(endDate))
          )
        )
        .orderBy(desc(schema.events.date));
      return events.map(this.mapEventRecord);
    } catch (error) {
      logger.error('Erro ao buscar eventos por período', error);
      return [];
    }
  }

  /**
   * Busca eventos por igreja
   */
  async getEventsByChurch(churchIdOrName: string | number): Promise<Event[]> {
    try {
      const churchId =
        typeof churchIdOrName === 'number' ? churchIdOrName : parseInt(churchIdOrName, 10);
      const events = await db
        .select()
        .from(schema.events)
        .where(eq(schema.events.churchId, churchId))
        .orderBy(desc(schema.events.date));
      return events.map(this.mapEventRecord);
    } catch (error) {
      logger.error('Erro ao buscar eventos por igreja', error);
      return [];
    }
  }

  /**
   * Busca eventos por tipo
   */
  async getEventsByType(type: string): Promise<Event[]> {
    try {
      const events = await db
        .select()
        .from(schema.events)
        .where(eq(schema.events.type, type))
        .orderBy(desc(schema.events.date));
      return events.map(this.mapEventRecord);
    } catch (error) {
      logger.error('Erro ao buscar eventos por tipo', error);
      return [];
    }
  }

  /**
   * Busca próximos eventos
   */
  async getUpcomingEvents(limit: number = 10): Promise<Event[]> {
    try {
      const today = new Date();
      const events = await db
        .select()
        .from(schema.events)
        .where(gte(schema.events.date, today))
        .orderBy(schema.events.date)
        .limit(limit);
      return events.map(this.mapEventRecord);
    } catch (error) {
      logger.error('Erro ao buscar próximos eventos', error);
      return [];
    }
  }

  /**
   * Busca próximos eventos por distrito
   */
  async getUpcomingEventsByDistrict(districtId: number, limit: number = 10): Promise<Event[]> {
    try {
      const today = new Date();
      const events = await db
        .select()
        .from(schema.events)
        .where(and(gte(schema.events.date, today), eq(schema.events.districtId, districtId)))
        .orderBy(schema.events.date)
        .limit(limit);
      return events.map(this.mapEventRecord);
    } catch (error) {
      logger.error('Erro ao buscar próximos eventos por distrito', error);
      return [];
    }
  }

  /**
   * Conta total de eventos
   */
  async countEvents(): Promise<number> {
    try {
      const [result] = await db.select({ count: count() }).from(schema.events);
      return result?.count || 0;
    } catch (error) {
      logger.error('Erro ao contar eventos', error);
      return 0;
    }
  }

  /**
   * Cria evento com lógica de negócio completa (time parsing, district lookup)
   * Usado pelo NeonAdapter
   */
  async createEventFull(eventData: CreateEventInput, getUserById?: (id: number) => Promise<{ districtId?: number | null } | null>): Promise<Event> {
    try {
      const eventExtras = eventData as CreateEventInput & {
        endDate?: string | null;
        type?: string;
        organizerId?: number | null;
        maxParticipants?: number | null;
        capacity?: number | null;
        color?: string | null;
        churchId?: number | null;
        time?: string;
        districtId?: number | null;
      };
      const baseDate = new Date(eventExtras.date);
      if (eventExtras.time) {
        const [hours, minutes] = eventExtras.time.split(':');
        const parsedHours = Number(hours);
        const parsedMinutes = Number(minutes);
        if (!Number.isNaN(parsedHours)) {
          baseDate.setHours(parsedHours);
        }
        if (!Number.isNaN(parsedMinutes)) {
          baseDate.setMinutes(parsedMinutes);
        }
      }

      let districtId = eventExtras.districtId || null;
      if (!districtId && eventExtras.organizerId && getUserById) {
        const user = await getUserById(eventExtras.organizerId);
        districtId = user?.districtId || null;
      }

      const newEvent = {
        title: eventExtras.title || 'Evento',
        description: eventExtras.description ?? null,
        date: baseDate,
        endDate: eventExtras.endDate ? new Date(eventExtras.endDate) : null,
        location: eventExtras.location ?? null,
        type: eventExtras.type || 'evento',
        color: eventExtras.color ?? null,
        capacity: eventExtras.capacity ?? eventExtras.maxParticipants ?? null,
        isRecurring: eventExtras.isRecurring ?? false,
        recurrencePattern: eventExtras.recurrencePattern ?? null,
        createdBy: eventExtras.organizerId ?? null,
        churchId: eventExtras.churchId ?? null,
        districtId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db
        .insert(schema.events)
        .values(newEvent as typeof schema.events.$inferInsert)
        .returning();
      return result[0] as unknown as Event;
    } catch (error) {
      logger.error('Erro ao criar evento:', error);
      throw error;
    }
  }

  /**
   * Atualiza evento com lógica de negócio completa (field-by-field mapping)
   * Usado pelo NeonAdapter
   */
  async updateEventFull(id: number, updates: UpdateEventInput): Promise<Event | null> {
    try {
      const updatesExtras = updates as UpdateEventInput & {
        endDate?: string | null;
        type?: string;
        organizerId?: number | null;
        maxParticipants?: number | null;
        capacity?: number | null;
        color?: string | null;
        churchId?: number | null;
        time?: string;
      };
      const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };

      if (updatesExtras.title !== undefined) dbUpdates.title = updatesExtras.title;
      if (updatesExtras.description !== undefined) {
        dbUpdates.description = updatesExtras.description ?? null;
      }
      if (updatesExtras.location !== undefined) dbUpdates.location = updatesExtras.location ?? null;
      if (updatesExtras.type !== undefined) dbUpdates.type = updatesExtras.type;
      if (updatesExtras.isRecurring !== undefined) {
        dbUpdates.isRecurring = updatesExtras.isRecurring;
      }
      if (updatesExtras.recurrencePattern !== undefined) {
        dbUpdates.recurrencePattern = updatesExtras.recurrencePattern ?? null;
      }
      if (updatesExtras.maxParticipants !== undefined) {
        dbUpdates.capacity = updatesExtras.maxParticipants ?? null;
      }
      if (updatesExtras.capacity !== undefined) dbUpdates.capacity = updatesExtras.capacity ?? null;
      if (updatesExtras.organizerId !== undefined) {
        dbUpdates.createdBy = updatesExtras.organizerId ?? null;
      }
      if (updatesExtras.color !== undefined) dbUpdates.color = updatesExtras.color ?? null;
      if (updatesExtras.churchId !== undefined) dbUpdates.churchId = updatesExtras.churchId ?? null;
      if (updatesExtras.date !== undefined) {
        const nextDate = new Date(updatesExtras.date);
        if (updatesExtras.time) {
          const [hours, minutes] = updatesExtras.time.split(':');
          const parsedHours = Number(hours);
          const parsedMinutes = Number(minutes);
          if (!Number.isNaN(parsedHours)) {
            nextDate.setHours(parsedHours);
          }
          if (!Number.isNaN(parsedMinutes)) {
            nextDate.setMinutes(parsedMinutes);
          }
        }
        dbUpdates.date = nextDate;
      }
      if (updatesExtras.endDate !== undefined) {
        dbUpdates.endDate = updatesExtras.endDate ? new Date(updatesExtras.endDate) : null;
      }

      const result = await db
        .update(schema.events)
        .set(dbUpdates)
        .where(eq(schema.events.id, id))
        .returning();

      return (result[0] || null) as unknown as Event | null;
    } catch (error) {
      logger.error('Erro ao atualizar evento:', error);
      return null;
    }
  }

  /**
   * Deleta todos os eventos
   */
  async clearAllEvents(): Promise<void> {
    try {
      await db.delete(schema.events);
    } catch (error) {
      logger.error('Erro ao limpar eventos:', error);
      throw error;
    }
  }

  /**
   * Mapeia registro do banco para tipo Event
   */
  private mapEventRecord(record: Record<string, unknown>): Event {
    return {
      id: record.id as number,
      title: record.title as string | undefined,
      description: record.description as string | null | undefined,
      date: record.date instanceof Date ? record.date.toISOString() : String(record.date || ''),
      time: record.time as string | undefined,
      location: record.location as string | null | undefined,
      type: record.type as string | undefined,
      church: record.church as string | undefined,
      churchId: record.churchId as number | null | undefined,
      districtId: record.districtId as number | null | undefined,
      createdBy: record.createdBy as number | null | undefined,
      isRecurring: record.isRecurring as boolean | undefined,
      recurrencePattern: record.recurrencePattern as string | null | undefined,
      createdAt:
        record.createdAt instanceof Date
          ? record.createdAt.toISOString()
          : (record.createdAt as string | undefined),
      updatedAt:
        record.updatedAt instanceof Date
          ? record.updatedAt.toISOString()
          : (record.updatedAt as string | undefined),
    };
  }
}

export const eventRepository = new EventRepository();
export default eventRepository;
