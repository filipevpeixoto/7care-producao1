/**
 * Relationship Repository
 * Métodos relacionados a relacionamentos entre usuários
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import type { Relationship } from '../../shared/schema';
import type { CreateRelationshipInput } from '../types/storage';

export class RelationshipRepository {
  /**
   * Busca todos os relacionamentos
   */
  async getAll(): Promise<Relationship[]> {
    try {
      const relationships = await db
        .select()
        .from(schema.relationships)
        .orderBy(desc(schema.relationships.createdAt));
      return relationships.map(this.mapRecord);
    } catch (error) {
      logger.error('Erro ao buscar relacionamentos:', error);
      return [];
    }
  }

  /**
   * Busca relacionamentos por missionário
   */
  async getByMissionary(missionaryId: number): Promise<Relationship[]> {
    try {
      const relationships = await db
        .select()
        .from(schema.relationships)
        .where(eq(schema.relationships.missionaryId, missionaryId))
        .orderBy(desc(schema.relationships.createdAt));
      return relationships.map(this.mapRecord);
    } catch (error) {
      logger.error('Erro ao buscar relacionamentos do missionário:', error);
      return [];
    }
  }

  /**
   * Busca relacionamentos por interessado
   */
  async getByInterested(interestedId: number): Promise<Relationship[]> {
    try {
      const relationships = await db
        .select()
        .from(schema.relationships)
        .where(eq(schema.relationships.interestedId, interestedId))
        .orderBy(desc(schema.relationships.createdAt));
      return relationships.map(this.mapRecord);
    } catch (error) {
      logger.error('Erro ao buscar relacionamentos do interessado:', error);
      return [];
    }
  }

  /**
   * Busca relacionamento por ID
   */
  async getById(id: number): Promise<Relationship | null> {
    try {
      const [relationship] = await db
        .select()
        .from(schema.relationships)
        .where(eq(schema.relationships.id, id))
        .limit(1);
      return relationship ? this.mapRecord(relationship) : null;
    } catch (error) {
      logger.error('Erro ao buscar relacionamento por ID:', error);
      return null;
    }
  }

  /**
   * Cria novo relacionamento
   */
  async create(data: CreateRelationshipInput): Promise<Relationship> {
    try {
      const [relationship] = await db
        .insert(schema.relationships)
        .values({
          interestedId: data.interestedId,
          missionaryId: data.missionaryId,
          status: data.status || 'pending',
          notes: data.notes,
        })
        .returning();
      return this.mapRecord(relationship);
    } catch (error) {
      logger.error('Erro ao criar relacionamento:', error);
      throw error;
    }
  }

  /**
   * Atualiza relacionamento
   */
  async update(id: number, updates: Partial<Relationship>): Promise<Relationship | null> {
    try {
      const [relationship] = await db
        .update(schema.relationships)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(schema.relationships.id, id))
        .returning();
      return relationship ? this.mapRecord(relationship) : null;
    } catch (error) {
      logger.error('Erro ao atualizar relacionamento:', error);
      return null;
    }
  }

  /**
   * Deleta relacionamento
   */
  async delete(id: number): Promise<boolean> {
    try {
      await db
        .delete(schema.relationships)
        .where(eq(schema.relationships.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar relacionamento:', error);
      return false;
    }
  }

  /**
   * Deleta relacionamento por interessado
   */
  async deleteByInterested(interestedId: number): Promise<boolean> {
    try {
      await db
        .delete(schema.relationships)
        .where(eq(schema.relationships.interestedId, interestedId));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar relacionamentos do interessado:', error);
      return false;
    }
  }

  /**
   * Mapeia registro do banco para o tipo Relationship
   */
  private mapRecord(record: Record<string, unknown>): Relationship {
    return {
      id: Number(record.id),
      interestedId: record.interestedId ? Number(record.interestedId) : undefined,
      missionaryId: record.missionaryId ? Number(record.missionaryId) : undefined,
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
}

export const relationshipRepository = new RelationshipRepository();
