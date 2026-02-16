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
import {
  calculateAdvancedUserPoints,
  calculateUserPoints,
  calculateUserPointsBatch,
} from './storage/pointsCalculation';
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

  private getPointsCalculationDeps() {
    return {
      db,
      schema,
      eq,
      logger,
      isSuperAdmin,
      toPermissionUser: this.toPermissionUser.bind(this),
      getPointsConfigurationByDistrict: this.getPointsConfigurationByDistrict.bind(this),
      getPointsConfiguration: this.getPointsConfiguration.bind(this),
      getAllUsers: this.getAllUsers.bind(this),
    };
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
    return calculateUserPoints(this.getPointsCalculationDeps(), userId);
  }

  /**
   * Calcula pontos para múltiplos usuários de uma vez (otimizado - evita N+1)
   * Esta versão usa os dados já carregados, evitando queries extras ao banco.
   * @param users Array de usuários já carregados
   * @returns Map de userId -> pontos calculados
   */
  async calculateUserPointsBatch(users: User[]): Promise<Map<number, number>> {
    return calculateUserPointsBatch(this.getPointsCalculationDeps(), users);
  }

  // Método para recalcular pontos dos usuários (opcionalmente filtrado por distrito)
  async calculateAdvancedUserPoints(
    districtId?: number | null
  ): Promise<PointsRecalculationResult> {
    return calculateAdvancedUserPoints(this.getPointsCalculationDeps(), districtId);
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
