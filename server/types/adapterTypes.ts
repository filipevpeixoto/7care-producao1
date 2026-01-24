/**
 * Tipos específicos para adapters do banco de dados
 * Resolve incompatibilidades entre Drizzle schema e tipos da aplicação
 */

import { User, Event, Relationship } from '../../shared/schema';

// =============================================================================
// TIPOS PARA ROLES E STATUS
// =============================================================================

/**
 * Roles válidas no sistema
 */
export type UserRole = 'superadmin' | 'pastor' | 'member' | 'interested' | 'missionary' | 'admin_readonly';

/**
 * Status válidos para usuários
 */
export type UserStatus = 'active' | 'inactive' | 'pending' | 'visited';

/**
 * Status válidos para relacionamentos
 */
export type RelationshipStatus = 'active' | 'pending' | 'inactive';

/**
 * Status válidos para eventos
 */
export type EventStatus = 'scheduled' | 'cancelled' | 'completed';

// =============================================================================
// HELPERS PARA VALIDAÇÃO E CONVERSÃO
// =============================================================================

const VALID_ROLES: UserRole[] = ['superadmin', 'pastor', 'member', 'interested', 'missionary', 'admin_readonly'];
const VALID_USER_STATUS: UserStatus[] = ['active', 'inactive', 'pending', 'visited'];
const VALID_RELATIONSHIP_STATUS: RelationshipStatus[] = ['active', 'pending', 'inactive'];
const VALID_EVENT_STATUS: EventStatus[] = ['scheduled', 'cancelled', 'completed'];

/**
 * Valida e retorna role válida
 */
export function toValidRole(value: unknown): UserRole {
  const str = String(value ?? 'member').toLowerCase();
  return VALID_ROLES.includes(str as UserRole) ? str as UserRole : 'member';
}

/**
 * Valida e retorna status válido para usuário
 */
export function toValidUserStatus(value: unknown): UserStatus {
  const str = String(value ?? 'active').toLowerCase();
  return VALID_USER_STATUS.includes(str as UserStatus) ? str as UserStatus : 'active';
}

/**
 * Valida e retorna status válido para relacionamento
 */
export function toValidRelationshipStatus(value: unknown): RelationshipStatus {
  const str = String(value ?? 'pending').toLowerCase();
  return VALID_RELATIONSHIP_STATUS.includes(str as RelationshipStatus) ? str as RelationshipStatus : 'pending';
}

/**
 * Valida e retorna status válido para evento
 */
export function toValidEventStatus(value: unknown): EventStatus {
  const str = String(value ?? 'scheduled').toLowerCase();
  return VALID_EVENT_STATUS.includes(str as EventStatus) ? str as EventStatus : 'scheduled';
}

// =============================================================================
// TIPOS PARA OPERAÇÕES DE BANCO
// =============================================================================

/**
 * Dados para inserção de usuário no banco
 * Omite campos auto-gerados e timestamps
 */
