/**
 * Repository Interfaces
 * Interfaces base e específicas para injeção de dependência
 *
 * All specific interfaces now use proper types instead of `unknown`
 * to enable compile-time type safety across the codebase.
 */

import type { PaginationOptions, PaginatedResult } from '../BaseRepository';
import type { User, Church, Event, Meeting } from '../../../shared/schema';
import type { CreateUserInput, UpdateUserInput, CreateChurchInput, UpdateChurchInput, CreateEventInput, UpdateEventInput, CreateMeetingInput, UpdateMeetingInput } from '../../types/storage';

/**
 * Interface base para todos os repositórios
 */
export interface IBaseRepository<T, CreateDTO, UpdateDTO> {
  getAll(): Promise<T[]>;
  getById(id: number): Promise<T | null>;
  create(data: CreateDTO): Promise<T>;
  update(id: number, data: UpdateDTO): Promise<T | null>;
  delete(id: number): Promise<boolean>;
  count(): Promise<number>;
}

/**
 * Interface para User Repository
 */
export interface IUserRepository {
  getAllUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(userData: CreateUserInput): Promise<User>;
  updateUser(id: number, userData: UpdateUserInput): Promise<User | null>;
  deleteUser(id: number): Promise<boolean>;
  countUsers(): Promise<number>;
  getUsersByChurch(church: string): Promise<User[]>;
  getUsersByDistrict(districtId: number): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  searchUsers(query: string, limit?: number): Promise<User[]>;
  updateUserPoints(id: number, points: number): Promise<User | null>;
}

/**
 * Interface para Church Repository
 */
export interface IChurchRepository {
  getAllChurches(): Promise<Church[]>;
  getChurchById(id: number): Promise<Church | null>;
  getChurchByCode(code: string): Promise<Church | null>;
  createChurch(data: CreateChurchInput): Promise<Church>;
  updateChurch(id: number, data: UpdateChurchInput): Promise<Church | null>;
  deleteChurch(id: number): Promise<boolean>;
  getChurchesByDistrict(districtId: number): Promise<Church[]>;
}

/**
 * Interface para Event Repository
 */
export interface IEventRepository {
  getAllEvents(): Promise<Event[]>;
  getEventById(id: number): Promise<Event | null>;
  createEvent(data: CreateEventInput): Promise<Event>;
  updateEvent(id: number, data: UpdateEventInput): Promise<Event | null>;
  deleteEvent(id: number): Promise<boolean>;
  getEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]>;
  getEventsByChurch(churchId: number): Promise<Event[]>;
}

/**
 * Interface para District Repository
 */
export interface IDistrictRepository {
  getAllDistricts(): Promise<Record<string, unknown>[]>;
  getDistrictById(id: number): Promise<Record<string, unknown> | null>;
  getDistrictByCode(code: string): Promise<Record<string, unknown> | null>;
  createDistrict(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateDistrict(id: number, data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  deleteDistrict(id: number): Promise<boolean>;
  getDistrictStats(districtId: number): Promise<Record<string, unknown>>;
}

/**
 * Interface para Election Repository
 */
export interface IElectionRepository {
  getAllElections(): Promise<Record<string, unknown>[]>;
  getElectionById(id: number): Promise<Record<string, unknown> | null>;
  createElection(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateElection(id: number, data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  deleteElection(id: number): Promise<boolean>;
  getActiveElections(): Promise<Record<string, unknown>[]>;
  getCandidatesByElection(electionId: number): Promise<Record<string, unknown>[]>;
  getVotesByElection(electionId: number): Promise<Record<string, unknown>[]>;
  registerVote(electionId: number, candidateId: number, voterId: number): Promise<Record<string, unknown>>;
}

/**
 * Interface para Audit Repository
 */
export interface IAuditRepository {
  createAuditLog(data: AuditLogEntry): Promise<Record<string, unknown>>;
  getAuditLogs(options?: AuditQueryOptions): Promise<PaginatedResult<Record<string, unknown>>>;
  getAuditLogsByUser(
    userId: number,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Record<string, unknown>>>;
  getAuditLogsByAction(
    action: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Record<string, unknown>>>;
  getAuditLogsByResource(resource: string, resourceId: number): Promise<Record<string, unknown>[]>;
  deleteOldLogs(olderThan: Date): Promise<number>;
}

/**
 * Entrada de log de auditoria
 */
export interface AuditLogEntry {
  userId: number;
  userEmail: string;
  action: AuditAction;
  resource: string;
  resourceId?: number;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Ações de auditoria
 */
export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGE'
  | 'PERMISSION_CHANGE'
  | 'EXPORT'
  | 'IMPORT'
  | 'BULK_UPDATE'
  | 'BULK_DELETE';

/**
 * Opções de query para audit logs
 */
export interface AuditQueryOptions extends PaginationOptions {
  userId?: number;
  action?: AuditAction;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Interface para Points Repository
 */
export interface IPointsRepository {
  getUserPoints(userId: number): Promise<Record<string, unknown>>;
  addPoints(userId: number, points: number, reason: string): Promise<Record<string, unknown>>;
  getPointsHistory(userId: number, options?: PaginationOptions): Promise<PaginatedResult<Record<string, unknown>>>;
  getRankingByChurch(churchId: number, limit?: number): Promise<Record<string, unknown>[]>;
  getRankingByDistrict(districtId: number, limit?: number): Promise<Record<string, unknown>[]>;
}

/**
 * Interface para Prayer Repository
 */
export interface IPrayerRepository {
  getAllPrayers(): Promise<Record<string, unknown>[]>;
  getPrayerById(id: number): Promise<Record<string, unknown> | null>;
  createPrayer(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updatePrayer(id: number, data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  deletePrayer(id: number): Promise<boolean>;
  getPrayersByUser(userId: number): Promise<Record<string, unknown>[]>;
  markAsPrayed(prayerId: number, userId: number): Promise<Record<string, unknown>>;
}

/**
 * Interface para Meeting Repository
 */
export interface IMeetingRepository {
  getAllMeetings(): Promise<Meeting[]>;
  getMeetingById(id: number): Promise<Meeting | null>;
  createMeeting(data: CreateMeetingInput): Promise<Meeting>;
  updateMeeting(id: number, data: UpdateMeetingInput): Promise<Meeting | null>;
  deleteMeeting(id: number): Promise<boolean>;
  getMeetingsByDateRange(startDate: Date, endDate: Date): Promise<Meeting[]>;
  registerAttendance(meetingId: number, userId: number): Promise<Record<string, unknown>>;
}

export default {
  IBaseRepository: {} as IBaseRepository<unknown, unknown, unknown>,
};
