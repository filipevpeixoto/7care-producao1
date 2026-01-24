/**
 * Points Repository
 * Métodos relacionados a pontos, conquistas e gamificação
 */

import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { logger } from '../utils/logger';
import type { Achievement, PointActivity } from '../../shared/schema';
import type { PointsConfiguration } from '../types/storage';

// Configuração padrão de pontos
const DEFAULT_POINTS_CONFIG: PointsConfiguration = {
  activities: [
    { id: 'cadastro_completo', name: 'Cadastro Completo', points: 100, category: 'perfil' },
    { id: 'foto_perfil', name: 'Foto de Perfil', points: 50, category: 'perfil' },
    { id: 'presenca_culto', name: 'Presença no Culto', points: 20, category: 'participacao' },
    { id: 'participacao_evento', name: 'Participação em Evento', points: 30, category: 'participacao' },
    { id: 'estudo_biblico', name: 'Estudo Bíblico', points: 40, category: 'educacao' },
    { id: 'convidar_amigo', name: 'Convidar Amigo', points: 50, category: 'evangelismo' },
    { id: 'dizimo', name: 'Dízimo', points: 30, category: 'contribuicao' },
    { id: 'oferta', name: 'Oferta', points: 15, category: 'contribuicao' },
  ],
  levels: [
    { id: 'iniciante', name: 'Iniciante', minPoints: 0, maxPoints: 99 },
    { id: 'participante', name: 'Participante', minPoints: 100, maxPoints: 299 },
    { id: 'engajado', name: 'Engajado', minPoints: 300, maxPoints: 599 },
    { id: 'dedicado', name: 'Dedicado', minPoints: 600, maxPoints: 999 },
    { id: 'lider', name: 'Líder', minPoints: 1000, maxPoints: Infinity },
  ],
};

export class PointsRepository {
  /**
   * Busca configuração de pontos
   */
  async getConfiguration(): Promise<PointsConfiguration> {
    try {
      const [config] = await db
        .select()
        .from(schema.systemConfig)
        .where(eq(schema.systemConfig.key, 'points_configuration'))
        .limit(1);
      
      if (config && config.value) {
        return config.value as unknown as PointsConfiguration;
      }
      return DEFAULT_POINTS_CONFIG;
    } catch (error) {
      logger.error('Erro ao buscar configuração de pontos:', error);
      return DEFAULT_POINTS_CONFIG;
    }
  }

