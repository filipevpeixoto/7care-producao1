/**
 * Meeting Repository
 * Métodos relacionados a reuniões e agendamentos
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import type { Meeting, MeetingType } from '../../shared/schema';
import type { CreateMeetingInput, UpdateMeetingInput } from '../types/storage';

export class MeetingRepository {
  /**
   * Busca todas as reuniões
   */
  async getAll(): Promise<Meeting[]> {
    try {
      const meetings = await db
        .select()
        .from(schema.meetings)
        .orderBy(desc(schema.meetings.scheduledAt));
      return meetings.map(this.mapRecord);
    } catch (error) {
      logger.error('Erro ao buscar reuniões:', error);
      return [];
    }
  }

  /**
   * Busca reuniões por usuário
   */
  async getByUserId(userId: number): Promise<Meeting[]> {
    try {
      const meetings = await db
        .select()
        .from(schema.meetings)
        .where(eq(schema.meetings.requesterId, userId))
        .orderBy(desc(schema.meetings.scheduledAt));
      return meetings.map(this.mapRecord);
    } catch (error) {
      logger.error('Erro ao buscar reuniões do usuário:', error);
      return [];
    }
  }

  /**
   * Busca reuniões por status
   */
  async getByStatus(status: string): Promise<Meeting[]> {
    try {
      const meetings = await db
        .select()
        .from(schema.meetings)
        .where(eq(schema.meetings.status, status))
        .orderBy(desc(schema.meetings.scheduledAt));
      return meetings.map(this.mapRecord);
    } catch (error) {
      logger.error('Erro ao buscar reuniões por status:', error);
      return [];
    }
  }

  /**
   * Busca reunião por ID
   */
  async getById(id: number): Promise<Meeting | null> {
    try {
      const [meeting] = await db
        .select()
        .from(schema.meetings)
        .where(eq(schema.meetings.id, id))
        .limit(1);
      return meeting ? this.mapRecord(meeting) : null;
    } catch (error) {
      logger.error('Erro ao buscar reunião por ID:', error);
      return null;
    }
  }

  /**
   * Cria nova reunião
   */
  async create(data: CreateMeetingInput): Promise<Meeting> {
    try {
      const [meeting] = await db
        .insert(schema.meetings)
        .values({
          title: data.title,
          description: data.description,
          scheduledAt: new Date(data.scheduledAt),
          duration: data.duration || 60,
          location: data.location,
          requesterId: data.requesterId,
          assignedToId: data.assignedToId,
          typeId: data.typeId,
          priority: data.priority || 'medium',
          isUrgent: data.isUrgent || false,
          status: data.status || 'pending',
          notes: data.notes,
        })
        .returning();
      return this.mapRecord(meeting);
    } catch (error) {
      logger.error('Erro ao criar reunião:', error);
      throw error;
    }
  }

  /**
   * Atualiza reunião
   */
  async update(id: number, updates: UpdateMeetingInput): Promise<Meeting | null> {
    try {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.scheduledAt) {
        updateData.scheduledAt = new Date(updates.scheduledAt);
      }
      updateData.updatedAt = new Date();

      const [meeting] = await db
        .update(schema.meetings)
        .set(updateData)
        .where(eq(schema.meetings.id, id))
        .returning();
      return meeting ? this.mapRecord(meeting) : null;
    } catch (error) {
      logger.error('Erro ao atualizar reunião:', error);
      return null;
    }
  }

  /**
   * Deleta reunião
   */
  async delete(id: number): Promise<boolean> {
    try {
      await db
        .delete(schema.meetings)
        .where(eq(schema.meetings.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar reunião:', error);
      return false;
    }
  }

  /**
   * Busca todos os tipos de reunião
   */
  async getMeetingTypes(): Promise<MeetingType[]> {
    try {
      const types = await db
        .select()
        .from(schema.meetingTypes)
        .orderBy(schema.meetingTypes.name);
      return types.map(this.mapMeetingTypeRecord);
    } catch (error) {
      logger.error('Erro ao buscar tipos de reunião:', error);
      return [];
    }
  }

  /**
   * Mapeia registro do banco para o tipo Meeting
   */
  private mapRecord(record: Record<string, unknown>): Meeting {
    return {
      id: Number(record.id),
      title: String(record.title || ''),
      description: record.description ? String(record.description) : null,
      scheduledAt: record.scheduledAt instanceof Date 
        ? record.scheduledAt.toISOString() 
        : String(record.scheduledAt || ''),
      duration: Number(record.duration || 60),
      location: record.location ? String(record.location) : null,
      requesterId: record.requesterId ? Number(record.requesterId) : undefined,
      assignedToId: record.assignedToId ? Number(record.assignedToId) : undefined,
      typeId: record.typeId ? Number(record.typeId) : undefined,
      priority: String(record.priority || 'medium'),
      isUrgent: Boolean(record.isUrgent),
      status: String(record.status || 'pending'),
      notes: record.notes ? String(record.notes) : undefined,
      createdAt: record.createdAt instanceof Date 
        ? record.createdAt.toISOString() 
        : String(record.createdAt || ''),
      updatedAt: record.updatedAt instanceof Date 
        ? record.updatedAt.toISOString() 
        : String(record.updatedAt || ''),
    };
  }

  /**
   * Mapeia registro do banco para o tipo MeetingType
   */
  private mapMeetingTypeRecord(record: Record<string, unknown>): MeetingType {
    return {
      id: Number(record.id),
      name: String(record.name || ''),
      description: record.description ? String(record.description) : undefined,
      color: record.color ? String(record.color) : undefined,
      createdAt: record.createdAt instanceof Date 
        ? record.createdAt.toISOString() 
        : String(record.createdAt || ''),
    };
  }
}

export const meetingRepository = new MeetingRepository();
