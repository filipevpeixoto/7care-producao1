/**
 * Módulo de Storage para Eventos
 */

import { db } from '../neonConfig';
import { schema } from '../schema';
import { eq, desc } from 'drizzle-orm';
import type { Event } from '../../shared/schema';
import type { CreateEventInput, UpdateEventInput, EventPermissions } from '../types/storage';

export async function getAllEvents(): Promise<Event[]> {
  try {
    const result = await db.select({
      id: schema.events.id,
      title: schema.events.title,
      description: schema.events.description,
      date: schema.events.date,
      endDate: schema.events.endDate,
      location: schema.events.location,
      type: schema.events.type,
      color: schema.events.color,
      capacity: schema.events.capacity,
      isRecurring: schema.events.isRecurring,
      recurrencePattern: schema.events.recurrencePattern,
      createdBy: schema.events.createdBy,
      churchId: schema.events.churchId,
      createdAt: schema.events.createdAt,
      updatedAt: schema.events.updatedAt
    }).from(schema.events).orderBy(desc(schema.events.date));
    
    return result as unknown as Event[];
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    return [];
  }
}

export async function getEventById(id: number): Promise<Event | null> {
  try {
    const result = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
    return (result[0] || null) as unknown as Event | null;
  } catch (error) {
    console.error('Erro ao buscar evento por ID:', error);
    return null;
  }
}

export async function createEvent(eventData: CreateEventInput): Promise<Event> {
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
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.insert(schema.events).values(newEvent as typeof schema.events.$inferInsert).returning();
    return result[0] as unknown as Event;
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    throw error;
  }
}

export async function updateEvent(id: number, updates: UpdateEventInput): Promise<Event | null> {
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
    if (updatesExtras.description !== undefined) dbUpdates.description = updatesExtras.description ?? null;
    if (updatesExtras.location !== undefined) dbUpdates.location = updatesExtras.location ?? null;
    if (updatesExtras.type !== undefined) dbUpdates.type = updatesExtras.type;
    if (updatesExtras.isRecurring !== undefined) dbUpdates.isRecurring = updatesExtras.isRecurring;
    if (updatesExtras.recurrencePattern !== undefined) dbUpdates.recurrencePattern = updatesExtras.recurrencePattern ?? null;
    if (updatesExtras.maxParticipants !== undefined) dbUpdates.capacity = updatesExtras.maxParticipants ?? null;
    if (updatesExtras.capacity !== undefined) dbUpdates.capacity = updatesExtras.capacity ?? null;
    if (updatesExtras.organizerId !== undefined) dbUpdates.createdBy = updatesExtras.organizerId ?? null;
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
    console.error('Erro ao atualizar evento:', error);
    return null;
  }
}

export async function deleteEvent(id: number): Promise<boolean> {
  try {
    await db.delete(schema.events).where(eq(schema.events.id, id));
    return true;
  } catch (error) {
    console.error('Erro ao deletar evento:', error);
    return false;
  }
}

export async function clearAllEvents(): Promise<boolean> {
  try {
    await db.delete(schema.events);
    return true;
  } catch (error) {
    console.error('Erro ao limpar eventos:', error);
    return false;
  }
}

// Permissões de eventos são salvas em system_configs
export async function getEventPermissions(): Promise<EventPermissions | null> {
  // Implementado via getSystemConfig
  return null;
}

export async function saveEventPermissions(_permissions: EventPermissions): Promise<void> {
  // Implementado via saveSystemConfig
}
