/**
 * Tipos de domínio da aplicação 7Care
 * Reduz uso de 'any' ao definir tipos específicos
 */

// ============================================
// Tipos Base
// ============================================

export interface BaseEntity {
  id: number | string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// Church (Igreja)
// ============================================

export interface Church extends BaseEntity {
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  pastor?: string | null;
  districtId?: number | null;
  isDefault?: boolean;
}

// ============================================
// District (Distrito)
// ============================================

export interface District extends BaseEntity {
  name: string;
  code: string;
  pastorId?: number | null;
  description?: string | null;
}

// ============================================
// User Member Extended
// ============================================

export interface UserMember extends BaseEntity {
  name: string;
  email: string;
  role: string;
  church?: string | null;
  churchCode?: string | null;
  districtId?: number | null;
  points?: number;
  calculatedPoints?: number;
  level?: string | number;
  avatarUrl?: string | null;
  profilePhoto?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  baptismDate?: string | null;
  address?: string | null;
  occupation?: string | null;
  education?: string | null;
  civilStatus?: string | null;
  departments?: string | null;
  status?: string;
  isApproved?: boolean;
  firstAccess?: boolean;
  lastAccess?: string | null;
  lastLogin?: string | null;
  // Campos de pontuação
  engajamento?: string | null;
  classificacao?: string | null;
  dizimistaType?: string | null;
  ofertanteType?: string | null;
  tempoBatismoAnos?: number | null;
  extraData?: Record<string, unknown>;
}

// ============================================
// Event (Evento)
// ============================================

export interface Event extends BaseEntity {
  title?: string;
  description?: string | null;
  date: string;
  time?: string;
  endDate?: string | null;
  end_date?: string | null; // snake_case variant from API
  startDate?: string | null; // Alias for date in some contexts
  location?: string | null;
  type?: string;
  color?: string | null;
  capacity?: number | null;
  church?: string;
  churchId?: number | null;
  districtId?: number | null;
  createdBy?: number | null;
  isRecurring?: boolean;
  recurrencePattern?: string | null;
}

// ============================================
// Task (Tarefa)
// ============================================

export interface Task extends BaseEntity {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: number | null;
  assignedToName?: string | null;
  createdBy?: number | null;
  category?: string | null;
  churchId?: number | null;
  // Campos do Google Sheets
  responsavel?: string | null;
  prazo?: string | null;
  observacoes?: string | null;
}

// ============================================
// Meeting (Reunião)
// ============================================

export interface Meeting extends BaseEntity {
  title: string;
  description?: string | null;
  scheduledAt: string;
  duration?: number;
  location?: string | null;
  requesterId?: number | null;
  requesterName?: string | null;
  assignedToId?: number | null;
  assignedToName?: string | null;
  typeId?: number | null;
  typeName?: string | null;
  priority?: 'low' | 'medium' | 'high';
  isUrgent?: boolean;
  status?: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  notes?: string | null;
}

// ============================================
// Notification (Notificação)
// ============================================

export interface Notification extends BaseEntity {
  userId: number;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  isRead?: boolean;
  readAt?: string | null;
  actionUrl?: string | null;
}

// ============================================
// Election (Eleição)
// ============================================

export interface Election extends BaseEntity {
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
  churchId?: number | null;
  districtId?: number | null;
  createdBy?: number | null;
  isPublic?: boolean;
}

export interface ElectionCandidate extends BaseEntity {
  electionId: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  position?: string | null;
  bio?: string | null;
  votes?: number;
}

export interface ElectionVote extends BaseEntity {
  electionId: number;
  voterId: number;
  candidateId: number;
  votedAt: string;
}

// ============================================
// Prayer Request (Pedido de Oração)
// ============================================

export interface PrayerRequest extends BaseEntity {
  userId: number;
  userName?: string;
  title?: string;
  request: string;
  isAnonymous?: boolean;
  isPrayed?: boolean;
  prayerCount?: number;
  status?: 'active' | 'answered' | 'archived';
}

// ============================================
// Discipleship (Discipulado)
// ============================================

export interface DiscipleshipRequest extends BaseEntity {
  interestedId?: number | null;
  interestedName?: string | null;
  missionaryId?: number | null;
  missionaryName?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string | null;
}

export interface Relationship extends BaseEntity {
  interestedId?: number | null;
  missionaryId?: number | null;
  status?: string;
  notes?: string | null;
}

// ============================================
// Gamification (Gamificação)
// ============================================

export interface LeaderboardEntry {
  id: number;
  name: string;
  points: number;
  rank?: number;
  level?: string;
  avatarUrl?: string | null;
  church?: string | null;
}

export interface PointsBreakdown {
  category: string;
  points: number;
  description?: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============================================
// Form Data Types
// ============================================

export interface UserFormData {
  name: string;
  email: string;
  role?: string;
  church?: string;
  churchCode?: string;
  districtId?: number | null;
  phone?: string;
  birthDate?: string;
  address?: string;
  password?: string;
}

export interface ChurchFormData {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  pastor?: string;
  districtId?: number | null;
}

export interface EventFormData {
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  location?: string;
  type: string;
  churchId?: number | null;
  isRecurring?: boolean;
}

// ============================================
// Filter/Query Types
// ============================================

export interface UserFilters {
  role?: string;
  church?: string;
  districtId?: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EventFilters {
  type?: string;
  startDate?: string;
  endDate?: string;
  churchId?: number;
  limit?: number;
}

// ============================================
// Settings Types
// ============================================

export interface SystemSettings {
  churchName?: string;
  churchCode?: string;
  logoUrl?: string;
  primaryColor?: string;
  enableNotifications?: boolean;
  enableGamification?: boolean;
  enable2FA?: boolean;
  defaultLanguage?: string;
}

export interface PointsConfig {
  baptism?: number;
  attendance?: number;
  tithe?: number;
  offering?: number;
  evangelism?: number;
  discipleship?: number;
  [key: string]: number | undefined;
}

// ============================================
// Google Sheets Task (raw format)
// ============================================

export interface SheetTask {
  id: string;
  titulo?: string;
  descricao?: string;
  status?: string;
  prioridade?: string;
  responsavel?: string;
  criador?: string;
  igreja?: string;
  data_criacao?: string;
  data_vencimento?: string;
  data_conclusao?: string;
  tags?: string;
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardUser {
  id: number | string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  church?: string;
  birthDate?: string | null;
  profilePhoto?: string | null;
  avatarUrl?: string | null;
}

export interface DashboardStats {
  totalUsers: number;
  totalMembers: number;
  totalMissionaries: number;
  totalInterested: number;
  approvedUsers: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  totalPrayers: number;
  totalVisits: number;
  totalActivities: number;
  totalPoints: number;
}

export interface BirthdayUser {
  id: number | string;
  name: string;
  birthDate: string;
  nextBirthday?: Date;
  profilePhoto?: string | null;
  avatarUrl?: string | null;
}

// ============================================
// Interested/Relationship Types
// ============================================

export interface InterestedUser extends UserMember {
  missionaryId?: number | null;
  missionaryName?: string | null;
}

export interface ActiveRelationship extends Relationship {
  interestedName?: string | null;
  missionaryName?: string | null;
}
