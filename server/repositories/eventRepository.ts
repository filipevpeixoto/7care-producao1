/**
 * Event Repository
 * Métodos relacionados a eventos extraídos do NeonAdapter
 */

import { eq, desc, sql, and, gte, lte, or, like, count } from 'drizzle-orm';
import { db } from '../neonConfig';
import * as schema from '../schema';
import type { Event, InsertEvent, UpdateEvent } from '../../shared/schema';

export class EventRepository {
  /**
   * Busca todos os eventos
   */
  async getAllEvents(): Promise<Event[]> {
    try {
      const events = await db.select().from(schema.events).orderBy(desc(schema.events.date));
      return events.map(this.mapEventRecord);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      return [];
    }
  }

  /**
   * Busca evento por ID
   */
  async getEventById(id: number): Promise<Event | null> {
    try {
      const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
      return event ? this.mapEventRecord(event) : null;
    } catch (error) {
      console.error('Erro ao buscar evento por ID:', error);
      return null;
    }
  }

  /**
   * Cria novo evento
   */
  async createEvent(eventData: InsertEvent): Promise<Event> {
    try {
      const [event] = await db.insert(schema.events).values({
        title: (eventData as any).title || 'Evento',
        type: (eventData as any).type || 'general',
        date: (eventData as any).date ? new Date((eventData as any).date) : new Date(),
        description: (eventData as any).description,
        endDate: (eventData as any).endDate ? new Date((eventData as any).endDate) : null,
        location: (eventData as any).location,
        churchId: (eventData as any).churchId,
        createdBy: (eventData as any).createdBy,
        isRecurring: (eventData as any).isRecurring || false,
        recurrencePattern: (eventData as any).recurrencePattern,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any).returning();
      return this.mapEventRecord(event);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      throw error;
    }
  }

  /**
   * Atualiza evento
   */
  async updateEvent(id: number, eventData: UpdateEvent): Promise<Event | null> {
    try {
      const { createdAt, ...data } = eventData as Record<string, unknown>;
      // Converter date se for string
      if (data.date && typeof data.date === 'string') {
        data.date = new Date(data.date);
      }
      const [event] = await db
        .update(schema.events)
        .set({
          ...data,
          updatedAt: new Date()
        } as Record<string, unknown>)
        .where(eq(schema.events.id, id))
        .returning();
      return event ? this.mapEventRecord(event) : null;
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
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
      console.error('Erro ao deletar evento:', error);
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
      console.error('Erro ao buscar eventos por período:', error);
      return [];
    }
  }

  /**
   * Busca eventos por igreja
   */
  async getEventsByChurch(churchIdOrName: string | number): Promise<Event[]> {
    try {
      const churchId = typeof churchIdOrName === 'number' 
        ? churchIdOrName 
        : parseInt(churchIdOrName, 10);
      const events = await db
        .select()
        .from(schema.events)
        .where(eq(schema.events.churchId, churchId))
        .orderBy(desc(schema.events.date));
      return events.map(this.mapEventRecord);
    } catch (error) {
      console.error('Erro ao buscar eventos por igreja:', error);
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
      console.error('Erro ao buscar eventos por tipo:', error);
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
      console.error('Erro ao buscar próximos eventos:', error);
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
      console.error('Erro ao contar eventos:', error);
      return 0;
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
      date: record.date instanceof Date 
        ? record.date.toISOString() 
        : String(record.date || ''),
      time: record.time as string | undefined,
      location: record.location as string | null | undefined,
      type: record.type as string | undefined,
      church: record.church as string | undefined,
      churchId: record.churchId as number | null | undefined,
      districtId: record.districtId as number | null | undefined,
      createdBy: record.createdBy as number | null | undefined,
      isRecurring: record.isRecurring as boolean | undefined,
      recurrencePattern: record.recurrencePattern as string | null | undefined,
      createdAt: record.createdAt instanceof Date 
        ? record.createdAt.toISOString() 
        : record.createdAt as string | undefined,
      updatedAt: record.updatedAt instanceof Date 
        ? record.updatedAt.toISOString() 
        : record.updatedAt as string | undefined,
    };
  }
}

export const eventRepository = new EventRepository();
export default eventRepository;
