/**
 * Prayer Repository
 * Métodos relacionados a orações e intercessores
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import type { User } from '../../shared/schema';
import type { Prayer, CreatePrayerInput } from '../types/storage';

export class PrayerRepository {
  /**
   * Busca todas as orações
   */
  async getAll(): Promise<Prayer[]> {
    try {
      const prayers = await db
        .select()
        .from(schema.prayers)
        .orderBy(desc(schema.prayers.createdAt));
      return prayers.map(this.mapRecord);
    } catch (error) {
      logger.error('Erro ao buscar orações:', error);
      return [];
    }
  }

  /**
   * Busca oração por ID
   */
  async getById(id: number): Promise<Prayer | null> {
    try {
      const [prayer] = await db
        .select()
        .from(schema.prayers)
        .where(eq(schema.prayers.id, id))
        .limit(1);
      return prayer ? this.mapRecord(prayer) : null;
    } catch (error) {
      logger.error('Erro ao buscar oração por ID:', error);
      return null;
    }
  }

  /**
   * Cria nova oração
   */
  async create(data: CreatePrayerInput): Promise<Prayer> {
    try {
      const [prayer] = await db
        .insert(schema.prayers)
        .values({
          title: data.title,
          description: data.description,
          requesterId: data.userId,
          isPrivate: !data.isPublic,
          status: 'active',
        })
        .returning();
      return this.mapRecord(prayer);
    } catch (error) {
      logger.error('Erro ao criar oração:', error);
      throw error;
    }
  }

  /**
   * Marca oração como respondida
   */
  async markAsAnswered(id: number, _testimony?: string): Promise<Prayer | null> {
    try {
      const [prayer] = await db
        .update(schema.prayers)
        .set({
          status: 'answered',
          updatedAt: new Date(),
        })
        .where(eq(schema.prayers.id, id))
        .returning();
      return prayer ? this.mapRecord(prayer) : null;
    } catch (error) {
      logger.error('Erro ao marcar oração como respondida:', error);
      return null;
    }
  }

  /**
   * Deleta oração
   */
  async delete(id: number): Promise<boolean> {
    try {
      // Primeiro deleta os intercessores
      await db.delete(schema.prayerIntercessors).where(eq(schema.prayerIntercessors.prayerId, id));

      // Depois deleta a oração
      await db.delete(schema.prayers).where(eq(schema.prayers.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar oração:', error);
      return false;
    }
  }

  /**
   * Adiciona intercessor à oração
   */
  async addIntercessor(prayerId: number, userId: number): Promise<boolean> {
    try {
      await db.insert(schema.prayerIntercessors).values({
        prayerId,
        userId,
      });
      return true;
    } catch (error) {
      logger.error('Erro ao adicionar intercessor:', error);
      return false;
    }
  }

  /**
   * Remove intercessor da oração
   */
  async removeIntercessor(prayerId: number, userId: number): Promise<boolean> {
    try {
      await db
        .delete(schema.prayerIntercessors)
        .where(
          and(
            eq(schema.prayerIntercessors.prayerId, prayerId),
            eq(schema.prayerIntercessors.userId, userId)
          )
        );
      return true;
    } catch (error) {
      logger.error('Erro ao remover intercessor:', error);
      return false;
    }
  }

  /**
   * Busca intercessores de uma oração
   */
  async getIntercessors(prayerId: number): Promise<User[]> {
    try {
      const result = await db
        .select({
          user: schema.users,
        })
        .from(schema.prayerIntercessors)
        .innerJoin(schema.users, eq(schema.prayerIntercessors.userId, schema.users.id))
        .where(eq(schema.prayerIntercessors.prayerId, prayerId));

      return result.map(r => this.mapUserRecord(r.user));
    } catch (error) {
      logger.error('Erro ao buscar intercessores:', error);
      return [];
    }
  }

  /**
   * Busca orações que um usuário está orando
   */
  async getPrayersUserIsPrayingFor(userId: number): Promise<Prayer[]> {
    try {
      const result = await db
        .select({
          prayer: schema.prayers,
        })
        .from(schema.prayerIntercessors)
        .innerJoin(schema.prayers, eq(schema.prayerIntercessors.prayerId, schema.prayers.id))
        .where(eq(schema.prayerIntercessors.userId, userId));

      return result.map(r => this.mapRecord(r.prayer));
    } catch (error) {
      logger.error('Erro ao buscar orações do usuário:', error);
      return [];
    }
  }

  /**
   * Mapeia registro do banco para o tipo Prayer
   */
  private mapRecord(record: Record<string, unknown>): Prayer {
    const isAnswered = record.status === 'answered';
    const createdAt =
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : String(record.createdAt || '');
    const updatedAt =
      record.updatedAt instanceof Date
        ? record.updatedAt.toISOString()
        : String(record.updatedAt || '');

    return {
      id: Number(record.id),
      userId: Number(record.requesterId),
      title: String(record.title || ''),
      description: record.description ? String(record.description) : null,
      isPublic: record.isPrivate === null ? true : !record.isPrivate,
      isAnswered,
      answeredAt: isAnswered ? updatedAt : null,
      testimony: null,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Mapeia registro de usuário
   */
  private mapUserRecord(record: Record<string, unknown>): User {
    return {
      id: Number(record.id),
      name: String(record.name || ''),
      email: String(record.email || ''),
      password: '',
      role: String(record.role || 'member') as User['role'],
      church: record.church ? String(record.church) : null,
      churchCode: record.churchCode ? String(record.churchCode) : '',
      createdAt:
        record.createdAt instanceof Date
          ? record.createdAt.toISOString()
          : String(record.createdAt || ''),
      updatedAt:
        record.updatedAt instanceof Date
          ? record.updatedAt.toISOString()
          : String(record.updatedAt || ''),
    } as User;
  }
}

export const prayerRepository = new PrayerRepository();
