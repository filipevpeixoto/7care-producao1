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

// ========== Conversão de Datas ==========
export function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value == null) {
    return '';
  }
  return String(value);
}

export function toOptionalDateString(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : String(value);
}

// ========== Normalização de Dados ==========
export function normalizeExtraData(value: unknown): Record<string, unknown> | string | null | undefined {
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
    extraData: normalizeExtraData(row.extraData),
    observations: row.observations == null ? '' : String(row.observations),
    createdAt: toDateString(row.createdAt),
    updatedAt: toDateString(row.updatedAt),
    firstAccess: Boolean(row.firstAccess),
    status: row.status == null ? undefined : String(row.status),
    phone: row.phone == null ? undefined : String(row.phone),
    cpf: row.cpf == null ? undefined : String(row.cpf),
    profilePhoto: row.profilePhoto == null ? undefined : String(row.profilePhoto),
    isOffering: row.isOffering == null ? undefined : Boolean(row.isOffering),
    hasLesson: row.hasLesson == null ? undefined : Boolean(row.hasLesson)
  };
}

export function mapChurchRecord(record: Record<string, unknown>): Church {
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
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapRelationshipRecord(record: Record<string, unknown>): Relationship {
  return {
    id: Number(record.id),
    interestedId: record.interestedId == null ? undefined : Number(record.interestedId),
    missionaryId: record.missionaryId == null ? undefined : Number(record.missionaryId),
    userId1: record.userId1 == null ? undefined : Number(record.userId1),
    userId2: record.userId2 == null ? undefined : Number(record.userId2),
    relationshipType: record.relationshipType == null ? undefined : String(record.relationshipType),
    status: record.status == null ? undefined : String(record.status),
    notes: record.notes == null ? undefined : String(record.notes),
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
    title: record.title == null ? '' : String(record.title),
    description: record.description == null ? '' : String(record.description),
    scheduledAt: toDateString(record.scheduledAt),
    duration: Number(record.duration ?? 0),
    location: record.location == null ? '' : String(record.location),
    priority: record.priority == null ? '' : String(record.priority),
    isUrgent: Boolean(record.isUrgent),
    status: record.status == null ? '' : String(record.status),
    notes: record.notes == null ? '' : String(record.notes),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapMeetingTypeRecord(record: Record<string, unknown>): MeetingType {
  return {
    id: Number(record.id),
    name: record.name == null ? '' : String(record.name),
    description: record.description == null ? '' : String(record.description),
    duration: Number(record.duration ?? 0),
    isActive: record.isActive == null ? true : Boolean(record.isActive),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapConversationRecord(record: Record<string, unknown>): Conversation {
  const typeValue = record.type == null ? '' : String(record.type);
  return {
    id: Number(record.id),
    title: record.title == null ? '' : String(record.title),
    type: typeValue,
    isGroup: typeValue === 'group' || typeValue === 'grupo',
    createdBy: record.createdBy == null ? null : Number(record.createdBy),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapMessageRecord(record: Record<string, unknown>): Message {
  return {
    id: Number(record.id),
    conversationId: Number(record.conversationId ?? 0),
    senderId: Number(record.senderId ?? 0),
    content: record.content == null ? '' : String(record.content),
    messageType: record.messageType == null ? 'text' : String(record.messageType),
    isRead: record.isRead == null ? false : Boolean(record.isRead),
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
    description: record.description == null ? '' : String(record.description),
    createdAt: toDateString(record.createdAt)
  };
}

export function mapAchievementRecord(record: Record<string, unknown>): Achievement {
  return {
    id: Number(record.id),
    name: record.name == null ? '' : String(record.name),
    description: record.description == null ? '' : String(record.description),
    icon: record.icon == null ? '' : String(record.icon),
    requiredPoints: Number(record.pointsRequired ?? record.requiredPoints ?? 0),
    requiredConditions: record.requiredConditions == null ? '' : String(record.requiredConditions),
    badgeColor: record.badgeColor == null ? '' : String(record.badgeColor),
    isActive: record.isActive == null ? true : Boolean(record.isActive),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapDiscipleshipRequestRecord(record: Record<string, unknown>): DiscipleshipRequest {
  const interestedId = record.interestedId == null ? undefined : Number(record.interestedId);
  const missionaryId = record.missionaryId == null ? undefined : Number(record.missionaryId);
  return {
    id: Number(record.id),
    requesterId: Number(interestedId ?? 0),
    mentorId: Number(missionaryId ?? 0),
    status: record.status == null ? '' : String(record.status),
    message: record.notes == null ? '' : String(record.notes),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt),
    interestedId,
    missionaryId,
    notes: record.notes == null ? undefined : String(record.notes)
  };
}

export function mapEmotionalCheckInRecord(record: Record<string, unknown>): EmotionalCheckIn {
  return {
    id: Number(record.id),
    userId: Number(record.userId ?? 0),
    emotionalScore: record.emotionalScore == null ? null : Number(record.emotionalScore),
    mood: record.mood == null ? null : String(record.mood),
    prayerRequest: record.prayerRequest == null ? null : String(record.prayerRequest),
    isPrivate: Boolean(record.isPrivate),
    allowChurchMembers: record.allowChurchMembers == null ? true : Boolean(record.allowChurchMembers),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

export function mapMissionaryProfileRecord(record: Record<string, unknown>): MissionaryProfile {
  return {
    id: Number(record.id),
    userId: Number(record.userId ?? 0),
    missionField: record.missionField == null ? String(record.specialization ?? '') : String(record.missionField),
    startDate: record.startDate == null ? '' : String(record.startDate),
    endDate: record.endDate == null ? '' : String(record.endDate),
    status: record.status == null ? 'active' : String(record.status),
    notes: record.notes == null ? String(record.experience ?? '') : String(record.notes),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt),
    isActive: record.isActive == null ? undefined : Boolean(record.isActive)
  };
}

export function mapPushSubscriptionRecord(record: Record<string, unknown>): PushSubscription {
  return {
    id: Number(record.id),
    userId: Number(record.userId ?? 0),
    endpoint: record.endpoint == null ? '' : String(record.endpoint),
    p256dh: record.p256dh == null ? '' : String(record.p256dh),
    auth: record.auth == null ? '' : String(record.auth),
    isActive: record.isActive == null ? true : Boolean(record.isActive),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt),
    deviceName: record.deviceName == null ? null : String(record.deviceName)
  };
}

export function mapNotificationRecord(record: Record<string, unknown>): Notification {
  return {
    id: Number(record.id),
    userId: Number(record.userId ?? 0),
    title: record.title == null ? '' : String(record.title),
    message: record.message == null ? '' : String(record.message),
    type: record.type == null ? 'general' : String(record.type),
    isRead: record.isRead == null ? false : Boolean(record.isRead),
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

export function toPermissionUser(user: { id?: number; role?: string; email?: string; districtId?: number | null; church?: string | null }): Partial<User> {
  return {
    id: user.id,
    role: user.role as User['role'],
    email: user.email,
    districtId: user.districtId ?? undefined,
    church: user.church ?? undefined
  };
}
