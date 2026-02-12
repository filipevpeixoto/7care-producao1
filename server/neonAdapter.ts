import { userRepository } from './repositories/userRepository';
import { churchRepository } from './repositories/churchRepository';
import { meetingRepository } from './repositories/meetingRepository';
import { notificationRepository } from './repositories/notificationRepository';
import { prayerRepository } from './repositories/prayerRepository';
import { relationshipRepository } from './repositories/relationshipRepository';
import { pushSubscriptionRepository } from './repositories/pushSubscriptionRepository';
import { missionaryProfileRepository } from './repositories/missionaryProfileRepository';
import { pointsRepository } from './repositories/pointsRepository';
import { conversationRepository, messageRepository } from './repositories/messageRepository';
import { discipleshipRepository } from './repositories/discipleshipRepository';
import { emotionalCheckInRepository } from './repositories/emotionalCheckInRepository';
import { eventRepository } from './repositories/eventRepository';
import { systemRepository } from './repositories/systemRepository';
import { googleCalendarRepository } from './repositories/googleCalendarRepository';
// Services desabilitados temporariamente - schema não corresponde
// TODO: Ajustar services para usar raw SQL como os repositories
// import { gamificationService } from './services/gamificationService';
// import { electionService } from './services/electionService';
// import { reportService } from './services/reportService';
/**
 * Neon Database Adapter
 * @module server/neonAdapter
 * @description Implementação do adaptador de armazenamento para PostgreSQL Neon.
 * Este é o principal ponto de acesso ao banco de dados, implementando a interface IStorage.
 *
 * Funcionalidades principais:
 * - CRUD completo para todas as entidades (Users, Churches, Events, etc.)
 * - Sistema de pontos e gamificação
 * - Push notifications (Web Push API)
 * - Relacionamentos e discipulado
 * - Check-ins emocionais e espirituais
 *
 * @example
 * ```typescript
 * import { NeonAdapter } from './neonAdapter';
 *
 * const storage = new NeonAdapter();
 *
 * // Buscar usuário
 * const user = await storage.getUserById(1);
 *
 * // Criar evento
 * const event = await storage.createEvent({ title: 'Culto', ... });
 * ```
 */

import { db } from './neonConfig';
import { schema } from './schema';
import {
  mapConversationRecord as _mapConversationRecord,
  toPermissionUser as _toPermissionUser,
} from './storage/helpers';
import { eq } from 'drizzle-orm';
import { isSuperAdmin } from './utils/permissions';
import { logger } from './utils/logger';
import {
  type IStorage,
  type CreateActivityInput,
  type UpdateActivityInput,
  type CreatePushSubscriptionInput,
  type CreatePrayerInput,
  type CreateUserInput,
  type UpdateUserInput,
  type CreateChurchInput,
  type UpdateChurchInput,
  type CreateEventInput,
  type UpdateEventInput,
  type CreateMeetingInput,
  type UpdateMeetingInput,
  type CreateMessageInput,
  type UpdateMessageInput,
  type CreateNotificationInput,
  type UpdateNotificationInput,
  type CreateRelationshipInput,
  type CreateDiscipleshipRequestInput,
  type UpdateDiscipleshipRequestInput,
  type EmotionalCheckIn,
  type CreateEmotionalCheckInInput,
  type PointsConfiguration,
  getRequiredPointsConfig,
  type EventPermissions,
  type PointsCalculationResult,
  type PointsRecalculationResult,
  type PushSubscription,
  type Activity,
  type GoogleDriveConfig,
  type GoogleCalendarTokens,
  type GoogleCalendarConfig,
  type Prayer,
} from './types/storage';
import {
  type User,
  type Church,
  type Event,
  type Meeting,
  type Message,
  type Conversation,
  type Notification,
  type Achievement,
  type PointActivity,
  type Relationship,
  type DiscipleshipRequest,
  type MissionaryProfile,
  type MeetingType,
} from '../shared/schema';

/**
 * Implementação do adaptador de armazenamento para Neon PostgreSQL
 * @class NeonAdapter
 * @implements {IStorage}
 */
export class NeonAdapter implements IStorage {
  /** Delegate to shared helper */
  private toPermissionUser(user: {
    id?: number;
    role?: string;
    email?: string;
    districtId?: number | null;
    church?: string | null;
  }): Partial<User> {
    return _toPermissionUser(user);
  }

  /** Delegate to shared helper */
  private mapConversationRecord(record: Record<string, unknown>): Conversation {
    return _mapConversationRecord(record);
  }

  // ========== USUÁRIOS ==========
  async getAllUsers(): Promise<User[]> {
    return userRepository.getAllUsers();
  }

  /**
   * Busca usuários por distrito específico (query otimizada)
   * PERFORMANCE: Evita carregar todos os usuários e filtrar na memória
   */
  async getUsersByDistrictId(districtId: number): Promise<User[]> {
    return userRepository.getUsersByDistrictId(districtId);
  }

  /**
   * Busca usuários por distrito com filtros opcionais (query otimizada)
   */
  async getUsersByDistrictIdWithFilters(
    districtId: number,
    filters?: { role?: string; status?: string; church?: string }
  ): Promise<User[]> {
    return userRepository.getUsersByDistrictIdWithFilters(districtId, filters);
  }

  /**
   * Conta usuários por distrito (query otimizada para stats)
   */
  async countUsersByDistrictId(districtId: number): Promise<number> {
    return userRepository.countUsersByDistrictId(districtId);
  }

  async getVisitedUsers(): Promise<User[]> {
    return userRepository.getVisitedUsers();
  }

  async getUserById(id: number): Promise<User | null> {
    return userRepository.getUserById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return userRepository.getUserByEmail(email);
  }

  /**
   * Busca usuário por username normalizado (O(1) com índice)
   * Usado para login por username gerado do nome
   */
  async getUserByNormalizedUsername(username: string): Promise<User | null> {
    return userRepository.getUserByNormalizedUsername(username);
  }

  async createUser(userData: CreateUserInput): Promise<User> {
    return userRepository.createUser(userData);
  }

