/**
 * JWT Authentication Middleware
 * Sistema completo de autenticação com access tokens e refresh tokens
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { ApiErrorResponse, ErrorCodes, UserRole } from '../types';
import { JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } from '../config/jwtConfig';

const storage = new NeonAdapter();

// Configurações JWT - Centralizadas em config/jwtConfig.ts
const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutos
const REFRESH_TOKEN_EXPIRY = JWT_REFRESH_EXPIRES_IN || '7d';  // 7 dias

// Interface para payload do token
export interface JwtPayload {
  id: number;
  email: string;
  role: UserRole;
  name: string;
  church?: string;
  districtId?: number;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// Interface para request autenticado
export interface AuthenticatedRequest extends Request {
  userId?: number;
  user?: {
    id: number;
    email: string;
    role: UserRole;
    name: string;
    church?: string;
    districtId?: number;
  };
  userRole?: UserRole;
  tokenPayload?: JwtPayload;
}

/**
 * Gera par de tokens (access + refresh)
 */
export function generateTokens(user: {
  id: number;
  email: string;
  role: string;
  name: string;
  church?: string | null;
  districtId?: number | null;
}): { accessToken: string; refreshToken: string; expiresIn: number } {
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets not configured');
  }

  const basePayload = {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    name: user.name,
    church: user.church || undefined,
    districtId: user.districtId || undefined,
  };

  const accessToken = jwt.sign(
    { ...basePayload, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { ...basePayload, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60 // 15 minutos em segundos
  };
}

/**
 * Verifica e decodifica access token
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  if (!JWT_SECRET) return null;
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (decoded.type !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verifica e decodifica refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload | null {
  if (!JWT_REFRESH_SECRET) return null;
  
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Middleware: Requer autenticação JWT
 */
export const requireJwtAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Token de autenticação não fornecido',
        code: ErrorCodes.UNAUTHORIZED
      };
      res.status(401).json(errorResponse);
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer '
    const payload = verifyAccessToken(token);

    if (!payload) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Token inválido ou expirado',
        code: ErrorCodes.UNAUTHORIZED
      };
      res.status(401).json(errorResponse);
      return;
    }

    // Verificar se usuário ainda existe e está ativo
    const user = await storage.getUserById(payload.id);
    if (!user) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Usuário não encontrado',
        code: ErrorCodes.UNAUTHORIZED
      };
      res.status(401).json(errorResponse);
      return;
    }

    // Adicionar dados ao request
    req.userId = payload.id;
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      church: payload.church,
      districtId: payload.districtId,
    };
    req.userRole = payload.role;
    req.tokenPayload = payload;

    next();
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: 'Erro na autenticação',
      code: ErrorCodes.INTERNAL_ERROR
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * Middleware: Autenticação opcional (não bloqueia se não tiver token)
 */
export const optionalJwtAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = verifyAccessToken(token);

      if (payload) {
        const user = await storage.getUserById(payload.id);
        if (user) {
          req.userId = payload.id;
          req.user = {
            id: payload.id,
            email: payload.email,
            role: payload.role,
            name: payload.name,
            church: payload.church,
            districtId: payload.districtId,
          };
          req.userRole = payload.role;
          req.tokenPayload = payload;
        }
      }
    }

    next();
  } catch {
    // Continua sem autenticação em caso de erro
    next();
  }
};

/**
 * Middleware: Requer role específica
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user || !req.userRole) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Autenticação necessária',
        code: ErrorCodes.UNAUTHORIZED
      };
      res.status(401).json(errorResponse);
      return;
    }

    if (!allowedRoles.includes(req.userRole)) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Permissão negada para esta ação',
        code: ErrorCodes.FORBIDDEN
      };
      res.status(403).json(errorResponse);
      return;
    }

    next();
  };
};

/**
 * Middleware: Requer acesso de admin
 */
export const requireAdmin = requireRole('superadmin');

/**
 * Middleware: Requer superadmin
 */
export const requireSuperAdmin = requireRole('superadmin');

/**
 * Middleware: Requer pastor ou superior
 */
export const requirePastor = requireRole('superadmin', 'pastor');

export default {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  requireJwtAuth,
  optionalJwtAuth,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requirePastor,
};
