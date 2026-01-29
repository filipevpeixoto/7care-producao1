/**
 * Audit Repository
 * Repositório para persistência de logs de auditoria no banco de dados
 */

import { sql as rawSql } from '../neonConfig';
import { logger } from '../utils/logger';
import { createPaginatedResult, PaginationOptions, PaginatedResult } from './BaseRepository';

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

export interface AuditLog {
  id: number;
  userId: number;
  userEmail: string;
  action: AuditAction;
  resource: string;
  resourceId: number | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateAuditLogDTO {
  userId: number;
  userEmail: string;
  action: AuditAction;
  resource: string;
  resourceId?: number | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditQueryOptions extends PaginationOptions {
  userId?: number;
  action?: AuditAction;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}

export class AuditRepository {
  /**
   * Inicializa a tabela de audit logs se não existir
   */
  async ensureTable(): Promise<void> {
    try {
      await rawSql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          user_email TEXT NOT NULL,
          action TEXT NOT NULL,
          resource TEXT NOT NULL,
          resource_id INTEGER,
          old_value JSONB,
          new_value JSONB,
          ip_address TEXT,
          user_agent TEXT,
          correlation_id TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Cria índices para consultas frequentes
      await rawSql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
      `;
      await rawSql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)
      `;
      await rawSql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource)
      `;
      await rawSql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)
      `;
      await rawSql`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON audit_logs(correlation_id)
      `;
    } catch (error) {
      logger.error('Erro ao criar tabela de audit logs', error);
    }
  }

  /**
   * Cria um novo log de auditoria
   */
  async createAuditLog(data: CreateAuditLogDTO): Promise<AuditLog> {
    try {
      const oldValueJson = data.oldValue ? JSON.stringify(data.oldValue) : null;
      const newValueJson = data.newValue ? JSON.stringify(data.newValue) : null;
      const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null;

      const [log] = await rawSql`
        INSERT INTO audit_logs (
          user_id, user_email, action, resource, resource_id,
          old_value, new_value, ip_address, user_agent,
          correlation_id, metadata, created_at
        )
        VALUES (
          ${data.userId},
          ${data.userEmail},
          ${data.action},
          ${data.resource},
          ${data.resourceId ?? null},
          ${oldValueJson}::jsonb,
          ${newValueJson}::jsonb,
          ${data.ipAddress ?? null},
          ${data.userAgent ?? null},
          ${data.correlationId ?? null},
          ${metadataJson}::jsonb,
          NOW()
        )
        RETURNING *
      `;

      return this.mapAuditLogRecord(log);
    } catch (error) {
      logger.error('Erro ao criar audit log', error);
      throw error;
    }
  }

  /**
   * Busca logs de auditoria com paginação e filtros
   */
  async getAuditLogs(options?: AuditQueryOptions): Promise<PaginatedResult<AuditLog>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 50;
      const offset = (page - 1) * limit;

      // Monta as condições WHERE dinamicamente
      const conditions: string[] = ['1=1'];
      const params: unknown[] = [];

      if (options?.userId) {
        conditions.push(`user_id = $${params.length + 1}`);
        params.push(options.userId);
      }

      if (options?.action) {
        conditions.push(`action = $${params.length + 1}`);
        params.push(options.action);
      }

      if (options?.resource) {
        conditions.push(`resource = $${params.length + 1}`);
        params.push(options.resource);
      }

      if (options?.startDate) {
        conditions.push(`created_at >= $${params.length + 1}`);
        params.push(options.startDate.toISOString());
      }

      if (options?.endDate) {
        conditions.push(`created_at <= $${params.length + 1}`);
        params.push(options.endDate.toISOString());
      }

      // Usa query simples para evitar complexidade com parâmetros dinâmicos
      const logs = await rawSql`
        SELECT * FROM audit_logs
        WHERE 1=1
          AND (${options?.userId ?? null}::integer IS NULL OR user_id = ${options?.userId ?? null})
          AND (${options?.action ?? null}::text IS NULL OR action = ${options?.action ?? null})
          AND (${options?.resource ?? null}::text IS NULL OR resource = ${options?.resource ?? null})
          AND (${options?.startDate?.toISOString() ?? null}::timestamp IS NULL OR created_at >= ${options?.startDate?.toISOString() ?? null}::timestamp)
          AND (${options?.endDate?.toISOString() ?? null}::timestamp IS NULL OR created_at <= ${options?.endDate?.toISOString() ?? null}::timestamp)
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      // Conta total
      const [countResult] = await rawSql`
        SELECT COUNT(*) as count FROM audit_logs
        WHERE 1=1
          AND (${options?.userId ?? null}::integer IS NULL OR user_id = ${options?.userId ?? null})
          AND (${options?.action ?? null}::text IS NULL OR action = ${options?.action ?? null})
          AND (${options?.resource ?? null}::text IS NULL OR resource = ${options?.resource ?? null})
          AND (${options?.startDate?.toISOString() ?? null}::timestamp IS NULL OR created_at >= ${options?.startDate?.toISOString() ?? null}::timestamp)
          AND (${options?.endDate?.toISOString() ?? null}::timestamp IS NULL OR created_at <= ${options?.endDate?.toISOString() ?? null}::timestamp)
      `;

      const total = Number(countResult?.count || 0);
      const data = logs.map(this.mapAuditLogRecord);

      return createPaginatedResult(data, page, limit, total);
    } catch (error) {
      logger.error('Erro ao buscar audit logs', error);
      return createPaginatedResult([], options?.page || 1, options?.limit || 50, 0);
    }
  }

  /**
   * Busca logs por usuário
   */
  async getAuditLogsByUser(
    userId: number,
    options?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    return this.getAuditLogs({
      page: options?.page ?? 1,
      limit: options?.limit ?? 50,
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
      userId,
    });
  }

  /**
   * Busca logs por ação
   */
  async getAuditLogsByAction(
    action: AuditAction,
    options?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    return this.getAuditLogs({
      page: options?.page ?? 1,
      limit: options?.limit ?? 50,
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
      action,
    });
  }

  /**
   * Busca logs por recurso específico
   */
  async getAuditLogsByResource(resource: string, resourceId: number): Promise<AuditLog[]> {
    try {
      const logs = await rawSql`
        SELECT * FROM audit_logs
        WHERE resource = ${resource} AND resource_id = ${resourceId}
        ORDER BY created_at DESC
      `;
      return logs.map(this.mapAuditLogRecord);
    } catch (error) {
      logger.error('Erro ao buscar audit logs por recurso', error);
      return [];
    }
  }

  /**
   * Busca log por correlation ID
   */
  async getAuditLogsByCorrelationId(correlationId: string): Promise<AuditLog[]> {
    try {
      const logs = await rawSql`
        SELECT * FROM audit_logs
        WHERE correlation_id = ${correlationId}
        ORDER BY created_at ASC
      `;
      return logs.map(this.mapAuditLogRecord);
    } catch (error) {
      logger.error('Erro ao buscar audit logs por correlation ID', error);
      return [];
    }
  }

  /**
   * Deleta logs antigos (para manutenção)
   */
  async deleteOldLogs(olderThan: Date): Promise<number> {
    try {
      const result = await rawSql`
        DELETE FROM audit_logs
        WHERE created_at < ${olderThan.toISOString()}
      `;
      return result?.length || 0;
    } catch (error) {
      logger.error('Erro ao deletar audit logs antigos', error);
      return 0;
    }
  }

  /**
   * Conta total de logs
   */
  async countLogs(): Promise<number> {
    try {
      const [result] = await rawSql`
        SELECT COUNT(*) as count FROM audit_logs
      `;
      return Number(result?.count || 0);
    } catch (error) {
      logger.error('Erro ao contar audit logs', error);
      return 0;
    }
  }

  /**
   * Busca estatísticas de auditoria
   */
  async getAuditStats(): Promise<{
    totalLogs: number;
    logsByAction: { action: string; count: number }[];
    logsByResource: { resource: string; count: number }[];
    recentActivity: AuditLog[];
  }> {
    try {
      const [totalResult] = await rawSql`
        SELECT COUNT(*) as count FROM audit_logs
      `;

      const actionStats = await rawSql`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        GROUP BY action
        ORDER BY count DESC
      `;

      const resourceStats = await rawSql`
        SELECT resource, COUNT(*) as count
        FROM audit_logs
        GROUP BY resource
        ORDER BY count DESC
        LIMIT 10
      `;

      const recentLogs = await rawSql`
        SELECT * FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 10
      `;

      return {
        totalLogs: Number(totalResult?.count || 0),
        logsByAction: actionStats.map((r: Record<string, unknown>) => ({
          action: r.action as string,
          count: Number(r.count),
        })),
        logsByResource: resourceStats.map((r: Record<string, unknown>) => ({
          resource: r.resource as string,
          count: Number(r.count),
        })),
        recentActivity: recentLogs.map(this.mapAuditLogRecord),
      };
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de auditoria', error);
      return {
        totalLogs: 0,
        logsByAction: [],
        logsByResource: [],
        recentActivity: [],
      };
    }
  }

  /**
   * Mapeia registro do banco para tipo AuditLog
   */
  private mapAuditLogRecord(record: Record<string, unknown>): AuditLog {
    const parseJson = (value: unknown): unknown => {
      if (!value) return null;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    };

    return {
      id: record.id as number,
      userId: record.user_id as number,
      userEmail: record.user_email as string,
      action: record.action as AuditAction,
      resource: record.resource as string,
      resourceId: record.resource_id as number | null,
      oldValue: parseJson(record.old_value),
      newValue: parseJson(record.new_value),
      ipAddress: record.ip_address as string | null,
      userAgent: record.user_agent as string | null,
      correlationId: record.correlation_id as string | null,
      metadata: parseJson(record.metadata) as Record<string, unknown> | null,
      createdAt:
        record.created_at instanceof Date
          ? record.created_at.toISOString()
          : (record.created_at as string),
    };
  }
}

export const auditRepository = new AuditRepository();
export default auditRepository;
