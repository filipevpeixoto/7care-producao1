/**
 * Route Helpers
 * Utilitários e padrões comuns para rotas Express
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from './logger';
import { auditService, AuditContext } from '../services/auditService';

/**
 * Tipos de erro HTTP comuns
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

/**
 * Interface para resposta de erro padronizada
 */
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  code?: string;
  correlationId?: string;
}

/**
 * Interface para resposta de sucesso padronizada
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Wrapper para handler async - captura erros automaticamente
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(error => {
      logger.error('Async handler error', error);
      next(error);
    });
  };
};

/**
 * Envia resposta de erro padronizada
 */
export const sendError = (
  res: Response,
  status: HttpStatusCode,
  error: string,
  details?: unknown
): Response => {
  const correlationId = res.getHeader('x-correlation-id') as string | undefined;
  const response: ErrorResponse = {
    error,
    correlationId,
  };

  if (details) {
    response.details = details;
  }

  return res.status(status).json(response);
};

/**
 * Envia resposta de sucesso padronizada
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  status: HttpStatusCode = HttpStatus.OK,
  message?: string
): Response => {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return res.status(status).json(response);
};

/**
 * Erros HTTP padronizados
 */
export const badRequest = (res: Response, message: string, details?: unknown): Response =>
  sendError(res, HttpStatus.BAD_REQUEST, message, details);

export const unauthorized = (res: Response, message = 'Não autorizado'): Response =>
  sendError(res, HttpStatus.UNAUTHORIZED, message);

export const forbidden = (res: Response, message = 'Acesso negado'): Response =>
  sendError(res, HttpStatus.FORBIDDEN, message);

export const notFound = (res: Response, resource = 'Recurso'): Response =>
  sendError(res, HttpStatus.NOT_FOUND, `${resource} não encontrado`);

export const conflict = (res: Response, message: string): Response =>
  sendError(res, HttpStatus.CONFLICT, message);

export const tooManyRequests = (res: Response, message = 'Muitas requisições'): Response =>
  sendError(res, HttpStatus.TOO_MANY_REQUESTS, message);

export const internalError = (res: Response, message = 'Erro interno do servidor'): Response =>
  sendError(res, HttpStatus.INTERNAL_ERROR, message);

/**
 * Extrai user ID do header
 */
export const getUserId = (req: Request): number | null => {
  const headerValue = req.headers['x-user-id'];
  const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const parsed = rawValue ? parseInt(String(rawValue), 10) : NaN;
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Extrai user email do header
 */
export const getUserEmail = (req: Request): string | null => {
  const headerValue = req.headers['x-user-email'];
  return Array.isArray(headerValue) ? headerValue[0] : headerValue || null;
};

/**
 * Extrai correlation ID do header
 */
export const getCorrelationId = (req: Request): string | null => {
  const headerValue = req.headers['x-correlation-id'];
  return Array.isArray(headerValue) ? headerValue[0] : headerValue || null;
};

/**
 * Extrai contexto de auditoria da request
 */
export const getAuditContext = (req: Request): AuditContext => {
  return {
    userId: getUserId(req) || 0,
    userEmail: getUserEmail(req) || 'unknown',
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || undefined,
    correlationId: getCorrelationId(req) || undefined,
  };
};

/**
 * Obtém IP do cliente considerando proxies
 */
export const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

/**
 * Parser seguro de ID de parâmetro
 */
export const parseParamId = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Valida campos obrigatórios
 */
export const validateRequired = (
  body: Record<string, unknown>,
  fields: string[]
): { valid: boolean; missing: string[] } => {
  const missing = fields.filter(field => {
    const value = body[field];
    return value === undefined || value === null || value === '';
  });

  return {
    valid: missing.length === 0,
    missing,
  };
};

/**
 * Middleware de validação de campos obrigatórios
 */
export const requireFields = (...fields: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { valid, missing } = validateRequired(req.body, fields);
    if (!valid) {
      badRequest(res, `Campos obrigatórios: ${missing.join(', ')}`);
      return;
    }
    next();
  };
};

/**
 * Middleware que requer usuário autenticado
 */
export const requireAuth: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userId = getUserId(req);
  if (!userId) {
    unauthorized(res);
    return;
  }
  next();
};

/**
 * Cria middleware que requer role específica
 */
