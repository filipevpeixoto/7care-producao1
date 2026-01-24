import { db, sql as neonSql } from './neonConfig';
import { schema } from './schema';
import { eq, and, desc, asc, ne, or, inArray, sql as drizzleSql } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import webpush from 'web-push';
import { isSuperAdmin, hasAdminAccess } from './utils/permissions';
import {
  IStorage,
  CreateActivityInput,
  UpdateActivityInput,
  CreatePushSubscriptionInput,
  CreatePrayerInput,
  CreateUserInput,
  UpdateUserInput,
  CreateChurchInput,
  UpdateChurchInput,
  CreateEventInput,
  UpdateEventInput,
  CreateMeetingInput,
  UpdateMeetingInput,
  CreateMessageInput,
  UpdateMessageInput,
  CreateNotificationInput,
  UpdateNotificationInput,
  CreateRelationshipInput,
  CreateDiscipleshipRequestInput,
  UpdateDiscipleshipRequestInput,
  EmotionalCheckIn,
  CreateEmotionalCheckInInput,
  PointsConfiguration,
  EventPermissions,
  PointsCalculationResult,
  PointsRecalculationResult,
  PushSubscriptionPayload,
  PushSubscription,
  Activity,
  GoogleDriveConfig,
  Prayer
} from './types/storage';
import {
  User,
  Church,
  Event,
  Meeting,
  Message,
  Conversation,
  Notification,
  Achievement,
  PointActivity,
  Relationship,
  DiscipleshipRequest,
  MissionaryProfile,
  MeetingType
} from '../shared/schema';

export class NeonAdapter implements IStorage {
  private getActivitiesFromConfig(raw: unknown): Activity[] {
    if (Array.isArray(raw)) {
      return raw as Activity[];
    }
    return [];
  }

