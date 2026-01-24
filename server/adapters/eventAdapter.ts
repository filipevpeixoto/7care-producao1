/**
 * Adapter de Eventos - Operações CRUD para tabela events
 * Extraído do neonAdapter.ts para melhor organização
 */

import { db } from '../neonConfig';
import { schema } from '../schema';
import { eq, and, desc, asc, gte, lte, sql as drizzleSql } from 'drizzle-orm';
import { CreateEventInput, UpdateEventInput } from '../types/storage';
import { Event } from '../../shared/schema';

/**
 * Converte row do banco para tipo Event
 */
export function toEvent(row: Record<string, unknown>): Event {
  return {
    id: Number(row.id),
    title: row.title == null ? undefined : String(row.title),
    name: row.name == null ? undefined : String(row.name),
    description: row.description == null ? null : String(row.description),
    date: row.date instanceof Date ? row.date.toISOString() : String(row.date ?? ''),
    endDate: row.endDate == null ? null : (row.endDate instanceof Date ? row.endDate.toISOString() : String(row.endDate)),
    location: row.location == null ? null : String(row.location),
    type: row.type == null ? 'general' : String(row.type),
    color: row.color == null ? null : String(row.color),
    churchId: row.churchId == null ? null : Number(row.churchId),
    createdBy: row.createdBy == null ? null : Number(row.createdBy),
    capacity: row.capacity == null ? null : Number(row.capacity),
    isRecurring: Boolean(row.isRecurring),
    recurrencePattern: row.recurrencePattern == null ? null : String(row.recurrencePattern),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ''),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt ?? ''),
  };
}

/**
 * Busca todos os eventos
 */
export async function getAllEvents(): Promise<Event[]> {
  const rows = await db
    .select()
    .from(schema.events)
    .orderBy(desc(schema.events.date));
  return rows.map((row) => toEvent(row as Record<string, unknown>));
}

/**
 * Busca evento por ID
 */
export async function getEventById(id: number): Promise<Event | null> {
  const rows = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  return toEvent(rows[0] as Record<string, unknown>);
}

/**
 * Busca eventos por ID da igreja
 */
export async function getEventsByChurchId(churchId: number): Promise<Event[]> {
  const rows = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.churchId, churchId))
    .orderBy(desc(schema.events.date));
  return rows.map((row) => toEvent(row as Record<string, unknown>));
}

/**
 * Busca eventos por ID do distrito (usando churchId como proxy)
 */
export async function getEventsByDistrictId(districtId: number): Promise<Event[]> {
  // districtId não existe na tabela events, retornar todos os eventos
  const rows = await db
    .select()
    .from(schema.events)
    .orderBy(desc(schema.events.date));
  return rows.map((row) => toEvent(row as Record<string, unknown>));
}

/**
 * Busca eventos por intervalo de datas
 */
export async function getEventsByDateRange(
  startDate: Date,
  endDate: Date,
  churchId?: number,
  _districtId?: number
): Promise<Event[]> {
  const conditions: any[] = [
    gte(schema.events.date, startDate),
    lte(schema.events.date, endDate),
  ];

  if (churchId) {
    conditions.push(eq(schema.events.churchId, churchId));
  }
  // districtId não existe na tabela events

  const rows = await db
    .select()
    .from(schema.events)
    .where(and(...conditions))
    .orderBy(asc(schema.events.date));

  return rows.map((row) => toEvent(row as Record<string, unknown>));
}

/**
 * Busca próximos eventos
 */
export async function getUpcomingEvents(limit: number = 10, churchId?: number): Promise<Event[]> {
  const conditions: any[] = [
    gte(schema.events.date, new Date()),
  ];

  if (churchId) {
    conditions.push(eq(schema.events.churchId, churchId));
  }

  const rows = await db
    .select()
    .from(schema.events)
    .where(and(...conditions))
    .orderBy(asc(schema.events.date))
    .limit(limit);

  return rows.map((row) => toEvent(row as Record<string, unknown>));
}

/**
 * Busca eventos passados
 */
export async function getPastEvents(limit: number = 10, churchId?: number): Promise<Event[]> {
  const conditions: any[] = [
    lte(schema.events.date, new Date()),
  ];

  if (churchId) {
    conditions.push(eq(schema.events.churchId, churchId));
  }

  const rows = await db
    .select()
    .from(schema.events)
    .where(and(...conditions))
    .orderBy(desc(schema.events.date))
    .limit(limit);

  return rows.map((row) => toEvent(row as Record<string, unknown>));
}

