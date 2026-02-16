/**
 * Discipleship Repository
 * Métodos relacionados a pedidos de discipulado
 */

import { eq, desc } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import type { DiscipleshipRequest } from '../../shared/schema';
import type {
  CreateDiscipleshipRequestInput,
  UpdateDiscipleshipRequestInput,
} from '../types/storage';

const isNil = (value: unknown): value is null | undefined => value === null || value === undefined;

export class DiscipleshipRepository {
  /**
   * Busca todos os pedidos de discipulado
   */
  async getAll(): Promise<DiscipleshipRequest[]> {
    try {
      const requests = await db
        .select()
        .from(schema.discipleshipRequests)
        .orderBy(desc(schema.discipleshipRequests.createdAt));
      return requests.map(request => this.mapRecord(request));
    } catch (error) {
      logger.error('Erro ao buscar pedidos de discipulado:', error);
      return [];
    }
  }

  /**
   * Busca pedido de discipulado por ID
   */
  async getById(id: number): Promise<DiscipleshipRequest | null> {
    try {
      const requests = await db
        .select()
        .from(schema.discipleshipRequests)
        .where(eq(schema.discipleshipRequests.id, id))
        .limit(1);
      return requests[0] ? this.mapRecord(requests[0]) : null;
    } catch (error) {
      logger.error('Erro ao buscar pedido de discipulado por ID:', error);
      return null;
    }
  }

  /**
   * Cria pedido de discipulado
   */
  async create(data: CreateDiscipleshipRequestInput): Promise<DiscipleshipRequest> {
    try {
      const [request] = await db
        .insert(schema.discipleshipRequests)
        .values({
          interestedId: data.interestedId,
          missionaryId: data.missionaryId,
          status: data.status || 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return this.mapRecord(request);
    } catch (error) {
      logger.error('Erro ao criar pedido de discipulado:', error);
      throw error;
    }
  }

  /**
   * Atualiza pedido de discipulado
   */
  async update(
    id: number,
    updates: UpdateDiscipleshipRequestInput
  ): Promise<DiscipleshipRequest | null> {
    try {
      const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.status !== undefined) dbUpdates.status = updates.status ?? 'pending';
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes ?? null;
      if (updates.missionaryId !== undefined) dbUpdates.missionaryId = updates.missionaryId ?? null;
      if (updates.interestedId !== undefined) dbUpdates.interestedId = updates.interestedId ?? null;
      const [updated] = await db
        .update(schema.discipleshipRequests)
        .set(dbUpdates)
        .where(eq(schema.discipleshipRequests.id, id))
        .returning();
      return updated ? this.mapRecord(updated) : null;
    } catch (error) {
      logger.error('Erro ao atualizar pedido de discipulado:', error);
      return null;
    }
  }

  /**
   * Deleta pedido de discipulado
   */
  async delete(id: number): Promise<boolean> {
    try {
      await db.delete(schema.discipleshipRequests).where(eq(schema.discipleshipRequests.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar pedido de discipulado:', error);
      return false;
    }
  }

  /**
   * Converte Date para string ISO
   */
  private toDateString(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value || '');
  }

  /**
   * Mapeia registro do banco para o tipo DiscipleshipRequest
   */
  private mapRecord(record: Record<string, unknown>): DiscipleshipRequest {
    const interestedId = isNil(record.interestedId) ? undefined : Number(record.interestedId);
    const missionaryId = isNil(record.missionaryId) ? undefined : Number(record.missionaryId);
    return {
      id: Number(record.id),
      requesterId: Number(interestedId ?? 0),
      mentorId: Number(missionaryId ?? 0),
      status: isNil(record.status) ? '' : String(record.status),
      message: isNil(record.notes) ? '' : String(record.notes),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt),
      interestedId,
      missionaryId,
      notes: isNil(record.notes) ? undefined : String(record.notes),
    };
  }
}

export const discipleshipRepository = new DiscipleshipRepository();
