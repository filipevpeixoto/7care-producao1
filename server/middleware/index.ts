/**
 * Middleware Compartilhado
 * Funções de middleware reutilizáveis para todas as rotas
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { NeonAdapter } from '../neonAdapter';
import { AuthenticatedRequest, ApiErrorResponse, ErrorCodes, UserRole } from '../types';
import { hasAdminAccess, isSuperAdmin, isPastor } from '../utils/permissions';
import { JWT_SECRET } from '../config/jwtConfig';
import { logger } from '../utils/logger';

// Instância compartilhada do storage
const storage = new NeonAdapter();

type JwtUserPayload = {
  id: number;
  email?: string;
  role?: string;
  name?: string;
};

const resolveUserId = (req: AuthenticatedRequest): number | null => {
  const headerValue = req.headers['x-user-id'];
  const rawHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const parsedHeader = rawHeader ? parseInt(String(rawHeader), 10) : NaN;
  if (!Number.isNaN(parsedHeader)) return parsedHeader;

  const authHeaderValue = req.headers.authorization;
  if (!authHeaderValue) return null;
  const rawAuth = Array.isArray(authHeaderValue) ? authHeaderValue[0] : authHeaderValue;
  const authHeader = rawAuth ? String(rawAuth) : '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;
  try {
    if (!JWT_SECRET) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    return typeof decoded?.id === 'number' ? decoded.id : null;
  } catch {
    return null;
  }
};

/**
 * Extrai e valida o ID do usuário do header
 * Adiciona user e userId ao request
 */
export const extractUserId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveUserId(req);

    if (userId !== null) {
      req.userId = userId;
      const user = await storage.getUserById(userId);

      if (user) {
        req.user = user;
        req.userRole = user.role as UserRole;
      }
    }

    next();
  } catch (error) {
    // Não bloquear em caso de erro, apenas continuar
    logger.error('Error extracting user ID:', error);
    next();
  }
};

/**
 * Verifica se o usuário tem acesso read-only e bloqueia edições
 */
export const checkReadOnlyAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveUserId(req);

    if (userId !== null) {
      const user = await storage.getUserById(userId);

      if (user) {
        // Verificar se é admin_readonly ou tem flag readOnly
        const isReadOnly =
          user.role === 'admin_readonly' ||
          (user.extraData &&
            typeof user.extraData === 'object' &&
            (user.extraData as Record<string, unknown>).readOnly === true);

        if (isReadOnly) {
          const errorResponse: ApiErrorResponse = {
            success: false,
            error:
              'Usuário de teste possui acesso somente para leitura. Edições não são permitidas.',
            code: ErrorCodes.READONLY_ACCESS,
          };
          res.status(403).json(errorResponse);
          return;
        }
      }
    }

    next();
  } catch (error) {
    // Em caso de erro, permitir continuar (fail open para não bloquear)
    logger.error('Error checking read-only access:', error);
    next();
  }
};

/**
 * Requer que o usuário esteja autenticado
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveUserId(req);
    if (userId === null) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Authentication required',
        code: ErrorCodes.UNAUTHORIZED,
      };
      res.status(401).json(errorResponse);
      return;
    }

    const user = await storage.getUserById(userId);

    if (!user) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'User not found',
        code: ErrorCodes.UNAUTHORIZED,
      };
      res.status(401).json(errorResponse);
      return;
    }

    req.userId = userId;
    req.user = user;
    req.userRole = user.role as UserRole;

    next();
  } catch (error) {
    logger.error('Error in requireAuth middleware:', error);
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: 'Authentication error',
      code: ErrorCodes.INTERNAL_ERROR,
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * Requer acesso de administrador (superadmin ou pastor)
 */
