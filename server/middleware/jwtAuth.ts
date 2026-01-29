/**
 * JWT Authentication Middleware
 * @module middleware/jwtAuth
 * @description Sistema completo de autenticação com access tokens e refresh tokens.
 * Implementa boas práticas de segurança incluindo:
 * - Tokens de curta duração (access) e longa duração (refresh)
 * - Suporte a cookies httpOnly para maior segurança
 * - Fingerprinting de dispositivo para detectar token theft
 * - Verificação de usuário ativo a cada requisição
 *
 * @example
 * ```typescript
 * import { requireJwtAuth, requireRole, generateTokens } from './middleware/jwtAuth';
 *
 * // Gerar tokens no login
 * const tokens = generateTokens(user);
 *
 * // Proteger rota
 * app.get('/protected', requireJwtAuth, handler);
 *
 * // Exigir role específica
 * app.post('/admin', requireJwtAuth, requireRole('superadmin'), handler);
 * ```
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { NeonAdapter } from '../neonAdapter';
import { ApiErrorResponse, ErrorCodes, UserRole } from '../types';
import { JWT_SECRET, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN } from '../config/jwtConfig';
import { logger } from '../utils/logger';

const storage = new NeonAdapter();

// Configurações JWT - Centralizadas em config/jwtConfig.ts
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRY = JWT_REFRESH_EXPIRES_IN || '7d'; // 7 dias

/** Nome do cookie para refresh token */
const REFRESH_TOKEN_COOKIE = '7care_refresh_token';

/** Opções de segurança para cookies */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
  path: '/api/auth',
};

/**
 * Interface para payload do token JWT
 * @interface JwtPayload
 */
export interface JwtPayload {
  /** ID do usuário */
  id: number;
  /** Email do usuário */
  email: string;
  /** Role do usuário no sistema */
  role: UserRole;
  /** Nome do usuário */
  name: string;
  /** Nome da igreja (opcional) */
  church?: string;
  /** ID do distrito (opcional) */
  districtId?: number;
  /** Tipo do token (access ou refresh) */
  type: 'access' | 'refresh';
  /** Fingerprint do dispositivo (para validação adicional) */
  fingerprint?: string;
  /** Timestamp de criação (adicionado pelo JWT) */
  iat?: number;
  /** Timestamp de expiração (adicionado pelo JWT) */
  exp?: number;
}

/**
 * Interface para request com dados de autenticação
 * @interface AuthenticatedRequest
 */
export interface AuthenticatedRequest extends Request {
  /** ID do usuário autenticado */
  userId?: number;
  /** Dados do usuário autenticado */
  user?: {
    id: number;
    email: string;
    role: UserRole;
    name: string;
    church?: string;
    districtId?: number;
  };
  /** Role do usuário (atalho) */
  userRole?: UserRole;
  /** Payload completo do token */
  tokenPayload?: JwtPayload;
}

/**
 * Gera fingerprint do dispositivo baseado em headers da requisição
 * @param {Request} req - Requisição Express
 * @returns {string} Hash SHA-256 do fingerprint
 * @description Cria um identificador único do dispositivo combinando User-Agent,
 * Accept-Language e IP para detectar uso do token em dispositivo diferente.
 */
export function generateFingerprint(req: Request): string {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.ip || req.connection?.remoteAddress || '',
  ].join('|');

  return crypto.createHash('sha256').update(components).digest('hex').substring(0, 16);
}

/**
 * Gera par de tokens (access + refresh)
 * @param {Object} user - Dados do usuário para incluir no token
 * @param {number} user.id - ID do usuário
 * @param {string} user.email - Email do usuário
 * @param {string} user.role - Role do usuário
 * @param {string} user.name - Nome do usuário
 * @param {string|null} [user.church] - Nome da igreja
 * @param {number|null} [user.districtId] - ID do distrito
 * @param {string} [fingerprint] - Fingerprint do dispositivo
 * @returns {{accessToken: string, refreshToken: string, expiresIn: number}} Tokens gerados
 * @throws {Error} Se JWT secrets não estiverem configurados
 */
export function generateTokens(
  user: {
    id: number;
    email: string;
    role: string;
    name: string;
    church?: string | null;
    districtId?: number | null;
  },
  fingerprint?: string
): { accessToken: string; refreshToken: string; expiresIn: number } {
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
    fingerprint,
  };

  const accessToken = jwt.sign({ ...basePayload, type: 'access' }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign({ ...basePayload, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutos em segundos
  };
}

/**
 * Define refresh token em cookie httpOnly
 * @param {Response} res - Response Express
 * @param {string} refreshToken - Refresh token a armazenar
 * @description Armazena o refresh token em cookie seguro para evitar
 * exposição via JavaScript (proteção contra XSS).
 */
export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
}