  async updateUser(id: number, updates: UpdateUserInput): Promise<User | null> {
    return userRepository.updateUser(id, updates);
  }

  async updateUserDirectly(id: number, updates: UpdateUserInput): Promise<User | null> {
    return userRepository.updateUserDirectly(id, updates);
  }

  async deleteUser(id: number): Promise<boolean> {
    return userRepository.deleteUser(id);
  }

  // ========== IGREJAS ==========
  async getAllChurches(): Promise<Church[]> {
    return churchRepository.getAllChurches();
  }

  async getChurchesByDistrict(districtId: number): Promise<Church[]> {
    return churchRepository.getChurchesByDistrict(districtId);
  }

  async getChurchById(id: number): Promise<Church | null> {
    return churchRepository.getChurchById(id);
  }

  async createChurch(churchData: CreateChurchInput): Promise<Church> {
    return churchRepository.createChurch(churchData);
  }

  async updateChurch(id: number, updates: UpdateChurchInput): Promise<Church | null> {
    return churchRepository.updateChurch(id, updates);
  }

  async deleteChurch(id: number): Promise<boolean> {
    return churchRepository.deleteChurch(id);
  }

  // ========== EVENTOS ==========
  async getAllEvents(): Promise<Event[]> {
    return eventRepository.getAllEvents();
  }

  async getEventById(id: number): Promise<Event | null> {
    return eventRepository.getEventById(id);
  }

  async createEvent(eventData: CreateEventInput): Promise<Event> {
    return eventRepository.createEventFull(eventData, (id) => this.getUserById(id));
  }

  async updateEvent(id: number, updates: UpdateEventInput): Promise<Event | null> {
    return eventRepository.updateEventFull(id, updates);
  }

  async deleteEvent(id: number): Promise<boolean> {
    return eventRepository.deleteEvent(id);
  }

  // ========== DADOS DETALHADOS DO USUÁRIO ==========
  async getUserDetailedData(userId: number): Promise<User | null> {
    return userRepository.getUserDetailedData(userId);
  }

  // ========== CONFIGURAÇÃO DE PONTOS ==========
  async getPointsConfiguration(): Promise<PointsConfiguration> {
    return pointsRepository.getPointsConfigFromDB();
  }

  async getPointsConfigurationByDistrict(districtId: number | null): Promise<PointsConfiguration> {
    return pointsRepository.getPointsConfigByDistrict(districtId);
  }

  async savePointsConfiguration(config: PointsConfiguration): Promise<void> {
    return pointsRepository.savePointsConfigToDB(config);
  }

  async resetPointsConfiguration(): Promise<void> {
    return pointsRepository.resetPointsConfigDB();
  }

  async resetAllUserPoints(): Promise<{ success: boolean; message: string; error?: string }> {
    return pointsRepository.resetAllUserPointsDB();
  }

