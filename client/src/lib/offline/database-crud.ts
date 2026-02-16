import { createLogger } from '@/lib/logger';
import { encryptData, decryptData } from './crypto';
import { db } from './database-core';
import { generateChecksum, hasOfflinePermission } from './database-utils';
import type {
  OfflineUser,
  OfflineEvent,
  OfflineTask,
  OfflineMessage,
  OfflineRelationship,
  OfflinePrayer,
  OfflineMeeting,
  OfflineEmotionalCheckin,
  OfflineDiscipleshipRequest,
  OfflineNotification,
} from './database-types';
import type { User, Event, Message } from '@shared/schema';

const offlineLogger = createLogger('Offline');

export interface TaskData {
  id: number;
  [key: string]: unknown;
}

export interface RelationshipData {
  id: number;
  interestedId?: number;
  missionaryId?: number;
  userId1?: number;
  userId2?: number;
  relationshipType?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface PrayerData {
  id: number;
  userId?: number;
  title?: string;
  description?: string;
  isPublic?: boolean;
  isAnswered?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface MeetingData {
  id: number;
  requesterId?: number;
  assignedToId?: number;
  title?: string;
  description?: string;
  scheduledAt?: string;
  duration?: number;
  location?: string;
  status?: string;
  priority?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface EmotionalCheckinData {
  id: number;
  userId: number;
  emotionalScore?: number;
  mood?: string;
  prayerRequest?: string;
  isPrivate?: boolean;
  allowChurchMembers?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface DiscipleshipRequestData {
  id: number;
  interestedId?: number;
  missionaryId?: number;
  status?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface NotificationData {
  id: number;
  userId: number;
  title?: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export async function saveUsersOffline(users: User[], userRole: string): Promise<void> {
  if (!hasOfflinePermission(userRole)) {
    offlineLogger.debug('Usuário não tem permissão para cache de usuários');
    return;
  }

  const now = Date.now();

  offlineLogger.debug(`Preparando ${users.length} usuários para salvar...`);

  const offlineUsers: OfflineUser[] = await Promise.all(
    users.map(async user => ({
      id: user.id,
      data: await encryptData(user),
      checksum: await generateChecksum(user),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  offlineLogger.debug(`Dados preparados, salvando no IndexedDB...`);

  await db.transaction('rw', db.users, db.meta, async () => {
    await db.users.bulkPut(offlineUsers);
    await db.meta.put({ key: 'users_last_sync', value: now.toString(), updatedAt: now });
  });

  offlineLogger.debug(`${users.length} usuários salvos (criptografados)`);
}

export async function getUsersOffline(): Promise<User[]> {
  offlineLogger.debug('Buscando usuários do IndexedDB...');
  const offlineUsers = await db.users.toArray();
  offlineLogger.debug(`Encontrados ${offlineUsers.length} registros de usuários`);

  if (offlineUsers.length === 0) {
    offlineLogger.warn('Nenhum usuário encontrado no cache!');
    return [];
  }

  const users = await Promise.all(
    offlineUsers.map(async ou => {
      try {
        return await decryptData<User>(ou.data);
      } catch (error) {
        offlineLogger.warn(`Falha ao descriptografar usuário ${ou.id}:`, error);
        return null;
      }
    })
  );

  const validUsers = users.filter((u): u is User => u !== null);
  offlineLogger.debug(`Retornando ${validUsers.length} usuários descriptografados`);
  return validUsers;
}

export async function saveCurrentUserOffline(user: User): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.users, db.meta, async () => {
    const offlineUser: OfflineUser = {
      id: user.id,
      data: await encryptData(user),
      checksum: await generateChecksum(user),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    };

    await db.users.put(offlineUser);
    await db.meta.put({ key: 'current_user_id', value: user.id.toString(), updatedAt: now });
  });
}

export async function getCurrentUserOffline(): Promise<User | null> {
  const userIdStr = await db.meta.get('current_user_id');
  if (!userIdStr) return null;

  const userId = parseInt(userIdStr.value, 10);
  const offlineUser = await db.users.get(userId);
  if (!offlineUser) return null;

  try {
    return await decryptData<User>(offlineUser.data);
  } catch {
    return null;
  }
}

export async function updateUserOffline(userId: number, userData: Partial<User>): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.users, async () => {
    const existing = await db.users.get(userId);
    if (!existing) {
      throw new Error(`Usuário ${userId} não encontrado no cache`);
    }

    const currentData = await decryptData<User>(existing.data);
    const updatedData = { ...currentData, ...userData };

    await db.users.update(userId, {
      data: await encryptData(updatedData),
      checksum: await generateChecksum(updatedData),
      modifiedAt: now,
      isModified: true,
      version: existing.version + 1,
    });
  });
}

export async function saveEventsOffline(events: Event[]): Promise<void> {
  const now = Date.now();

  offlineLogger.debug(`Preparando ${events.length} eventos para salvar...`);

  const offlineEvents: OfflineEvent[] = await Promise.all(
    events.map(async event => ({
      id: event.id,
      data: JSON.stringify(event),
      checksum: await generateChecksum(event),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  offlineLogger.debug(`Dados preparados, salvando no IndexedDB...`);

  await db.transaction('rw', db.events, db.meta, async () => {
    await db.events.bulkPut(offlineEvents);
    await db.meta.put({ key: 'events_last_sync', value: now.toString(), updatedAt: now });
  });

  offlineLogger.debug(`${events.length} eventos salvos`);
}

export async function getEventsOffline(): Promise<Event[]> {
  offlineLogger.debug('Buscando eventos do IndexedDB...');
  const offlineEvents = await db.events.toArray();
  offlineLogger.debug(`Encontrados ${offlineEvents.length} eventos`);

  if (offlineEvents.length === 0) {
    offlineLogger.warn('Nenhum evento encontrado no cache!');
  }

  return offlineEvents.map(oe => JSON.parse(oe.data) as Event);
}

export async function updateEventOffline(
  eventId: number,
  eventData: Partial<Event>
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.events, async () => {
    const existing = await db.events.get(eventId);
    if (!existing) {
      throw new Error(`Evento ${eventId} não encontrado no cache`);
    }

    const currentData = JSON.parse(existing.data) as Event;
    const updatedData = { ...currentData, ...eventData };

    await db.events.update(eventId, {
      data: JSON.stringify(updatedData),
      checksum: await generateChecksum(updatedData),
      modifiedAt: now,
      isModified: true,
      version: existing.version + 1,
    });
  });
}

export async function saveTasksOffline(tasks: TaskData[]): Promise<void> {
  const now = Date.now();

  offlineLogger.debug(`Preparando ${tasks.length} tarefas para salvar...`);

  const offlineTasks: OfflineTask[] = await Promise.all(
    tasks.map(async task => ({
      id: task.id,
      data: JSON.stringify(task),
      checksum: await generateChecksum(task),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  offlineLogger.debug(`Dados preparados, salvando no IndexedDB...`);

  await db.transaction('rw', db.tasks, db.meta, async () => {
    await db.tasks.bulkPut(offlineTasks);
    await db.meta.put({ key: 'tasks_last_sync', value: now.toString(), updatedAt: now });
  });

  offlineLogger.debug(`${tasks.length} tarefas salvas`);
}

export async function getTasksOffline(): Promise<TaskData[]> {
  offlineLogger.debug('Buscando tarefas do IndexedDB...');
  const offlineTasks = await db.tasks.toArray();
  offlineLogger.debug(`Encontradas ${offlineTasks.length} tarefas`);

  if (offlineTasks.length === 0) {
    offlineLogger.warn('Nenhuma tarefa encontrada no cache!');
  }

  return offlineTasks.map(ot => JSON.parse(ot.data) as TaskData);
}

export async function updateTaskOffline(
  taskId: number,
  taskData: Partial<TaskData>
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.tasks, async () => {
    const existing = await db.tasks.get(taskId);
    if (!existing) {
      throw new Error(`Tarefa ${taskId} não encontrada no cache`);
    }

    const currentData = JSON.parse(existing.data) as TaskData;
    const updatedData = { ...currentData, ...taskData };

    await db.tasks.update(taskId, {
      data: JSON.stringify(updatedData),
      checksum: await generateChecksum(updatedData),
      modifiedAt: now,
      isModified: true,
      version: existing.version + 1,
    });
  });
}

export async function saveRelationshipsOffline(relationships: RelationshipData[]): Promise<void> {
  const now = Date.now();

  offlineLogger.debug(`Preparando ${relationships.length} relacionamentos para salvar...`);

  const offlineRelationships: OfflineRelationship[] = await Promise.all(
    relationships.map(async rel => ({
      id: rel.id,
      data: JSON.stringify(rel),
      checksum: await generateChecksum(rel),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  offlineLogger.debug(`Dados preparados, salvando no IndexedDB...`);

  await db.transaction('rw', db.relationships, db.meta, async () => {
    await db.relationships.bulkPut(offlineRelationships);
    await db.meta.put({ key: 'relationships_last_sync', value: now.toString(), updatedAt: now });
  });

  offlineLogger.debug(`${relationships.length} relacionamentos salvos`);
}

export async function getRelationshipsOffline(): Promise<RelationshipData[]> {
  offlineLogger.debug('Buscando relacionamentos do IndexedDB...');
  const offlineRelationships = await db.relationships.toArray();
  offlineLogger.debug(`Encontrados ${offlineRelationships.length} relacionamentos`);

  if (offlineRelationships.length === 0) {
    offlineLogger.warn('Nenhum relacionamento encontrado no cache!');
  }

  return offlineRelationships.map(or => JSON.parse(or.data) as RelationshipData);
}

export async function updateRelationshipOffline(
  relationshipId: number,
  relationshipData: Partial<RelationshipData>
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.relationships, async () => {
    const existing = await db.relationships.get(relationshipId);
    if (!existing) {
      throw new Error(`Relacionamento ${relationshipId} não encontrado no cache`);
    }

    const currentData = JSON.parse(existing.data) as RelationshipData;
    const updatedData = { ...currentData, ...relationshipData };

    await db.relationships.update(relationshipId, {
      data: JSON.stringify(updatedData),
      checksum: await generateChecksum(updatedData),
      modifiedAt: now,
      isModified: true,
      version: existing.version + 1,
    });
  });
}

export async function savePrayersOffline(prayers: PrayerData[]): Promise<void> {
  const now = Date.now();

  offlineLogger.debug(`Preparando ${prayers.length} pedidos de oração para salvar...`);

  const offlinePrayers: OfflinePrayer[] = await Promise.all(
    prayers.map(async prayer => ({
      id: prayer.id,
      data: JSON.stringify(prayer),
      checksum: await generateChecksum(prayer),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  await db.transaction('rw', db.prayers, db.meta, async () => {
    await db.prayers.bulkPut(offlinePrayers);
    await db.meta.put({ key: 'prayers_last_sync', value: now.toString(), updatedAt: now });
  });

  offlineLogger.debug(`${prayers.length} pedidos de oração salvos`);
}

export async function getPrayersOffline(): Promise<PrayerData[]> {
  offlineLogger.debug('Buscando pedidos de oração do IndexedDB...');
  const offlinePrayers = await db.prayers.toArray();
  offlineLogger.debug(`Encontrados ${offlinePrayers.length} pedidos de oração`);

  return offlinePrayers.map(op => JSON.parse(op.data) as PrayerData);
}

export async function updatePrayerOffline(
  prayerId: number,
  prayerData: Partial<PrayerData>
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.prayers, async () => {
    const existing = await db.prayers.get(prayerId);
    if (!existing) {
      throw new Error(`Pedido de oração ${prayerId} não encontrado no cache`);
    }

    const currentData = JSON.parse(existing.data) as PrayerData;
    const updatedData = { ...currentData, ...prayerData };

    await db.prayers.update(prayerId, {
      data: JSON.stringify(updatedData),
      checksum: await generateChecksum(updatedData),
      modifiedAt: now,
      isModified: true,
      version: existing.version + 1,
    });
  });
}

export async function saveMeetingsOffline(meetings: MeetingData[]): Promise<void> {
  const now = Date.now();

  offlineLogger.debug(`Preparando ${meetings.length} reuniões para salvar...`);

  const offlineMeetings: OfflineMeeting[] = await Promise.all(
    meetings.map(async meeting => ({
      id: meeting.id,
      data: JSON.stringify(meeting),
      checksum: await generateChecksum(meeting),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  await db.transaction('rw', db.meetings, db.meta, async () => {
    await db.meetings.bulkPut(offlineMeetings);
    await db.meta.put({ key: 'meetings_last_sync', value: now.toString(), updatedAt: now });
  });

  offlineLogger.debug(`${meetings.length} reuniões salvas`);
}

export async function getMeetingsOffline(): Promise<MeetingData[]> {
  offlineLogger.debug('Buscando reuniões do IndexedDB...');
  const offlineMeetings = await db.meetings.toArray();
  offlineLogger.debug(`Encontradas ${offlineMeetings.length} reuniões`);

  return offlineMeetings.map(om => JSON.parse(om.data) as MeetingData);
}

export async function updateMeetingOffline(
  meetingId: number,
  meetingData: Partial<MeetingData>
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.meetings, async () => {
    const existing = await db.meetings.get(meetingId);
    if (!existing) {
      throw new Error(`Reunião ${meetingId} não encontrada no cache`);
    }

    const currentData = JSON.parse(existing.data) as MeetingData;
    const updatedData = { ...currentData, ...meetingData };

    await db.meetings.update(meetingId, {
      data: JSON.stringify(updatedData),
      checksum: await generateChecksum(updatedData),
      modifiedAt: now,
      isModified: true,
      version: existing.version + 1,
    });
  });
}

export async function saveEmotionalCheckinsOffline(
  checkins: EmotionalCheckinData[]
): Promise<void> {
  const now = Date.now();

  offlineLogger.debug(`Preparando ${checkins.length} check-ins emocionais para salvar...`);

  const offlineCheckins: OfflineEmotionalCheckin[] = await Promise.all(
    checkins.map(async checkin => ({
      id: checkin.id,
      userId: checkin.userId,
      data: JSON.stringify(checkin),
      checksum: await generateChecksum(checkin),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  await db.transaction('rw', db.emotionalCheckins, db.meta, async () => {
    await db.emotionalCheckins.bulkPut(offlineCheckins);
    await db.meta.put({
      key: 'emotional_checkins_last_sync',
      value: now.toString(),
      updatedAt: now,
    });
  });

  offlineLogger.debug(`${checkins.length} check-ins emocionais salvos`);
}

export async function getEmotionalCheckinsOffline(
  userId?: number
): Promise<EmotionalCheckinData[]> {
  offlineLogger.debug('Buscando check-ins emocionais do IndexedDB...');
  let offlineCheckins = await db.emotionalCheckins.toArray();

  if (userId) {
    offlineCheckins = offlineCheckins.filter(c => c.userId === userId);
  }

  offlineLogger.debug(`Encontrados ${offlineCheckins.length} check-ins emocionais`);

  return offlineCheckins.map(oc => JSON.parse(oc.data) as EmotionalCheckinData);
}

export async function saveDiscipleshipRequestsOffline(
  requests: DiscipleshipRequestData[]
): Promise<void> {
  const now = Date.now();

  offlineLogger.debug(`Preparando ${requests.length} pedidos de discipulado para salvar...`);

  const offlineRequests: OfflineDiscipleshipRequest[] = await Promise.all(
    requests.map(async request => ({
      id: request.id,
      data: JSON.stringify(request),
      checksum: await generateChecksum(request),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  await db.transaction('rw', db.discipleshipRequests, db.meta, async () => {
    await db.discipleshipRequests.bulkPut(offlineRequests);
    await db.meta.put({
      key: 'discipleship_requests_last_sync',
      value: now.toString(),
      updatedAt: now,
    });
  });

  offlineLogger.debug(`${requests.length} pedidos de discipulado salvos`);
}

export async function getDiscipleshipRequestsOffline(): Promise<DiscipleshipRequestData[]> {
  offlineLogger.debug('Buscando pedidos de discipulado do IndexedDB...');
  const offlineRequests = await db.discipleshipRequests.toArray();
  offlineLogger.debug(`Encontrados ${offlineRequests.length} pedidos de discipulado`);

  return offlineRequests.map(or => JSON.parse(or.data) as DiscipleshipRequestData);
}

export async function updateDiscipleshipRequestOffline(
  requestId: number,
  requestData: Partial<DiscipleshipRequestData>
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.discipleshipRequests, async () => {
    const existing = await db.discipleshipRequests.get(requestId);
    if (!existing) {
      throw new Error(`Pedido de discipulado ${requestId} não encontrado no cache`);
    }

    const currentData = JSON.parse(existing.data) as DiscipleshipRequestData;
    const updatedData = { ...currentData, ...requestData };

    await db.discipleshipRequests.update(requestId, {
      data: JSON.stringify(updatedData),
      checksum: await generateChecksum(updatedData),
      modifiedAt: now,
      isModified: true,
      version: existing.version + 1,
    });
  });
}

export async function saveNotificationsOffline(notifications: NotificationData[]): Promise<void> {
  const now = Date.now();

  offlineLogger.debug(`Preparando ${notifications.length} notificações para salvar...`);

  const offlineNotifications: OfflineNotification[] = await Promise.all(
    notifications.map(async notification => ({
      id: notification.id,
      userId: notification.userId,
      data: JSON.stringify(notification),
      checksum: await generateChecksum(notification),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  await db.transaction('rw', db.notifications, db.meta, async () => {
    await db.notifications.bulkPut(offlineNotifications);
    await db.meta.put({ key: 'notifications_last_sync', value: now.toString(), updatedAt: now });
  });

  offlineLogger.debug(`${notifications.length} notificações salvas`);
}

export async function getNotificationsOffline(userId?: number): Promise<NotificationData[]> {
  offlineLogger.debug('Buscando notificações do IndexedDB...');
  let offlineNotifications = await db.notifications.toArray();

  if (userId) {
    offlineNotifications = offlineNotifications.filter(n => n.userId === userId);
  }

  offlineLogger.debug(`Encontradas ${offlineNotifications.length} notificações`);

  return offlineNotifications.map(on => JSON.parse(on.data) as NotificationData);
}

export async function updateNotificationOffline(
  notificationId: number,
  notificationData: Partial<NotificationData>
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', db.notifications, async () => {
    const existing = await db.notifications.get(notificationId);
    if (!existing) {
      throw new Error(`Notificação ${notificationId} não encontrada no cache`);
    }

    const currentData = JSON.parse(existing.data) as NotificationData;
    const updatedData = { ...currentData, ...notificationData };

    await db.notifications.update(notificationId, {
      data: JSON.stringify(updatedData),
      checksum: await generateChecksum(updatedData),
      modifiedAt: now,
      isModified: true,
      version: existing.version + 1,
    });
  });
}

export async function saveMessagesOffline(
  messages: Message[],
  conversationId: number
): Promise<void> {
  const now = Date.now();

  const offlineMessages: OfflineMessage[] = await Promise.all(
    messages.map(async msg => ({
      id: msg.id,
      conversationId,
      data: await encryptData(msg),
      checksum: await generateChecksum(msg),
      syncedAt: now,
      modifiedAt: now,
      isModified: false,
      version: 1,
    }))
  );

  await db.transaction('rw', db.messages, async () => {
    await db.messages.bulkPut(offlineMessages);
  });

  offlineLogger.debug(`${messages.length} mensagens salvas (criptografadas)`);
}

export async function getMessagesOffline(conversationId: number): Promise<Message[]> {
  const offlineMessages = await db.messages
    .where('conversationId')
    .equals(conversationId)
    .toArray();

  const messages = await Promise.all(
    offlineMessages.map(async om => {
      try {
        return await decryptData<Message>(om.data);
      } catch {
        return null;
      }
    })
  );

  return messages.filter((m): m is Message => m !== null);
}