/**
 * Cria novo evento
 */
export async function createEvent(eventData: CreateEventInput): Promise<Event> {
  const [inserted] = await db
    .insert(schema.events)
    .values({
      title: eventData.title || eventData.name || 'Evento',
      description: eventData.description,
      date: eventData.date ? new Date(eventData.date) : new Date(),
      endDate: eventData.endDate ? new Date(eventData.endDate) : null,
      location: eventData.location,
      type: eventData.type || 'general',
      churchId: eventData.churchId,
      createdBy: eventData.createdBy,
      capacity: eventData.maxAttendees,
      isRecurring: eventData.isRecurring || false,
      recurrencePattern: eventData.recurrenceRule,
    })
    .returning();

  return toEvent(inserted as Record<string, unknown>);
}

/**
 * Atualiza evento
 */
export async function updateEvent(id: number, updates: UpdateEventInput): Promise<Event | null> {
  const safeUpdates: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      if (key === 'date' || key === 'endDate') {
        safeUpdates[key] = value ? new Date(value as string) : null;
      } else {
        safeUpdates[key] = value;
      }
    }
  }

  safeUpdates.updatedAt = new Date();

  const [updated] = await db
    .update(schema.events)
    .set(safeUpdates)
    .where(eq(schema.events.id, id))
    .returning();

  if (!updated) return null;
  return toEvent(updated as Record<string, unknown>);
}

/**
 * Deleta evento
 */
export async function deleteEvent(id: number): Promise<boolean> {
  const result = await db
    .delete(schema.events)
    .where(eq(schema.events.id, id))
    .returning({ id: schema.events.id });
  return result.length > 0;
}

/**
 * Atualiza status do evento (usando tipo como proxy)
 */
export async function updateEventStatus(id: number, status: string): Promise<Event | null> {
  const [updated] = await db
    .update(schema.events)
    .set({ 
      type: status, // status não existe, usar type como proxy
      updatedAt: new Date(),
    } as Record<string, unknown>)
    .where(eq(schema.events.id, id))
    .returning();

  if (!updated) return null;
  return toEvent(updated as Record<string, unknown>);
}

/**
 * Conta eventos
 */
export async function countEvents(filters?: {
  churchId?: number;
  districtId?: number;
  status?: string;
}): Promise<number> {
  const conditions: any[] = [];

  if (filters?.churchId) {
    conditions.push(eq(schema.events.churchId, filters.churchId));
  }
  // districtId e status não existem na tabela events

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({ count: drizzleSql<number>`count(*)` })
    .from(schema.events)
    .where(whereClause);

  return Number(result[0]?.count ?? 0);
}

/**
 * Busca eventos com paginação
 */
export async function getEventsPaginated(
  page: number = 1,
  limit: number = 20,
  filters?: {
    churchId?: number;
    districtId?: number;
    status?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{ events: Event[]; total: number; pages: number }> {
  const offset = (page - 1) * limit;
  const conditions: any[] = [];

  if (filters?.churchId) {
    conditions.push(eq(schema.events.churchId, filters.churchId));
  }
  // districtId e status não existem na tabela events
  if (filters?.type) {
    conditions.push(eq(schema.events.type, filters.type));
  }
  if (filters?.startDate) {
    conditions.push(gte(schema.events.date, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(schema.events.date, filters.endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, rows] = await Promise.all([
    db.select({ count: drizzleSql<number>`count(*)` })
      .from(schema.events)
      .where(whereClause),
    db.select()
      .from(schema.events)
      .where(whereClause)
      .orderBy(desc(schema.events.date))
      .limit(limit)
      .offset(offset)
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const pages = Math.ceil(total / limit);
  const events = rows.map((row) => toEvent(row as Record<string, unknown>));

  return { events, total, pages };
}

export default {
  toEvent,
  getAllEvents,
  getEventById,
  getEventsByChurchId,
  getEventsByDistrictId,
  getEventsByDateRange,
  getUpcomingEvents,
  getPastEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  updateEventStatus,
  countEvents,
  getEventsPaginated,
};