export const requireRole = (...roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.headers['x-user-role'];
    const role = Array.isArray(userRole) ? userRole[0] : userRole;

    if (!role || !roles.includes(role)) {
      forbidden(res, 'Permissão insuficiente');
      return;
    }
    next();
  };
};

/**
 * Handler genérico para CRUD list
 */
export const createListHandler = <T>(
  fetchFn: (req: Request) => Promise<T[]>,
  resourceName: string
): RequestHandler => {
  return asyncHandler(async (req: Request, res: Response) => {
    try {
      const items = await fetchFn(req);
      return res.json(items);
    } catch (error) {
      logger.error(`Erro ao listar ${resourceName}`, error);
      return internalError(res);
    }
  });
};

/**
 * Handler genérico para CRUD get by ID
 */
export const createGetByIdHandler = <T>(
  fetchFn: (id: number, req: Request) => Promise<T | null>,
  resourceName: string
): RequestHandler => {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = parseParamId(req.params.id);
    if (!id) {
      return badRequest(res, 'ID inválido');
    }

    try {
      const item = await fetchFn(id, req);
      if (!item) {
        return notFound(res, resourceName);
      }
      return res.json(item);
    } catch (error) {
      logger.error(`Erro ao buscar ${resourceName}`, error);
      return internalError(res);
    }
  });
};

/**
 * Handler genérico para CRUD create
 */
export const createCreateHandler = <T, D>(
  createFn: (data: D, req: Request) => Promise<T>,
  resourceName: string,
  auditResource?: string
): RequestHandler => {
  return asyncHandler(async (req: Request, res: Response) => {
    try {
      const item = await createFn(req.body as D, req);

      // Audit log
      if (auditResource) {
        const context = getAuditContext(req);
        await auditService.logCreate(context, auditResource, (item as { id: number }).id, item);
      }

      return res.status(HttpStatus.CREATED).json(item);
    } catch (error) {
      logger.error(`Erro ao criar ${resourceName}`, error);
      return internalError(res);
    }
  });
};

/**
 * Handler genérico para CRUD update
 */
export const createUpdateHandler = <T, D>(
  fetchFn: (id: number) => Promise<T | null>,
  updateFn: (id: number, data: D, req: Request) => Promise<T | null>,
  resourceName: string,
  auditResource?: string
): RequestHandler => {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = parseParamId(req.params.id);
    if (!id) {
      return badRequest(res, 'ID inválido');
    }

    try {
      const oldItem = await fetchFn(id);
      if (!oldItem) {
        return notFound(res, resourceName);
      }

      const updated = await updateFn(id, req.body as D, req);
      if (!updated) {
        return internalError(res);
      }

      // Audit log
      if (auditResource) {
        const context = getAuditContext(req);
        await auditService.logUpdate(context, auditResource, id, oldItem, updated);
      }

      return res.json(updated);
    } catch (error) {
      logger.error(`Erro ao atualizar ${resourceName}`, error);
      return internalError(res);
    }
  });
};

/**
 * Handler genérico para CRUD delete
 */
export const createDeleteHandler = <T>(
  fetchFn: (id: number) => Promise<T | null>,
  deleteFn: (id: number, req: Request) => Promise<boolean>,
  resourceName: string,
  auditResource?: string
): RequestHandler => {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = parseParamId(req.params.id);
    if (!id) {
      return badRequest(res, 'ID inválido');
    }

    try {
      const item = await fetchFn(id);
      if (!item) {
        return notFound(res, resourceName);
      }

      const deleted = await deleteFn(id, req);
      if (!deleted) {
        return internalError(res);
      }

      // Audit log
      if (auditResource) {
        const context = getAuditContext(req);
        await auditService.logDelete(context, auditResource, id, item);
      }

      return res.json({ success: true, message: `${resourceName} deletado com sucesso` });
    } catch (error) {
      logger.error(`Erro ao deletar ${resourceName}`, error);
      return internalError(res);
    }
  });
};

export default {
  asyncHandler,
  sendError,
  sendSuccess,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  internalError,
  getUserId,
  getUserEmail,
  getCorrelationId,
  getAuditContext,
  getClientIp,
  parseParamId,
  validateRequired,
  requireFields,
  requireAuth,
  requireRole,
  createListHandler,
  createGetByIdHandler,
  createCreateHandler,
  createUpdateHandler,
  createDeleteHandler,
  HttpStatus,
};
