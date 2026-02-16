/**
 * Helpers e funções utilitárias para o storage
 */

import { db } from '../neonConfig';
import { schema } from '../schema';
import { eq } from 'drizzle-orm';
import type {
  User,
  Church,
  Meeting,
  MeetingType,
  Message,
  Conversation,
  Notification,
  Achievement,
  PointActivity,
  Relationship,
  DiscipleshipRequest,
  MissionaryProfile
} from '../../shared/schema';
import type {
  Activity,
  EmotionalCheckIn,
  Prayer,
  PushSubscription
} from '../types/storage';

const isNil = (value: unknown): value is null | undefined => value === null || value === undefined;

// ========== Conversão de Datas ==========
export function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (isNil(value)) {
    return '';
  }
  return String(value);
}

export function toOptionalDateString(value: unknown): string | null {
  if (isNil(value)) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : String(value);
}

// ========== Normalização de Dados ==========
export function normalizeExtraData(value: unknown): Record<string, unknown> | string | null | undefined {
  if (isNil(value)) {
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

export function getActivitiesFromConfig(raw: unknown): Activity[] {
  if (Array.isArray(raw)) {
    return raw as Activity[];
  }
  return [];
}

// ========== Geração de Códigos ==========
export function generateChurchCode(name: string): string {
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

export async function resolveChurchCode(name: string, providedCode?: string | null): Promise<string> {
  const initialCode = (providedCode && providedCode.trim() !== '' ? providedCode : generateChurchCode(name)).slice(0, 10);
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

// ========== Mappers de Registros ==========
export function toUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    name: isNil(row.name) ? '' : String(row.name),
    email: isNil(row.email) ? '' : String(row.email),
    password: isNil(row.password) ? '' : String(row.password),
    role: (isNil(row.role) ? 'member' : String(row.role)) as User['role'],
    church: isNil(row.church) ? null : String(row.church),
    churchCode: isNil(row.churchCode) ? '' : String(row.churchCode),
    districtId: isNil(row.districtId) ? null : Number(row.districtId),
    departments: isNil(row.departments) ? '' : String(row.departments),
    birthDate: isNil(row.birthDate) ? '' : String(row.birthDate),
    civilStatus: isNil(row.civilStatus) ? '' : String(row.civilStatus),
    occupation: isNil(row.occupation) ? '' : String(row.occupation),
    education: isNil(row.education) ? '' : String(row.education),
    address: isNil(row.address) ? '' : String(row.address),
    baptismDate: isNil(row.baptismDate) ? '' : String(row.baptismDate),
    previousReligion: isNil(row.previousReligion) ? '' : String(row.previousReligion),
    biblicalInstructor: isNil(row.biblicalInstructor) ? null : String(row.biblicalInstructor),
    interestedSituation: isNil(row.interestedSituation) ? '' : String(row.interestedSituation),
    isDonor: Boolean(row.isDonor),
    isTither: Boolean(row.isTither),
    isApproved: Boolean(row.isApproved),
    points: Number(row.points ?? 0),
    level: isNil(row.level) ? '' : String(row.level),
    attendance: Number(row.attendance ?? 0),
    extraData: normalizeExtraData(row.extraData),
    observations: isNil(row.observations) ? '' : String(row.observations),
    createdAt: toDateString(row.createdAt),
    updatedAt: toDateString(row.updatedAt),
    firstAccess: Boolean(row.firstAccess),
    status: (isNil(row.status) ? 'active' : String(row.status)) as import('../../shared/types/user').UserStatus,
    phone: isNil(row.phone) ? undefined : String(row.phone),
    cpf: isNil(row.cpf) ? undefined : String(row.cpf),
    profilePhoto: isNil(row.profilePhoto) ? undefined : String(row.profilePhoto),
    isOffering: isNil(row.isOffering) ? undefined : Boolean(row.isOffering),
    hasLesson: isNil(row.hasLesson) ? undefined : Boolean(row.hasLesson)
  };
}

export function mapChurchRecord(record: Record<string, unknown>): Church {
  return {
    id: Number(record.id),
    name: isNil(record.name) ? '' : String(record.name),
    code: isNil(record.code) ? undefined : String(record.code),
    address: isNil(record.address) ? null : String(record.address),
    city: isNil(record.city) ? null : String(record.city),
    state: isNil(record.state) ? null : String(record.state),
    zip_code: isNil(record.zip_code) ? null : String(record.zip_code),
    email: isNil(record.email) ? null : String(record.email),
    phone: isNil(record.phone) ? null : String(record.phone),
    pastor_name: isNil(record.pastor_name) ? null : String(record.pastor_name),
    pastor_email: isNil(record.pastor_email) ? null : String(record.pastor_email),
    established_date: isNil(record.established_date) ? null : String(record.established_date),
    status: isNil(record.status) ? null : String(record.status),
    districtId: isNil(record.districtId) ? null : Number(record.districtId),
    isActive: isNil(record.isActive) ? true : Boolean(record.isActive),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapRelationshipRecord(record: Record<string, unknown>): Relationship {
  return {
    id: Number(record.id),
    interestedId: isNil(record.interestedId) ? undefined : Number(record.interestedId),
    missionaryId: isNil(record.missionaryId) ? undefined : Number(record.missionaryId),
    userId1: isNil(record.userId1) ? undefined : Number(record.userId1),
    userId2: isNil(record.userId2) ? undefined : Number(record.userId2),
    relationshipType: isNil(record.relationshipType) ? undefined : String(record.relationshipType),
    status: isNil(record.status) ? undefined : String(record.status),
    notes: isNil(record.notes) ? undefined : String(record.notes),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapMeetingRecord(record: Record<string, unknown>): Meeting {
  return {
    id: Number(record.id),
    requesterId: Number(record.requesterId ?? 0),
    assignedToId: Number(record.assignedToId ?? 0),
    typeId: Number(record.typeId ?? 0),
    title: isNil(record.title) ? '' : String(record.title),
    description: isNil(record.description) ? '' : String(record.description),
    scheduledAt: toDateString(record.scheduledAt),
    duration: Number(record.duration ?? 0),
    location: isNil(record.location) ? '' : String(record.location),
    priority: isNil(record.priority) ? '' : String(record.priority),
    isUrgent: Boolean(record.isUrgent),
    status: isNil(record.status) ? '' : String(record.status),
    notes: isNil(record.notes) ? '' : String(record.notes),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapMeetingTypeRecord(record: Record<string, unknown>): MeetingType {
  return {
    id: Number(record.id),
    name: isNil(record.name) ? '' : String(record.name),
    description: isNil(record.description) ? '' : String(record.description),
    duration: Number(record.duration ?? 0),
    isActive: isNil(record.isActive) ? true : Boolean(record.isActive),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapConversationRecord(record: Record<string, unknown>): Conversation {
  const typeValue = isNil(record.type) ? '' : String(record.type);
  return {
    id: Number(record.id),
    title: isNil(record.title) ? '' : String(record.title),
    type: typeValue,
    isGroup: typeValue === 'group' || typeValue === 'grupo',
    createdBy: isNil(record.createdBy) ? null : Number(record.createdBy),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapMessageRecord(record: Record<string, unknown>): Message {
  return {
    id: Number(record.id),
    conversationId: Number(record.conversationId ?? 0),
    senderId: Number(record.senderId ?? 0),
    content: isNil(record.content) ? '' : String(record.content),
    messageType: isNil(record.messageType) ? 'text' : String(record.messageType),
    isRead: isNil(record.isRead) ? false : Boolean(record.isRead),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapPointActivityRecord(record: Record<string, unknown>): PointActivity {
  return {
    id: Number(record.id),
    userId: Number(record.userId ?? 0),
    pointId: Number(record.pointId ?? record.id ?? 0),
    points: Number(record.points ?? 0),
    description: isNil(record.description) ? '' : String(record.description),
    createdAt: toDateString(record.createdAt)
  };
}

export function mapAchievementRecord(record: Record<string, unknown>): Achievement {
  return {
    id: Number(record.id),
    name: isNil(record.name) ? '' : String(record.name),
    description: isNil(record.description) ? '' : String(record.description),
    icon: isNil(record.icon) ? '' : String(record.icon),
    requiredPoints: Number(record.pointsRequired ?? record.requiredPoints ?? 0),
    requiredConditions: isNil(record.requiredConditions) ? '' : String(record.requiredConditions),
    badgeColor: isNil(record.badgeColor) ? '' : String(record.badgeColor),
    isActive: isNil(record.isActive) ? true : Boolean(record.isActive),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapDiscipleshipRequestRecord(record: Record<string, unknown>): DiscipleshipRequest {
  const interestedId = isNil(record.interestedId) ? undefined : Number(record.interestedId);
  const missionaryId = isNil(record.missionaryId) ? undefined : Number(record.missionaryId);
  return {
    id: Number(record.id),
    requesterId: Number(interestedId ?? 0),
    mentorId: Number(missionaryId ?? 0),
    status: isNil(record.status) ? '' : String(record.status),
    message: isNil(record.notes) ? '' : String(record.notes),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt),
    interestedId,
    missionaryId,
    notes: isNil(record.notes) ? undefined : String(record.notes)
  };
}

export function mapEmotionalCheckInRecord(record: Record<string, unknown>): EmotionalCheckIn {
  return {
    id: Number(record.id),
    userId: Number(record.userId ?? 0),
    emotionalScore: isNil(record.emotionalScore) ? null : Number(record.emotionalScore),
    mood: isNil(record.mood) ? null : String(record.mood),
    prayerRequest: isNil(record.prayerRequest) ? null : String(record.prayerRequest),
    isPrivate: Boolean(record.isPrivate),
    allowChurchMembers: isNil(record.allowChurchMembers) ? true : Boolean(record.allowChurchMembers),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapMissionaryProfileRecord(record: Record<string, unknown>): MissionaryProfile {
  return {
    id: Number(record.id),
    userId: Number(record.userId ?? 0),
    missionField: isNil(record.missionField)
      ? String(record.specialization ?? '')
      : String(record.missionField),
    startDate: isNil(record.startDate) ? '' : String(record.startDate),
    endDate: isNil(record.endDate) ? '' : String(record.endDate),
    status: isNil(record.status) ? 'active' : String(record.status),
    notes: isNil(record.notes) ? String(record.experience ?? '') : String(record.notes),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt),
    isActive: isNil(record.isActive) ? undefined : Boolean(record.isActive)
  };
}

export function mapPushSubscriptionRecord(record: Record<string, unknown>): PushSubscription {
  return {
    id: Number(record.id),
    userId: Number(record.userId ?? 0),
    endpoint: isNil(record.endpoint) ? '' : String(record.endpoint),
    p256dh: isNil(record.p256dh) ? '' : String(record.p256dh),
    auth: isNil(record.auth) ? '' : String(record.auth),
    isActive: isNil(record.isActive) ? true : Boolean(record.isActive),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt),
    deviceName: isNil(record.deviceName) ? null : String(record.deviceName)
  };
}

export function mapNotificationRecord(record: Record<string, unknown>): Notification {
  return {
    id: Number(record.id),
    userId: Number(record.userId ?? 0),
    title: isNil(record.title) ? '' : String(record.title),
    message: isNil(record.message) ? '' : String(record.message),
    type: isNil(record.type) ? 'general' : String(record.type),
    isRead: isNil(record.isRead) ? false : Boolean(record.isRead),
    createdAt: toDateString(record.createdAt)
  };
}

export function mapPrayerRecord(record: Record<string, unknown>): Prayer {
  const createdAt = toOptionalDateString(record?.createdAt);
  const updatedAt = toOptionalDateString(record?.updatedAt);
  const isAnswered = record?.status === 'answered';
  return {
    id: Number(record.id),
    userId: Number(record.requesterId),
    districtId: isNil(record.districtId) ? null : Number(record.districtId),
    title: String(record.title),
    description: isNil(record.description) ? null : String(record.description),
    isPublic: record.isPrivate === null ? true : !record.isPrivate,
    isAnswered,
    answeredAt: isAnswered ? (updatedAt ? String(updatedAt) : null) : null,
    testimony: null,
    createdAt: createdAt ? String(createdAt) : '',
    updatedAt: updatedAt ? String(updatedAt) : ''
  };
}

export function toPermissionUser(user: { id?: number; role?: string; email?: string; districtId?: number | null; church?: string | null }): Partial<User> {
  return {
    id: user.id,
    role: user.role as User['role'],
    email: user.email,
    districtId: user.districtId ?? undefined,
    church: user.church ?? undefined
  };
}
