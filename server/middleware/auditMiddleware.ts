/**
 * Middleware de Audit Log Automático
 * Registra automaticamente ações em rotas específicas
 */

import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/auditService';
import { logger } from '../utils/logger';

export interface AuditMiddlewareOptions {
  resource: string;
  action?: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  getResourceId?: (req: Request, res: Response) => number | undefined;
  getOldValue?: (req: Request) => unknown;
  getNewValue?: (req: Request, res: Response) => unknown;
  getMetadata?: (req: Request, res: Response) => Record<string, unknown>;
  skipOnError?: boolean;
}

/**
 * Middleware para audit log automático
 *
 * @example
 * ```typescript
 * router.post('/users',
 *   auditMiddleware({
 *     resource: 'user',
 *     action: 'CREATE',
 *     getResourceId: (_, res) => res.locals.userId,
 *     getNewValue: (req) => req.body,
 *   }),
 *   createUserHandler
 * );
 * ```
 */
export function auditMiddleware(options: AuditMiddlewareOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);
    const startTime = Date.now();

    // Captura o valor antigo antes da operação (para UPDATE/DELETE)
    const oldValue = options.getOldValue?.(req);

    // Override do res.json para capturar resposta
    res.json = function (body: unknown) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Registra audit log após resposta bem-sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const context = auditService.extractContextFromRequest(req);

        const auditData = {
          userId: context.userId || 0,
          userEmail: context.userEmail || 'unknown',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          correlationId: context.correlationId,
        };

        const resourceId = options.getResourceId?.(req, res);
        const newValue = options.getNewValue?.(req, res) || (body as Record<string, unknown>)?.data;
        const metadata = {
          ...options.getMetadata?.(req, res),
          duration,
          statusCode: res.statusCode,
        };

        // Determina ação baseado no método HTTP se não especificada
        const action = options.action || getActionFromMethod(req.method);

        // Log assíncrono - não bloqueia resposta
        setImmediate(async () => {
          try {
            switch (action) {
              case 'CREATE':
                await auditService.logCreate(
                  auditData,
                  options.resource,
                  resourceId || 0,
                  newValue,
                  metadata
                );
                break;
              case 'UPDATE':
                await auditService.logUpdate(
                  auditData,
                  options.resource,
                  resourceId || 0,
                  oldValue,
                  newValue,
                  metadata
                );
                break;
              case 'DELETE':
                await auditService.logDelete(
                  auditData,
                  options.resource,
                  resourceId || 0,
                  oldValue,
                  metadata
                );
                break;
              case 'READ':
                await auditService.logRead(auditData, options.resource, resourceId, metadata);
                break;
            }
          } catch (error) {
            logger.error('Erro ao registrar audit log', error);
          }
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Determina ação de audit baseada no método HTTP
 */
function getActionFromMethod(method: string): 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'READ';
  }
}

/**
 * Middleware simplificado para log de login
 */
export function auditLoginMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      const response = body as { success?: boolean; user?: { id: number; email: string } };

      setImmediate(async () => {
        try {
          const context = auditService.extractContextFromRequest(req);

          if (response?.success && response?.user) {
            await auditService.logLogin(
              {
                userId: response.user.id,
                userEmail: response.user.email,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
              },
              { success: true }
            );
          } else {
            await auditService.logLoginFailed(
              req.body?.email || 'unknown',
              context.ipAddress || 'unknown',
              context.userAgent || 'unknown',
              'invalid_credentials'
            );
          }
        } catch (error) {
          logger.error('Erro ao registrar audit de login', error);
        }
      });

      return originalJson(body);
    };

    next();
  };
}

/**
 * Middleware para log de operações sensíveis
 */
export function auditSensitiveOperation(description: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const context = auditService.extractContextFromRequest(req);

    logger.warn(`[SENSITIVE] ${description}`, {
      userId: context.userId,
      userEmail: context.userEmail,
      ip: context.ipAddress,
      path: req.path,
      method: req.method,
    });

    setImmediate(async () => {
      try {
        await auditService.log({
          userId: context.userId || 0,
          userEmail: context.userEmail || 'unknown',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          action: 'UPDATE',
          resource: 'sensitive_operation',
          metadata: {
            description,
            path: req.path,
            method: req.method,
          },
        });
      } catch (error) {
        logger.error('Erro ao registrar operação sensível', error);
      }
    });

    next();
  };
}

export default auditMiddleware;
