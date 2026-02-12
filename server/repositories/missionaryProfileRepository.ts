/**
 * Missionary Profile Repository
 * CRUD operations for missionary profiles
 */

import { eq, inArray } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import { mapMissionaryProfileRecord, toUser } from '../storage/helpers';
import type { MissionaryProfile, User } from '../types/storage';

export class MissionaryProfileRepository {
  /**
   * Busca perfil missionário por ID do usuário
   */
  async getByUserId(userId: number): Promise<MissionaryProfile | null> {
    try {
      const profiles = await db
        .select()
        .from(schema.missionaryProfiles)
        .where(eq(schema.missionaryProfiles.userId, userId))
        .limit(1);
      return profiles[0] ? mapMissionaryProfileRecord(profiles[0]) : null;
    } catch (error) {
      logger.error('Erro ao buscar perfil missionário:', error);
      return null;
    }
  }

  /**
   * Busca perfil missionário por ID
   */
  async getById(id: number): Promise<MissionaryProfile | null> {
    try {
      const profiles = await db
        .select()
        .from(schema.missionaryProfiles)
        .where(eq(schema.missionaryProfiles.id, id))
        .limit(1);
      return profiles[0] ? mapMissionaryProfileRecord(profiles[0]) : null;
    } catch (error) {
      logger.error('Erro ao buscar perfil missionário por ID:', error);
      return null;
    }
  }

  /**
   * Busca todos os perfis missionários
   */
  async getAll(): Promise<MissionaryProfile[]> {
    try {
      const profiles = await db.select().from(schema.missionaryProfiles);
      return profiles.map(profile => mapMissionaryProfileRecord(profile));
    } catch (error) {
      logger.error('Erro ao buscar perfis missionários:', error);
      return [];
    }
  }

  /**
   * Cria perfil missionário
   */
  async create(data: Partial<MissionaryProfile>): Promise<MissionaryProfile> {
    try {
      const [profile] = await db
        .insert(schema.missionaryProfiles)
        .values({
          userId: data.userId,
          specialization: data.missionField ?? null,
          experience: data.notes ?? null,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return mapMissionaryProfileRecord(profile);
    } catch (error) {
      logger.error('Erro ao criar perfil missionário:', error);
      throw error;
    }
  }

  /**
   * Atualiza perfil missionário
   */
  async update(
    id: number,
    updates: Partial<MissionaryProfile>
  ): Promise<MissionaryProfile | null> {
    try {
      const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.userId !== undefined) dbUpdates.userId = updates.userId ?? null;
      if (updates.missionField !== undefined) {
        dbUpdates.specialization = updates.missionField ?? null;
      }
      if (updates.notes !== undefined) dbUpdates.experience = updates.notes ?? null;
      if (updates.isActive !== undefined) dbUpdates.isActive = updates.isActive ?? true;
      const [profile] = await db
        .update(schema.missionaryProfiles)
        .set(dbUpdates)
        .where(eq(schema.missionaryProfiles.id, id))
        .returning();
      return profile ? mapMissionaryProfileRecord(profile) : null;
    } catch (error) {
      logger.error('Erro ao atualizar perfil missionário:', error);
      return null;
    }
  }

  /**
   * Deleta perfil missionário
   */
  async delete(id: number): Promise<boolean> {
    try {
      await db.delete(schema.missionaryProfiles).where(eq(schema.missionaryProfiles.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar perfil missionário:', error);
      return false;
    }
  }

  /**
   * Busca usuários que possuem perfil missionário
   */
  async getUsersWithProfile(): Promise<User[]> {
    try {
      const profiles = await db
        .select({ userId: schema.missionaryProfiles.userId })
        .from(schema.missionaryProfiles);
      const ids = profiles.map(profile => profile.userId).filter(Boolean) as number[];
      if (ids.length === 0) {
        return [];
      }
      const users = await db.select().from(schema.users).where(inArray(schema.users.id, ids));
      return users.map(user => toUser(user));
    } catch (error) {
      logger.error('Erro ao buscar usuários com perfil missionário:', error);
      return [];
    }
  }
}

export const missionaryProfileRepository = new MissionaryProfileRepository();
