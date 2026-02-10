/**
 * Tipos TypeScript para API do 7care
 * @module types/api
 */

// ============================================
// Tipos Base
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> extends ApiResponse<{
  items: T[];
  pagination: PaginationInfo;
}> {}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// ============================================
// Usuários (importados de shared/types/user.ts - fonte única de verdade)
// ============================================

export type { User, UserRole, UserStatus, AuthUser, UserListItem, UserCreateInput, UserUpdateInput } from './user';

export interface AuthenticatedUser {
  token: string;
  id: number;
  name: string;
  email: string;
  role: import('./user').UserRole;
  church?: string | null;
  churchId?: number | null;
  districtId?: number | null;
  isApproved: boolean;
  status: import('./user').UserStatus;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse extends ApiResponse<AuthenticatedUser> {}

// ============================================
// Igrejas
// ============================================

export interface Church {
  id: number;
  name: string;
  districtId: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  pastorName?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  memberCount: number;
  settings?: Record<string, unknown>;
}

export interface ChurchCreateInput {
  name: string;
  districtId: number;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  pastorName?: string;
}

export interface ChurchUpdateInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  pastorName?: string;
  isActive?: boolean;
  settings?: Record<string, unknown>;
}

export interface ChurchStats {
  church: Church;
  memberCount: number;
  activeMemberCount: number;
  totalPoints: number;
  averagePoints: number;
  participationRate: number;
  roleDistribution: Record<string, number>;
}

export interface ChurchRanking {
  rank: number;
  id: number;
  name: string;
  totalPoints: number;
  memberCount: number;
  activeMembers: number;
  averagePoints: number;
}

// ============================================
// Distritos
// ============================================

export interface District {
  id: number;
  name: string;
  region?: string | null;
  pastorId?: number | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  churchCount: number;
  memberCount: number;
  settings?: Record<string, unknown>;
  pointsConfig?: PointsConfig;
}

export interface DistrictCreateInput {
  name: string;
  region?: string;
  pastorId?: number;
}

export interface DistrictUpdateInput {
  name?: string;
  region?: string;
  pastorId?: number;
  isActive?: boolean;
  settings?: Record<string, unknown>;
  pointsConfig?: PointsConfig;
}

export interface DistrictStats {
  district: District;
  churchCount: number;
  memberCount: number;
  activeMemberCount: number;
  totalPoints: number;
  averagePoints: number;
  participationRate: number;
  churchStats: ChurchStats[];
}

// ============================================
// Pontos e Gamificação
// ============================================

export interface PointsConfig {
  etapa1: number;
  etapa2: number;
  etapa3: number;
  etapa4: number;
  etapa5: number;
  etapa6: number;
  etapa7: number;
  biblicalStudies: number;
  checkIn?: number;
  eventParticipation?: number;
  consecutiveWeeks?: number;
  monthlyBonus?: number;
}

export interface UserLevel {
  level: number;
  name: string;
  icon: string;
  minPoints: number;
  maxPoints: number;
  points: number;
  progressPercent: number;
  nextLevel?: {
    level: number;
    name: string;
    icon: string;
    minPoints: number;
    pointsNeeded: number;
  } | null;
}

export interface StepProgress {
  step1: number;
  step2: number;
  step3: number;
  step4: number;
  step5: number;
  step6: number;
  step7: number;
}

export interface GroupStats {
  totalMembers: number;
  totalPoints: number;
  averagePoints: number;
  stepProgress: Record<string, number>;
  levelDistribution: Record<string, number>;
  topPerformers: { id: number; name: string; points: number }[];
  participationRate: number;
}

export interface UserRanking {
  rank: number;
  id: number;
  name: string;
  points: number;
  level: UserLevel;
}

// ============================================
// Convites
// ============================================

export type InviteStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export interface PastorInvite {
  id: number;
  email: string;
  name: string;
  token: string;
  status: InviteStatus;
  districtName: string;
  region?: string | null;
  churches?: string[] | object[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  approvedAt?: string | null;
  approvedBy?: number | null;
  rejectedAt?: string | null;
  rejectedBy?: number | null;
  rejectionReason?: string | null;
  pastorData?: Record<string, unknown>;
  excelData?: unknown[];
}

export interface InviteCreateInput {
  email: string;
  name: string;
  districtName: string;
  region?: string;
  churches?: string[];
  expiresAt?: string;
}

export interface InviteApproveInput {
  approvedBy: number;
}

export interface InviteRejectInput {
  rejectedBy: number;
  reason?: string;
}

// ============================================
// Eventos
// ============================================

export interface Event {
  id: number;
  title: string;
  description?: string | null;
  date: string;
  endDate?: string | null;
  location?: string | null;
  churchId?: number | null;
  districtId?: number | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  maxParticipants?: number | null;
  currentParticipants?: number;
  eventType?: string | null;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
}

export interface EventCreateInput {
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  location?: string;
  churchId?: number;
  districtId?: number;
  maxParticipants?: number;
  eventType?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export interface EventParticipation {
  eventId: number;
  userId: number;
  status: 'confirmed' | 'pending' | 'declined' | 'attended';
  confirmedAt?: string | null;
  attendedAt?: string | null;
  notes?: string | null;
}

// ============================================
// Relacionamentos
// ============================================

export interface Relationship {
  id: number;
  missionaryId: number;
  interestedId: number;
  status: 'active' | 'inactive' | 'completed';
  createdAt: string;
  updatedAt: string;
  notes?: string | null;
  lastContactAt?: string | null;
}

export interface RelationshipCreateInput {
  missionaryId: number;
  interestedId: number;
  notes?: string;
}

// ============================================
// Excel Import
// ============================================

export interface ExcelImportResult {
  success: boolean;
  data: ImportedRow[];
  errors: ImportError[];
  warnings: ImportWarning[];
  stats: ImportStats;
  columnMapping: {
    mapped: Record<string, string>;
    unmapped: string[];
  };
}

export interface ImportedRow {
  name: string;
  email?: string;
  phone?: string;
  church?: string;
  memberType?: string;
  birthDate?: string;
  [key: string]: unknown;
}

export interface ImportError {
  row: number;
  data: ImportedRow;
  errors: string[];
}

export interface ImportWarning {
  row: number;
  warnings: string[];
}

export interface ImportStats {
  totalRows: number;
  churches: number;
  churchList: { name: string; memberCount: number }[];
  memberTypes: Record<string, number>;
  dataCompleteness: {
    email: number;
    phone: number;
    birthDate: number;
  };
}

// ============================================
// Rate Limiting
// ============================================

export type RateLimitType = 'auth' | 'api' | 'write' | 'bulk';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

// ============================================
// Logging
// ============================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  env?: string;
  [key: string]: unknown;
}

// ============================================
// Erros
// ============================================

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'METHOD_NOT_ALLOWED';

export interface ApiError {
  success: false;
  error: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
}