export type UserInsertData = {
  name: string;
  email: string;
  password: string;
  role: string; // Drizzle usa text, não enum
  church?: string | null;
  churchCode?: string | null;
  districtId?: number | null;
  departments?: string | null;
  birthDate?: string | null;
  civilStatus?: string | null;
  occupation?: string | null;
  education?: string | null;
  address?: string | null;
  baptismDate?: string | null;
  previousReligion?: string | null;
  biblicalInstructor?: string | null;
  interestedSituation?: string | null;
  isDonor?: boolean;
  isTither?: boolean;
  isApproved?: boolean;
  points?: number;
  level?: string;
  attendance?: number;
  extraData?: Record<string, unknown> | null;
  engajamento?: string | null;
  classificacao?: string | null;
  dizimistaType?: string | null;
  ofertanteType?: string | null;
  tempoBatismoAnos?: number | null;
  departamentosCargos?: string | null;
  nomeUnidade?: string | null;
  temLicao?: boolean;
  totalPresenca?: number;
  comunhao?: number;
  missao?: number;
  estudoBiblico?: number;
  batizouAlguem?: boolean;
  discPosBatismal?: number;
  cpfValido?: boolean;
  camposVazios?: boolean;
  observations?: string | null;
  firstAccess?: boolean;
  status?: string; // Drizzle usa text
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Dados para atualização de usuário
 */
export type UserUpdateData = Partial<Omit<UserInsertData, 'email'>> & {
  email?: string;
  updatedAt?: Date;
};

/**
 * Row retornado pelo Drizzle para users
 */
export interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  church: string | null;
  churchCode: string | null;
  districtId: number | null;
  departments: string | null;
  birthDate: string | Date | null;
  civilStatus: string | null;
  occupation: string | null;
  education: string | null;
  address: string | null;
  baptismDate: string | Date | null;
  previousReligion: string | null;
  biblicalInstructor: string | null;
  interestedSituation: string | null;
  isDonor: boolean | null;
  isTither: boolean | null;
  isApproved: boolean | null;
  points: number | null;
  level: string | null;
  attendance: number | null;
  extraData: unknown;
  engajamento: string | null;
  classificacao: string | null;
  dizimistaType: string | null;
  ofertanteType: string | null;
  tempoBatismoAnos: number | null;
  departamentosCargos: string | null;
  nomeUnidade: string | null;
  temLicao: boolean | null;
  totalPresenca: number | null;
  comunhao: number | null;
  missao: number | null;
  estudoBiblico: number | null;
  batizouAlguem: boolean | null;
  discPosBatismal: number | null;
  cpfValido: boolean | null;
  camposVazios: boolean | null;
  observations: string | null;
  firstAccess: boolean | null;
  status: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  [key: string]: unknown; // Para campos extras
}

/**
 * Converte UserRow para User
 */
export function userRowToUser(row: UserRow | Record<string, unknown>): User {
  const r = row as Record<string, unknown>;
  
  return {
    id: Number(r.id),
    name: String(r.name ?? ''),
    email: String(r.email ?? ''),
    password: r.password ? String(r.password) : undefined,
    role: toValidRole(r.role),
    church: r.church ? String(r.church) : null,
    churchCode: r.churchCode ? String(r.churchCode) : undefined,
    churchId: r.churchId != null ? Number(r.churchId) : null,
    districtId: r.districtId != null ? Number(r.districtId) : null,
    departments: r.departments ? String(r.departments) : undefined,
    birthDate: r.birthDate ? String(r.birthDate) : null,
    civilStatus: r.civilStatus ? String(r.civilStatus) : undefined,
    occupation: r.occupation ? String(r.occupation) : undefined,
    education: r.education ? String(r.education) : undefined,
    address: r.address ? String(r.address) : null,
    baptismDate: r.baptismDate ? String(r.baptismDate) : undefined,
    previousReligion: r.previousReligion ? String(r.previousReligion) : undefined,
    biblicalInstructor: r.biblicalInstructor ? String(r.biblicalInstructor) : null,
    interestedSituation: r.interestedSituation ? String(r.interestedSituation) : undefined,
    isDonor: Boolean(r.isDonor),
    isTither: Boolean(r.isTither),
    isApproved: Boolean(r.isApproved),
    points: Number(r.points ?? 0),
    calculatedPoints: r.calculatedPoints != null ? Number(r.calculatedPoints) : undefined,
    level: r.level ? String(r.level) : undefined,
    attendance: r.attendance != null ? Number(r.attendance) : undefined,
    extraData: r.extraData as Record<string, unknown> | null,
    engajamento: r.engajamento ? String(r.engajamento) : undefined,
    classificacao: r.classificacao ? String(r.classificacao) : undefined,
    dizimistaType: r.dizimistaType ? String(r.dizimistaType) : undefined,
    observations: r.observations ? String(r.observations) : undefined,
    firstAccess: r.firstAccess != null ? Boolean(r.firstAccess) : undefined,
    status: toValidUserStatus(r.status),
    phone: r.phone ? String(r.phone) : null,
    cpf: r.cpf ? String(r.cpf) : undefined,
    profilePhoto: r.profilePhoto ? String(r.profilePhoto) : undefined,
    avatarUrl: r.avatarUrl ? String(r.avatarUrl) : null,
    isOffering: r.isOffering != null ? Boolean(r.isOffering) : undefined,
    hasLesson: r.hasLesson != null ? Boolean(r.hasLesson) : undefined,
    emotionalScore: r.emotionalScore != null ? Number(r.emotionalScore) : null,
    streak: r.streak != null ? Number(r.streak) : undefined,
    visitedBy: r.visitedBy != null ? Number(r.visitedBy) : null,
    howKnew: r.howKnew ? String(r.howKnew) : null,
    invitedBy: r.invitedBy ? String(r.invitedBy) : null,
    maritalStatus: r.maritalStatus ? String(r.maritalStatus) : null,
    gender: r.gender ? String(r.gender) : null,
    ministries: r.ministries ? String(r.ministries) : null,
    lastLogin: r.lastLogin ? String(r.lastLogin) : null,
    lastStreak: r.lastStreak ? String(r.lastStreak) : null,
    lastAccess: r.lastAccess ? String(r.lastAccess) : undefined,
    createdAt: r.createdAt ? String(r.createdAt) : undefined,
    updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
  };
}

