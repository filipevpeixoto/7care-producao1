/**
 * Audit Service
 * Serviço de auditoria para registrar ações no sistema
 */

import {
  auditRepository,
  CreateAuditLogDTO,
  AuditAction,
  AuditLog,
  AuditQueryOptions,
} from '../repositories/auditRepository';
import { PaginatedResult } from '../repositories/BaseRepository';
import { logger } from '../utils/logger';
import type { Request } from 'express';

export interface AuditContext {
  userId: number;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export class AuditService {
  private initialized = false;

  /**
   * Inicializa o serviço de auditoria
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await auditRepository.ensureTable();
      this.initialized = true;
      logger.info('Audit service initialized');
    } catch (error) {
      logger.error('Failed to initialize audit service', error);
    }
  }

  /**
   * Extrai contexto de auditoria de uma requisição Express
   */
  extractContextFromRequest(req: Request): Partial<AuditContext> {
    const userId = parseInt((req.headers['x-user-id'] as string) || '0');
    const userEmail = (req.headers['x-user-email'] as string) || 'unknown';
    const correlationId = (req.headers['x-correlation-id'] as string) || undefined;

    return {
      userId: userId || undefined,
      userEmail: userEmail,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || undefined,
      correlationId,
    };
  }

  /**
   * Obtém IP do cliente considerando proxies
   */
  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Registra uma ação de criação
   */
  async logCreate(
    context: AuditContext,
    resource: string,
    resourceId: number,
    newValue: unknown,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      ...context,
      action: 'CREATE',
      resource,
      resourceId,
      newValue,
      metadata,
    });
  }

  /**
   * Registra uma ação de leitura
   */
  async logRead(
    context: AuditContext,
    resource: string,
    resourceId?: number,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      ...context,
      action: 'READ',
      resource,
      resourceId: resourceId ?? null,
      metadata,
    });
  }

  /**
   * Registra uma ação de atualização
   */
  async logUpdate(
    context: AuditContext,
    resource: string,
    resourceId: number,
    oldValue: unknown,
    newValue: unknown,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      ...context,
      action: 'UPDATE',
      resource,
      resourceId,
      oldValue,
      newValue,
      metadata,
    });
  }

  /**
   * Registra uma ação de deleção
   */
  async logDelete(
    context: AuditContext,
    resource: string,
    resourceId: number,
    oldValue: unknown,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      ...context,
      action: 'DELETE',
      resource,
      resourceId,
      oldValue,
      metadata,
    });
  }

  /**
   * Registra login bem-sucedido
   */
  async logLogin(
    context: AuditContext,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      ...context,
      action: 'LOGIN',
      resource: 'auth',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Registra logout
   */
  async logLogout(
    context: AuditContext,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      ...context,
      action: 'LOGOUT',
      resource: 'auth',
      metadata,
    });
  }

  /**
   * Registra tentativa de login falha
   */
  async logLoginFailed(
    email: string,
    ipAddress: string,
    userAgent: string,
    reason: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      userId: 0,
      userEmail: email,
      action: 'LOGIN_FAILED',
      resource: 'auth',
      ipAddress,
      userAgent,
      metadata: {
        ...metadata,
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Registra mudança de senha
   */
  async logPasswordChange(
    context: AuditContext,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      ...context,
      action: 'PASSWORD_CHANGE',
      resource: 'user',
      resourceId: context.userId,
      metadata,
    });
  }

  /**
   * Registra mudança de permissões
   */
  async logPermissionChange(
    context: AuditContext,
    targetUserId: number,
    oldPermissions: unknown,
    newPermissions: unknown,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      ...context,
      action: 'PERMISSION_CHANGE',
      resource: 'user',
      resourceId: targetUserId,
      oldValue: oldPermissions,
      newValue: newPermissions,
      metadata,
    });
  }

  /**
   * Registra exportação de dados
   */
  async logExport(
    context: AuditContext,
    resource: string,
    recordCount: number,
    format: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      ...context,
      action: 'EXPORT',
      resource,
      metadata: {
        ...metadata,
        recordCount,
        format,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Registra importação de dados
   */
  async logImport(
    context: AuditContext,
    resource: string,
    recordCount: number,
    successCount: number,
    errorCount: number,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      ...context,
      action: 'IMPORT',
      resource,
      metadata: {
        ...metadata,
        recordCount,
        successCount,
        errorCount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Registra atualização em lote
   */
  async logBulkUpdate(
    context: AuditContext,
    resource: string,
    affectedIds: number[],
    changes: unknown,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      ...context,
      action: 'BULK_UPDATE',
      resource,
      newValue: changes,
      metadata: {
        ...metadata,
        affectedIds,
        affectedCount: affectedIds.length,
      },
    });
  }

  /**
   * Registra deleção em lote
   */
  async logBulkDelete(
    context: AuditContext,
    resource: string,
    deletedIds: number[],
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    return this.log({
      ...context,
      action: 'BULK_DELETE',
      resource,
      metadata: {
        ...metadata,
        deletedIds,
        deletedCount: deletedIds.length,
      },
    });
  }

  /**
   * Método base para registrar log
   */
  private async log(data: CreateAuditLogDTO): Promise<AuditLog | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      return await auditRepository.createAuditLog(data);
    } catch (error) {
      logger.error('Failed to create audit log', error);
      return null;
    }
  }

  /**
   * Busca logs de auditoria
   */
  async getLogs(options?: AuditQueryOptions): Promise<PaginatedResult<AuditLog>> {
    return auditRepository.getAuditLogs(options);
  }

  /**
   * Busca logs por usuário
   */
  async getLogsByUser(
    userId: number,
    options?: AuditQueryOptions
  ): Promise<PaginatedResult<AuditLog>> {
    return auditRepository.getAuditLogsByUser(userId, options);
  }

  /**
   * Busca logs por ação
   */
  async getLogsByAction(
    action: AuditAction,
    options?: AuditQueryOptions
  ): Promise<PaginatedResult<AuditLog>> {
    return auditRepository.getAuditLogsByAction(action, options);
  }

  /**
   * Busca logs por recurso
   */
  async getLogsByResource(resource: string, resourceId: number): Promise<AuditLog[]> {
    return auditRepository.getAuditLogsByResource(resource, resourceId);
  }

  /**
   * Busca logs por correlation ID
   */
  async getLogsByCorrelationId(correlationId: string): Promise<AuditLog[]> {
    return auditRepository.getAuditLogsByCorrelationId(correlationId);
  }

  /**
   * Busca estatísticas de auditoria
   */
  async getStats() {
    return auditRepository.getAuditStats();
  }

  /**
   * Limpa logs antigos
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    return auditRepository.deleteOldLogs(cutoffDate);
  }
}

export const auditService = new AuditService();
export default auditService;