export const requireAdminAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Primeiro, garantir que está autenticado
    const userId = resolveUserId(req);

    if (userId === null) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Authentication required',
        code: ErrorCodes.UNAUTHORIZED,
      };
      res.status(401).json(errorResponse);
      return;
    }

    const user = await storage.getUserById(userId);

    if (!user) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'User not found',
        code: ErrorCodes.UNAUTHORIZED,
      };
      res.status(401).json(errorResponse);
      return;
    }

    // Verificar se tem acesso admin
    if (!hasAdminAccess(user)) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Admin access required',
        code: ErrorCodes.FORBIDDEN,
      };
      res.status(403).json(errorResponse);
      return;
    }

    req.userId = userId;
    req.user = user;
    req.userRole = user.role as UserRole;

    next();
  } catch (error) {
    logger.error('Error in requireAdminAccess middleware:', error);
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: 'Authorization error',
      code: ErrorCodes.INTERNAL_ERROR,
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * Requer acesso de superadmin
 */
export const requireSuperAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveUserId(req);

    if (userId === null) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Authentication required',
        code: ErrorCodes.UNAUTHORIZED,
      };
      res.status(401).json(errorResponse);
      return;
    }

    const user = await storage.getUserById(userId);

    if (!user) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'User not found',
        code: ErrorCodes.UNAUTHORIZED,
      };
      res.status(401).json(errorResponse);
      return;
    }

    if (!isSuperAdmin(user)) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Superadmin access required',
        code: ErrorCodes.FORBIDDEN,
      };
      res.status(403).json(errorResponse);
      return;
    }

    req.userId = userId;
    req.user = user;
    req.userRole = user.role as UserRole;

    next();
  } catch (error) {
    logger.error('Error in requireSuperAdmin middleware:', error);
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: 'Authorization error',
      code: ErrorCodes.INTERNAL_ERROR,
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * Requer um role específico
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = resolveUserId(req);
      if (userId === null) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: 'Authentication required',
          code: ErrorCodes.UNAUTHORIZED,
        };
        res.status(401).json(errorResponse);
        return;
      }

      const user = await storage.getUserById(userId);

      if (!user) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: 'User not found',
          code: ErrorCodes.UNAUTHORIZED,
        };
        res.status(401).json(errorResponse);
        return;
      }

      if (!allowedRoles.includes(user.role as UserRole)) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: `Required role: ${allowedRoles.join(' or ')}`,
          code: ErrorCodes.FORBIDDEN,
        };
        res.status(403).json(errorResponse);
        return;
      }

      req.userId = userId;
      req.user = user;
      req.userRole = user.role as UserRole;

      next();
    } catch (error) {
      logger.error('Error in requireRole middleware:', error);
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Authorization error',
        code: ErrorCodes.INTERNAL_ERROR,
      };
      res.status(500).json(errorResponse);
    }
  };
};

/**
 * Verifica se o usuário pode acessar dados de um distrito específico
 */
export const requireDistrictAccess = (
  getDistrictId: (req: AuthenticatedRequest) => number | null | undefined
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = resolveUserId(req);
      if (userId === null) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: 'Authentication required',
          code: ErrorCodes.UNAUTHORIZED,
        };
        res.status(401).json(errorResponse);
        return;
      }

      const user = await storage.getUserById(userId);

      if (!user) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: 'User not found',
          code: ErrorCodes.UNAUTHORIZED,
        };
        res.status(401).json(errorResponse);
        return;
      }

      req.userId = userId;
      req.user = user;
      req.userRole = user.role as UserRole;

      // Superadmin tem acesso a todos os distritos
      if (isSuperAdmin(user)) {
        next();
        return;
      }

      // Pastor só pode acessar seu próprio distrito
      if (isPastor(user)) {
        const requestedDistrictId = getDistrictId(req);

        if (requestedDistrictId !== undefined && requestedDistrictId !== null) {
          if (user.districtId !== requestedDistrictId) {
            const errorResponse: ApiErrorResponse = {
              success: false,
              error: 'Access denied to this district',
              code: ErrorCodes.FORBIDDEN,
            };
            res.status(403).json(errorResponse);
            return;
          }
        }

        next();
        return;
      }

      // Outros usuários não têm acesso a recursos de distrito
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Admin access required for district resources',
        code: ErrorCodes.FORBIDDEN,
      };
      res.status(403).json(errorResponse);
    } catch (_error) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Authorization error',
        code: ErrorCodes.INTERNAL_ERROR,
      };
      res.status(500).json(errorResponse);
    }
  };
};

// Exportar middleware de CSRF
export { csrfCookie, csrfProtection, csrfTokenEndpoint, generateCsrfToken } from './csrf';

// Exportar middleware de CSP e headers de segurança
export { cspMiddleware, securityHeadersMiddleware, fullSecurityMiddleware } from './cspHeaders';

// Exportar rate limiters
export {
  authRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
  sensitiveRateLimiter,
  searchRateLimiter,
  webhookRateLimiter,
  createUserBasedRateLimiter,
  rateLimiters,
} from './rateLimiters';