// =============================================================================
// TIPOS PARA EVENTOS
// =============================================================================

export interface EventRow {
  id: number;
  title: string;
  description: string | null;
  date: Date;
  endDate: Date | null;
  location: string | null;
  type: string;
  color: string | null;
  capacity: number | null;
  isRecurring: boolean | null;
  recurrencePattern: string | null;
  createdBy: number | null;
  churchId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  [key: string]: unknown;
}

export function eventRowToEvent(row: EventRow | Record<string, unknown>): Event {
  const r = row as Record<string, unknown>;
  
  return {
    id: Number(r.id),
    title: String(r.title ?? ''),
    name: r.name ? String(r.name) : undefined,
    description: r.description ? String(r.description) : null,
    date: r.date instanceof Date ? r.date.toISOString() : String(r.date ?? ''),
    endDate: r.endDate ? (r.endDate instanceof Date ? r.endDate.toISOString() : String(r.endDate)) : null,
    time: r.time ? String(r.time) : undefined,
    location: r.location ? String(r.location) : null,
    type: r.type ? String(r.type) : undefined,
    color: r.color ? String(r.color) : null,
    organizerId: r.organizerId != null ? Number(r.organizerId) : undefined,
    church: r.church ? String(r.church) : undefined,
    churchId: r.churchId != null ? Number(r.churchId) : null,
    districtId: r.districtId != null ? Number(r.districtId) : null,
    createdBy: r.createdBy != null ? Number(r.createdBy) : null,
    isRecurring: r.isRecurring != null ? Boolean(r.isRecurring) : undefined,
    recurrencePattern: r.recurrencePattern ? String(r.recurrencePattern) : null,
    recurrenceRule: r.recurrenceRule ? String(r.recurrenceRule) : null,
    maxParticipants: r.maxParticipants != null ? Number(r.maxParticipants) : undefined,
    maxAttendees: r.maxAttendees != null ? Number(r.maxAttendees) : null,
    capacity: r.capacity != null ? Number(r.capacity) : null,
    isPublic: r.isPublic != null ? Boolean(r.isPublic) : undefined,
    status: toValidEventStatus(r.status),
    createdAt: r.createdAt ? String(r.createdAt) : undefined,
    updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
  };
}

// =============================================================================
// TIPOS PARA RELACIONAMENTOS
// =============================================================================

export interface RelationshipRow {
  id: number;
  interestedId: number | null;
  missionaryId: number | null;
  status: string | null;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  [key: string]: unknown;
}

export function relationshipRowToRelationship(row: RelationshipRow | Record<string, unknown>): Relationship {
  const r = row as Record<string, unknown>;
  
  return {
    id: Number(r.id),
    interestedId: r.interestedId != null ? Number(r.interestedId) : undefined,
    missionaryId: r.missionaryId != null ? Number(r.missionaryId) : undefined,
    userId1: r.userId1 != null ? Number(r.userId1) : undefined,
    userId2: r.userId2 != null ? Number(r.userId2) : undefined,
    relationshipType: r.relationshipType ? String(r.relationshipType) : undefined,
    status: toValidRelationshipStatus(r.status),
    notes: r.notes ? String(r.notes) : undefined,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? new Date().toISOString()),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt ?? new Date().toISOString()),
  };
}

// =============================================================================
// TIPOS AUXILIARES PARA QUERIES
// =============================================================================

/**
 * Opções de filtro para busca de usuários
 */
export interface UserFilterOptions {
  role?: UserRole | string;
  status?: UserStatus | string;
  churchId?: number;
  districtId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Opções de ordenação
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Resultado paginado
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
