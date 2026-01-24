// Schema simplificado para LocalStorage
// Removidas dependências do Drizzle ORM
import { z } from "zod";

// Tipos TypeScript para as entidades
export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: 'superadmin' | 'pastor' | 'member' | 'interested' | 'missionary' | 'admin_readonly';
  church?: string | null;
  churchCode?: string;
  churchId?: number | null;
  districtId?: number | null;
  departments?: string;
  birthDate?: string | null;
  civilStatus?: string;
  occupation?: string;
  education?: string;
  address?: string | null;
  baptismDate?: string;
  previousReligion?: string;
  biblicalInstructor?: string | null;
  interestedSituation?: string;
  isDonor?: boolean;
  isTither?: boolean;
  isApproved?: boolean;
  points?: number;
  calculatedPoints?: number;
  level?: string | number;
  attendance?: number;
  extraData?: Record<string, unknown> | string | null;
  observations?: string;
  createdAt?: string;
  updatedAt?: string;
  firstAccess?: boolean;
  status?: 'active' | 'inactive' | 'pending' | 'visited' | string;
  phone?: string | null;
  cpf?: string;
  profilePhoto?: string;
  avatarUrl?: string | null;
  isOffering?: boolean;
  hasLesson?: boolean;
  emotionalScore?: number | null;
  engajamento?: string;
  classificacao?: string;
  dizimistaType?: string;
  streak?: number;
  visitedBy?: number | null;
  howKnew?: string | null;
  invitedBy?: string | null;
  maritalStatus?: string | null;
  gender?: string | null;
  ministries?: string | null;
  lastLogin?: string | null;
  lastStreak?: string | null;
  lastAccess?: string;
}

export interface Relationship {
  id: number;
  interestedId?: number;
  missionaryId?: number;
  userId1?: number;
  userId2?: number;
  relationshipType?: string;
  status?: 'active' | 'pending' | 'inactive' | string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: number;
  title?: string;
  name?: string;
  description?: string | null;
  date: string;
  endDate?: string | null;
  time?: string;
  location?: string | null;
  type?: string;
  color?: string | null;
  organizerId?: number;
  church?: string;
  churchId?: number | null;
  districtId?: number | null;
  createdBy?: number | null;
  isRecurring?: boolean;
  recurrencePattern?: string | null;
  recurrenceRule?: string | null;
  maxParticipants?: number;
  maxAttendees?: number | null;
  capacity?: number | null;
  isPublic?: boolean;
  status?: 'scheduled' | 'cancelled' | 'completed' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface District {
  id: number;
  name: string;
  code: string;
  pastorId: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Church {
  id: number;
  name: string;
  code?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  email?: string | null;
  phone?: string | null;
  pastor?: string | null;
  pastor_name?: string | null;
  pastor_email?: string | null;
  established_date?: string | null;
  status?: string | null;
  districtId?: number | null;
  isActive?: boolean;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Schemas Zod para validação
export const insertUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['superadmin', 'pastor', 'member', 'interested', 'missionary', 'admin_readonly']),
  church: z.string().optional(),
  churchCode: z.string().optional(),
  departments: z.string().optional(),
  birthDate: z.string().optional(),
  civilStatus: z.string().optional(),
  occupation: z.string().optional(),
  education: z.string().optional(),
  address: z.string().optional(),
  baptismDate: z.string().optional(),
  previousReligion: z.string().optional(),
  biblicalInstructor: z.string().optional(),
  interestedSituation: z.string().optional(),
  isDonor: z.boolean().default(false),
  isTither: z.boolean().default(false),
  isApproved: z.boolean().default(false),
  points: z.number().default(0),
  level: z.string().default("Iniciante"),
  attendance: z.number().default(0),
  extraData: z.union([z.string(), z.record(z.unknown())]).optional(),
  observations: z.string().optional(),
  firstAccess: z.boolean().default(true),
});

export const insertMeetingSchema = z.object({
  requesterId: z.number(),
  assignedToId: z.number().optional(),
  typeId: z.number(),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledAt: z.string(),
  duration: z.number().default(60),
  location: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  isUrgent: z.boolean().default(false),
  status: z.enum(['pending', 'approved', 'rejected', 'completed', 'cancelled']).default('pending'),
  notes: z.string().optional(),
});

export const insertEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string(),
  endDate: z.string().optional().nullable(),
  time: z.string().optional(),
  location: z.string().optional(),
  type: z.string().optional(),
  color: z.string().optional().nullable(),
  organizerId: z.number().optional(),
  church: z.string().optional(),
  churchId: z.number().optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().optional().nullable(),
  maxParticipants: z.number().optional(),
  isPublic: z.boolean().default(true),
});

export const insertMessageSchema = z.object({
  conversationId: z.number(),
  senderId: z.number(),
  content: z.string().min(1),
  messageType: z.enum(['text', 'image', 'file', 'system']).default('text'),
  isRead: z.boolean().default(false),
});

// Tipos adicionais para compatibilidade
export type InsertUser = Omit<User, 'id' | 'createdAt' | 'updatedAt'> & {
  updatedAt?: string;
};
export type InsertEvent = Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertChurch = Omit<Church, 'id' | 'createdAt' | 'updatedAt'>;

// Tipos de Update (parciais, todos os campos opcionais)
export type UpdateUser = Partial<Omit<User, 'id' | 'createdAt'>>;
export type UpdateEvent = Partial<Omit<Event, 'id' | 'createdAt'>>;
export type UpdateChurch = Partial<Omit<Church, 'id' | 'createdAt'>>;
export type UpdateMeeting = Partial<Omit<Meeting, 'id' | 'createdAt'>>;
export type UpdateMessage = Partial<Omit<Message, 'id' | 'createdAt'>>;

// Corrigidos: tipos explícitos em vez de any
export type InsertMeeting = Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertMessage = Omit<Message, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertNotification = Omit<Notification, 'id' | 'createdAt'>;
export type InsertDiscipleshipRequest = Omit<DiscipleshipRequest, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertRelationship = Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>;

export interface Meeting {
  id: number;
  requesterId?: number | null;
  assignedToId?: number | null;
  typeId?: number | null;
  title: string;
  description?: string | null;
  scheduledAt: string;
  duration: number;
  location?: string | null;
  priority: string;
  isUrgent: boolean;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  conversationId?: number | null;
  senderId?: number | null;
  content: string;
  messageType?: string;
  isRead?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  id: number;
  title?: string | null;
  type?: string;
  isGroup?: boolean;
  createdBy?: number | null;
  createdAt: string;
  updatedAt?: string;
}

export interface VideoCallSession {
  id: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingType {
  id: number;
  name: string;
  description?: string | null;
  duration?: number;
  isActive?: boolean;
  color?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface Achievement {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  requiredPoints?: number;
  pointsRequired?: number;
  requiredConditions?: string | null;
  badgeColor?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PointActivity {
  id: number;
  userId?: number | null;
  pointId?: number | null;
  activity?: string;
  points: number;
  description?: string | null;
  createdAt: string;
}

export interface DiscipleshipRequest {
  id: number;
  requesterId?: number;
  mentorId?: number;
  status: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
  interestedId?: number;
  missionaryId?: number;
  notes?: string;
}

export interface MissionaryProfile {
  id: number;
  userId: number;
  missionField: string;
  startDate: string;
  endDate: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
}

// Exportar arrays vazios para compatibilidade
export const users: User[] = [];
export const events: Event[] = [];
export const churches: Church[] = [];