/**
 * Remove refresh token do cookie
 * @param {Response} res - Response Express
 */
export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/auth' });
}

/**
 * Obtém refresh token do cookie
 * @param {Request} req - Request Express
 * @returns {string | undefined} Refresh token ou undefined
 */
export function getRefreshTokenFromCookie(req: Request): string | undefined {
  return req.cookies?.[REFRESH_TOKEN_COOKIE];
}

/**
 * Verifica e decodifica access token
 * @param {string} token - Token JWT a verificar
 * @param {string} [fingerprint] - Fingerprint para validação adicional (opcional)
 * @returns {JwtPayload | null} Payload decodificado ou null se inválido
 */
export function verifyAccessToken(token: string, fingerprint?: string): JwtPayload | null {
  if (!JWT_SECRET) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (decoded.type !== 'access') return null;

    // Verificar fingerprint se fornecido no token
    if (decoded.fingerprint && fingerprint && decoded.fingerprint !== fingerprint) {
      logger.warn('Token fingerprint mismatch detected', {
        userId: decoded.id,
        expected: decoded.fingerprint,
        received: fingerprint,
      });
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verifica e decodifica refresh token
 * @param {string} token - Token JWT a verificar
 * @param {string} [fingerprint] - Fingerprint para validação adicional (opcional)
 * @returns {JwtPayload | null} Payload decodificado ou null se inválido
 */
export function verifyRefreshToken(token: string, fingerprint?: string): JwtPayload | null {
  if (!JWT_REFRESH_SECRET) return null;

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
    if (decoded.type !== 'refresh') return null;

    // Verificar fingerprint se fornecido
    if (decoded.fingerprint && fingerprint && decoded.fingerprint !== fingerprint) {
      logger.warn('Refresh token fingerprint mismatch', { userId: decoded.id });
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Middleware: Requer autenticação JWT
 * @description Valida o token JWT no header Authorization e adiciona dados do
 * usuário ao request. Também verifica se o usuário ainda existe e está ativo.
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
        code: ErrorCodes.UNAUTHORIZED,
      };
      res.status(401).json(errorResponse);
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer '
    const fingerprint = generateFingerprint(req);
    const payload = verifyAccessToken(token, fingerprint);

    if (!payload) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Token inválido ou expirado',
        code: ErrorCodes.UNAUTHORIZED,
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
        code: ErrorCodes.UNAUTHORIZED,
      };
      res.status(401).json(errorResponse);
      return;
    }

    // Verificar se usuário está ativo
    if (user.status === 'inactive') {
      logger.warn('Access attempt by inactive user', { userId: user.id });
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Conta desativada',
        code: ErrorCodes.UNAUTHORIZED,
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
    logger.error('Authentication error', error);
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: 'Erro na autenticação',
      code: ErrorCodes.INTERNAL_ERROR,
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * Middleware: Autenticação opcional (não bloqueia se não tiver token)
 * @description Tenta autenticar o usuário se houver token, mas permite
 * continuar mesmo sem autenticação.
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
      const fingerprint = generateFingerprint(req);
      const payload = verifyAccessToken(token, fingerprint);

      if (payload) {
        const user = await storage.getUserById(payload.id);
        if (user && user.status !== 'inactive') {
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
 * @param {...UserRole} allowedRoles - Roles permitidas para acessar a rota
 * @returns Middleware Express
 * @description Deve ser usado após requireJwtAuth para verificar se o usuário
 * tem uma das roles permitidas.
 * @example
 * ```typescript
 * app.post('/admin', requireJwtAuth, requireRole('superadmin', 'pastor'), handler);
 * ```
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.userRole) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Autenticação necessária',
        code: ErrorCodes.UNAUTHORIZED,
      };
      res.status(401).json(errorResponse);
      return;
    }

    if (!allowedRoles.includes(req.userRole)) {
      logger.warn('Permission denied', {
        userId: req.userId,
        userRole: req.userRole,
        requiredRoles: allowedRoles,
      });
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Permissão negada para esta ação',
        code: ErrorCodes.FORBIDDEN,
      };
      res.status(403).json(errorResponse);
      return;
    }

    next();
  };
};

/** Middleware: Requer acesso de admin (superadmin) */
export const requireAdmin = requireRole('superadmin');

/** Middleware: Requer superadmin */
export const requireSuperAdmin = requireRole('superadmin');

/** Middleware: Requer pastor ou superior */
export const requirePastor = requireRole('superadmin', 'pastor');

export default {
  generateTokens,
  generateFingerprint,
  verifyAccessToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie,
  requireJwtAuth,
  optionalJwtAuth,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requirePastor,
};
