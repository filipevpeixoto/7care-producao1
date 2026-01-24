/**
 * System Repository
 * Métodos relacionados a configurações do sistema
 */

import { eq } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import type { EventPermissions } from '../types/storage';

export class SystemRepository {
  /**
   * Busca configuração do sistema
   */
  async getConfig(key: string): Promise<unknown | null> {
    try {
      const [config] = await db
        .select()
        .from(schema.systemConfig)
        .where(eq(schema.systemConfig.key, key))
        .limit(1);
      
      return config?.value ?? null;
    } catch (error) {
      logger.error(`Erro ao buscar config ${key}:`, error);
      return null;
    }
  }

  /**
   * Salva configuração do sistema
   */
  async saveConfig(key: string, value: unknown): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(schema.systemConfig)
        .where(eq(schema.systemConfig.key, key))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.systemConfig)
          .set({
            value: value as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(schema.systemConfig.key, key));
      } else {
        await db
          .insert(schema.systemConfig)
          .values({
            key,
            value: value as Record<string, unknown>,
          });
      }
    } catch (error) {
      logger.error(`Erro ao salvar config ${key}:`, error);
      throw error;
    }
  }

  /**
   * Busca configuração de settings
   */
  async getSetting(key: string): Promise<unknown | null> {
    try {
      const [setting] = await db
        .select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.key, key))
        .limit(1);
      
      return setting?.value ?? null;
    } catch (error) {
      logger.error(`Erro ao buscar setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Salva configuração de settings
   */
  async saveSetting(key: string, value: unknown): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.key, key))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.systemSettings)
          .set({
            value: value as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(schema.systemSettings.key, key));
      } else {
        await db
          .insert(schema.systemSettings)
          .values({
            key,
            value: value as Record<string, unknown>,
          });
      }
    } catch (error) {
      logger.error(`Erro ao salvar setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Salva logo do sistema
   */
  async saveLogo(logoData: string): Promise<void> {
    await this.saveSetting('system_logo', { data: logoData });
  }

  /**
   * Busca logo do sistema
   */
  async getLogo(): Promise<string | null> {
    try {
      const result = await this.getSetting('system_logo');
      if (result && typeof result === 'object' && 'data' in result) {
        return (result as { data: string }).data;
      }
      return null;
    } catch (error) {
      logger.error('Erro ao buscar logo do sistema:', error);
      return null;
    }
  }

  /**
   * Limpa logo do sistema
   */
  async clearLogo(): Promise<void> {
    try {
      await db
        .delete(schema.systemSettings)
        .where(eq(schema.systemSettings.key, 'system_logo'));
    } catch (error) {
      logger.error('Erro ao limpar logo do sistema:', error);
      throw error;
    }
  }

  /**
   * Busca permissões de eventos
   */
  async getEventPermissions(): Promise<EventPermissions | null> {
    try {
      const [permissions] = await db
        .select()
        .from(schema.eventFilterPermissions)
        .limit(1);
      
      if (permissions?.permissions) {
        return permissions.permissions as EventPermissions;
      }
      return null;
    } catch (error) {
      logger.error('Erro ao buscar permissões de eventos:', error);
      return null;
    }
  }

  /**
   * Salva permissões de eventos
   */
  async saveEventPermissions(permissions: EventPermissions): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(schema.eventFilterPermissions)
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.eventFilterPermissions)
          .set({
            permissions: permissions as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(schema.eventFilterPermissions.id, existing[0].id));
      } else {
        await db
          .insert(schema.eventFilterPermissions)
          .values({
            permissions: permissions as unknown as Record<string, unknown>,
          });
      }
    } catch (error) {
      logger.error('Erro ao salvar permissões de eventos:', error);
      throw error;
    }
  }

  /**
   * Limpa todos os dados (para reset)
   */
  async clearAllData(): Promise<void> {
    try {
      logger.warn('Iniciando limpeza de todos os dados...');
      
      // Ordem de deleção respeitando foreign keys
      await db.delete(schema.eventParticipants);
      await db.delete(schema.prayerIntercessors);
      await db.delete(schema.messages);
      await db.delete(schema.conversationParticipants);
      await db.delete(schema.conversations);
      await db.delete(schema.relationships);
      await db.delete(schema.discipleshipRequests);
      await db.delete(schema.meetings);
      await db.delete(schema.events);
      await db.delete(schema.notifications);
      await db.delete(schema.pointActivities);
      await db.delete(schema.userAchievements);
      await db.delete(schema.userPointsHistory);
      await db.delete(schema.emotionalCheckins);
      await db.delete(schema.missionaryProfiles);
      await db.delete(schema.prayers);
      await db.delete(schema.pushSubscriptions);
      
      logger.info('Dados limpos com sucesso');
    } catch (error) {
      logger.error('Erro ao limpar dados:', error);
      throw error;
    }
  }
}

export const systemRepository = new SystemRepository();
