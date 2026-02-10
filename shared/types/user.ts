/**
 * @fileoverview Unified User type definitions for the entire application
 * @module shared/types/user
 * 
 * This is the SINGLE SOURCE OF TRUTH for User types.
 * All other User interfaces should import from here.
 */

// ============================================
// User Roles
// ============================================

export type UserRole =
  | 'superadmin'
  | 'pastor'
  | 'admin'
  | 'admin_readonly'
  | 'member'
  | 'missionary'
  | 'interested';

export type UserStatus = 'active' | 'inactive' | 'pending' | 'visited';

export type CivilStatus = 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo';

export type Gender = 'Masculino' | 'Feminino' | 'Outro';

// ============================================
// Core User Interface (Complete)
// ============================================

export interface User {
  // Core Identity
  id: number;
  name: string;
  email: string;
  password?: string; // Only present in create/update operations

  // Authentication & Authorization
  role: UserRole;
  status: UserStatus;
  isApproved: boolean;
  firstAccess: boolean;
  lastLogin?: string | null;
  lastAccess?: string | null;

  // Church Assignment
  church?: string | null;
  churchCode?: string | null;
  churchId?: number | null;
  districtId?: number | null;
  departments?: string | null;
  ministries?: string | null;

  // Contact Information
  phone?: string | null;
  cpf?: string | null;
  address?: string | null;

  // Personal Information
  birthDate?: string | null;
  civilStatus?: CivilStatus | string | null;
  maritalStatus?: string | null; // Alias for civilStatus
  gender?: Gender | string | null;
  occupation?: string | null;
  education?: string | null;
  profilePhoto?: string | null;
  avatarUrl?: string | null;

  // Spiritual Journey
  baptismDate?: string | null;
  previousReligion?: string | null;
  biblicalInstructor?: string | null;
  interestedSituation?: string | null;
  howKnew?: string | null;
  invitedBy?: string | null;
  visitedBy?: number | null;

  // Funnel Steps (7 Steps x 3 Substeps = 21 fields)
  step1OrarPor1?: boolean;
  step1OrarPor2?: boolean;
  step1OrarPor3?: boolean;
  step2CuidarDe1?: boolean;
  step2CuidarDe2?: boolean;
  step2CuidarDe3?: boolean;
  step3Cultivar1?: boolean;
  step3Cultivar2?: boolean;
  step3Cultivar3?: boolean;
  step4Convidar1?: boolean;
  step4Convidar2?: boolean;
  step4Convidar3?: boolean;
  step5Apresentar1?: boolean;
  step5Apresentar2?: boolean;
  step5Apresentar3?: boolean;
  step6Preparar1?: boolean;
  step6Preparar2?: boolean;
  step6Preparar3?: boolean;
  step7Batismo1?: boolean;
  step7Batismo2?: boolean;
  step7Batismo3?: boolean;

  // Gamification & Participation
  points?: number;
  calculatedPoints?: number;
  level?: string | number | null;
  attendance?: number;
  streak?: number;
  lastStreak?: string | null;
  engajamento?: string | null;
  classificacao?: string | null;

  // Financial Participation
  isDonor?: boolean;
  isTither?: boolean;
  isOffering?: boolean;
  dizimistaType?: string | null;

  // Ministry Activities
  hasLesson?: boolean;
  estudosBiblicosCount?: number;
  baptismsPerformed?: number;
  memberType?: string | null;
  emotionalScore?: number | null;

  // Metadata
  extraData?: Record<string, unknown> | string | null;
  observations?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Subset Types for Specific Use Cases
// ============================================

/**
 * Minimal user info for authentication contexts
 */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  church?: string | null;
  churchCode?: string | null;
  churchId?: number | null;
  districtId?: number | null;
  isApproved: boolean;
  status: UserStatus;
  firstAccess: boolean;
  profilePhoto?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
}

/**
 * User info for list displays (minimal memory footprint)
 */
export interface UserListItem {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  church?: string | null;
  phone?: string | null;
  points?: number;
  level?: string | number | null;
  isApproved: boolean;
  createdAt: string;
}

/**
 * User creation payload
 */
export interface UserCreateInput {
  name: string;
  email: string;
  password?: string; // Optional - will be auto-generated if not provided
  phone?: string;
  role?: UserRole;
  churchId?: number;
  districtId?: number;
  status?: UserStatus;
  isApproved?: boolean;
  birthDate?: string;
  cpf?: string;
  address?: string;
}

/**
 * User update payload (all fields optional except what's needed for identification)
 */
export interface UserUpdateInput {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: UserRole;
  churchId?: number;
  districtId?: number;
  status?: UserStatus;
  isApproved?: boolean;
  firstAccess?: boolean;
  birthDate?: string;
  cpf?: string;
  address?: string;
  civilStatus?: string;
  occupation?: string;
  education?: string;
  profilePhoto?: string;
  departments?: string;
  ministries?: string;
  points?: number;
  level?: string | number;
  attendance?: number;
  observations?: string;
  extraData?: Record<string, unknown>;
  [key: string]: unknown; // Allow dynamic fields for flexibility
}

// ============================================
// Type Guards
// ============================================

export function isAuthUser(user: unknown): user is AuthUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'email' in user &&
    'role' in user
  );
}

export function isFullUser(user: unknown): user is User {
  return (
    isAuthUser(user) &&
    'createdAt' in user &&
    'updatedAt' in user
  );
}

// ============================================
// Helper Functions
// ============================================

/**
 * Convert full User to AuthUser (for auth contexts)
 */
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    church: user.church,
    churchCode: user.churchCode,
    churchId: user.churchId,
    districtId: user.districtId,
    isApproved: user.isApproved,
    status: user.status,
    firstAccess: user.firstAccess,
    profilePhoto: user.profilePhoto,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
  };
}

/**
 * Convert full User to UserListItem (for lists)
 */
export function toUserListItem(user: User): UserListItem {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    church: user.church,
    phone: user.phone,
    points: user.points,
    level: user.level,
    isApproved: user.isApproved,
    createdAt: user.createdAt,
  };
}
