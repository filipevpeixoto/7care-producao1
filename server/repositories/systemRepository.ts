/**
 * System Repository
 * Métodos relacionados a configurações do sistema
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import type {
  EventPermissions,
  Activity,
  CreateActivityInput,
  UpdateActivityInput,
  GoogleDriveConfig,
  GoogleCalendarConfig,
} from '../types/storage';

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
        await db.insert(schema.systemConfig).values({
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
        await db.insert(schema.systemSettings).values({
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
      await db.delete(schema.systemSettings).where(eq(schema.systemSettings.key, 'system_logo'));
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
      const [permissions] = await db.select().from(schema.eventFilterPermissions).limit(1);

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
      const existing = await db.select().from(schema.eventFilterPermissions).limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.eventFilterPermissions)
          .set({
            permissions: permissions as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(schema.eventFilterPermissions.id, existing[0].id));
      } else {
        await db.insert(schema.eventFilterPermissions).values({
          permissions: permissions as unknown as Record<string, unknown>,
        });
      }
    } catch (error) {
      logger.error('Erro ao salvar permissões de eventos:', error);
      throw error;
    }
  }

  // ========== DISTRICT SETTINGS ==========

  /**
   * Busca configuração de um distrito por chave
   */
  async getDistrictSetting(districtId: number, key: string): Promise<unknown | null> {
    try {
      const [setting] = await db
        .select()
        .from(schema.districtSettings)
        .where(
          and(
            eq(schema.districtSettings.districtId, districtId),
            eq(schema.districtSettings.key, key)
          )
        )
        .limit(1);

      return setting?.value ?? null;
    } catch (error) {
      logger.error(`Erro ao buscar district setting ${key} para distrito ${districtId}:`, error);
      return null;
    }
  }

  /**
   * Salva configuração de um distrito por chave
   */
  async saveDistrictSetting(districtId: number, key: string, value: unknown): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(schema.districtSettings)
        .where(
          and(
            eq(schema.districtSettings.districtId, districtId),
            eq(schema.districtSettings.key, key)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.districtSettings)
          .set({
            value: value as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(schema.districtSettings.id, existing[0].id));
      } else {
        await db.insert(schema.districtSettings).values({
          districtId,
          key,
          value: value as Record<string, unknown>,
        });
      }
    } catch (error) {
      logger.error(`Erro ao salvar district setting ${key} para distrito ${districtId}:`, error);
      throw error;
    }
  }

  // ========== GOOGLE DRIVE CONFIG ==========

  /**
   * Salva configuração do Google Drive
   */
  async saveGoogleDriveConfig(config: GoogleDriveConfig): Promise<void> {
    await this.saveConfig('google_drive_config', config);
  }

  /**
   * Busca configuração do Google Drive
   */
  async getGoogleDriveConfig(): Promise<GoogleDriveConfig | null> {
    const config = await this.getConfig('google_drive_config');
    if (!config) {
      return null;
    }
    return config as GoogleDriveConfig;
  }

  // ========== GOOGLE CALENDAR CONFIG ==========

  /**
   * Salva configuração do Google Calendar para um usuário
   */
  async saveGoogleCalendarConfig(
    userId: number,
    config: Partial<GoogleCalendarConfig>
  ): Promise<void> {
    const existingConfig = await this.getGoogleCalendarConfig(userId);
    const newConfig = {
      ...existingConfig,
      ...config,
      userId,
    };
    await this.saveConfig(`google_calendar_config_${userId}`, newConfig);
  }

  /**
   * Busca configuração do Google Calendar para um usuário
   */
  async getGoogleCalendarConfig(userId: number): Promise<GoogleCalendarConfig | null> {
    const config = await this.getConfig(`google_calendar_config_${userId}`);
    if (!config) {
      return null;
    }
    return config as GoogleCalendarConfig;
  }

  // ========== ACTIVITIES (CONFIG-BASED) ==========

  /**
   * Helper para extrair atividades de config stored
   */
  private getActivitiesFromConfig(stored: unknown): Activity[] {
    if (!stored) return [];
    if (Array.isArray(stored)) {
      return stored.map((item: Record<string, unknown>) => ({
        id: Number(item.id ?? 0),
        title: String(item.title ?? ''),
        description: item.description === null || item.description === undefined ? null : String(item.description),
        imageUrl: item.imageUrl === null || item.imageUrl === undefined ? '' : String(item.imageUrl),
        date: item.date === null || item.date === undefined ? null : String(item.date),
        active: item.active === null || item.active === undefined ? true : Boolean(item.active),
        order: item.order === null || item.order === undefined ? 0 : Number(item.order),
        districtId: item.districtId === null || item.districtId === undefined ? null : Number(item.districtId),
      }));
    }
    return [];
  }

  /**
   * Busca todas as atividades (armazenadas em systemConfig)
   */
  async getAllActivities(): Promise<Activity[]> {
    const stored = await this.getConfig('activities');
    return this.getActivitiesFromConfig(stored);
  }

  /**
   * Cria atividade
   */
  async createActivity(data: CreateActivityInput & { createdBy?: number }): Promise<Activity> {
    const activities = await this.getAllActivities();
    const nextId = activities.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;

    // Buscar distrito do criador da atividade
    let districtId = null;
    if (data.createdBy) {
      try {
        const [user] = await db
          .select({ districtId: schema.users.districtId })
          .from(schema.users)
          .where(eq(schema.users.id, data.createdBy))
          .limit(1);
        districtId = user?.districtId || null;
      } catch {
        // ignore
      }
    }

    const activity: Activity = {
      id: nextId,
      title: data.title,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? '',
      date: data.date ?? null,
      active: data.active ?? true,
      order: data.order ?? activities.length,
      districtId,
    };
    const updated = [...activities, activity];
    await this.saveConfig('activities', updated);
    return activity;
  }

  /**
   * Atualiza atividade
   */
  async updateActivity(id: number, updates: UpdateActivityInput): Promise<Activity | null> {
    const activities = await this.getAllActivities();
    const index = activities.findIndex(item => Number(item.id) === id);
    if (index === -1) {
      return null;
    }
    const updatedActivity = {
      ...activities[index],
      ...updates,
      id,
    };
    activities[index] = updatedActivity;
    await this.saveConfig('activities', activities);
    return updatedActivity;
  }

  /**
   * Deleta atividade
   */
  async deleteActivity(id: number): Promise<boolean> {
    const activities = await this.getAllActivities();
    const filtered = activities.filter(item => Number(item.id) !== id);
    if (filtered.length === activities.length) {
      return false;
    }
    await this.saveConfig('activities', filtered);
    return true;
  }

  /**
   * Limpa todos os dados (para reset)
   */
  async clearAllData(): Promise<void> {
    try {
      logger.warn('Iniciando limpeza de todos os dados...');

      // Executa todas as deleções em uma única transação atômica
      await db.transaction(async (tx) => {
        // Ordem de deleção respeitando foreign keys
        await tx.delete(schema.eventParticipants);
        await tx.delete(schema.prayerIntercessors);
        await tx.delete(schema.messages);
        await tx.delete(schema.conversationParticipants);
        await tx.delete(schema.conversations);
        await tx.delete(schema.relationships);
        await tx.delete(schema.discipleshipRequests);
        await tx.delete(schema.meetings);
        await tx.delete(schema.events);
        await tx.delete(schema.notifications);
        await tx.delete(schema.pointActivities);
        await tx.delete(schema.userAchievements);
        await tx.delete(schema.userPointsHistory);
        await tx.delete(schema.emotionalCheckins);
        await tx.delete(schema.missionaryProfiles);
        await tx.delete(schema.prayers);
        await tx.delete(schema.pushSubscriptions);
        await tx.delete(schema.pastorInvites);
      });

      logger.info('Dados limpos com sucesso');
    } catch (error) {
      logger.error('Erro ao limpar dados:', error);
      throw error;
    }
  }

  /**
   * Deleta uma configuração do sistema por chave
   */
  async deleteConfig(key: string): Promise<void> {
    try {
      await db.delete(schema.systemConfig).where(eq(schema.systemConfig.key, key));
    } catch (error) {
      logger.error(`Error deleting system config ${key}:`, error);
      throw new Error(`Failed to delete system config: ${(error as Error).message}`);
    }
  }

  /**
   * Deleta uma setting do sistema por chave
   */
  async deleteSetting(key: string): Promise<void> {
    try {
      await db.delete(schema.systemSettings).where(eq(schema.systemSettings.key, key));
    } catch (error) {
      logger.error(`Error deleting system setting ${key}:`, error);
      throw new Error(`Failed to delete system setting: ${(error as Error).message}`);
    }
  }
}

export const systemRepository = new SystemRepository();
