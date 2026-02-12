/**
 * Points Repository
 * Métodos relacionados a pontos, conquistas e gamificação
 */

import { eq, desc } from 'drizzle-orm';
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
    {
      id: 'participacao_evento',
      name: 'Participação em Evento',
      points: 30,
      category: 'participacao',
    },
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
        await db.insert(schema.systemConfig).values({
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
   * Reseta pontos dos usuários (filtrado por distrito se fornecido)
   */
  async resetAllUserPoints(districtId?: number): Promise<{ success: boolean; message: string }> {
    try {
      if (districtId) {
        await db
          .update(schema.users)
          .set({
            points: 0,
            level: 'Iniciante',
            updatedAt: new Date(),
          })
          .where(eq(schema.users.districtId, districtId));
        return {
          success: true,
          message: `Pontos resetados com sucesso para o distrito ${districtId}`,
        };
      } 
        await db.update(schema.users).set({
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
      const { createdAt: _createdAt, ...safeUpdates } = updates;
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
      await db.delete(schema.achievements).where(eq(schema.achievements.id, id));
      return true;
    } catch (error) {
      logger.error('Erro ao deletar conquista:', error);
      return false;
    }
  }

  /**
   * Busca configuração de pontos a partir da tabela pointConfigs (row-by-row)
   * Esta é a implementação completa usada pelo NeonAdapter
   */
  async getPointsConfigFromDB(): Promise<PointsConfiguration> {
    try {
      const configs = await db.select().from(schema.pointConfigs);

      if (configs.length === 0) {
        return this.getDefaultPointsConfig();
      }

      const resolved = this.getDefaultPointsConfig();
      const setNested = (category: keyof PointsConfiguration, key: string, value: number) => {
        const group = resolved[category];
        if (group && typeof group === 'object') {
          (group as Record<string, number>)[key] = value;
        }
      };

      configs.forEach(item => {
        if (item.name === 'basicPoints') resolved.basicPoints = item.value;
        else if (item.name === 'attendancePoints') resolved.attendancePoints = item.value;
        else if (item.name === 'eventPoints') resolved.eventPoints = item.value;
        else if (item.name === 'donationPoints') resolved.donationPoints = item.value;
        else {
          const parts = item.name.split('_');
          const category = parts[0] as keyof PointsConfiguration;
          const key = parts.slice(1).join('_');
          setNested(category, key, item.value);
        }
      });

      return resolved;
    } catch (error) {
      logger.error('❌ Erro ao buscar configuração de pontos:', error);
      return this.getDefaultPointsConfig();
    }
  }

  /**
   * Busca configuração de pontos por distrito, com fallback para global
   */
  async getPointsConfigByDistrict(districtId: number | null): Promise<PointsConfiguration> {
    try {
      if (!districtId) {
        return this.getPointsConfigFromDB();
      }

      const districtConfigs = await db
        .select()
        .from(schema.districtPointsConfig)
        .where(eq(schema.districtPointsConfig.districtId, districtId));

      if (districtConfigs.length === 0) {
        logger.info(`Distrito ${districtId} não tem config própria, usando global`);
        return this.getPointsConfigFromDB();
      }

      const resolved = this.getDefaultPointsConfig();
      const setNested = (category: keyof PointsConfiguration, key: string, value: number) => {
        const group = resolved[category];
        if (group && typeof group === 'object') {
          (group as Record<string, number>)[key] = value;
        }
      };

      districtConfigs.forEach(item => {
        if (item.category && item.key) {
          const category = item.category as keyof PointsConfiguration;
          setNested(category, item.key, item.value);
        }
      });

      logger.info(`Usando configuração de pontos do distrito ${districtId}`);
      return resolved;
    } catch (error) {
      logger.error(`❌ Erro ao buscar configuração de pontos do distrito ${districtId}:`, error);
      return this.getPointsConfigFromDB();
    }
  }

  /**
   * Retorna a configuração padrão de pontos (completa)
   */
  getDefaultPointsConfig(): PointsConfiguration {
    return {
      basicPoints: 25,
      attendancePoints: 25,
      eventPoints: 50,
      donationPoints: 75,
      engajamento: { baixo: 25, medio: 50, alto: 75 },
      classificacao: { frequente: 75, naoFrequente: 25 },
      dizimista: { naoDizimista: 0, pontual: 50, sazonal: 75, recorrente: 100 },
      ofertante: { naoOfertante: 0, pontual: 50, sazonal: 75, recorrente: 100 },
      tempoBatismo: { doisAnos: 50, cincoAnos: 75, dezAnos: 100, vinteAnos: 150, maisVinte: 200 },
      cargos: { umCargo: 50, doisCargos: 100, tresOuMais: 150 },
      nomeUnidade: { comUnidade: 25, semUnidade: 0 },
      temLicao: { comLicao: 50 },
      pontuacaoDinamica: { multiplicador: 25 },
      totalPresenca: { zeroATres: 25, quatroASete: 50, oitoATreze: 100 },
      presenca: { multiplicador: 5 },
      escolaSabatina: { comunhao: 50, missao: 75, estudoBiblico: 100, batizouAlguem: 200, discipuladoPosBatismo: 50 },
      batizouAlguem: { sim: 200, nao: 0 },
      discipuladoPosBatismo: { multiplicador: 50 },
      cpfValido: { valido: 25, invalido: 0 },
      camposVaziosACMS: { completos: 50, incompletos: 0 },
    };
  }

  /**
   * Salva configuração de pontos na tabela pointConfigs (row-by-row)
   */
  async savePointsConfigToDB(config: PointsConfiguration): Promise<void> {
    try {
      // Executa delete + insert em transação atômica para evitar perda de dados
      const allConfigs = [
        { name: 'basicPoints', value: config.basicPoints || 100, category: 'basic' },
        { name: 'attendancePoints', value: config.attendancePoints || 10, category: 'basic' },
        { name: 'eventPoints', value: config.eventPoints || 20, category: 'basic' },
        { name: 'donationPoints', value: config.donationPoints || 50, category: 'basic' },
        { name: 'engajamento_baixo', value: config.engajamento?.baixo || 10, category: 'engajamento' },
        { name: 'engajamento_medio', value: config.engajamento?.medio || 25, category: 'engajamento' },
        { name: 'engajamento_alto', value: config.engajamento?.alto || 50, category: 'engajamento' },
        { name: 'classificacao_frequente', value: config.classificacao?.frequente || 30, category: 'classificacao' },
        { name: 'classificacao_naoFrequente', value: config.classificacao?.naoFrequente || 5, category: 'classificacao' },
        { name: 'dizimista_naoDizimista', value: config.dizimista?.naoDizimista || 0, category: 'dizimista' },
        { name: 'dizimista_pontual', value: config.dizimista?.pontual || 20, category: 'dizimista' },
        { name: 'dizimista_sazonal', value: config.dizimista?.sazonal || 15, category: 'dizimista' },
        { name: 'dizimista_recorrente', value: config.dizimista?.recorrente || 40, category: 'dizimista' },
        { name: 'ofertante_naoOfertante', value: config.ofertante?.naoOfertante || 0, category: 'ofertante' },
        { name: 'ofertante_pontual', value: config.ofertante?.pontual || 15, category: 'ofertante' },
        { name: 'ofertante_sazonal', value: config.ofertante?.sazonal || 10, category: 'ofertante' },
        { name: 'ofertante_recorrente', value: config.ofertante?.recorrente || 30, category: 'ofertante' },
        { name: 'tempoBatismo_doisAnos', value: config.tempoBatismo?.doisAnos || 10, category: 'tempoBatismo' },
        { name: 'tempoBatismo_cincoAnos', value: config.tempoBatismo?.cincoAnos || 20, category: 'tempoBatismo' },
        { name: 'tempoBatismo_dezAnos', value: config.tempoBatismo?.dezAnos || 30, category: 'tempoBatismo' },
        { name: 'tempoBatismo_vinteAnos', value: config.tempoBatismo?.vinteAnos || 40, category: 'tempoBatismo' },
        { name: 'tempoBatismo_maisVinte', value: config.tempoBatismo?.maisVinte || 50, category: 'tempoBatismo' },
        { name: 'cargos_umCargo', value: config.cargos?.umCargo || 50, category: 'cargos' },
        { name: 'cargos_doisCargos', value: config.cargos?.doisCargos || 100, category: 'cargos' },
        { name: 'cargos_tresOuMais', value: config.cargos?.tresOuMais || 150, category: 'cargos' },
        { name: 'nomeUnidade_comUnidade', value: config.nomeUnidade?.comUnidade || 15, category: 'nomeUnidade' },
        { name: 'nomeUnidade_semUnidade', value: config.nomeUnidade?.semUnidade || 0, category: 'nomeUnidade' },
        { name: 'temLicao_comLicao', value: config.temLicao?.comLicao || 50, category: 'temLicao' },
        { name: 'pontuacaoDinamica_multiplicador', value: config.pontuacaoDinamica?.multiplicador || 5, category: 'multiplicador' },
        { name: 'presenca_multiplicador', value: config.presenca?.multiplicador || 2, category: 'multiplicador' },
        { name: 'batizouAlguem_sim', value: config.batizouAlguem?.sim || 100, category: 'batismo' },
        { name: 'batizouAlguem_nao', value: config.batizouAlguem?.nao || 0, category: 'batismo' },
        { name: 'discipuladoPosBatismo_multiplicador', value: config.discipuladoPosBatismo?.multiplicador || 10, category: 'discipulado' },
        { name: 'cpfValido_valido', value: config.cpfValido?.valido || 20, category: 'cpf' },
        { name: 'cpfValido_invalido', value: config.cpfValido?.invalido || 0, category: 'cpf' },
        { name: 'camposVaziosACMS_completos', value: config.camposVaziosACMS?.completos || 25, category: 'campos' },
        { name: 'camposVaziosACMS_incompletos', value: config.camposVaziosACMS?.incompletos || 0, category: 'campos' },
        { name: 'totalPresenca_zeroATres', value: config.totalPresenca?.zeroATres || 25, category: 'totalPresenca' },
        { name: 'totalPresenca_quatroASete', value: config.totalPresenca?.quatroASete || 50, category: 'totalPresenca' },
        { name: 'totalPresenca_oitoATreze', value: config.totalPresenca?.oitoATreze || 100, category: 'totalPresenca' },
        { name: 'escolaSabatina_comunhao', value: config.escolaSabatina?.comunhao || 50, category: 'escolaSabatina' },
        { name: 'escolaSabatina_missao', value: config.escolaSabatina?.missao || 75, category: 'escolaSabatina' },
        { name: 'escolaSabatina_estudoBiblico', value: config.escolaSabatina?.estudoBiblico || 100, category: 'escolaSabatina' },
        { name: 'escolaSabatina_batizouAlguem', value: config.escolaSabatina?.batizouAlguem || 200, category: 'escolaSabatina' },
        { name: 'escolaSabatina_discipuladoPosBatismo', value: config.escolaSabatina?.discipuladoPosBatismo || 25, category: 'escolaSabatina' },
      ];

      await db.transaction(async (tx) => {
        await tx.delete(schema.pointConfigs);
        await tx.insert(schema.pointConfigs).values(allConfigs);
      });
    } catch (error) {
      logger.error('Erro ao salvar configuração de pontos', error);
      throw error;
    }
  }

  /**
   * Reseta configuração de pontos (limpa tabela pointConfigs)
   */
  async resetPointsConfigDB(): Promise<void> {
    try {
      await db.delete(schema.pointConfigs);
      logger.info('Configuração de pontos resetada');
    } catch (error) {
      logger.error('Erro ao resetar configuração de pontos', error);
      throw error;
    }
  }

  /**
   * Reseta pontos de todos os usuários (zera campo points)
   */
  async resetAllUserPointsDB(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      logger.info('Zerando pontos de todos os usuários...');
      await db.update(schema.users).set({ points: 0 });
      logger.info('Pontos zerados para todos os usuários');
      return { success: true, message: 'Pontos zerados para todos os usuários' };
    } catch (error) {
      logger.error('Erro ao zerar pontos', error);
      return { success: false, message: 'Erro ao zerar pontos', error: (error as Error).message };
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
      createdAt:
        record.createdAt instanceof Date
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
      createdAt:
        record.createdAt instanceof Date
          ? record.createdAt.toISOString()
          : String(record.createdAt || ''),
    };
  }
}

export const pointsRepository = new PointsRepository();