  private toDateString(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value == null) {
      return '';
    }
    return String(value);
  }

  private toOptionalDateString(value: unknown): string | null {
    if (value == null) {
      return null;
    }
    return value instanceof Date ? value.toISOString() : String(value);
  }

  private normalizeExtraData(value: unknown): Record<string, unknown> | string | null | undefined {
    if (value == null) {
      return value as null | undefined;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    return String(value);
  }

  private toUser(row: Record<string, unknown>): User {
    return {
      id: Number(row.id),
      name: row.name == null ? '' : String(row.name),
      email: row.email == null ? '' : String(row.email),
      password: row.password == null ? '' : String(row.password),
      role: (row.role == null ? 'member' : String(row.role)) as User['role'],
      church: row.church == null ? null : String(row.church),
      churchCode: row.churchCode == null ? '' : String(row.churchCode),
      districtId: row.districtId == null ? null : Number(row.districtId),
      departments: row.departments == null ? '' : String(row.departments),
      birthDate: row.birthDate == null ? '' : String(row.birthDate),
      civilStatus: row.civilStatus == null ? '' : String(row.civilStatus),
      occupation: row.occupation == null ? '' : String(row.occupation),
      education: row.education == null ? '' : String(row.education),
      address: row.address == null ? '' : String(row.address),
      baptismDate: row.baptismDate == null ? '' : String(row.baptismDate),
      previousReligion: row.previousReligion == null ? '' : String(row.previousReligion),
      biblicalInstructor: row.biblicalInstructor == null ? null : String(row.biblicalInstructor),
      interestedSituation: row.interestedSituation == null ? '' : String(row.interestedSituation),
      isDonor: Boolean(row.isDonor),
      isTither: Boolean(row.isTither),
      isApproved: Boolean(row.isApproved),
      points: Number(row.points ?? 0),
      level: row.level == null ? '' : String(row.level),
      attendance: Number(row.attendance ?? 0),
      extraData: this.normalizeExtraData(row.extraData),
      observations: row.observations == null ? '' : String(row.observations),
      createdAt: this.toDateString(row.createdAt),
      updatedAt: this.toDateString(row.updatedAt),
      firstAccess: Boolean(row.firstAccess),
      status: row.status == null ? undefined : String(row.status),
      phone: row.phone == null ? undefined : String(row.phone),
      cpf: row.cpf == null ? undefined : String(row.cpf),
      profilePhoto: row.profilePhoto == null ? undefined : String(row.profilePhoto),
      isOffering: row.isOffering == null ? undefined : Boolean(row.isOffering),
      hasLesson: row.hasLesson == null ? undefined : Boolean(row.hasLesson)
    };
  }

  private generateChurchCode(name: string): string {
    const base = name
      .split(' ')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    return (base || 'CH').slice(0, 10);
  }

  private async resolveChurchCode(name: string, providedCode?: string | null): Promise<string> {
    const initialCode = (providedCode && providedCode.trim() !== '' ? providedCode : this.generateChurchCode(name)).slice(0, 10);
    let finalCode = initialCode;
    let counter = 1;

    while (true) {
      const existing = await db.select()
        .from(schema.churches)
        .where(eq(schema.churches.code, finalCode))
        .limit(1);
      if (existing.length === 0) {
        return finalCode;
      }
      const suffix = String(counter);
      const truncated = initialCode.slice(0, Math.max(1, 10 - suffix.length));
      finalCode = `${truncated}${suffix}`;
      counter += 1;
    }
  }

  private toPermissionUser(user: { id?: number; role?: string; email?: string; districtId?: number | null; church?: string | null }): Partial<User> {
    return {
      id: user.id,
      role: user.role as User['role'],
      email: user.email,
      districtId: user.districtId ?? undefined,
      church: user.church ?? undefined
    };
  }

  private mapPrayerRecord(record: Record<string, unknown>): Prayer {
    const createdAt = this.toOptionalDateString(record?.createdAt);
    const updatedAt = this.toOptionalDateString(record?.updatedAt);
    const isAnswered = record?.status === 'answered';
    return {
      id: Number(record.id),
      userId: Number(record.requesterId),
      title: String(record.title),
      description: record.description == null ? null : String(record.description),
      isPublic: record.isPrivate === null ? true : !record.isPrivate,
      isAnswered,
      answeredAt: isAnswered ? (updatedAt ? String(updatedAt) : null) : null,
      testimony: null,
      createdAt: createdAt ? String(createdAt) : '',
      updatedAt: updatedAt ? String(updatedAt) : ''
    };
  }

  private mapChurchRecord(record: Record<string, unknown>): Church {
    return {
      id: Number(record.id),
      name: record.name == null ? '' : String(record.name),
      code: record.code == null ? undefined : String(record.code),
      address: record.address == null ? null : String(record.address),
      city: record.city == null ? null : String(record.city),
      state: record.state == null ? null : String(record.state),
      zip_code: record.zip_code == null ? null : String(record.zip_code),
      email: record.email == null ? null : String(record.email),
      phone: record.phone == null ? null : String(record.phone),
      pastor_name: record.pastor_name == null ? null : String(record.pastor_name),
      pastor_email: record.pastor_email == null ? null : String(record.pastor_email),
      established_date: record.established_date == null ? null : String(record.established_date),
      status: record.status == null ? null : String(record.status),
      districtId: record.districtId == null ? null : Number(record.districtId),
      isActive: record.isActive == null ? true : Boolean(record.isActive),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }

  private mapRelationshipRecord(record: Record<string, unknown>): Relationship {
    return {
      id: Number(record.id),
      interestedId: record.interestedId == null ? undefined : Number(record.interestedId),
      missionaryId: record.missionaryId == null ? undefined : Number(record.missionaryId),
      userId1: record.userId1 == null ? undefined : Number(record.userId1),
      userId2: record.userId2 == null ? undefined : Number(record.userId2),
      relationshipType: record.relationshipType == null ? undefined : String(record.relationshipType),
      status: record.status == null ? undefined : String(record.status),
      notes: record.notes == null ? undefined : String(record.notes),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }

  private mapMeetingRecord(record: Record<string, unknown>): Meeting {
    return {
      id: Number(record.id),
      requesterId: Number(record.requesterId ?? 0),
      assignedToId: Number(record.assignedToId ?? 0),
      typeId: Number(record.typeId ?? 0),
      title: record.title == null ? '' : String(record.title),
      description: record.description == null ? '' : String(record.description),
      scheduledAt: this.toDateString(record.scheduledAt),
      duration: Number(record.duration ?? 0),
      location: record.location == null ? '' : String(record.location),
      priority: record.priority == null ? '' : String(record.priority),
      isUrgent: Boolean(record.isUrgent),
      status: record.status == null ? '' : String(record.status),
      notes: record.notes == null ? '' : String(record.notes),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }

  private mapMeetingTypeRecord(record: Record<string, unknown>): MeetingType {
    return {
      id: Number(record.id),
      name: record.name == null ? '' : String(record.name),
      description: record.description == null ? '' : String(record.description),
      duration: Number(record.duration ?? 0),
      isActive: record.isActive == null ? true : Boolean(record.isActive),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }

  private mapConversationRecord(record: Record<string, unknown>): Conversation {
    const typeValue = record.type == null ? '' : String(record.type);
    return {
      id: Number(record.id),
      title: record.title == null ? '' : String(record.title),
      type: typeValue,
      isGroup: typeValue === 'group' || typeValue === 'grupo',
      createdBy: record.createdBy == null ? null : Number(record.createdBy),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }

  private mapMessageRecord(record: Record<string, unknown>): Message {
    return {
      id: Number(record.id),
      conversationId: Number(record.conversationId ?? 0),
      senderId: Number(record.senderId ?? 0),
      content: record.content == null ? '' : String(record.content),
      messageType: record.messageType == null ? 'text' : String(record.messageType),
      isRead: record.isRead == null ? false : Boolean(record.isRead),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }

  private mapPointActivityRecord(record: Record<string, unknown>): PointActivity {
    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      pointId: Number(record.pointId ?? record.id ?? 0),
      points: Number(record.points ?? 0),
      description: record.description == null ? '' : String(record.description),
      createdAt: this.toDateString(record.createdAt)
    };
  }

  private mapAchievementRecord(record: Record<string, unknown>): Achievement {
    return {
      id: Number(record.id),
      name: record.name == null ? '' : String(record.name),
      description: record.description == null ? '' : String(record.description),
      icon: record.icon == null ? '' : String(record.icon),
      requiredPoints: Number(record.pointsRequired ?? record.requiredPoints ?? 0),
      requiredConditions: record.requiredConditions == null ? '' : String(record.requiredConditions),
      badgeColor: record.badgeColor == null ? '' : String(record.badgeColor),
      isActive: record.isActive == null ? true : Boolean(record.isActive),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }

  private mapDiscipleshipRequestRecord(record: Record<string, unknown>): DiscipleshipRequest {
    const interestedId = record.interestedId == null ? undefined : Number(record.interestedId);
    const missionaryId = record.missionaryId == null ? undefined : Number(record.missionaryId);
    return {
      id: Number(record.id),
      requesterId: Number(interestedId ?? 0),
      mentorId: Number(missionaryId ?? 0),
      status: record.status == null ? '' : String(record.status),
      message: record.notes == null ? '' : String(record.notes),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt),
      interestedId,
      missionaryId,
      notes: record.notes == null ? undefined : String(record.notes)
    };
  }

  private mapEmotionalCheckInRecord(record: Record<string, unknown>): EmotionalCheckIn {
    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      emotionalScore: record.emotionalScore == null ? null : Number(record.emotionalScore),
      mood: record.mood == null ? null : String(record.mood),
      prayerRequest: record.prayerRequest == null ? null : String(record.prayerRequest),
      isPrivate: Boolean(record.isPrivate),
      allowChurchMembers: record.allowChurchMembers == null ? true : Boolean(record.allowChurchMembers),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt)
    };
  }

  private mapMissionaryProfileRecord(record: Record<string, unknown>): MissionaryProfile {
    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      missionField: record.missionField == null ? String(record.specialization ?? '') : String(record.missionField),
      startDate: record.startDate == null ? '' : String(record.startDate),
      endDate: record.endDate == null ? '' : String(record.endDate),
      status: record.status == null ? 'active' : String(record.status),
      notes: record.notes == null ? String(record.experience ?? '') : String(record.notes),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt),
      isActive: record.isActive == null ? undefined : Boolean(record.isActive)
    };
  }

  private mapPushSubscriptionRecord(record: Record<string, unknown>): PushSubscription {
    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      endpoint: record.endpoint == null ? '' : String(record.endpoint),
      p256dh: record.p256dh == null ? '' : String(record.p256dh),
      auth: record.auth == null ? '' : String(record.auth),
      isActive: record.isActive == null ? true : Boolean(record.isActive),
      createdAt: this.toDateString(record.createdAt),
      updatedAt: this.toDateString(record.updatedAt),
      deviceName: record.deviceName == null ? null : String(record.deviceName)
    };
  }

  private mapNotificationRecord(record: Record<string, unknown>): Notification {
    return {
      id: Number(record.id),
      userId: Number(record.userId ?? 0),
      title: record.title == null ? '' : String(record.title),
      message: record.message == null ? '' : String(record.message),
      type: record.type == null ? 'general' : String(record.type),
      isRead: record.isRead == null ? false : Boolean(record.isRead),
      createdAt: this.toDateString(record.createdAt)
    };
  }

  // ========== USUÁRIOS ==========
  async getAllUsers(): Promise<User[]> {
    try {
      const result = await db.select().from(schema.users).orderBy(asc(schema.users.id));
      return result.map(user => this.toUser(user));
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
  }

  async getVisitedUsers(): Promise<User[]> {
    try {
      const result = await db
        .select()
        .from(schema.users)
        .where(
          and(
            or(eq(schema.users.role, 'member'), eq(schema.users.role, 'missionary')),
            drizzleSql`extra_data->>'visited' = 'true'`
          )
        )
        .orderBy(schema.users.id);
      return result.map(user => this.toUser(user));
    } catch (error) {
      console.error('Erro ao buscar usuários visitados:', error);
      return [];
    }
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
      const row = result[0] || null;
      return row ? this.toUser(row) : null;
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      const row = result[0] || null;
      return row ? this.toUser(row) : null;
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      return null;
    }
  }

  async createUser(userData: CreateUserInput): Promise<User> {
    try {
      // Hash da senha - garantir que sempre tenha uma senha
      const password = userData.password || 'temp123';
      let hashedPassword = password;
      if (!password.startsWith('$2')) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      const newUser = {
        ...userData,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(schema.users).values(newUser as typeof schema.users.$inferInsert).returning();
      return this.toUser(result[0]);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: UpdateUserInput): Promise<User | null> {
    try {
      // Hash da senha se fornecida
      if (updates.password && !updates.password.startsWith('$2')) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      // Converter level para string se for número
      const dbUpdates: Record<string, unknown> = { ...updates, updatedAt: new Date() };
      if (typeof dbUpdates.level === 'number') {
        dbUpdates.level = String(dbUpdates.level);
      }

      const result = await db
        .update(schema.users)
        .set(dbUpdates as typeof schema.users.$inferInsert)
        .where(eq(schema.users.id, id))
        .returning();

      return result[0] ? this.toUser(result[0]) : null;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return null;
    }
  }

  async updateUserDirectly(id: number, updates: UpdateUserInput): Promise<User | null> {
    try {
      console.log(`🔄 Atualizando usuário ${id} diretamente com:`, updates);
      
      // Hash da senha se fornecida
      if (updates.password && !updates.password.startsWith('$2')) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      const updatedAt = new Date();

      // Usar consulta SQL direta para garantir que funcione
      const extraDataString = typeof updates.extraData === 'object' ? 
        JSON.stringify(updates.extraData) : 
        updates.extraData;

      const result = await neonSql`
        UPDATE users 
        SET extra_data = ${extraDataString}::jsonb, updated_at = ${updatedAt}
        WHERE id = ${id}
        RETURNING id, name, extra_data, updated_at
      `;

      console.log(`✅ Usuário ${id} atualizado diretamente:`, result[0]?.extra_data);
      return await this.getUserById(id);
    } catch (error) {
      console.error('Erro ao atualizar usuário diretamente:', error);
      return null;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Verificar se é super administrador
      const user = await this.getUserById(id);
      if (user && isSuperAdmin(this.toPermissionUser(user))) {
        throw new Error("Não é possível excluir o Super Administrador do sistema");
      }

      // Verificar se é administrador (pastor ou superadmin)
      if (user && hasAdminAccess(this.toPermissionUser(user))) {
        throw new Error("Não é possível excluir usuários administradores do sistema");
      }

      await db.delete(schema.users).where(eq(schema.users.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }
  }

  // ========== IGREJAS ==========
  async getAllChurches(): Promise<Church[]> {
    try {
      const result = await db.select().from(schema.churches).orderBy(asc(schema.churches.id));
      return result as unknown as Church[];
    } catch (error) {
      console.error('Erro ao buscar igrejas:', error);
      return [];
    }
  }

  async getChurchesByDistrict(districtId: number): Promise<Church[]> {
    try {
      const result = await db.select()
        .from(schema.churches)
        .where(eq(schema.churches.districtId, districtId))
        .orderBy(asc(schema.churches.id));
      return result as unknown as Church[];
    } catch (error) {
      console.error('Erro ao buscar igrejas por distrito:', error);
      return [];
    }
  }

  async getChurchById(id: number): Promise<Church | null> {
    try {
      const result = await db.select().from(schema.churches).where(eq(schema.churches.id, id)).limit(1);
      return (result[0] || null) as unknown as Church | null;
    } catch (error) {
      console.error('Erro ao buscar igreja por ID:', error);
      return null;
    }
  }

  async createChurch(churchData: CreateChurchInput): Promise<Church> {
    try {
      const providedCode = (churchData as { code?: string | null }).code;
      const code = await this.resolveChurchCode(churchData.name, providedCode);
      const newChurch = {
        ...churchData,
        code,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(schema.churches).values(newChurch).returning();
      return result[0] as unknown as Church;
    } catch (error) {
      console.error('Erro ao criar igreja:', error);
      throw error;
    }
  }

  async updateChurch(id: number, updates: UpdateChurchInput): Promise<Church | null> {
    try {
      const dbUpdates: Record<string, unknown> = { ...updates, updatedAt: new Date() };

      const result = await db
        .update(schema.churches)
        .set(dbUpdates)
        .where(eq(schema.churches.id, id))
        .returning();

      return (result[0] || null) as unknown as Church | null;
    } catch (error) {
      console.error('Erro ao atualizar igreja:', error);
      return null;
    }
  }

  async deleteChurch(id: number): Promise<boolean> {
    try {
      await db.delete(schema.churches).where(eq(schema.churches.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar igreja:', error);
      return false;
    }
  }

  // ========== EVENTOS ==========
  async getAllEvents(): Promise<Event[]> {
    try {
      // Selecionar apenas as colunas que existem no banco
      const result = await db.select({
        id: schema.events.id,
        title: schema.events.title,
        description: schema.events.description,
        date: schema.events.date,
        endDate: schema.events.endDate,
        location: schema.events.location,
        type: schema.events.type,
        color: schema.events.color,
        capacity: schema.events.capacity,
        isRecurring: schema.events.isRecurring,
        recurrencePattern: schema.events.recurrencePattern,
        createdBy: schema.events.createdBy,
        churchId: schema.events.churchId,
        createdAt: schema.events.createdAt,
        updatedAt: schema.events.updatedAt
      }).from(schema.events).orderBy(desc(schema.events.date));
      
      // TEMPORÁRIO: Adicionar eventos específicos para teste
      return result as unknown as Event[];
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      return [];
    }
  }

  async getEventById(id: number): Promise<Event | null> {
    try {
      const result = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
      return (result[0] || null) as unknown as Event | null;
    } catch (error) {
      console.error('Erro ao buscar evento por ID:', error);
      return null;
    }
  }

  async createEvent(eventData: CreateEventInput): Promise<Event> {
    try {
      const eventExtras = eventData as CreateEventInput & {
        endDate?: string | null;
        type?: string;
        organizerId?: number | null;
        maxParticipants?: number | null;
        capacity?: number | null;
        color?: string | null;
        churchId?: number | null;
        time?: string;
      };
      const baseDate = new Date(eventExtras.date);
      if (eventExtras.time) {
        const [hours, minutes] = eventExtras.time.split(':');
        const parsedHours = Number(hours);
        const parsedMinutes = Number(minutes);
        if (!Number.isNaN(parsedHours)) {
          baseDate.setHours(parsedHours);
        }
        if (!Number.isNaN(parsedMinutes)) {
          baseDate.setMinutes(parsedMinutes);
        }
      }

      const newEvent = {
        title: eventExtras.title || 'Evento',
        description: eventExtras.description ?? null,
        date: baseDate,
        endDate: eventExtras.endDate ? new Date(eventExtras.endDate) : null,
        location: eventExtras.location ?? null,
        type: eventExtras.type || 'evento',
        color: eventExtras.color ?? null,
        capacity: eventExtras.capacity ?? eventExtras.maxParticipants ?? null,
        isRecurring: eventExtras.isRecurring ?? false,
        recurrencePattern: eventExtras.recurrencePattern ?? null,
        createdBy: eventExtras.organizerId ?? null,
        churchId: eventExtras.churchId ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(schema.events).values(newEvent as typeof schema.events.$inferInsert).returning();
      return result[0] as unknown as Event;
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      throw error;
    }
  }

  async updateEvent(id: number, updates: UpdateEventInput): Promise<Event | null> {
    try {
      const updatesExtras = updates as UpdateEventInput & {
        endDate?: string | null;
        type?: string;
        organizerId?: number | null;
        maxParticipants?: number | null;
        capacity?: number | null;
        color?: string | null;
        churchId?: number | null;
        time?: string;
      };
      const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };

      if (updatesExtras.title !== undefined) dbUpdates.title = updatesExtras.title;
      if (updatesExtras.description !== undefined) dbUpdates.description = updatesExtras.description ?? null;
      if (updatesExtras.location !== undefined) dbUpdates.location = updatesExtras.location ?? null;
      if (updatesExtras.type !== undefined) dbUpdates.type = updatesExtras.type;
      if (updatesExtras.isRecurring !== undefined) dbUpdates.isRecurring = updatesExtras.isRecurring;
      if (updatesExtras.recurrencePattern !== undefined) dbUpdates.recurrencePattern = updatesExtras.recurrencePattern ?? null;
      if (updatesExtras.maxParticipants !== undefined) dbUpdates.capacity = updatesExtras.maxParticipants ?? null;
      if (updatesExtras.capacity !== undefined) dbUpdates.capacity = updatesExtras.capacity ?? null;
      if (updatesExtras.organizerId !== undefined) dbUpdates.createdBy = updatesExtras.organizerId ?? null;
      if (updatesExtras.color !== undefined) dbUpdates.color = updatesExtras.color ?? null;
      if (updatesExtras.churchId !== undefined) dbUpdates.churchId = updatesExtras.churchId ?? null;
      if (updatesExtras.date !== undefined) {
        const nextDate = new Date(updatesExtras.date);
        if (updatesExtras.time) {
          const [hours, minutes] = updatesExtras.time.split(':');
          const parsedHours = Number(hours);
          const parsedMinutes = Number(minutes);
          if (!Number.isNaN(parsedHours)) {
            nextDate.setHours(parsedHours);
          }
          if (!Number.isNaN(parsedMinutes)) {
            nextDate.setMinutes(parsedMinutes);
          }
        }
        dbUpdates.date = nextDate;
      }
      if (updatesExtras.endDate !== undefined) {
        dbUpdates.endDate = updatesExtras.endDate ? new Date(updatesExtras.endDate) : null;
      }

      const result = await db
        .update(schema.events)
        .set(dbUpdates)
        .where(eq(schema.events.id, id))
        .returning();

      return (result[0] || null) as unknown as Event | null;
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      return null;
    }
  }

  async deleteEvent(id: number): Promise<boolean> {
    try {
      await db.delete(schema.events).where(eq(schema.events.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar evento:', error);
      return false;
    }
  }

  // ========== DADOS DETALHADOS DO USUÁRIO ==========
  async getUserDetailedData(userId: number): Promise<User | null> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return null;

      // Extrair dados do extraData se existir
      let extraData: Record<string, unknown> = {};
      if (user.extraData) {
        if (typeof user.extraData === 'string') {
          try {
            extraData = JSON.parse(user.extraData);
          } catch (e) {
            console.error('Erro ao fazer parse do extraData:', e);
            extraData = {};
          }
        } else if (typeof user.extraData === 'object') {
          extraData = user.extraData;
        }
      }

      return {
        ...user,
        extraData
      };
    } catch (error) {
      console.error('Erro ao buscar dados detalhados do usuário:', error);
      return null;
    }
  }

  // ========== CONFIGURAÇÃO DE PONTOS ==========
  async getPointsConfiguration(): Promise<PointsConfiguration> {
    try {
      // Buscar configurações do banco de dados
      const configs = await db.select().from(schema.pointConfigs);
      
      if (configs.length === 0) {
        // Se não há configurações, retornar valores padrão
        return this.getDefaultPointsConfiguration();
      }
      
      const resolved = this.getDefaultPointsConfiguration();
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
      console.error('❌ Erro ao buscar configuração de pontos:', error);
      return this.getDefaultPointsConfiguration();
    }
  }
  
  private getDefaultPointsConfiguration(): PointsConfiguration {
    return {
      basicPoints: 25,
      attendancePoints: 25,
      eventPoints: 50,
      donationPoints: 75,
      engajamento: {
        baixo: 25,
        medio: 50,
        alto: 75
      },
      classificacao: {
        frequente: 75,
        naoFrequente: 25
      },
      dizimista: {
        naoDizimista: 0,
        pontual: 50,
        sazonal: 75,
        recorrente: 100
      },
      ofertante: {
        naoOfertante: 0,
        pontual: 50,
        sazonal: 75,
        recorrente: 100
      },
      tempoBatismo: {
        doisAnos: 50,
        cincoAnos: 75,
        dezAnos: 100,
        vinteAnos: 150,
        maisVinte: 200
      },
      cargos: {
        umCargo: 50,
        doisCargos: 100,
        tresOuMais: 150
      },
      nomeUnidade: {
        comUnidade: 25,
        semUnidade: 0
      },
      temLicao: {
        comLicao: 50
      },
      pontuacaoDinamica: {
        multiplicador: 25
      },
      totalPresenca: {
        zeroATres: 25,
        quatroASete: 50,
        oitoATreze: 100
      },
      presenca: {
        multiplicador: 5
      },
      escolaSabatina: {
        comunhao: 50,
        missao: 75,
        estudoBiblico: 100,
        batizouAlguem: 200,
        discipuladoPosBatismo: 50
      },
      batizouAlguem: {
        sim: 200,
        nao: 0
      },
      discipuladoPosBatismo: {
        multiplicador: 50
      },
      cpfValido: {
        valido: 25,
        invalido: 0
      },
      camposVaziosACMS: {
        completos: 50,
        incompletos: 0
      }
    };
  }

  async savePointsConfiguration(config: PointsConfiguration): Promise<void> {
    try {
      
      // Limpar configurações existentes
      await db.delete(schema.pointConfigs);
      
      // Salvar configurações básicas
      const basicConfigs = [
        { name: 'basicPoints', value: config.basicPoints || 100, category: 'basic' },
        { name: 'attendancePoints', value: config.attendancePoints || 10, category: 'basic' },
        { name: 'eventPoints', value: config.eventPoints || 20, category: 'basic' },
        { name: 'donationPoints', value: config.donationPoints || 50, category: 'basic' }
      ];
      
      // Salvar configurações de engajamento
      const engajamentoConfigs = [
        { name: 'engajamento_baixo', value: config.engajamento?.baixo || 10, category: 'engajamento' },
        { name: 'engajamento_medio', value: config.engajamento?.medio || 25, category: 'engajamento' },
        { name: 'engajamento_alto', value: config.engajamento?.alto || 50, category: 'engajamento' }
      ];
      
      // Salvar configurações de classificação
      const classificacaoConfigs = [
        { name: 'classificacao_frequente', value: config.classificacao?.frequente || 30, category: 'classificacao' },
        { name: 'classificacao_naoFrequente', value: config.classificacao?.naoFrequente || 5, category: 'classificacao' }
      ];
      
      // Salvar configurações de dízimo
      const dizimistaConfigs = [
        { name: 'dizimista_naoDizimista', value: config.dizimista?.naoDizimista || 0, category: 'dizimista' },
        { name: 'dizimista_pontual', value: config.dizimista?.pontual || 20, category: 'dizimista' },
        { name: 'dizimista_sazonal', value: config.dizimista?.sazonal || 15, category: 'dizimista' },
        { name: 'dizimista_recorrente', value: config.dizimista?.recorrente || 40, category: 'dizimista' }
      ];
      
      // Salvar configurações de oferta
      const ofertanteConfigs = [
        { name: 'ofertante_naoOfertante', value: config.ofertante?.naoOfertante || 0, category: 'ofertante' },
        { name: 'ofertante_pontual', value: config.ofertante?.pontual || 15, category: 'ofertante' },
        { name: 'ofertante_sazonal', value: config.ofertante?.sazonal || 10, category: 'ofertante' },
        { name: 'ofertante_recorrente', value: config.ofertante?.recorrente || 30, category: 'ofertante' }
      ];
      
      // Salvar configurações de tempo de batismo
      const tempoBatismoConfigs = [
        { name: 'tempoBatismo_doisAnos', value: config.tempoBatismo?.doisAnos || 10, category: 'tempoBatismo' },
        { name: 'tempoBatismo_cincoAnos', value: config.tempoBatismo?.cincoAnos || 20, category: 'tempoBatismo' },
        { name: 'tempoBatismo_dezAnos', value: config.tempoBatismo?.dezAnos || 30, category: 'tempoBatismo' },
        { name: 'tempoBatismo_vinteAnos', value: config.tempoBatismo?.vinteAnos || 40, category: 'tempoBatismo' },
        { name: 'tempoBatismo_maisVinte', value: config.tempoBatismo?.maisVinte || 50, category: 'tempoBatismo' }
      ];
      
      // Salvar configurações de cargos
      const cargosConfigs = [
        { name: 'cargos_umCargo', value: config.cargos?.umCargo || 50, category: 'cargos' },
        { name: 'cargos_doisCargos', value: config.cargos?.doisCargos || 100, category: 'cargos' },
        { name: 'cargos_tresOuMais', value: config.cargos?.tresOuMais || 150, category: 'cargos' }
      ];
      
      // Salvar configurações de unidade
      const unidadeConfigs = [
        { name: 'nomeUnidade_comUnidade', value: config.nomeUnidade?.comUnidade || 15, category: 'nomeUnidade' },
        { name: 'nomeUnidade_semUnidade', value: config.nomeUnidade?.semUnidade || 0, category: 'nomeUnidade' }
      ];
      
      // Salvar configurações de tem lição
      const temLicaoConfigs = [
        { name: 'temLicao_comLicao', value: config.temLicao?.comLicao || 50, category: 'temLicao' }
      ];
      
      // Salvar configurações de multiplicadores
      const multiplicadorConfigs = [
        { name: 'pontuacaoDinamica_multiplicador', value: config.pontuacaoDinamica?.multiplicador || 5, category: 'multiplicador' },
        { name: 'presenca_multiplicador', value: config.presenca?.multiplicador || 2, category: 'multiplicador' }
      ];
      
      // Salvar configurações de batismo
      const batismoConfigs = [
        { name: 'batizouAlguem_sim', value: config.batizouAlguem?.sim || 100, category: 'batismo' },
        { name: 'batizouAlguem_nao', value: config.batizouAlguem?.nao || 0, category: 'batismo' }
      ];
      
      // Salvar configurações de discipulado
      const discipuladoConfigs = [
        { name: 'discipuladoPosBatismo_multiplicador', value: config.discipuladoPosBatismo?.multiplicador || 10, category: 'discipulado' }
      ];
      
      // Salvar configurações de CPF
      const cpfConfigs = [
        { name: 'cpfValido_valido', value: config.cpfValido?.valido || 20, category: 'cpf' },
        { name: 'cpfValido_invalido', value: config.cpfValido?.invalido || 0, category: 'cpf' }
      ];
      
      // Salvar configurações de campos
      const camposConfigs = [
        { name: 'camposVaziosACMS_completos', value: config.camposVaziosACMS?.completos || 25, category: 'campos' },
        { name: 'camposVaziosACMS_incompletos', value: config.camposVaziosACMS?.incompletos || 0, category: 'campos' }
      ];
      
      // Salvar configurações de total de presença
      const totalPresencaConfigs = [
        { name: 'totalPresenca_zeroATres', value: config.totalPresenca?.zeroATres || 25, category: 'totalPresenca' },
        { name: 'totalPresenca_quatroASete', value: config.totalPresenca?.quatroASete || 50, category: 'totalPresenca' },
        { name: 'totalPresenca_oitoATreze', value: config.totalPresenca?.oitoATreze || 100, category: 'totalPresenca' }
      ];
      
      // Salvar configurações de escola sabatina
      const escolaSabatinaConfigs = [
        { name: 'escolaSabatina_comunhao', value: config.escolaSabatina?.comunhao || 50, category: 'escolaSabatina' },
        { name: 'escolaSabatina_missao', value: config.escolaSabatina?.missao || 75, category: 'escolaSabatina' },
        { name: 'escolaSabatina_estudoBiblico', value: config.escolaSabatina?.estudoBiblico || 100, category: 'escolaSabatina' },
        { name: 'escolaSabatina_batizouAlguem', value: config.escolaSabatina?.batizouAlguem || 200, category: 'escolaSabatina' },
        { name: 'escolaSabatina_discipuladoPosBatismo', value: config.escolaSabatina?.discipuladoPosBatismo || 25, category: 'escolaSabatina' }
      ];
      
      // Combinar todas as configurações
      const allConfigs = [
        ...basicConfigs,
        ...engajamentoConfigs,
        ...classificacaoConfigs,
        ...dizimistaConfigs,
        ...ofertanteConfigs,
        ...tempoBatismoConfigs,
        ...cargosConfigs,
        ...unidadeConfigs,
        ...temLicaoConfigs,
        ...multiplicadorConfigs,
        ...batismoConfigs,
        ...discipuladoConfigs,
        ...cpfConfigs,
        ...camposConfigs,
        ...totalPresencaConfigs,
        ...escolaSabatinaConfigs
      ];
      
      // Inserir todas as configurações
      await db.insert(schema.pointConfigs).values(allConfigs);
      
      
    } catch (error) {
      console.error('❌ Erro ao salvar configuração de pontos:', error);
      throw error;
    }
  }

  async resetPointsConfiguration(): Promise<void> {
    try {
      // Limpar todas as configurações de pontos
      await db.delete(schema.pointConfigs);
      console.log('✅ Configuração de pontos resetada');
    } catch (error) {
      console.error('❌ Erro ao resetar configuração de pontos:', error);
      throw error;
    }
  }

  async resetAllUserPoints(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      console.log('🔄 Zerando pontos de todos os usuários...');
      
      // Zerar pontos de todos os usuários
      await db.update(schema.users).set({ points: 0 });
      
      console.log('✅ Pontos zerados para todos os usuários');
      
      return { 
        success: true, 
        message: 'Pontos zerados para todos os usuários'
      };
      
    } catch (error) {
      console.error('❌ Erro ao zerar pontos:', error);
      return { success: false, message: 'Erro ao zerar pontos', error: (error as Error).message };
    }
  }

  async calculateUserPoints(userId: number): Promise<PointsCalculationResult> {
    try {
      // Buscar dados do usuário diretamente
      const userResult = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
      
      if (!userResult || userResult.length === 0) {
        return { success: false, message: 'Usuário não encontrado' };
      }
      
      const userData = userResult[0];
      
      if (!userData) {
        console.log('❌ Usuário não encontrado no banco de dados');
        return { success: false, message: 'Usuário não encontrado' };
      }
      
      // Pular Super Admin - não deve ter pontos
      if (isSuperAdmin(this.toPermissionUser(userData))) {
        return { success: true, points: 0, breakdown: {}, message: 'Admin não possui pontos' };
      }
      
      // Buscar configuração de pontos
      const pointsConfig = await this.getPointsConfiguration();
      // Log removido para reduzir verbosidade em produção
      
      // Parsear extraData se for string
      let extraData: Record<string, unknown> = {};
      if (typeof userData.extraData === 'string') {
        try {
          extraData = JSON.parse(userData.extraData);
    } catch (error) {
          console.log('⚠️ Erro ao parsear extraData:', error);
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
      const departamentosCargos = String(userData.departamentosCargos || extraData?.departamentosCargos || '').trim();
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
      if (batizouAlguemValue === 'Sim' || batizouAlguemValue === true || batizouAlguemValue === 'true') {
        pointsBreakdown.batizouAlguem = pointsConfig.escolaSabatina.batizouAlguem;
        totalPoints += pointsConfig.escolaSabatina.batizouAlguem;
      }

      // 12. DISCIPULADO PÓS-BATISMO (campo direto em userData)
      const discipuladoPosBatismoValue = Number(userData.discPosBatismal ?? extraData?.discPosBatismal ?? 0);
      if (discipuladoPosBatismoValue > 0) {
        const pontosDiscipulado = discipuladoPosBatismoValue * pointsConfig.escolaSabatina.discipuladoPosBatismo;
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
          extraData: extraData
        }
      };
      
    } catch (error) {
      console.error('❌ Erro ao calcular pontos:', error);
      return { success: false, message: 'Erro ao calcular pontos', error: (error as Error).message };
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
      // Buscar configuração de pontos uma vez só
      const pointsConfig = await this.getPointsConfiguration();
      
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

        // 1. ENGAJAMENTO
        const engajamentoValue = (userData as any).engajamento || extraData?.engajamento;
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
        const classificacaoValue = (userData as any).classificacao || extraData?.classificacao;
        if (classificacaoValue) {
          const classificacao = String(classificacaoValue).toLowerCase();
          if (classificacao.includes('frequente') && !classificacao.includes('não')) {
            totalPoints += pointsConfig.classificacao?.frequente ?? 0;
          } else {
            totalPoints += pointsConfig.classificacao?.naoFrequente ?? 0;
          }
        }

        // 3. DIZIMISTA
        const dizimistaValue = (userData as any).dizimistaType || extraData?.dizimistaType;
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
        const ofertanteValue = (userData as any).ofertanteType || extraData?.ofertanteType;
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
        const tempoBatismo = (userData as any).tempoBatismoAnos || extraData?.tempoBatismoAnos;
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
        const temLicao = (userData as any).temLicao ?? extraData?.temLicao;
        if (temLicao === true && pointsConfig.temLicao) {
          totalPoints += pointsConfig.temLicao.comLicao ?? 0;
        }

        // 7. TOTAL PRESENÇA (usa multiplicador)
        const totalPresenca = (userData as any).totalPresenca ?? extraData?.totalPresenca;
        if (totalPresenca !== null && totalPresenca !== undefined) {
          const presencas = Number(totalPresenca);
          if (!isNaN(presencas) && pointsConfig.presenca) {
            totalPoints += presencas * (pointsConfig.presenca.multiplicador ?? 0);
          }
        }

        // 8. CPF VÁLIDO
        const cpfValido = (userData as any).cpfValido ?? extraData?.cpfValido;
        if (cpfValido !== undefined && pointsConfig.cpfValido) {
          if (cpfValido === true) {
            totalPoints += pointsConfig.cpfValido.valido ?? 0;
          } else {
            totalPoints += pointsConfig.cpfValido.invalido ?? 0;
          }
        }

        // 9. CAMPOS VAZIOS
        const camposVazios = (userData as any).camposVazios ?? extraData?.camposVazios;
        if (camposVazios !== undefined && pointsConfig.camposVaziosACMS) {
          if (camposVazios === false) {
            totalPoints += pointsConfig.camposVaziosACMS.completos ?? 0;
          } else {
            totalPoints += pointsConfig.camposVaziosACMS.incompletos ?? 0;
          }
        }

        // 10. BATIZOU ALGUÉM
        const batizouAlguem = (userData as any).batizouAlguem ?? extraData?.batizouAlguem;
        if (batizouAlguem === true && pointsConfig.batizouAlguem) {
          totalPoints += pointsConfig.batizouAlguem.sim ?? 0;
        }

        // Arredondar para inteiro
        pointsMap.set(userData.id, Math.round(totalPoints));
      }
      
    } catch (error) {
      console.error('❌ Erro ao calcular pontos em batch:', error);
    }
    
    return pointsMap;
  }

  // Método para recalcular pontos de todos os usuários
  async calculateAdvancedUserPoints(): Promise<PointsRecalculationResult> {
    try {
      // Buscar todos os usuários
      const users = await this.getAllUsers();
      
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
      await db.update(schema.users)
                .set({ points: calculation.points })
                .where(eq(schema.users.id, user.id));
              
          updatedCount++;
            }
            
            results.push({
              userId: user.id,
              name: user.name,
              points: calculation.points,
              updated: user.points !== calculation.points
            });
      } else {
            errorCount++;
          }
        } catch (userError) {
          errorCount++;
        }
      }
      
      return {
        success: true,
        message: `Pontos recalculados para ${users.length} usuários. ${updatedCount} atualizados.`,
        updatedUsers: updatedCount,
        totalUsers: users.length,
        errors: errorCount,
        results
      };
      
    } catch (error) {
      console.error('❌ Erro ao recalcular pontos:', error);
        return {
        success: false, 
        message: 'Erro ao recalcular pontos', 
        error: (error as Error).message 
      };
    }
  }

  // ========== MÉTODOS ADICIONAIS (Sistema, Logo, etc) ==========
  
  async saveSystemLogo(logoData: string): Promise<void> {
    try {
      await db.insert(schema.systemSettings)
        .values({
          key: 'system_logo',
          value: logoData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: schema.systemSettings.key,
          set: {
            value: logoData,
            updatedAt: new Date()
          }
        });
    } catch (error) {
      console.error('Erro ao salvar logo do sistema:', error);
      throw error;
    }
  }

  async getSystemLogo(): Promise<string | null> {
    try {
      const result = await db.select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.key, 'system_logo'))
        .limit(1);
      
      const value = result[0]?.value;
      if (value == null) {
        return null;
      }
      if (typeof value === 'string') {
        return value;
      }
      return JSON.stringify(value);
    } catch (error) {
      console.error('Erro ao buscar logo do sistema:', error);
      return null;
    }
  }

  async clearSystemLogo(): Promise<void> {
    try {
      await db.delete(schema.systemSettings)
        .where(eq(schema.systemSettings.key, 'system_logo'));
    } catch (error) {
      console.error('Erro ao limpar logo do sistema:', error);
      throw error;
    }
  }

  async saveSystemSetting(key: string, value: unknown): Promise<void> {
    try {
      await db.insert(schema.systemSettings)
        .values({
          key,
          value: JSON.stringify(value),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: schema.systemSettings.key,
          set: {
            value: JSON.stringify(value),
            updatedAt: new Date()
          }
        });
    } catch (error) {
      console.error('Erro ao salvar configuração do sistema:', error);
      throw error;
    }
  }

  async getSystemSetting(key: string): Promise<unknown | null> {
    try {
      const result = await db.select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.key, key))
        .limit(1);
      
      const value = result[0]?.value;
      if (value == null) {
        return null;
      }
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    } catch (error) {
      console.error('Erro ao buscar configuração do sistema:', error);
      return null;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      console.log('🧹 Iniciando limpeza completa de todos os dados do sistema...');
      
      // Deletar dados das tabelas em ordem (respeitando foreign keys)
      // Tabelas dependentes primeiro
      console.log('  🗑️ Limpando participantes de vídeo...');
      await db.delete(schema.videoCallParticipants);
      
      console.log('  🗑️ Limpando participantes de conversas...');
      await db.delete(schema.conversationParticipants);
      
      console.log('  🗑️ Limpando participantes de eventos...');
      await db.delete(schema.eventParticipants);
      
      console.log('  🗑️ Limpando intercessores de oração...');
      await db.delete(schema.prayerIntercessors);
      
      console.log('  🗑️ Limpando conquistas de usuários...');
      await db.delete(schema.userAchievements);
      
      console.log('  🗑️ Limpando histórico de pontos...');
      await db.delete(schema.userPointsHistory);
      
      console.log('  🗑️ Limpando atividades de pontos...');
      await db.delete(schema.pointActivities);
      
      console.log('  🗑️ Limpando mensagens...');
      await db.delete(schema.messages);
      
      // Tabelas principais
      console.log('  🗑️ Limpando sessões de vídeo...');
      await db.delete(schema.videoCallSessions);
      
      console.log('  🗑️ Limpando conversas...');
      await db.delete(schema.conversations);
      
      console.log('  🗑️ Limpando eventos...');
      await db.delete(schema.events);
      
      console.log('  🗑️ Limpando reuniões...');
      await db.delete(schema.meetings);
      
      console.log('  🗑️ Limpando orações...');
      await db.delete(schema.prayers);
      
      console.log('  🗑️ Limpando notificações...');
      await db.delete(schema.notifications);
      
      console.log('  🗑️ Limpando subscriptions push...');
      await db.delete(schema.pushSubscriptions);
      
      console.log('  🗑️ Limpando check-ins emocionais...');
      await db.delete(schema.emotionalCheckins);
      
      console.log('  🗑️ Limpando relacionamentos...');
      await db.delete(schema.relationships);
      
      console.log('  🗑️ Limpando solicitações de discipulado...');
      await db.delete(schema.discipleshipRequests);
      
      console.log('  🗑️ Limpando perfis missionários...');
      await db.delete(schema.missionaryProfiles);
      
      console.log('  🗑️ Limpando tipos de reunião...');
      await db.delete(schema.meetingTypes);
      
      console.log('  🗑️ Limpando conquistas...');
      await db.delete(schema.achievements);
      
      console.log('  🗑️ Limpando configurações de pontos...');
      await db.delete(schema.pointConfigs);
      
      console.log('  🗑️ Limpando igrejas...');
      await db.delete(schema.churches);
      
      // Deletar TODOS os usuários EXCETO os admins
      console.log('  🗑️ Limpando usuários (mantendo admin)...');
      await db.delete(schema.users)
        .where(ne(schema.users.role, 'admin'));
      
      console.log('✅ Todos os dados foram limpos com sucesso!');
      console.log('ℹ️ Mantidos: usuários admin, configurações do sistema e permissões');
    } catch (error) {
      console.error('❌ Erro ao limpar dados:', error);
      throw error;
    }
  }

  // ========== MÉTODOS PRIORITÁRIOS (TOP 10 MAIS USADOS) ==========

  // 0. getAllRelationships - Busca todos os relacionamentos
  async getAllRelationships(): Promise<Relationship[]> {
    try {
      const relationships = await db.select()
        .from(schema.relationships);
      return relationships.map(relationship => this.mapRelationshipRecord(relationship));
    } catch (error) {
      console.error('Erro ao buscar todos os relacionamentos:', error);
      return [];
    }
  }

  // 1. getRelationshipsByMissionary (7x usado)
  async getRelationshipsByMissionary(missionaryId: number): Promise<Relationship[]> {
    try {
      const relationships = await db.select()
        .from(schema.relationships)
        .where(eq(schema.relationships.missionaryId, missionaryId));
      return relationships.map(relationship => this.mapRelationshipRecord(relationship));
    } catch (error) {
      console.error('Erro ao buscar relacionamentos do missionário:', error);
      return [];
    }
  }

  // 2. getMeetingsByUserId (5x usado)
  async getMeetingsByUserId(userId: number): Promise<Meeting[]> {
    try {
      const meetings = await db.select()
        .from(schema.meetings)
        .where(
          or(
            eq(schema.meetings.requesterId, userId),
            eq(schema.meetings.assignedToId, userId)
          )
        )
        .orderBy(desc(schema.meetings.scheduledAt));
      return meetings.map(meeting => this.mapMeetingRecord(meeting));
    } catch (error) {
      console.error('Erro ao buscar reuniões do usuário:', error);
      return [];
    }
  }

  // 3. getRelationshipsByInterested (4x usado)
  async getRelationshipsByInterested(interestedId: number): Promise<Relationship[]> {
    try {
      const relationships = await db.select()
        .from(schema.relationships)
        .where(eq(schema.relationships.interestedId, interestedId));
      return relationships.map(relationship => this.mapRelationshipRecord(relationship));
    } catch (error) {
      console.error('Erro ao buscar relacionamentos do interessado:', error);
      return [];
    }
  }

  async getRelationshipById(id: number): Promise<Relationship | null> {
    try {
      const relationships = await db.select()
        .from(schema.relationships)
        .where(eq(schema.relationships.id, id))
        .limit(1);
      return relationships[0] ? this.mapRelationshipRecord(relationships[0]) : null;
    } catch (error) {
      console.error('Erro ao buscar relacionamento por ID:', error);
      return null;
    }
  }

  async deleteRelationshipByInterested(interestedId: number): Promise<boolean> {
    try {
      await db.delete(schema.relationships)
        .where(eq(schema.relationships.interestedId, interestedId));
      return true;
    } catch (error) {
      console.error('Erro ao deletar relacionamento por interessado:', error);
      return false;
    }
  }

  // 4. updateUserChurch (4x usado)
  async updateUserChurch(userId: number, churchName: string): Promise<boolean> {
    try {
      await db.update(schema.users)
        .set({ church: churchName })
        .where(eq(schema.users.id, userId));
      return true;
    } catch (error) {
      console.error('Erro ao atualizar igreja do usuário:', error);
      return false;
    }
  }

  // 5. getAllDiscipleshipRequests (4x usado)
  async getAllDiscipleshipRequests(): Promise<DiscipleshipRequest[]> {
    try {
      const requests = await db.select()
        .from(schema.discipleshipRequests)
        .orderBy(desc(schema.discipleshipRequests.createdAt));
      return requests.map(request => this.mapDiscipleshipRequestRecord(request));
    } catch (error) {
      console.error('Erro ao buscar pedidos de discipulado:', error);
      return [];
    }
  }

  async getDiscipleshipRequestById(id: number): Promise<DiscipleshipRequest | null> {
    try {
      const requests = await db.select()
        .from(schema.discipleshipRequests)
        .where(eq(schema.discipleshipRequests.id, id))
        .limit(1);
      return requests[0] ? this.mapDiscipleshipRequestRecord(requests[0]) : null;
    } catch (error) {
      console.error('Erro ao buscar pedido de discipulado por ID:', error);
      return null;
    }
  }

  // 6. createRelationship (3x usado)
  async createRelationship(data: CreateRelationshipInput): Promise<Relationship> {
    try {
      const [relationship] = await db.insert(schema.relationships)
        .values({
          missionaryId: data.missionaryId,
          interestedId: data.interestedId,
          status: data.status || 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return this.mapRelationshipRecord(relationship);
    } catch (error) {
      console.error('Erro ao criar relacionamento:', error);
      throw error;
    }
  }

  // 7. getEventPermissions (3x usado)
  async getEventPermissions(): Promise<EventPermissions | null> {
    try {
      const permissions = await db.select()
        .from(schema.eventFilterPermissions)
        .limit(1);
      
      if (permissions.length > 0) {
        return typeof permissions[0].permissions === 'string' 
          ? JSON.parse(permissions[0].permissions)
          : permissions[0].permissions;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar permissões de eventos:', error);
      return null;
    }
  }

  // 8. getEmotionalCheckInsForAdmin (3x usado)
  async getEmotionalCheckInsForAdmin(): Promise<EmotionalCheckIn[]> {
    try {
      const checkIns = await db.select()
        .from(schema.emotionalCheckins)
        .orderBy(desc(schema.emotionalCheckins.createdAt));
      return checkIns.map(checkIn => this.mapEmotionalCheckInRecord(checkIn));
    } catch (error) {
      console.error('Erro ao buscar check-ins emocionais para admin:', error);
      return [];
    }
  }

  // 9. createDiscipleshipRequest (3x usado)
  async createDiscipleshipRequest(data: CreateDiscipleshipRequestInput): Promise<DiscipleshipRequest> {
    try {
      const [request] = await db.insert(schema.discipleshipRequests)
        .values({
          interestedId: data.interestedId,
          missionaryId: data.missionaryId ?? data.requestedMissionaryId,
          status: data.status || 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return this.mapDiscipleshipRequestRecord(request);
    } catch (error) {
      console.error('Erro ao criar pedido de discipulado:', error);
      throw error;
    }
  }

  // 10. getOrCreateChurch (3x usado)
  async getOrCreateChurch(churchName: string): Promise<Church> {
    try {
      // Buscar igreja existente
      const existing = await db.select()
        .from(schema.churches)
        .where(eq(schema.churches.name, churchName))
        .limit(1);
      
      if (existing.length > 0) {
        return this.mapChurchRecord(existing[0]);
      }
      
      const code = await this.resolveChurchCode(churchName);
      // Criar nova igreja
      const [newChurch] = await db.insert(schema.churches)
        .values({
          name: churchName,
          code,
          address: '',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return this.mapChurchRecord(newChurch);
    } catch (error) {
      console.error('Erro ao buscar/criar igreja:', error);
      throw error;
    }
  }

  // ========== MÉTODOS SECUNDÁRIOS (restantes) ==========

  // Meetings
  async getMeetingsByStatus(status: string): Promise<Meeting[]> {
    try {
      const meetings = await db.select()
        .from(schema.meetings)
        .where(eq(schema.meetings.status, status))
        .orderBy(desc(schema.meetings.scheduledAt));
      return meetings.map(meeting => this.mapMeetingRecord(meeting));
    } catch (error) {
      console.error('Erro ao buscar reuniões por status:', error);
      return [];
    }
  }

  async getAllMeetings(): Promise<Meeting[]> {
    try {
      const meetings = await db.select()
        .from(schema.meetings)
        .orderBy(desc(schema.meetings.scheduledAt));
      return meetings.map(meeting => this.mapMeetingRecord(meeting));
    } catch (error) {
      console.error('Erro ao buscar todas as reuniões:', error);
      return [];
    }
  }

  async getMeetingTypes(): Promise<MeetingType[]> {
    try {
      const types = await db.select().from(schema.meetingTypes);
      return types.map(type => this.mapMeetingTypeRecord(type));
    } catch (error) {
      console.error('Erro ao buscar tipos de reunião:', error);
      return [];
    }
  }

  // Prayers
  async getPrayers(): Promise<Prayer[]> {
    try {
      const prayers = await db.select()
        .from(schema.prayers)
        .orderBy(desc(schema.prayers.createdAt));
      return prayers.map(prayer => this.mapPrayerRecord(prayer));
    } catch (error) {
      console.error('Erro ao buscar orações:', error);
      return [];
    }
  }

  async markPrayerAsAnswered(id: number, testimony?: string): Promise<Prayer | null> {
    try {
      const [updated] = await db.update(schema.prayers)
        .set({ 
          status: 'answered',
          updatedAt: new Date()
        })
        .where(eq(schema.prayers.id, id))
        .returning();
      return updated ? this.mapPrayerRecord(updated) : null;
    } catch (error) {
      console.error('Erro ao marcar oração como respondida:', error);
      return null;
    }
  }

  async addPrayerIntercessor(prayerId: number, intercessorId: number): Promise<boolean> {
    try {
      await db.insert(schema.prayerIntercessors)
        .values({
          prayerId,
          userId: intercessorId,
          joinedAt: new Date()
        });
      return true;
    } catch (error) {
      console.error('Erro ao adicionar intercessor:', error);
      return false;
    }
  }

  async removePrayerIntercessor(prayerId: number, intercessorId: number): Promise<boolean> {
    try {
      await db.delete(schema.prayerIntercessors)
        .where(
          and(
            eq(schema.prayerIntercessors.prayerId, prayerId),
            eq(schema.prayerIntercessors.userId, intercessorId)
          )
        );
      return true;
    } catch (error) {
      console.error('Erro ao remover intercessor:', error);
      return false;
    }
  }

  async getPrayerIntercessors(prayerId: number): Promise<User[]> {
    try {
      const intercessors = await db.select()
        .from(schema.prayerIntercessors)
        .where(eq(schema.prayerIntercessors.prayerId, prayerId));
      const intercessorIds = intercessors
        .map(intercessor => intercessor.userId)
        .filter((id): id is number => typeof id === 'number');
      if (intercessorIds.length === 0) {
        return [];
      }
      const users = await db.select()
        .from(schema.users)
        .where(inArray(schema.users.id, intercessorIds));
      return users.map(user => this.toUser(user));
    } catch (error) {
      console.error('Erro ao buscar intercessores:', error);
      return [];
    }
  }

  async getPrayersUserIsPrayingFor(userId: number): Promise<Prayer[]> {
    try {
      const prayers = await db.select()
        .from(schema.prayers)
        .innerJoin(
          schema.prayerIntercessors,
          eq(schema.prayers.id, schema.prayerIntercessors.prayerId)
        )
        .where(eq(schema.prayerIntercessors.userId, userId));
      return prayers.map(prayer => this.mapPrayerRecord(prayer.prayers));
    } catch (error) {
      console.error('Erro ao buscar orações que usuário está orando:', error);
      return [];
    }
  }

  // Emotional Check-ins
  async getEmotionalCheckInsByUserId(userId: number): Promise<EmotionalCheckIn[]> {
    try {
      const checkIns = await db.select()
        .from(schema.emotionalCheckins)
        .where(eq(schema.emotionalCheckins.userId, userId))
        .orderBy(desc(schema.emotionalCheckins.createdAt));
      return checkIns.map(checkIn => this.mapEmotionalCheckInRecord(checkIn));
    } catch (error) {
      console.error('Erro ao buscar check-ins do usuário:', error);
      return [];
    }
  }

  // Discipulado
  async updateDiscipleshipRequest(id: number, updates: UpdateDiscipleshipRequestInput): Promise<DiscipleshipRequest | null> {
    try {
      const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.status !== undefined) dbUpdates.status = updates.status ?? 'pending';
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes ?? null;
      if (updates.missionaryId !== undefined) dbUpdates.missionaryId = updates.missionaryId ?? null;
      if (updates.interestedId !== undefined) dbUpdates.interestedId = updates.interestedId ?? null;
      const [updated] = await db.update(schema.discipleshipRequests)
        .set(dbUpdates)
        .where(eq(schema.discipleshipRequests.id, id))
        .returning();
      return updated ? this.mapDiscipleshipRequestRecord(updated) : null;
    } catch (error) {
      console.error('Erro ao atualizar pedido de discipulado:', error);
      return null;
    }
  }

  async deleteDiscipleshipRequest(id: number): Promise<boolean> {
    try {
      await db.delete(schema.discipleshipRequests)
        .where(eq(schema.discipleshipRequests.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar pedido de discipulado:', error);
      return false;
    }
  }

  // Relacionamentos
  async deleteRelationship(relationshipId: number): Promise<boolean> {
    try {
      await db.delete(schema.relationships)
        .where(eq(schema.relationships.id, relationshipId));
      return true;
    } catch (error) {
      console.error('Erro ao deletar relacionamento:', error);
      return false;
    }
  }

  // Chat/Mensagens
  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    try {
      const conversations = await db.select()
        .from(schema.conversations)
        .innerJoin(
          schema.conversationParticipants,
          eq(schema.conversations.id, schema.conversationParticipants.conversationId)
        )
        .where(eq(schema.conversationParticipants.userId, userId));
      return conversations.map(conversation => this.mapConversationRecord(conversation.conversations));
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      return [];
    }
  }

  async getConversationsByUser(userId: number): Promise<Conversation[]> {
    return this.getConversationsByUserId(userId);
  }

  async getAllConversations(): Promise<Conversation[]> {
    try {
      const conversations = await db.select()
        .from(schema.conversations)
        .orderBy(desc(schema.conversations.updatedAt));
      return conversations.map(conversation => this.mapConversationRecord(conversation));
    } catch (error) {
      console.error('Erro ao buscar todas as conversas:', error);
      return [];
    }
  }

  async getConversationById(id: number): Promise<Conversation | null> {
    try {
      const conversations = await db.select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, id))
        .limit(1);
      return conversations[0] ? this.mapConversationRecord(conversations[0]) : null;
    } catch (error) {
      console.error('Erro ao buscar conversa por ID:', error);
      return null;
    }
  }

  async createConversation(data: Partial<Conversation>): Promise<Conversation> {
    try {
      const [conversation] = await db.insert(schema.conversations)
        .values({
          title: data.title ?? null,
          type: data.type ?? 'private',
          createdBy: data.createdBy ?? null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return this.mapConversationRecord(conversation);
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      throw error;
    }
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | null> {
    try {
      const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.title !== undefined) dbUpdates.title = updates.title ?? null;
      if (updates.type !== undefined) dbUpdates.type = updates.type ?? 'private';
      if (updates.createdBy !== undefined) dbUpdates.createdBy = updates.createdBy ?? null;
      const [conversation] = await db.update(schema.conversations)
        .set(dbUpdates)
        .where(eq(schema.conversations.id, id))
        .returning();
      return conversation ? this.mapConversationRecord(conversation) : null;
    } catch (error) {
      console.error('Erro ao atualizar conversa:', error);
      return null;
    }
  }

  async deleteConversation(id: number): Promise<boolean> {
    try {
      await db.delete(schema.conversationParticipants)
        .where(eq(schema.conversationParticipants.conversationId, id));
      await db.delete(schema.conversations)
        .where(eq(schema.conversations.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar conversa:', error);
      return false;
    }
  }

  async getOrCreateDirectConversation(userAId: number, userBId: number): Promise<Conversation> {
    try {
      // Buscar conversa existente
      const existing = await db.select()
        .from(schema.conversations)
        .where(eq(schema.conversations.type, 'direct'))
        .limit(1);
      
      if (existing.length > 0) {
        return this.mapConversationRecord(existing[0]);
      }
      
      // Criar nova conversa
      const [conversation] = await db.insert(schema.conversations)
        .values({
          type: 'direct',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      // Adicionar participantes
      await db.insert(schema.conversationParticipants).values([
        { conversationId: conversation.id, userId: userAId, joinedAt: new Date() },
        { conversationId: conversation.id, userId: userBId, joinedAt: new Date() }
      ]);
      
      return this.mapConversationRecord(conversation);
    } catch (error) {
      console.error('Erro ao buscar/criar conversa:', error);
      throw error;
    }
  }

  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    try {
      const messages = await db.select()
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, conversationId))
        .orderBy(asc(schema.messages.createdAt));
      return messages.map(message => this.mapMessageRecord(message));
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return this.getMessagesByConversationId(conversationId);
  }

  async getAllMessages(): Promise<Message[]> {
    try {
      const messages = await db.select()
        .from(schema.messages)
        .orderBy(desc(schema.messages.createdAt));
      return messages.map(message => this.mapMessageRecord(message));
    } catch (error) {
      console.error('Erro ao buscar todas as mensagens:', error);
      return [];
    }
  }

  async getMessageById(id: number): Promise<Message | null> {
    try {
      const messages = await db.select()
        .from(schema.messages)
        .where(eq(schema.messages.id, id))
        .limit(1);
      return messages[0] ? this.mapMessageRecord(messages[0]) : null;
    } catch (error) {
      console.error('Erro ao buscar mensagem por ID:', error);
      return null;
    }
  }

  async createMessage(data: CreateMessageInput): Promise<Message> {
    try {
      const [message] = await db.insert(schema.messages)
        .values({
          content: data.content,
          senderId: data.senderId,
          conversationId: data.conversationId,
          createdAt: new Date()
        })
        .returning();
      return this.mapMessageRecord(message);
    } catch (error) {
      console.error('Erro ao criar mensagem:', error);
      throw error;
    }
  }

  async updateMessage(id: number, updates: UpdateMessageInput): Promise<Message | null> {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.senderId !== undefined) dbUpdates.senderId = updates.senderId ?? null;
      if (updates.conversationId !== undefined) dbUpdates.conversationId = updates.conversationId ?? null;
      const [message] = await db.update(schema.messages)
        .set(dbUpdates)
        .where(eq(schema.messages.id, id))
        .returning();
      return message ? this.mapMessageRecord(message) : null;
    } catch (error) {
      console.error('Erro ao atualizar mensagem:', error);
      return null;
    }
  }

  async deleteMessage(id: number): Promise<boolean> {
    try {
      await db.delete(schema.messages)
        .where(eq(schema.messages.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      return false;
    }
  }

  // Eventos
  async saveEventPermissions(permissions: EventPermissions): Promise<void> {
    try {
      const permissionsJson = JSON.stringify(permissions);
      await db.insert(schema.eventFilterPermissions)
        .values({
          permissions: permissionsJson,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: schema.eventFilterPermissions.id,
          set: {
            permissions: permissionsJson,
            updatedAt: new Date()
          }
        });
    } catch (error) {
      console.error('Erro ao salvar permissões de eventos:', error);
      throw error;
    }
  }

  async clearAllEvents(): Promise<boolean> {
    try {
      await db.delete(schema.events);
      return true;
    } catch (error) {
      console.error('Erro ao limpar eventos:', error);
      return false;
    }
  }

  // Sistema
  async getSystemConfig(key: string): Promise<unknown | null> {
    try {
      const result = await db.select()
        .from(schema.systemConfig)
        .where(eq(schema.systemConfig.key, key))
        .limit(1);
      
      const value = result[0]?.value;
      if (value == null) {
        return null;
      }
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    } catch (error) {
      console.error('Erro ao buscar config do sistema:', error);
      return null;
    }
  }

  async saveSystemConfig(key: string, value: unknown): Promise<void> {
    try {
      await db.insert(schema.systemConfig)
        .values({
          key,
          value,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: schema.systemConfig.key,
          set: {
            value,
            updatedAt: new Date()
          }
        });
    } catch (error) {
      console.error('Erro ao salvar config do sistema:', error);
      throw error;
    }
  }

  // Usuários
  async approveUser(id: number): Promise<User | null> {
    try {
      const [user] = await db.update(schema.users)
        .set({ status: 'approved' })
        .where(eq(schema.users.id, id))
        .returning();
      return user ? this.toUser(user) : null;
    } catch (error) {
      console.error('Erro ao aprovar usuário:', error);
      return null;
    }
  }

  async rejectUser(id: number): Promise<User | null> {
    try {
      const [user] = await db.update(schema.users)
        .set({ status: 'rejected' })
        .where(eq(schema.users.id, id))
        .returning();
      return user ? this.toUser(user) : null;
    } catch (error) {
      console.error('Erro ao rejeitar usuário:', error);
      return null;
    }
  }

  async setDefaultChurch(churchId: number): Promise<boolean> {
    try {
      await db.insert(schema.systemSettings)
        .values({
          key: 'default_church_id',
          value: churchId.toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: schema.systemSettings.key,
          set: {
            value: churchId.toString(),
            updatedAt: new Date()
          }
        });
      return true;
    } catch (error) {
      console.error('Erro ao definir igreja padrão:', error);
      return false;
    }
  }

  // Pontos
  async getAllPointActivities(): Promise<PointActivity[]> {
    try {
      const activities = await db.select()
        .from(schema.pointActivities)
        .orderBy(desc(schema.pointActivities.createdAt));
      return activities.map(activity => this.mapPointActivityRecord(activity));
    } catch (error) {
      console.error('Erro ao buscar atividades de pontos:', error);
      return [];
    }
  }

  async createPointActivity(data: Partial<PointActivity>): Promise<PointActivity> {
    try {
      const [activity] = await db.insert(schema.pointActivities)
        .values({
          userId: data.userId ?? null,
          activity: data.description ?? '',
          points: data.points ?? 0,
          description: data.description ?? null,
          createdAt: new Date()
        })
        .returning();
      return this.mapPointActivityRecord(activity);
    } catch (error) {
      console.error('Erro ao criar atividade de pontos:', error);
      throw error;
    }
  }

  async getAllAchievements(): Promise<Achievement[]> {
    try {
      const achievements = await db.select().from(schema.achievements);
      return achievements.map(achievement => this.mapAchievementRecord(achievement));
    } catch (error) {
      console.error('Erro ao buscar conquistas:', error);
      return [];
    }
  }

  async getAchievementById(id: number): Promise<Achievement | null> {
    try {
      const achievements = await db.select()
        .from(schema.achievements)
        .where(eq(schema.achievements.id, id))
        .limit(1);
      return achievements[0] ? this.mapAchievementRecord(achievements[0]) : null;
    } catch (error) {
      console.error('Erro ao buscar conquista por ID:', error);
      return null;
    }
  }

  async createAchievement(data: Partial<Achievement>): Promise<Achievement> {
    try {
      const [achievement] = await db.insert(schema.achievements)
        .values({
          name: data.name ?? '',
          description: data.description ?? null,
          pointsRequired: data.requiredPoints ?? 0,
          icon: data.icon ?? null,
          createdAt: new Date()
        })
        .returning();
      return this.mapAchievementRecord(achievement);
    } catch (error) {
      console.error('Erro ao criar conquista:', error);
      throw error;
    }
  }

  async updateAchievement(id: number, updates: Partial<Achievement>): Promise<Achievement | null> {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description ?? null;
      if (updates.requiredPoints !== undefined) dbUpdates.pointsRequired = updates.requiredPoints;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon ?? null;
      const [achievement] = await db.update(schema.achievements)
        .set(dbUpdates)
        .where(eq(schema.achievements.id, id))
        .returning();
      return achievement ? this.mapAchievementRecord(achievement) : null;
    } catch (error) {
      console.error('Erro ao atualizar conquista:', error);
      return null;
    }
  }

  async deleteAchievement(id: number): Promise<boolean> {
    try {
      await db.delete(schema.achievements)
        .where(eq(schema.achievements.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar conquista:', error);
      return false;
    }
  }

  // Perfil Missionário
  async getMissionaryProfileByUserId(userId: number): Promise<MissionaryProfile | null> {
    try {
      const profiles = await db.select()
        .from(schema.missionaryProfiles)
        .where(eq(schema.missionaryProfiles.userId, userId))
        .limit(1);
      return profiles[0] ? this.mapMissionaryProfileRecord(profiles[0]) : null;
    } catch (error) {
      console.error('Erro ao buscar perfil missionário:', error);
      return null;
    }
  }

  async createMissionaryProfile(data: Partial<MissionaryProfile>): Promise<MissionaryProfile> {
    try {
      const [profile] = await db.insert(schema.missionaryProfiles)
        .values({
          userId: data.userId,
          specialization: data.missionField ?? null,
          experience: data.notes ?? null,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return this.mapMissionaryProfileRecord(profile);
    } catch (error) {
      console.error('Erro ao criar perfil missionário:', error);
      throw error;
    }
  }

  async getAllMissionaryProfiles(): Promise<MissionaryProfile[]> {
    try {
      const profiles = await db.select().from(schema.missionaryProfiles);
      return profiles.map(profile => this.mapMissionaryProfileRecord(profile));
    } catch (error) {
      console.error('Erro ao buscar perfis missionários:', error);
      return [];
    }
  }

  async getMissionaryProfileById(id: number): Promise<MissionaryProfile | null> {
    try {
      const profiles = await db.select()
        .from(schema.missionaryProfiles)
        .where(eq(schema.missionaryProfiles.id, id))
        .limit(1);
      return profiles[0] ? this.mapMissionaryProfileRecord(profiles[0]) : null;
    } catch (error) {
      console.error('Erro ao buscar perfil missionário por ID:', error);
      return null;
    }
  }

  async updateMissionaryProfile(id: number, updates: Partial<MissionaryProfile>): Promise<MissionaryProfile | null> {
    try {
      const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.userId !== undefined) dbUpdates.userId = updates.userId ?? null;
      if (updates.missionField !== undefined) dbUpdates.specialization = updates.missionField ?? null;
      if (updates.notes !== undefined) dbUpdates.experience = updates.notes ?? null;
      if (updates.isActive !== undefined) dbUpdates.isActive = updates.isActive ?? true;
      const [profile] = await db.update(schema.missionaryProfiles)
        .set(dbUpdates)
        .where(eq(schema.missionaryProfiles.id, id))
        .returning();
      return profile ? this.mapMissionaryProfileRecord(profile) : null;
    } catch (error) {
      console.error('Erro ao atualizar perfil missionário:', error);
      return null;
    }
  }

  async deleteMissionaryProfile(id: number): Promise<boolean> {
    try {
      await db.delete(schema.missionaryProfiles)
        .where(eq(schema.missionaryProfiles.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar perfil missionário:', error);
      return false;
    }
  }

  async getUsersWithMissionaryProfile(): Promise<User[]> {
    try {
      const profiles = await db.select({ userId: schema.missionaryProfiles.userId }).from(schema.missionaryProfiles);
      const ids = profiles.map(profile => profile.userId).filter(Boolean) as number[];
      if (ids.length === 0) {
        return [];
      }
      const users = await db.select().from(schema.users).where(inArray(schema.users.id, ids));
      return users.map(user => this.toUser(user));
    } catch (error) {
      console.error('Erro ao buscar usuários com perfil missionário:', error);
      return [];
    }
  }

  // Igreja
  async getDefaultChurch(): Promise<Church | null> {
    try {
      const result = await db.select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.key, 'default_church_id'))
        .limit(1);
      
      const value = result[0]?.value;
      if (value != null) {
        const churchId = typeof value === 'number' ? value : parseInt(String(value), 10);
        if (!Number.isNaN(churchId)) {
          return await this.getChurchById(churchId);
        }
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar igreja padrão:', error);
      return null;
    }
  }

  // ========== MÉTODOS FINAIS (últimos 3) ==========
  
  async createEmotionalCheckIn(data: CreateEmotionalCheckInInput): Promise<EmotionalCheckIn> {
    try {
      const [checkIn] = await db.insert(schema.emotionalCheckins)
        .values({
          userId: data.userId,
          emotionalScore: data.emotionalScore ?? null,
          mood: data.mood ?? null,
          prayerRequest: data.prayerRequest ?? null,
          isPrivate: data.isPrivate ?? false,
          allowChurchMembers: data.allowChurchMembers ?? true,
          createdAt: new Date()
        })
        .returning();
      return this.mapEmotionalCheckInRecord(checkIn);
    } catch (error) {
      console.error('Erro ao criar emotional check-in:', error);
      throw error;
    }
  }

  async getPrayerById(prayerId: number): Promise<Prayer | null> {
    try {
      const prayers = await db.select()
        .from(schema.prayers)
        .where(eq(schema.prayers.id, prayerId))
        .limit(1);
      return prayers[0] ? this.mapPrayerRecord(prayers[0]) : null;
    } catch (error) {
      console.error('Erro ao buscar oração por ID:', error);
      return null;
    }
  }

  async deletePrayer(prayerId: number): Promise<boolean> {
    try {
      await db.delete(schema.prayers)
        .where(eq(schema.prayers.id, prayerId));
      return true;
    } catch (error) {
      console.error('Erro ao deletar oração:', error);
      return false;
    }
  }

  // ========== NOTIFICAÇÕES ==========
  async getAllNotifications(): Promise<Notification[]> {
    try {
      const notifications = await db.select()
        .from(schema.notifications)
        .orderBy(desc(schema.notifications.createdAt));
      return notifications.map(notification => this.mapNotificationRecord(notification));
    } catch (error) {
      console.error('Erro ao buscar todas as notificações:', error);
      return [];
    }
  }

  async getNotificationById(id: number): Promise<Notification | null> {
    try {
      const notifications = await db.select()
        .from(schema.notifications)
        .where(eq(schema.notifications.id, id))
        .limit(1);
      return notifications[0] ? this.mapNotificationRecord(notifications[0]) : null;
    } catch (error) {
      console.error('Erro ao buscar notificação por ID:', error);
      return null;
    }
  }

  async getNotificationsByUser(userId: number, limit: number = 50): Promise<Notification[]> {
    try {
      const notifications = await db.select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, userId))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(limit);
      return notifications.map(notification => this.mapNotificationRecord(notification));
    } catch (error) {
      console.error('Erro ao buscar notificações do usuário:', error);
      return [];
    }
  }

  async createNotification(data: CreateNotificationInput): Promise<Notification> {
    try {
      const [notification] = await db.insert(schema.notifications)
        .values({
          title: data.title,
          message: data.message,
          userId: data.userId,
          type: data.type || 'general',
          isRead: false,
          createdAt: new Date()
        })
        .returning();
      return this.mapNotificationRecord(notification);
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  }

  async updateNotification(id: number, updates: UpdateNotificationInput): Promise<Notification | null> {
    try {
      const [notification] = await db.update(schema.notifications)
        .set(updates)
        .where(eq(schema.notifications.id, id))
        .returning();
      return notification ? this.mapNotificationRecord(notification) : null;
    } catch (error) {
      console.error('Erro ao atualizar notificação:', error);
      return null;
    }
  }

  async markNotificationAsRead(id: number): Promise<Notification | null> {
    try {
      const [notification] = await db.update(schema.notifications)
        .set({ isRead: true })
        .where(eq(schema.notifications.id, id))
        .returning();
      return notification ? this.mapNotificationRecord(notification) : null;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return null;
    }
  }

  async deleteNotification(id: number): Promise<boolean> {
    try {
      await db.delete(schema.notifications)
        .where(eq(schema.notifications.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      return false;
    }
  }

  // ========== PUSH SUBSCRIPTIONS ==========
  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    try {
      const subscriptions = await db.select()
        .from(schema.pushSubscriptions)
        .orderBy(desc(schema.pushSubscriptions.createdAt));
      return subscriptions.map(subscription => this.mapPushSubscriptionRecord(subscription));
    } catch (error) {
      console.error('Erro ao buscar push subscriptions:', error);
      return [];
    }
  }

  async getPushSubscriptionsByUser(userId: number): Promise<PushSubscription[]> {
    try {
      const subscriptions = await db.select()
        .from(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.userId, userId))
        .orderBy(desc(schema.pushSubscriptions.createdAt));
      return subscriptions.map(subscription => this.mapPushSubscriptionRecord(subscription));
    } catch (error) {
      console.error('Erro ao buscar push subscriptions do usuário:', error);
      return [];
    }
  }

  async createPushSubscription(data: CreatePushSubscriptionInput): Promise<PushSubscription> {
    try {
      const subscriptionPayload: PushSubscriptionPayload = typeof data.subscription === 'string'
        ? JSON.parse(data.subscription)
        : data.subscription;
      // Verificar se já existe uma subscription com o mesmo endpoint
      const existing = await db.select()
        .from(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.endpoint, subscriptionPayload.endpoint))
        .limit(1);

      if (existing.length > 0) {
        // Atualizar a existente
        const [updated] = await db.update(schema.pushSubscriptions)
          .set({
            userId: data.userId,
            p256dh: subscriptionPayload.keys.p256dh,
            auth: subscriptionPayload.keys.auth,
            isActive: data.isActive ?? true,
            updatedAt: new Date()
          })
          .where(eq(schema.pushSubscriptions.id, existing[0].id))
          .returning();
        return this.mapPushSubscriptionRecord(updated);
      }

      // Criar nova
      const [subscription] = await db.insert(schema.pushSubscriptions)
        .values({
          userId: data.userId,
          endpoint: subscriptionPayload.endpoint,
          p256dh: subscriptionPayload.keys.p256dh,
          auth: subscriptionPayload.keys.auth,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return this.mapPushSubscriptionRecord(subscription);
    } catch (error) {
      console.error('Erro ao criar push subscription:', error);
      throw error;
    }
  }

  async togglePushSubscription(id: number): Promise<PushSubscription | null> {
    try {
      const existing = await db.select()
        .from(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.id, id))
        .limit(1);
      const current = existing[0];
      if (!current) {
        return null;
      }
      const [updated] = await db.update(schema.pushSubscriptions)
        .set({ 
          isActive: !current.isActive,
          updatedAt: new Date()
        })
        .where(eq(schema.pushSubscriptions.id, id))
        .returning();
      return updated ? this.mapPushSubscriptionRecord(updated) : null;
    } catch (error) {
      console.error('Erro ao alternar push subscription:', error);
      return null;
    }
  }

  async deletePushSubscription(id: number): Promise<boolean> {
    try {
      await db.delete(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar push subscription:', error);
      return false;
    }
  }

  async sendPushNotifications(data: { userIds: number[]; title: string; body: string; icon?: string; url?: string }): Promise<{ sent: number; failed: number }> {
    if (!data.userIds.length) {
      return { sent: 0, failed: 0 };
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY || 'BD6cS7ooCOhh1lfv-D__PNYDv3S_S9EyR4bpowVJHcBxYIl5gtTFs8AThEO-MZnpzsKIZuRY3iR2oOMBDAOH2wY';
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error('VAPID_PRIVATE_KEY não configurada');
    }

    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@7care.com';
    webpush.setVapidDetails(subject, publicKey, privateKey);

    try {
      const subscriptions = await db.select()
        .from(schema.pushSubscriptions)
        .where(
          and(
            inArray(schema.pushSubscriptions.userId, data.userIds),
            eq(schema.pushSubscriptions.isActive, true)
          )
        );

      let sent = 0;
      let failed = 0;

      for (const sub of subscriptions) {
        try {
          const payload = JSON.stringify({
            title: data.title,
            body: data.body,
            icon: data.icon || '/pwa-192x192.png',
            data: { url: data.url || '/' }
          });

          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            payload
          );
          sent += 1;
        } catch (error: unknown) {
          failed += 1;
          const pushError = error as { statusCode?: number } | null;
          if (pushError?.statusCode === 404 || pushError?.statusCode === 410) {
            await db.update(schema.pushSubscriptions)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(schema.pushSubscriptions.id, sub.id));
          }
        }
      }

      return { sent, failed };
    } catch (error) {
      console.error('Erro ao enviar push notifications:', error);
      return { sent: 0, failed: data.userIds.length };
    }
  }

  async getAllActivities(): Promise<Activity[]> {
    const stored = await this.getSystemConfig('activities');
    return this.getActivitiesFromConfig(stored);
  }

  async createActivity(data: CreateActivityInput): Promise<Activity> {
    const activities = await this.getAllActivities();
    const nextId = activities.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const activity = {
      id: nextId,
      title: data.title,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? '',
      date: data.date ?? null,
      active: data.active ?? true,
      order: data.order ?? activities.length
    };
    const updated = [...activities, activity];
    await this.saveSystemConfig('activities', updated);
    return activity;
  }

  async updateActivity(id: number, updates: UpdateActivityInput): Promise<Activity | null> {
    const activities = await this.getAllActivities();
    const index = activities.findIndex(item => Number(item.id) === id);
    if (index === -1) {
      return null;
    }
    const updatedActivity = {
      ...activities[index],
      ...updates,
      id
    };
    activities[index] = updatedActivity;
    await this.saveSystemConfig('activities', activities);
    return updatedActivity;
  }

  async deleteActivity(id: number): Promise<boolean> {
    const activities = await this.getAllActivities();
    const filtered = activities.filter(item => Number(item.id) !== id);
    if (filtered.length === activities.length) {
      return false;
    }
    await this.saveSystemConfig('activities', filtered);
    return true;
  }

  // ========== GOOGLE DRIVE CONFIG ==========
  async saveGoogleDriveConfig(config: GoogleDriveConfig): Promise<void> {
    await this.saveSystemConfig('google_drive_config', config);
  }

  async getGoogleDriveConfig(): Promise<GoogleDriveConfig | null> {
    const config = await this.getSystemConfig('google_drive_config');
    if (!config) {
      return null;
    }
    return config as GoogleDriveConfig;
  }

  // ========== MEETINGS ==========
  async createMeeting(data: CreateMeetingInput): Promise<Meeting> {
    try {
      const [meeting] = await db.insert(schema.meetings)
        .values({
          title: data.title,
          description: data.description || '',
          scheduledAt: new Date(data.scheduledAt),
          duration: data.duration || 60,
          location: data.location || '',
          requesterId: data.requesterId,
          assignedToId: data.assignedToId,
          typeId: data.typeId,
          isUrgent: data.isUrgent ?? false,
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          notes: data.notes || '',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return this.mapMeetingRecord(meeting);
    } catch (error) {
      console.error('Erro ao criar reunião:', error);
      throw error;
    }
  }

  async updateMeeting(id: number, updates: UpdateMeetingInput): Promise<Meeting | null> {
    try {
      const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description ?? '';
      if (updates.scheduledAt !== undefined) dbUpdates.scheduledAt = new Date(updates.scheduledAt);
      if (updates.duration !== undefined) dbUpdates.duration = updates.duration ?? 0;
      if (updates.location !== undefined) dbUpdates.location = updates.location ?? '';
      if (updates.requesterId !== undefined) dbUpdates.requesterId = updates.requesterId ?? null;
      if (updates.assignedToId !== undefined) dbUpdates.assignedToId = updates.assignedToId ?? null;
      if (updates.typeId !== undefined) dbUpdates.typeId = updates.typeId ?? null;
      if (updates.isUrgent !== undefined) dbUpdates.isUrgent = updates.isUrgent ?? false;
      if (updates.status !== undefined) dbUpdates.status = updates.status ?? 'pending';
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority ?? 'medium';
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes ?? '';
      const [meeting] = await db.update(schema.meetings)
        .set({
          ...dbUpdates
        })
        .where(eq(schema.meetings.id, id))
        .returning();
      return meeting ? this.mapMeetingRecord(meeting) : null;
    } catch (error) {
      console.error('Erro ao atualizar reunião:', error);
      return null;
    }
  }

  async getMeetingById(id: number): Promise<Meeting | null> {
    try {
      const meetings = await db.select()
        .from(schema.meetings)
        .where(eq(schema.meetings.id, id))
        .limit(1);
      return meetings[0] ? this.mapMeetingRecord(meetings[0]) : null;
    } catch (error) {
      console.error('Erro ao buscar reunião por ID:', error);
      return null;
    }
  }

  async deleteMeeting(id: number): Promise<boolean> {
    try {
      await db.delete(schema.meetings)
        .where(eq(schema.meetings.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao deletar reunião:', error);
      return false;
    }
  }

  // ========== PRAYERS (métodos adicionais) ==========
  async getAllPrayers(): Promise<Prayer[]> {
    return this.getPrayers();
  }

  async createPrayer(data: CreatePrayerInput): Promise<Prayer> {
    try {
      const [prayer] = await db.insert(schema.prayers)
        .values({
          requesterId: data.userId,
          title: data.title,
          description: data.description || '',
          isPrivate: data.isPublic === undefined ? false : !data.isPublic,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return this.mapPrayerRecord(prayer);
    } catch (error) {
      console.error('Erro ao criar oração:', error);
      throw error;
    }
  }

  async addIntercessor(prayerId: number, intercessorId: number): Promise<{ prayerId: number; intercessorId: number }> {
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
