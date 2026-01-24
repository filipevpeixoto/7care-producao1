/**
 * Tipos TypeScript Compartilhados para o Servidor
 * Definições de tipos para Express, API responses, e entidades
 */

import { Request, Response, NextFunction } from 'express';
import { User as SharedUser } from '../../shared/schema';

// ============================================
// Tipos de Usuário e Autenticação
// ============================================

/**
 * Roles disponíveis no sistema
 */
export type UserRole =
  | 'superadmin'
  | 'pastor'
  | 'member'
  | 'interested'
  | 'missionary'
  | 'admin_readonly';

/**
 * Interface base de usuário para o servidor
 * Re-exporta o tipo do shared/schema para manter consistência
 */
export type User = SharedUser;

/**
 * Dados mínimos de usuário para permissões
 */
export interface UserForPermission {
  id?: number;
  role?: string;
  email?: string;
  districtId?: number | null;
  church?: string;
}

// ============================================
// Tipos de Request Express Estendido
// ============================================

/**
 * Request com dados de autenticação
 */
export interface AuthenticatedRequest extends Request {
  userId?: number;
  user?: User | null;
  userRole?: UserRole;
}

/**
 * Request genérico com body tipado
 */
export interface TypedRequest<T = unknown> extends Request {
  body: T;
}

/**
 * Request autenticado com body tipado
 */
export interface AuthenticatedTypedRequest<T = unknown> extends AuthenticatedRequest {
  body: T;
}

// ============================================
// Tipos de Response da API
// ============================================

/**
 * Response padrão da API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

/**
 * Response de erro
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
  details?: unknown;
}

/**
 * Response de sucesso
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Response paginada
 */
export interface PaginatedResponse<T> extends ApiSuccessResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Tipos para Entidades do Sistema
// ============================================

/**
 * Igreja
 */
export interface Church {
  id: number;
  name: string;
  code: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  pastor?: string | null;
  districtId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Distrito
 */
export interface District {
  id: number;
  name: string;
  code: string;
  pastorId?: number | null;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Evento
 */
export interface Event {
  id: number;
  title: string;
  description?: string | null;
  date: Date;
  endDate?: Date | null;
  location?: string | null;
  type: string;
  color?: string | null;
  capacity?: number | null;
  isRecurring?: boolean;
  recurrencePattern?: string | null;
  createdBy?: number | null;
  churchId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Reunião
 */
export interface Meeting {
  id: number;
  title: string;
  description?: string | null;
  date: Date;
  location?: string | null;
  type: string;
  createdBy?: number | null;
  churchId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Relacionamento (interessado-missionário)
 */
export interface Relationship {
  id: number;
  interestedId?: number | null;
  missionaryId?: number | null;
  status?: string;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Requisição de Discipulado
 */
export interface DiscipleshipRequest {
  id: number;
  requesterId?: number | null;
  disciplerId?: number | null;
  status?: string;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Mensagem
 */
export interface Message {
  id: number;
  content: string;
  senderId?: number | null;
  conversationId?: number | null;
  createdAt?: Date;
}

/**
 * Conversa
 */
export interface Conversation {
  id: number;
  title?: string | null;
  type?: string;
  createdBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Notificação
 */
export interface Notification {
  id: number;
  title: string;
  message: string;
  userId?: number | null;
  type?: string;
  read?: boolean;
  createdAt?: Date;
}

/**
 * Oração
 */
export interface Prayer {
  id: number;
  title: string;
  content: string;
  userId?: number | null;
  status?: string;
  isAnswered?: boolean;
  answeredAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================
// Tipos para Requests específicos
// ============================================

/**
 * Request de Login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Request de Registro
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password?: string;
  role?: UserRole;
  church?: string;
  churchCode?: string;
}

/**
 * Request de Criação de Usuário
 */
export interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
  role?: UserRole;
  church?: string;
  churchCode?: string;
  districtId?: number;
  isApproved?: boolean;
}

/**
 * Request de Atualização de Usuário
 */
export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  church?: string;
  churchCode?: string;
  districtId?: number;
  isApproved?: boolean;
  status?: string;
  [key: string]: unknown;
}

// ============================================
// Tipos de Middleware
// ============================================

/**
 * Função de middleware Express
 */
export type ExpressMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Função de middleware autenticado
 */
export type AuthenticatedMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

// ============================================
// Tipos de Handler de Rota
// ============================================

/**
 * Handler de rota Express
 */
export type RouteHandler = (
  req: Request,
  res: Response
) => void | Promise<void>;

/**
 * Handler de rota autenticado
 */
export type AuthenticatedRouteHandler = (
  req: AuthenticatedRequest,
  res: Response
) => void | Promise<void>;

// ============================================
// Códigos de Erro
// ============================================

export const ErrorCodes = {
  // Autenticação
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  READONLY_ACCESS: 'READONLY_ACCESS',

  // Validação
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Recursos
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Servidor
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Re-export storage types
export * from './storage';
