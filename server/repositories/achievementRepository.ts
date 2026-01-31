/**
 * Achievement Repository
 * Gerencia operações de conquistas (gamificação) no banco de dados
 */

import { eq } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import type { Achievement } from '../../shared/schema';

export class AchievementRepository {
  /**
   * Busca todas as conquistas
   */
  async getAll(): Promise<Achievement[]> {
    try {
      const achievements = await db.select().from(schema.achievements);
      return achievements.map(a => this.mapRecord(a));
    } catch (error) {
      logger.error('Erro ao buscar conquistas:', error);
      return [];
    }
  }

  /**
   * Busca todas as conquistas ativas
   * Nota: filtra em memória pois isActive não existe no schema atual
   */
  async getActive(): Promise<Achievement[]> {
    try {
      const achievements = await db.select().from(schema.achievements);
      return achievements.map(a => this.mapRecord(a)).filter(a => a.isActive !== false);
    } catch (error) {
      logger.error('Erro ao buscar conquistas ativas:', error);
      return [];
    }
  }

  /**
   * Busca conquista por ID
   */
  async getById(id: number): Promise<Achievement | null> {
    try {
      const [achievement] = await db
        .select()
        .from(schema.achievements)
        .where(eq(schema.achievements.id, id))
        .limit(1);
      return achievement ? this.mapRecord(achievement) : null;
    } catch (error) {
      logger.error('Erro ao buscar conquista por ID:', error);
      return null;
    }
  }

  /**
   * Cria uma nova conquista
   */
  async create(data: Partial<Achievement>): Promise<Achievement> {
    try {
      const [achievement] = await db
        .insert(schema.achievements)
        .values({
          name: data.name ?? '',
          description: data.description ?? null,
          pointsRequired: data.requiredPoints ?? data.pointsRequired ?? 0,
          icon: data.icon ?? null,
          createdAt: new Date(),
        })
        .returning();
      return this.mapRecord(achievement);
    } catch (error) {
      logger.error('Erro ao criar conquista:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma conquista
   */
  async update(id: number, updates: Partial<Achievement>): Promise<Achievement | null> {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description ?? null;
      if (updates.requiredPoints !== undefined) dbUpdates.pointsRequired = updates.requiredPoints;
      if (updates.pointsRequired !== undefined) dbUpdates.pointsRequired = updates.pointsRequired;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon ?? null;
      if (updates.isActive !== undefined) dbUpdates.isActive = updates.isActive;

      const [achievement] = await db
        .update(schema.achievements)
        .set(dbUpdates)
        .where(eq(schema.achievements.id, id))
        .returning();
      return achievement ? this.mapRecord(achievement) : null;
    } catch (error) {
      logger.error('Erro ao atualizar conquista:', error);
      return null;
    }
  }

  /**
   * Deleta uma conquista
   */
  async delete(id: number): Promise<boolean> {
    try {
      await db.delete(schema.achievements).where(eq(schema.achievements.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar conquista:', error);
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
   * Mapeia registro do banco para o tipo Achievement
   */
  private mapRecord(record: Record<string, unknown>): Achievement {
    return {
      id: Number(record.id),
      name: record.name == null ? '' : String(record.name),
      description: record.description == null ? '' : String(record.description),
      icon: record.icon == null ? '' : String(record.icon),
      requiredPoints: Number(record.pointsRequired ?? record.requiredPoints ?? 0),
      pointsRequired: Number(record.pointsRequired ?? record.requiredPoints ?? 0),
      requiredConditions:
        record.requiredConditions == null ? '' : String(record.requiredConditions),
      badgeColor: record.badgeColor == null ? '' : String(record.badgeColor),
      isActive: record.isActive == null ? true : Boolean(record.isActive),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt),
    };
  }
}

export const achievementRepository = new AchievementRepository();
