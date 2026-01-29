/**
 * Repository Interfaces
 * Interfaces base e específicas para injeção de dependência
 */

import type { PaginationOptions, PaginatedResult } from '../BaseRepository';

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
  getAllUsers(): Promise<unknown[]>;
  getUserById(id: number): Promise<unknown | null>;
  getUserByEmail(email: string): Promise<unknown | null>;
  createUser(userData: unknown): Promise<unknown>;
  updateUser(id: number, userData: unknown): Promise<unknown | null>;
  deleteUser(id: number): Promise<boolean>;
  countUsers(): Promise<number>;
  getUsersByChurch(church: string): Promise<unknown[]>;
  getUsersByDistrict(districtId: number): Promise<unknown[]>;
  getUsersByRole(role: string): Promise<unknown[]>;
  searchUsers(query: string, limit?: number): Promise<unknown[]>;
  updateUserPoints(id: number, points: number): Promise<unknown | null>;
}

/**
 * Interface para Church Repository
 */
export interface IChurchRepository {
  getAllChurches(): Promise<unknown[]>;
  getChurchById(id: number): Promise<unknown | null>;
  getChurchByCode(code: string): Promise<unknown | null>;
  createChurch(data: unknown): Promise<unknown>;
  updateChurch(id: number, data: unknown): Promise<unknown | null>;
  deleteChurch(id: number): Promise<boolean>;
  getChurchesByDistrict(districtId: number): Promise<unknown[]>;
}

/**
 * Interface para Event Repository
 */
export interface IEventRepository {
  getAllEvents(): Promise<unknown[]>;
  getEventById(id: number): Promise<unknown | null>;
  createEvent(data: unknown): Promise<unknown>;
  updateEvent(id: number, data: unknown): Promise<unknown | null>;
  deleteEvent(id: number): Promise<boolean>;
  getEventsByDateRange(startDate: Date, endDate: Date): Promise<unknown[]>;
  getEventsByChurch(churchId: number): Promise<unknown[]>;
}

/**
 * Interface para District Repository
 */
export interface IDistrictRepository {
  getAllDistricts(): Promise<unknown[]>;
  getDistrictById(id: number): Promise<unknown | null>;
  getDistrictByCode(code: string): Promise<unknown | null>;
  createDistrict(data: unknown): Promise<unknown>;
  updateDistrict(id: number, data: unknown): Promise<unknown | null>;
  deleteDistrict(id: number): Promise<boolean>;
  getDistrictStats(districtId: number): Promise<unknown>;
}

/**
 * Interface para Election Repository
 */
export interface IElectionRepository {
  getAllElections(): Promise<unknown[]>;
  getElectionById(id: number): Promise<unknown | null>;
  createElection(data: unknown): Promise<unknown>;
  updateElection(id: number, data: unknown): Promise<unknown | null>;
  deleteElection(id: number): Promise<boolean>;
  getActiveElections(): Promise<unknown[]>;
  getCandidatesByElection(electionId: number): Promise<unknown[]>;
  getVotesByElection(electionId: number): Promise<unknown[]>;
  registerVote(electionId: number, candidateId: number, voterId: number): Promise<unknown>;
}

/**
 * Interface para Audit Repository
 */
export interface IAuditRepository {
  createAuditLog(data: AuditLogEntry): Promise<unknown>;
  getAuditLogs(options?: AuditQueryOptions): Promise<PaginatedResult<unknown>>;
  getAuditLogsByUser(
    userId: number,
    options?: PaginationOptions
  ): Promise<PaginatedResult<unknown>>;
  getAuditLogsByAction(
    action: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<unknown>>;
  getAuditLogsByResource(resource: string, resourceId: number): Promise<unknown[]>;
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
  getUserPoints(userId: number): Promise<unknown>;
  addPoints(userId: number, points: number, reason: string): Promise<unknown>;
  getPointsHistory(userId: number, options?: PaginationOptions): Promise<PaginatedResult<unknown>>;
  getRankingByChurch(churchId: number, limit?: number): Promise<unknown[]>;
  getRankingByDistrict(districtId: number, limit?: number): Promise<unknown[]>;
}

/**
 * Interface para Prayer Repository
 */
export interface IPrayerRepository {
  getAllPrayers(): Promise<unknown[]>;
  getPrayerById(id: number): Promise<unknown | null>;
  createPrayer(data: unknown): Promise<unknown>;
  updatePrayer(id: number, data: unknown): Promise<unknown | null>;
  deletePrayer(id: number): Promise<boolean>;
  getPrayersByUser(userId: number): Promise<unknown[]>;
  markAsPrayed(prayerId: number, userId: number): Promise<unknown>;
}

/**
 * Interface para Meeting Repository
 */
export interface IMeetingRepository {
  getAllMeetings(): Promise<unknown[]>;
  getMeetingById(id: number): Promise<unknown | null>;
  createMeeting(data: unknown): Promise<unknown>;
  updateMeeting(id: number, data: unknown): Promise<unknown | null>;
  deleteMeeting(id: number): Promise<boolean>;
  getMeetingsByDateRange(startDate: Date, endDate: Date): Promise<unknown[]>;
  registerAttendance(meetingId: number, userId: number): Promise<unknown>;
}

export default {
  IBaseRepository: {} as IBaseRepository<unknown, unknown, unknown>,
};
