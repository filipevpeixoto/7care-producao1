/**
 * Emotional Check-In Repository
 * Métodos relacionados a check-ins emocionais
 */

import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import type { EmotionalCheckIn, CreateEmotionalCheckInInput } from '../types/storage';

export class EmotionalCheckInRepository {
  /**
   * Cria check-in emocional
   */
  async create(data: CreateEmotionalCheckInInput): Promise<EmotionalCheckIn> {
    try {
      const [checkIn] = await db
        .insert(schema.emotionalCheckins)
        .values({
          userId: data.userId,
          emotionalScore: data.emotionalScore ?? null,
          mood: data.mood ?? null,
          prayerRequest: data.prayerRequest ?? null,
          isPrivate: data.isPrivate ?? false,
          allowChurchMembers: data.allowChurchMembers ?? true,
          createdAt: new Date(),
        })
        .returning();
      return this.mapRecord(checkIn);
    } catch (error) {
      logger.error('Erro ao criar emotional check-in:', error);
      throw error;
    }
  }

  /**
   * Busca todos os check-ins (para admin)
   */
  async getAll(): Promise<EmotionalCheckIn[]> {
    try {
      const checkIns = await db
        .select()
        .from(schema.emotionalCheckins)
        .orderBy(desc(schema.emotionalCheckins.createdAt));
      return checkIns.map(checkIn => this.mapRecord(checkIn));
    } catch (error) {
      logger.error('Erro ao buscar check-ins emocionais para admin:', error);
      return [];
    }
  }

  /**
   * Busca check-ins por IDs de usuários (para filtro por distrito)
   */
  async getByUserIds(userIds: number[]): Promise<EmotionalCheckIn[]> {
    try {
      if (userIds.length === 0) return [];
      const checkIns = await db
        .select()
        .from(schema.emotionalCheckins)
        .where(inArray(schema.emotionalCheckins.userId, userIds))
        .orderBy(desc(schema.emotionalCheckins.createdAt));
      return checkIns.map(checkIn => this.mapRecord(checkIn));
    } catch (error) {
      logger.error('Erro ao buscar check-ins por IDs de usuários:', error);
      return [];
    }
  }

  /**
   * Busca check-ins por ID do usuário
   */
  async getByUserId(userId: number): Promise<EmotionalCheckIn[]> {
    try {
      const checkIns = await db
        .select()
        .from(schema.emotionalCheckins)
        .where(eq(schema.emotionalCheckins.userId, userId))
        .orderBy(desc(schema.emotionalCheckins.createdAt));
      return checkIns.map(checkIn => this.mapRecord(checkIn));
    } catch (error) {
      logger.error('Erro ao buscar check-ins do usuário:', error);
      return [];
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
   * Mapeia registro do banco para o tipo EmotionalCheckIn
   */
  private mapRecord(record: Record<string, unknown>): EmotionalCheckIn {
    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      emotionalScore: record.emotionalScore === null || record.emotionalScore === undefined ? null : Number(record.emotionalScore),
      mood: record.mood === null || record.mood === undefined ? null : String(record.mood),
      prayerRequest: record.prayerRequest === null || record.prayerRequest === undefined ? null : String(record.prayerRequest),
      isPrivate: Boolean(record.isPrivate),
      allowChurchMembers:
        record.allowChurchMembers === null || record.allowChurchMembers === undefined ? true : Boolean(record.allowChurchMembers),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt),
    };
  }
}

export const emotionalCheckInRepository = new EmotionalCheckInRepository();