  /**
   * Salva configuração de pontos
   */
  async saveConfiguration(config: PointsConfiguration): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(schema.systemConfig)
        .where(eq(schema.systemConfig.key, 'points_configuration'))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.systemConfig)
          .set({
            value: config as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(schema.systemConfig.key, 'points_configuration'));
      } else {
        await db
          .insert(schema.systemConfig)
          .values({
            key: 'points_configuration',
            value: config as unknown as Record<string, unknown>,
          });
      }
    } catch (error) {
      logger.error('Erro ao salvar configuração de pontos:', error);
      throw error;
    }
  }

  /**
   * Reseta configuração para valores padrão
   */
  async resetConfiguration(): Promise<void> {
    try {
      await this.saveConfiguration(DEFAULT_POINTS_CONFIG);
    } catch (error) {
      logger.error('Erro ao resetar configuração de pontos:', error);
      throw error;
    }
  }

  /**
   * Reseta pontos de todos os usuários
   */
  async resetAllUserPoints(): Promise<{ success: boolean; message: string }> {
    try {
      await db
        .update(schema.users)
        .set({
          points: 0,
          level: 'Iniciante',
          updatedAt: new Date(),
        });
      
      return { success: true, message: 'Pontos resetados com sucesso' };
    } catch (error) {
      logger.error('Erro ao resetar pontos dos usuários:', error);
      return { success: false, message: 'Erro ao resetar pontos' };
    }
  }

  /**
   * Busca todas as atividades de pontos
   */
  async getAllActivities(): Promise<PointActivity[]> {
    try {
      const activities = await db
        .select()
        .from(schema.pointActivities)
        .orderBy(desc(schema.pointActivities.createdAt));
      return activities.map(this.mapActivityRecord);
    } catch (error) {
      logger.error('Erro ao buscar atividades de pontos:', error);
      return [];
    }
  }

  /**
   * Cria atividade de pontos
   */
  async createActivity(data: Partial<PointActivity>): Promise<PointActivity> {
    try {
      const [activity] = await db
        .insert(schema.pointActivities)
        .values({
          userId: data.userId,
          activity: data.activity || '',
          points: data.points || 0,
          description: data.description,
        })
        .returning();
      return this.mapActivityRecord(activity);
    } catch (error) {
      logger.error('Erro ao criar atividade de pontos:', error);
      throw error;
    }
  }

  /**
   * Busca todas as conquistas
   */
  async getAllAchievements(): Promise<Achievement[]> {
    try {
      const achievements = await db
        .select()
        .from(schema.achievements)
        .orderBy(schema.achievements.pointsRequired);
      return achievements.map(this.mapAchievementRecord);
    } catch (error) {
      logger.error('Erro ao buscar conquistas:', error);
      return [];
    }
  }

  /**
   * Busca conquista por ID
   */
  async getAchievementById(id: number): Promise<Achievement | null> {
    try {
      const [achievement] = await db
        .select()
        .from(schema.achievements)
        .where(eq(schema.achievements.id, id))
        .limit(1);
      return achievement ? this.mapAchievementRecord(achievement) : null;
    } catch (error) {
      logger.error('Erro ao buscar conquista por ID:', error);
      return null;
    }
  }

  /**
   * Cria conquista
   */
  async createAchievement(data: Partial<Achievement>): Promise<Achievement> {
    try {
      const [achievement] = await db
        .insert(schema.achievements)
        .values({
          name: data.name || '',
          description: data.description,
          pointsRequired: data.pointsRequired || 0,
          icon: data.icon,
        })
        .returning();
      return this.mapAchievementRecord(achievement);
    } catch (error) {
      logger.error('Erro ao criar conquista:', error);
      throw error;
    }
  }

  /**
   * Atualiza conquista
   */
  async updateAchievement(id: number, updates: Partial<Achievement>): Promise<Achievement | null> {
    try {
      // Remover createdAt do updates para evitar conflito de tipos
      const { createdAt, ...safeUpdates } = updates;
      const [achievement] = await db
        .update(schema.achievements)
        .set(safeUpdates)
        .where(eq(schema.achievements.id, id))
        .returning();
      return achievement ? this.mapAchievementRecord(achievement) : null;
    } catch (error) {
      logger.error('Erro ao atualizar conquista:', error);
      return null;
    }
  }

  /**
   * Deleta conquista
   */
  async deleteAchievement(id: number): Promise<boolean> {
    try {
      await db
        .delete(schema.achievements)
        .where(eq(schema.achievements.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar conquista:', error);
      return false;
    }
  }

  /**
   * Mapeia registro de atividade
   */
  private mapActivityRecord(record: Record<string, unknown>): PointActivity {
    return {
      id: Number(record.id),
      userId: record.userId ? Number(record.userId) : null,
      activity: String(record.activity || ''),
      points: Number(record.points || 0),
      description: record.description ? String(record.description) : null,
      createdAt: record.createdAt instanceof Date 
        ? record.createdAt.toISOString() 
        : String(record.createdAt || ''),
    };
  }

  /**
   * Mapeia registro de conquista
   */
  private mapAchievementRecord(record: Record<string, unknown>): Achievement {
    return {
      id: Number(record.id),
      name: String(record.name || ''),
      description: record.description ? String(record.description) : null,
      pointsRequired: Number(record.pointsRequired || 0),
      icon: record.icon ? String(record.icon) : null,
      createdAt: record.createdAt instanceof Date 
        ? record.createdAt.toISOString() 
        : String(record.createdAt || ''),
    };
  }
}

export const pointsRepository = new PointsRepository();