  async calculateUserPoints(userId: number): Promise<PointsCalculationResult> {
    try {
      // Buscar dados do usuário diretamente
      const userResult = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (!userResult || userResult.length === 0) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      const userData = userResult[0];

      if (!userData) {
        logger.warn('Usuário não encontrado no banco de dados', { userId });
        return { success: false, message: 'Usuário não encontrado' };
      }

      // Pular Super Admin - não deve ter pontos
      if (isSuperAdmin(this.toPermissionUser(userData))) {
        return { success: true, points: 0, breakdown: {}, message: 'Admin não possui pontos' };
      }

      // Buscar district_id do usuário (direto do usuário ou via churchCode)
      let userDistrictId: number | null = userData.districtId || null;

      // Se não tem districtId direto, tentar buscar via churchCode
      if (!userDistrictId && userData.churchCode) {
        const churchResult = await db
          .select({ districtId: schema.churches.districtId })
          .from(schema.churches)
          .where(eq(schema.churches.code, userData.churchCode))
          .limit(1);

        if (churchResult && churchResult.length > 0) {
          userDistrictId = churchResult[0].districtId;
        }
      }

      // Buscar configuração de pontos do distrito (com fallback para global)
      const rawConfig = await this.getPointsConfigurationByDistrict(userDistrictId);
      const pointsConfig = getRequiredPointsConfig(rawConfig);

      // Parsear extraData se for string
      let extraData: Record<string, unknown> = {};
      if (typeof userData.extraData === 'string') {
        try {
          extraData = JSON.parse(userData.extraData);
        } catch (error) {
          logger.warn('Erro ao parsear extraData', { userId, error });
          extraData = {};
        }
      } else if (userData.extraData && typeof userData.extraData === 'object') {
        extraData = userData.extraData as Record<string, unknown>;
      }

      // Calcular pontos baseado nos dados do usuário
      // IMPORTANTE: Os campos estão diretamente em userData, não em extraData
      let totalPoints = 0;
      const pointsBreakdown: Record<string, number> = {};

      // 1. ENGAJAMENTO (campo direto em userData)
      const engajamentoValue = userData.engajamento || extraData?.engajamento;
      if (engajamentoValue) {
        const engajamento = String(engajamentoValue).toLowerCase();
        if (engajamento.includes('baixo')) {
          pointsBreakdown.engajamento = pointsConfig.engajamento.baixo;
          totalPoints += pointsConfig.engajamento.baixo;
        } else if (engajamento.includes('médio') || engajamento.includes('medio')) {
          pointsBreakdown.engajamento = pointsConfig.engajamento.medio;
          totalPoints += pointsConfig.engajamento.medio;
        } else if (engajamento.includes('alto')) {
          pointsBreakdown.engajamento = pointsConfig.engajamento.alto;
          totalPoints += pointsConfig.engajamento.alto;
        }
      }

      // 2. CLASSIFICAÇÃO (campo direto em userData)
      const classificacaoValue = userData.classificacao || extraData?.classificacao;
      if (classificacaoValue) {
        const classificacao = String(classificacaoValue).toLowerCase();
        if (classificacao.includes('frequente') && !classificacao.includes('não')) {
          pointsBreakdown.classificacao = pointsConfig.classificacao.frequente;
          totalPoints += pointsConfig.classificacao.frequente;
        } else {
          pointsBreakdown.classificacao = pointsConfig.classificacao.naoFrequente;
          totalPoints += pointsConfig.classificacao.naoFrequente;
        }
      }

      // 3. DIZIMISTA (campo direto em userData)
      const dizimistaValue = userData.dizimistaType || extraData?.dizimistaType;
      if (dizimistaValue) {
        const dizimista = String(dizimistaValue).toLowerCase();
        if (dizimista.includes('não dizimista') || dizimista.includes('nao dizimista')) {
          pointsBreakdown.dizimista = pointsConfig.dizimista.naoDizimista;
          totalPoints += pointsConfig.dizimista.naoDizimista;
        } else if (dizimista.includes('pontual')) {
          pointsBreakdown.dizimista = pointsConfig.dizimista.pontual;
          totalPoints += pointsConfig.dizimista.pontual;
        } else if (dizimista.includes('sazonal')) {
          pointsBreakdown.dizimista = pointsConfig.dizimista.sazonal;
          totalPoints += pointsConfig.dizimista.sazonal;
        } else if (dizimista.includes('recorrente')) {
          pointsBreakdown.dizimista = pointsConfig.dizimista.recorrente;
          totalPoints += pointsConfig.dizimista.recorrente;
        }
      }

      // 4. OFERTANTE (campo direto em userData)
      const ofertanteValue = userData.ofertanteType || extraData?.ofertanteType;
      if (ofertanteValue) {
        const ofertante = String(ofertanteValue).toLowerCase();
        if (ofertante.includes('não ofertante') || ofertante.includes('nao ofertante')) {
          pointsBreakdown.ofertante = pointsConfig.ofertante.naoOfertante;
          totalPoints += pointsConfig.ofertante.naoOfertante;
        } else if (ofertante.includes('pontual')) {
          pointsBreakdown.ofertante = pointsConfig.ofertante.pontual;
          totalPoints += pointsConfig.ofertante.pontual;
        } else if (ofertante.includes('sazonal')) {
          pointsBreakdown.ofertante = pointsConfig.ofertante.sazonal;
          totalPoints += pointsConfig.ofertante.sazonal;
        } else if (ofertante.includes('recorrente')) {
          pointsBreakdown.ofertante = pointsConfig.ofertante.recorrente;
          totalPoints += pointsConfig.ofertante.recorrente;
        }
      }

      // 5. TEMPO DE BATISMO (campo direto em userData)
      const tempoBatismoValue = userData.tempoBatismoAnos || extraData?.tempoBatismoAnos;
      if (tempoBatismoValue && typeof tempoBatismoValue === 'number' && tempoBatismoValue > 0) {
        const tempo = tempoBatismoValue;
        if (tempo >= 2 && tempo < 5) {
          pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.doisAnos;
          totalPoints += pointsConfig.tempoBatismo.doisAnos;
        } else if (tempo >= 5 && tempo < 10) {
          pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.cincoAnos;
          totalPoints += pointsConfig.tempoBatismo.cincoAnos;
        } else if (tempo >= 10 && tempo < 20) {
          pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.dezAnos;
          totalPoints += pointsConfig.tempoBatismo.dezAnos;
        } else if (tempo >= 20 && tempo < 30) {
          pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.vinteAnos;
          totalPoints += pointsConfig.tempoBatismo.vinteAnos;
        } else if (tempo >= 30) {
          pointsBreakdown.tempoBatismo = pointsConfig.tempoBatismo.maisVinte;
          totalPoints += pointsConfig.tempoBatismo.maisVinte;
        }
      }

      // 6. CARGOS (campo direto em userData)
      const departamentosCargos = String(
        userData.departamentosCargos || extraData?.departamentosCargos || ''
      ).trim();
      if (departamentosCargos && departamentosCargos.length > 0) {
        const numCargos = departamentosCargos.split(';').filter(c => c.trim()).length;
        if (numCargos === 1) {
          pointsBreakdown.cargos = pointsConfig.cargos.umCargo;
          totalPoints += pointsConfig.cargos.umCargo;
        } else if (numCargos === 2) {
          pointsBreakdown.cargos = pointsConfig.cargos.doisCargos;
          totalPoints += pointsConfig.cargos.doisCargos;
        } else if (numCargos >= 3) {
          pointsBreakdown.cargos = pointsConfig.cargos.tresOuMais;
          totalPoints += pointsConfig.cargos.tresOuMais;
        }
      }

      // 7. NOME DA UNIDADE (campo direto em userData)
      const nomeUnidade = String(userData.nomeUnidade || extraData?.nomeUnidade || '').trim();
      if (nomeUnidade && nomeUnidade.length > 0) {
        pointsBreakdown.nomeUnidade = pointsConfig.nomeUnidade.comUnidade;
        totalPoints += pointsConfig.nomeUnidade.comUnidade;
      }

      // 8. TEM LIÇÃO (campo direto em userData)
      const temLicaoValue = userData.temLicao ?? extraData?.temLicao;
      if (temLicaoValue === true || temLicaoValue === 'true' || temLicaoValue === 1) {
        pointsBreakdown.temLicao = pointsConfig.temLicao.comLicao;
        totalPoints += pointsConfig.temLicao.comLicao;
      }

      // 9. TOTAL DE PRESENÇA (campo direto em userData)
      const totalPresencaValue = userData.totalPresenca ?? extraData?.totalPresenca;
      if (totalPresencaValue !== undefined && totalPresencaValue !== null) {
        const presenca = Number(totalPresencaValue);
        if (!isNaN(presenca)) {
          if (presenca >= 0 && presenca <= 3) {
            pointsBreakdown.totalPresenca = pointsConfig.totalPresenca.zeroATres;
            totalPoints += pointsConfig.totalPresenca.zeroATres;
          } else if (presenca >= 4 && presenca <= 7) {
            pointsBreakdown.totalPresenca = pointsConfig.totalPresenca.quatroASete;
            totalPoints += pointsConfig.totalPresenca.quatroASete;
          } else if (presenca >= 8 && presenca <= 13) {
            pointsBreakdown.totalPresenca = pointsConfig.totalPresenca.oitoATreze;
            totalPoints += pointsConfig.totalPresenca.oitoATreze;
          }
        }
      }

      // 10. ESCOLA SABATINA - PONTUAÇÃO DINÂMICA (campos diretos em userData)
      const comunhaoValue = Number(userData.comunhao ?? extraData?.comunhao ?? 0);
      if (comunhaoValue > 0) {
        const pontosComunhao = comunhaoValue * pointsConfig.escolaSabatina.comunhao;
        pointsBreakdown.comunhao = pontosComunhao;
        totalPoints += pontosComunhao;
      }

      const missaoValue = Number(userData.missao ?? extraData?.missao ?? 0);
      if (missaoValue > 0) {
        const pontosMissao = missaoValue * pointsConfig.escolaSabatina.missao;
        pointsBreakdown.missao = pontosMissao;
        totalPoints += pontosMissao;
      }

      const estudoBiblicoValue = Number(userData.estudoBiblico ?? extraData?.estudoBiblico ?? 0);
      if (estudoBiblicoValue > 0) {
        const pontosEstudoBiblico = estudoBiblicoValue * pointsConfig.escolaSabatina.estudoBiblico;
        pointsBreakdown.estudoBiblico = pontosEstudoBiblico;
        totalPoints += pontosEstudoBiblico;
      }

      // 11. BATIZOU ALGUÉM (campo direto em userData)
      const batizouAlguemValue = userData.batizouAlguem ?? extraData?.batizouAlguem;
      if (
        batizouAlguemValue === 'Sim' ||
        batizouAlguemValue === true ||
        batizouAlguemValue === 'true'
      ) {
        pointsBreakdown.batizouAlguem = pointsConfig.escolaSabatina.batizouAlguem;
        totalPoints += pointsConfig.escolaSabatina.batizouAlguem;
      }

      // 12. DISCIPULADO PÓS-BATISMO (campo direto em userData)
      const discipuladoPosBatismoValue = Number(
        userData.discPosBatismal ?? extraData?.discPosBatismal ?? 0
      );
      if (discipuladoPosBatismoValue > 0) {
        const pontosDiscipulado =
          discipuladoPosBatismoValue * pointsConfig.escolaSabatina.discipuladoPosBatismo;
        pointsBreakdown.discipuladoPosBatismo = pontosDiscipulado;
        totalPoints += pontosDiscipulado;
      }

      // 13. CPF VÁLIDO (campo direto em userData)
      const cpfValidoValue = userData.cpfValido ?? extraData?.cpfValido;
      if (cpfValidoValue === 'Sim' || cpfValidoValue === true || cpfValidoValue === 'true') {
        pointsBreakdown.cpfValido = pointsConfig.cpfValido.valido;
        totalPoints += pointsConfig.cpfValido.valido;
      }

      // 14. CAMPOS VAZIOS ACMS (campo direto em userData - camposVazios)
      const camposVaziosValue = userData.camposVazios ?? extraData?.camposVaziosACMS;
      if (camposVaziosValue === false || camposVaziosValue === 0 || camposVaziosValue === '0') {
        pointsBreakdown.camposVaziosACMS = pointsConfig.camposVaziosACMS.completos;
        totalPoints += pointsConfig.camposVaziosACMS.completos;
      }

      const roundedTotalPoints = Math.round(totalPoints);
      // Log removido para reduzir verbosidade em produção

      return {
        success: true,
        points: roundedTotalPoints,
        breakdown: pointsBreakdown,
        userData: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          extraData,
        },
      };
    } catch (error) {
      logger.error('❌ Erro ao calcular pontos:', error);
      return {
        success: false,
        message: 'Erro ao calcular pontos',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Calcula pontos para múltiplos usuários de uma vez (otimizado - evita N+1)
   * Esta versão usa os dados já carregados, evitando queries extras ao banco.
   * @param users Array de usuários já carregados
   * @returns Map de userId -> pontos calculados
   */
  async calculateUserPointsBatch(users: User[]): Promise<Map<number, number>> {
    const pointsMap = new Map<number, number>();

    try {
      // Buscar configuração de pontos uma vez só e garantir valores obrigatórios
      const rawConfig = await this.getPointsConfiguration();
      const pointsConfig = getRequiredPointsConfig(rawConfig);

      for (const userData of users) {
        // Pular Super Admin
        if (isSuperAdmin(this.toPermissionUser(userData))) {
          pointsMap.set(userData.id, 0);
          continue;
        }

        // Parsear extraData se necessário
        let extraData: Record<string, unknown> = {};
        if (typeof userData.extraData === 'string') {
          try {
            extraData = JSON.parse(userData.extraData);
          } catch {
            extraData = {};
          }
        } else if (userData.extraData && typeof userData.extraData === 'object') {
          extraData = userData.extraData as Record<string, unknown>;
        }

        let totalPoints = 0;

        // Helper para acessar campos com fallback para extraData
        // Aceita keyof User ou string para campos dinâmicos em extraData
        const getField = <T>(field: keyof User | string, defaultValue?: T): T | undefined => {
          // Primeiro tenta userData (campos diretos)
          const directValue = (userData as unknown as Record<string, unknown>)[field];
          if (directValue !== undefined && directValue !== null) {
            return directValue as T;
          }
          // Fallback para extraData
          return (extraData?.[field] ?? defaultValue) as T | undefined;
        };

        // 1. ENGAJAMENTO
        const engajamentoValue = getField<string>('engajamento');
        if (engajamentoValue) {
          const engajamento = String(engajamentoValue).toLowerCase();
          if (engajamento.includes('baixo')) {
            totalPoints += pointsConfig.engajamento?.baixo ?? 0;
          } else if (engajamento.includes('médio') || engajamento.includes('medio')) {
            totalPoints += pointsConfig.engajamento?.medio ?? 0;
          } else if (engajamento.includes('alto')) {
            totalPoints += pointsConfig.engajamento?.alto ?? 0;
          }
        }

        // 2. CLASSIFICAÇÃO
        const classificacaoValue = getField<string>('classificacao');
        if (classificacaoValue) {
          const classificacao = String(classificacaoValue).toLowerCase();
          if (classificacao.includes('frequente') && !classificacao.includes('não')) {
            totalPoints += pointsConfig.classificacao?.frequente ?? 0;
          } else {
            totalPoints += pointsConfig.classificacao?.naoFrequente ?? 0;
          }
        }

        // 3. DIZIMISTA
        const dizimistaValue = getField<string>('dizimistaType');
        if (dizimistaValue) {
          const dizimista = String(dizimistaValue).toLowerCase();
          if (dizimista.includes('não dizimista') || dizimista.includes('nao dizimista')) {
            totalPoints += pointsConfig.dizimista?.naoDizimista ?? 0;
          } else if (dizimista.includes('pontual')) {
            totalPoints += pointsConfig.dizimista?.pontual ?? 0;
          } else if (dizimista.includes('sazonal')) {
            totalPoints += pointsConfig.dizimista?.sazonal ?? 0;
          } else if (dizimista.includes('recorrente')) {
            totalPoints += pointsConfig.dizimista?.recorrente ?? 0;
          }
        }

        // 4. OFERTANTE
        const ofertanteValue = getField<string>('ofertanteType');
        if (ofertanteValue) {
          const ofertante = String(ofertanteValue).toLowerCase();
          if (ofertante.includes('não ofertante') || ofertante.includes('nao ofertante')) {
            totalPoints += pointsConfig.ofertante?.naoOfertante ?? 0;
          } else if (ofertante.includes('pontual')) {
            totalPoints += pointsConfig.ofertante?.pontual ?? 0;
          } else if (ofertante.includes('sazonal')) {
            totalPoints += pointsConfig.ofertante?.sazonal ?? 0;
          } else if (ofertante.includes('recorrente')) {
            totalPoints += pointsConfig.ofertante?.recorrente ?? 0;
          }
        }

        // 5. TEMPO DE BATISMO
        const tempoBatismo = getField<number>('tempoBatismoAnos');
        if (tempoBatismo !== null && tempoBatismo !== undefined) {
          const anos = Number(tempoBatismo);
          if (!isNaN(anos) && pointsConfig.tempoBatismo) {
            if (anos <= 2) {
              totalPoints += pointsConfig.tempoBatismo.doisAnos ?? 0;
            } else if (anos <= 5) {
              totalPoints += pointsConfig.tempoBatismo.cincoAnos ?? 0;
            } else if (anos <= 10) {
              totalPoints += pointsConfig.tempoBatismo.dezAnos ?? 0;
            } else if (anos <= 20) {
              totalPoints += pointsConfig.tempoBatismo.vinteAnos ?? 0;
            } else {
              totalPoints += pointsConfig.tempoBatismo.maisVinte ?? 0;
            }
          }
        }

        // 6. TEM LIÇÃO
        const temLicao = getField<boolean>('temLicao');
        if (temLicao === true && pointsConfig.temLicao) {
          totalPoints += pointsConfig.temLicao.comLicao ?? 0;
        }

        // 7. TOTAL PRESENÇA (usa multiplicador)
        const totalPresenca = getField<number>('totalPresenca');
        if (totalPresenca !== null && totalPresenca !== undefined) {
          const presencas = Number(totalPresenca);
          if (!isNaN(presencas) && pointsConfig.presenca) {
            totalPoints += presencas * (pointsConfig.presenca.multiplicador ?? 0);
          }
        }

        // 8. CPF VÁLIDO
        const cpfValido = getField<boolean>('cpfValido');
        if (cpfValido !== undefined && pointsConfig.cpfValido) {
          if (cpfValido === true) {
            totalPoints += pointsConfig.cpfValido.valido ?? 0;
          } else {
            totalPoints += pointsConfig.cpfValido.invalido ?? 0;
          }
        }

        // 9. CAMPOS VAZIOS
        const camposVazios = getField<boolean>('camposVazios');
        if (camposVazios !== undefined && pointsConfig.camposVaziosACMS) {
          if (camposVazios === false) {
            totalPoints += pointsConfig.camposVaziosACMS.completos ?? 0;
          } else {
            totalPoints += pointsConfig.camposVaziosACMS.incompletos ?? 0;
          }
        }

        // 10. BATIZOU ALGUÉM
        const batizouAlguem = getField<boolean>('batizouAlguem');
        if (batizouAlguem === true && pointsConfig.batizouAlguem) {
          totalPoints += pointsConfig.batizouAlguem.sim ?? 0;
        }

        // Arredondar para inteiro
        pointsMap.set(userData.id, Math.round(totalPoints));
      }
    } catch (error) {
      logger.error('❌ Erro ao calcular pontos em batch:', error);
    }

    return pointsMap;
  }

  // Método para recalcular pontos dos usuários (opcionalmente filtrado por distrito)
  async calculateAdvancedUserPoints(
    districtId?: number | null
  ): Promise<PointsRecalculationResult> {
    try {
      // Buscar todos os usuários
      let users = await this.getAllUsers();

      // Aplicar filtro de distrito se fornecido
      if (districtId !== undefined && districtId !== null) {
        const beforeCount = users.length;
        users = users.filter(u => u.districtId === districtId);
        logger.info(
          `🏛️ Recálculo filtrado por distrito ${districtId}: ${users.length} usuários (de ${beforeCount} total)`
        );
      }

      let updatedCount = 0;
      let errorCount = 0;
      const results: Record<string, unknown>[] = [];

      for (const user of users) {
        try {
          // Pular Super Admin
          if (isSuperAdmin(this.toPermissionUser(user))) {
            continue;
          }

          // Calcular pontos
          const calculation = await this.calculateUserPoints(user.id);

          if (calculation && calculation.success) {
            // Atualizar pontos no banco se mudaram
            if (user.points !== calculation.points) {
              // Atualizar pontos no banco
              await db
                .update(schema.users)
                .set({ points: calculation.points })
                .where(eq(schema.users.id, user.id));

              updatedCount++;
            }

            results.push({
              userId: user.id,
              name: user.name,
              points: calculation.points,
              updated: user.points !== calculation.points,
            });
          } else {
            errorCount++;
          }
        } catch (_userError) {
          errorCount++;
        }
      }

      const scopeMessage =
        districtId !== undefined && districtId !== null ? `do distrito` : `do sistema`;

      return {
        success: true,
        message: `Pontos recalculados para ${users.length} usuários ${scopeMessage}. ${updatedCount} atualizados.`,
        updatedUsers: updatedCount,
        totalUsers: users.length,
        errors: errorCount,
        results,
      };
    } catch (error) {
      logger.error('❌ Erro ao recalcular pontos:', error);
      return {
        success: false,
        message: 'Erro ao recalcular pontos',
        error: (error as Error).message,
      };
    }
  }

  // ========== MÉTODOS ADICIONAIS (Sistema, Logo, etc) ==========

  async saveSystemLogo(logoData: string): Promise<void> {
    return systemRepository.saveLogo(logoData);
  }

  async getSystemLogo(): Promise<string | null> {
    return systemRepository.getLogo();
  }

  async clearSystemLogo(): Promise<void> {
    return systemRepository.clearLogo();
  }

  async saveSystemSetting(key: string, value: unknown): Promise<void> {
    return systemRepository.saveSetting(key, value);
  }

  async getSystemSetting(key: string): Promise<unknown | null> {
    return systemRepository.getSetting(key);
  }

  async clearAllData(): Promise<void> {
    return systemRepository.clearAllData();
  }

  // ========== MÉTODOS PRIORITÁRIOS (TOP 10 MAIS USADOS) ==========

  // 0. getAllRelationships - Busca todos os relacionamentos
  async getAllRelationships(): Promise<Relationship[]> {
    return relationshipRepository.getAll();
  }

  // 1. getRelationshipsByMissionary (7x usado)
  async getRelationshipsByMissionary(missionaryId: number): Promise<Relationship[]> {
    return relationshipRepository.getByMissionary(missionaryId);
  }

  // 2. getMeetingsByUserId (5x usado)
  async getMeetingsByUserId(userId: number): Promise<Meeting[]> {
    return meetingRepository.getByUserId(userId);
  }

  // 3. getRelationshipsByInterested (4x usado)
  async getRelationshipsByInterested(interestedId: number): Promise<Relationship[]> {
    return relationshipRepository.getByInterested(interestedId);
  }

  async getRelationshipById(id: number): Promise<Relationship | null> {
    return relationshipRepository.getById(id);
  }

  async deleteRelationshipByInterested(interestedId: number): Promise<boolean> {
    return relationshipRepository.deleteByInterested(interestedId);
  }

  // 4. updateUserChurch (4x usado)
  async updateUserChurch(userId: number, churchName: string): Promise<boolean> {
    return userRepository.updateUserChurch(userId, churchName);
  }

  // 5. getAllDiscipleshipRequests (4x usado)
  async getAllDiscipleshipRequests(): Promise<DiscipleshipRequest[]> {
    return discipleshipRepository.getAll();
  }

  async getDiscipleshipRequestById(id: number): Promise<DiscipleshipRequest | null> {
    return discipleshipRepository.getById(id);
  }

  // 6. createRelationship (3x usado)
  async createRelationship(data: CreateRelationshipInput): Promise<Relationship> {
    return relationshipRepository.create(data);
  }

  // 7. getEventPermissions (3x usado)
  async getEventPermissions(): Promise<EventPermissions | null> {
    return systemRepository.getEventPermissions();
  }

  // 8. getEmotionalCheckInsForAdmin (3x usado)
  async getEmotionalCheckInsForAdmin(): Promise<EmotionalCheckIn[]> {
    return emotionalCheckInRepository.getAll();
  }

  // 9. createDiscipleshipRequest (3x usado)
  async createDiscipleshipRequest(
    data: CreateDiscipleshipRequestInput
  ): Promise<DiscipleshipRequest> {
    return discipleshipRepository.create(data);
  }

  // 10. getOrCreateChurch (3x usado)
  async getOrCreateChurch(churchName: string): Promise<Church> {
    return churchRepository.getOrCreateChurch(churchName);
  }

  // ========== MÉTODOS SECUNDÁRIOS (restantes) ==========

  // Meetings
  async getMeetingsByStatus(status: string): Promise<Meeting[]> {
    return meetingRepository.getByStatus(status);
  }

  async getAllMeetings(): Promise<Meeting[]> {
    return meetingRepository.getAll();
  }

  async getMeetingTypes(): Promise<MeetingType[]> {
    return meetingRepository.getMeetingTypes();
  }

  // Prayers
  async getPrayers(): Promise<Prayer[]> {
    return prayerRepository.getAll();
  }

  async markPrayerAsAnswered(id: number, _testimony?: string): Promise<Prayer | null> {
    return prayerRepository.markAsAnswered(id, _testimony);
  }

  async addPrayerIntercessor(prayerId: number, intercessorId: number): Promise<boolean> {
    return prayerRepository.addIntercessor(prayerId, intercessorId);
  }

  async removePrayerIntercessor(prayerId: number, intercessorId: number): Promise<boolean> {
    return prayerRepository.removeIntercessor(prayerId, intercessorId);
  }

  async getPrayerIntercessors(prayerId: number): Promise<User[]> {
    return prayerRepository.getIntercessors(prayerId);
  }

  async getPrayersUserIsPrayingFor(userId: number): Promise<Prayer[]> {
    return prayerRepository.getPrayersUserIsPrayingFor(userId);
  }

  // Emotional Check-ins
  async getEmotionalCheckInsByUserId(userId: number): Promise<EmotionalCheckIn[]> {
    return emotionalCheckInRepository.getByUserId(userId);
  }

  // Discipulado
  async updateDiscipleshipRequest(
    id: number,
    updates: UpdateDiscipleshipRequestInput
  ): Promise<DiscipleshipRequest | null> {
    return discipleshipRepository.update(id, updates);
  }

  async deleteDiscipleshipRequest(id: number): Promise<boolean> {
    return discipleshipRepository.delete(id);
  }

  // Relacionamentos
  async deleteRelationship(relationshipId: number): Promise<boolean> {
    return relationshipRepository.delete(relationshipId);
  }

  // Chat/Mensagens
  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    return conversationRepository.getByUserId(userId);
  }

  async getConversationsByUser(userId: number): Promise<Conversation[]> {
    return this.getConversationsByUserId(userId);
  }

  async getAllConversations(): Promise<Conversation[]> {
    return conversationRepository.getAll();
  }

  async getConversationById(id: number): Promise<Conversation | null> {
    return conversationRepository.getById(id);
  }

  async createConversation(data: Partial<Conversation>): Promise<Conversation> {
    try {
      // Buscar distrito do criador da conversa
      let districtId = null;
      if (data.createdBy) {
        const user = await this.getUserById(data.createdBy);
        districtId = user?.districtId || null;
      }

      const [conversation] = await db
        .insert(schema.conversations)
        .values({
          title: data.title ?? null,
          type: data.type ?? 'private',
          createdBy: data.createdBy ?? null,
          districtId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return this.mapConversationRecord(conversation);
    } catch (error) {
      logger.error('Erro ao criar conversa:', error);
      throw error;
    }
  }

  async updateConversation(
    id: number,
    updates: Partial<Conversation>
  ): Promise<Conversation | null> {
    return conversationRepository.update(id, updates);
  }

  async deleteConversation(id: number): Promise<boolean> {
    return conversationRepository.delete(id);
  }

  async getOrCreateDirectConversation(userAId: number, userBId: number): Promise<Conversation> {
    return conversationRepository.getOrCreateDirect(userAId, userBId);
  }

  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return messageRepository.getByConversationId(conversationId);
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return this.getMessagesByConversationId(conversationId);
  }

  async getConversationParticipants(conversationId: number): Promise<
    Array<{
      id: number;
      conversationId: number;
      userId: number;
      userName?: string;
      joinedAt: string;
    }>
  > {
    return conversationRepository.getParticipants(conversationId);
  }

  async getAllMessages(): Promise<Message[]> {
    return messageRepository.getAll();
  }

  async getMessageById(id: number): Promise<Message | null> {
    return messageRepository.getById(id);
  }

  async createMessage(data: CreateMessageInput): Promise<Message> {
    return messageRepository.create(data);
  }

  async updateMessage(id: number, updates: UpdateMessageInput): Promise<Message | null> {
    return messageRepository.update(id, updates);
  }

  async deleteMessage(id: number): Promise<boolean> {
    return messageRepository.delete(id);
  }

  // Eventos
  async saveEventPermissions(permissions: EventPermissions): Promise<void> {
    return systemRepository.saveEventPermissions(permissions);
  }

  async clearAllEvents(): Promise<boolean> {
    try {
      await eventRepository.clearAllEvents();
      return true;
    } catch (error) {
      logger.error('Erro ao limpar eventos:', error);
      return false;
    }
  }

  // Sistema
  async getSystemConfig(key: string): Promise<unknown | null> {
    return systemRepository.getConfig(key);
  }

  async saveSystemConfig(key: string, value: unknown): Promise<void> {
    return systemRepository.saveConfig(key, value);
  }

  // Usuários
  async approveUser(id: number): Promise<User | null> {
    return userRepository.approveUser(id);
  }

  async rejectUser(id: number): Promise<User | null> {
    return userRepository.rejectUser(id);
  }

  async setDefaultChurch(churchId: number): Promise<boolean> {
    return churchRepository.setDefaultChurch(churchId);
  }

  // Pontos
  async getAllPointActivities(): Promise<PointActivity[]> {
    return pointsRepository.getAllActivities();
  }

  async createPointActivity(data: Partial<PointActivity>): Promise<PointActivity> {
    return pointsRepository.createActivity(data);
  }

  async getAllAchievements(): Promise<Achievement[]> {
    return pointsRepository.getAllAchievements();
  }

  async getAchievementById(id: number): Promise<Achievement | null> {
    return pointsRepository.getAchievementById(id);
  }

  async createAchievement(data: Partial<Achievement>): Promise<Achievement> {
    return pointsRepository.createAchievement(data);
  }

  async updateAchievement(id: number, updates: Partial<Achievement>): Promise<Achievement | null> {
    return pointsRepository.updateAchievement(id, updates);
  }

  async deleteAchievement(id: number): Promise<boolean> {
    return pointsRepository.deleteAchievement(id);
  }

  // Perfil Missionário
  async getMissionaryProfileByUserId(userId: number): Promise<MissionaryProfile | null> {
    return missionaryProfileRepository.getByUserId(userId);
  }

  async createMissionaryProfile(data: Partial<MissionaryProfile>): Promise<MissionaryProfile> {
    return missionaryProfileRepository.create(data);
  }

  async getAllMissionaryProfiles(): Promise<MissionaryProfile[]> {
    return missionaryProfileRepository.getAll();
  }

  async getMissionaryProfileById(id: number): Promise<MissionaryProfile | null> {
    return missionaryProfileRepository.getById(id);
  }

  async updateMissionaryProfile(
    id: number,
    updates: Partial<MissionaryProfile>
  ): Promise<MissionaryProfile | null> {
    return missionaryProfileRepository.update(id, updates);
  }

  async deleteMissionaryProfile(id: number): Promise<boolean> {
    return missionaryProfileRepository.delete(id);
  }

  async getUsersWithMissionaryProfile(): Promise<User[]> {
    return missionaryProfileRepository.getUsersWithProfile();
  }

  // Igreja
  async getDefaultChurch(): Promise<Church | null> {
    return churchRepository.getDefaultChurch();
  }

  // ========== MÉTODOS FINAIS (últimos 3) ==========

  async createEmotionalCheckIn(data: CreateEmotionalCheckInInput): Promise<EmotionalCheckIn> {
    return emotionalCheckInRepository.create(data);
  }

  async getPrayerById(prayerId: number): Promise<Prayer | null> {
    return prayerRepository.getById(prayerId);
  }

  async deletePrayer(prayerId: number): Promise<boolean> {
    return prayerRepository.delete(prayerId);
  }

  // ========== NOTIFICAÇÕES ==========
  async getAllNotifications(): Promise<Notification[]> {
    return notificationRepository.getAll();
  }

  async getNotificationById(id: number): Promise<Notification | null> {
    return notificationRepository.getById(id);
  }

  async getNotificationsByUser(userId: number, limit: number = 50): Promise<Notification[]> {
    return notificationRepository.getByUserId(userId, limit);
  }

  async createNotification(data: CreateNotificationInput): Promise<Notification> {
    return notificationRepository.create(data);
  }

  async updateNotification(
    id: number,
    updates: UpdateNotificationInput
  ): Promise<Notification | null> {
    return notificationRepository.update(id, updates);
  }

  async markNotificationAsRead(id: number): Promise<Notification | null> {
    return notificationRepository.markAsRead(id);
  }

  async deleteNotification(id: number): Promise<boolean> {
    return notificationRepository.delete(id);
  }

  // ========== PUSH SUBSCRIPTIONS ==========
  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return pushSubscriptionRepository.getAll();
  }

  async getPushSubscriptionsByUser(userId: number): Promise<PushSubscription[]> {
    return pushSubscriptionRepository.getByUserId(userId);
  }

  async createPushSubscription(data: CreatePushSubscriptionInput): Promise<PushSubscription> {
    return pushSubscriptionRepository.create(data);
  }

  async togglePushSubscription(id: number): Promise<PushSubscription | null> {
    return pushSubscriptionRepository.toggle(id);
  }

  async deletePushSubscription(id: number): Promise<boolean> {
    return pushSubscriptionRepository.delete(id);
  }

  async sendPushNotifications(data: {
    userIds: number[];
    title: string;
    body: string;
    icon?: string;
    url?: string;
  }): Promise<{ sent: number; failed: number }> {
    return pushSubscriptionRepository.sendNotifications(data);
  }

  async getAllActivities(): Promise<Activity[]> {
    return systemRepository.getAllActivities();
  }

  async createActivity(data: CreateActivityInput & { createdBy?: number }): Promise<Activity> {
    return systemRepository.createActivity(data);
  }

  async updateActivity(id: number, updates: UpdateActivityInput): Promise<Activity | null> {
    return systemRepository.updateActivity(id, updates);
  }

  async deleteActivity(id: number): Promise<boolean> {
    return systemRepository.deleteActivity(id);
  }

  // ========== GOOGLE DRIVE CONFIG ==========
  async saveGoogleDriveConfig(config: GoogleDriveConfig): Promise<void> {
    return systemRepository.saveGoogleDriveConfig(config);
  }

  async getGoogleDriveConfig(): Promise<GoogleDriveConfig | null> {
    return systemRepository.getGoogleDriveConfig();
  }

  // ========== GOOGLE CALENDAR ==========
  async saveGoogleCalendarTokens(userId: number, tokens: GoogleCalendarTokens): Promise<void> {
    return googleCalendarRepository.saveTokens(userId, tokens);
  }

  async getGoogleCalendarTokens(userId: number): Promise<GoogleCalendarTokens | null> {
    return googleCalendarRepository.getTokens(userId);
  }

  async updateGoogleCalendarTokens(
    userId: number,
    tokens: Partial<GoogleCalendarTokens>
  ): Promise<void> {
    return googleCalendarRepository.updateTokens(userId, tokens);
  }

  async deleteGoogleCalendarTokens(userId: number): Promise<void> {
    return googleCalendarRepository.deleteTokens(userId);
  }

  async saveGoogleCalendarConfig(
    userId: number,
    config: Partial<GoogleCalendarConfig>
  ): Promise<void> {
    return systemRepository.saveGoogleCalendarConfig(userId, config);
  }

  async getGoogleCalendarConfig(userId: number): Promise<GoogleCalendarConfig | null> {
    return systemRepository.getGoogleCalendarConfig(userId);
  }

  async getEventByGoogleId(googleCalendarEventId: string): Promise<Event | null> {
    return googleCalendarRepository.getEventByGoogleId(googleCalendarEventId) as Promise<Event | null>;
  }

  async deleteSystemConfig(key: string): Promise<void> {
    return systemRepository.deleteConfig(key);
  }

  // ========== MEETINGS ==========
  async createMeeting(data: CreateMeetingInput): Promise<Meeting> {
    return meetingRepository.create(data);
  }

  async updateMeeting(id: number, updates: UpdateMeetingInput): Promise<Meeting | null> {
    return meetingRepository.update(id, updates);
  }

  async getMeetingById(id: number): Promise<Meeting | null> {
    return meetingRepository.getById(id);
  }

  async deleteMeeting(id: number): Promise<boolean> {
    return meetingRepository.delete(id);
  }

  // ========== PRAYERS (métodos adicionais) ==========
  async getAllPrayers(): Promise<Prayer[]> {
    return this.getPrayers();
  }

  async createPrayer(data: CreatePrayerInput): Promise<Prayer> {
    // Buscar distrito do usuário antes de delegar ao repositório
    let districtId = null;
    if (data.userId) {
      const user = await this.getUserById(data.userId);
      districtId = user?.districtId || null;
    }
    return prayerRepository.create({ ...data, districtId } as CreatePrayerInput & { districtId: number | null });
  }

  async addIntercessor(
    prayerId: number,
    intercessorId: number
  ): Promise<{ prayerId: number; intercessorId: number }> {
    const success = await this.addPrayerIntercessor(prayerId, intercessorId);
    if (!success) {
      throw new Error('Erro ao adicionar intercessor');
    }
    return { prayerId, intercessorId };
  }

  async removeIntercessor(prayerId: number, intercessorId: number): Promise<boolean> {
    return this.removePrayerIntercessor(prayerId, intercessorId);
  }

  async getIntercessorsByPrayer(prayerId: number): Promise<User[]> {
    return this.getPrayerIntercessors(prayerId);
  }

  async getPrayersUserIsInterceding(userId: number): Promise<Prayer[]> {
    return this.getPrayersUserIsPrayingFor(userId);
  }

  // ========== EMOTIONAL CHECK-INS ==========
  async getEmotionalCheckInsByUser(userId: number): Promise<EmotionalCheckIn[]> {
    return this.getEmotionalCheckInsByUserId(userId);
  }
}
