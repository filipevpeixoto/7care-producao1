/**
 * Módulo compartilhado de autenticação JWT
 *
 * Este módulo fornece funções utilitárias para geração e verificação de tokens JWT,
 * podendo ser usado tanto pelo server/ quanto pelo netlify/.
 *
 * @module shared/auth/jwtUtils
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

// ============ TIPOS ============

/**
 * Roles de usuário no sistema
 */
export type UserRole =
  | 'superadmin'
  | 'pastor'
  | 'member'
  | 'interested'
  | 'missionary'
  | 'admin_readonly';

/**
 * Payload do token JWT
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
 * Par de tokens (access + refresh)
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Dados do usuário para geração de token
 */
export interface UserForToken {
  id: number;
  email: string;
  role: string;
  name: string;
  church?: string | null;
  districtId?: number | null;
}

/**
 * Request simplificado para fingerprint
 */
export interface FingerprintRequest {
  headers: {
    'user-agent'?: string;
    'accept-language'?: string;
  };
  ip?: string;
  connection?: { remoteAddress?: string };
}

// ============ CONFIGURAÇÃO ============

/**
 * Configuração centralizada de JWT
 */
export const JWT_CONFIG = {
  /** Tempo de expiração do access token em segundos */
  accessTokenExpiry: 15 * 60, // 15 minutos
  /** Tempo de expiração do refresh token em segundos */
  refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 dias
  /** Tempo de expiração em segundos (para resposta da API) */
  accessTokenExpirySeconds: 15 * 60, // 15 minutos
};

// ============ FUNÇÕES DE SEGURANÇA ============

/**
 * Obtém JWT_SECRET de forma segura
 * @throws {Error} Se não configurado em produção
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isProduction && !secret) {
    throw new Error('JWT_SECRET não configurado em produção!');
  }

  if (isProduction && secret && secret.length < 32) {
    throw new Error('JWT_SECRET deve ter no mínimo 32 caracteres em produção.');
  }

  // Valor padrão apenas para desenvolvimento local
  return secret || (isDevelopment ? '7care-dev-secret-DO-NOT-USE-IN-PROD' : '');
}

/**
 * Obtém JWT_REFRESH_SECRET de forma segura
 * @throws {Error} Se não configurado em produção
 */
export function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isProduction && !secret) {
    throw new Error('JWT_REFRESH_SECRET não configurado em produção!');
  }

  if (isProduction && secret && secret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET deve ter no mínimo 32 caracteres em produção.');
  }

  return secret || (isDevelopment ? '7care-dev-refresh-secret-DO-NOT-USE-IN-PROD' : '');
}

// ============ FUNÇÕES DE TOKEN ============

/**
 * Gera fingerprint do dispositivo baseado em headers da requisição
 * @param req - Requisição com headers
 * @returns Hash SHA-256 do fingerprint (16 caracteres)
 */
export function generateFingerprint(req: FingerprintRequest): string {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.ip || req.connection?.remoteAddress || '',
  ].join('|');

  return crypto.createHash('sha256').update(components).digest('hex').substring(0, 16);
}

/**
 * Gera par de tokens (access + refresh)
 * @param user - Dados do usuário
 * @param fingerprint - Fingerprint do dispositivo (opcional)
 * @returns Par de tokens com tempo de expiração
 * @throws {Error} Se JWT secrets não estiverem configurados
 */
export function generateTokens(user: UserForToken, fingerprint?: string): TokenPair {
  const jwtSecret = getJwtSecret();
  const jwtRefreshSecret = getJwtRefreshSecret();

  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT secrets não configurados');
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

  const accessOptions: SignOptions = { expiresIn: JWT_CONFIG.accessTokenExpiry };
  const refreshOptions: SignOptions = { expiresIn: JWT_CONFIG.refreshTokenExpiry };

  const accessToken = jwt.sign({ ...basePayload, type: 'access' }, jwtSecret, accessOptions);
  const refreshToken = jwt.sign(
    { ...basePayload, type: 'refresh' },
    jwtRefreshSecret,
    refreshOptions
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_CONFIG.accessTokenExpirySeconds,
  };
}

/**
 * Gera apenas access token (para Netlify Functions compatibilidade)
 * @param user - Dados do usuário
 * @param expiresInSeconds - Tempo de expiração em segundos (default: 24h = 86400s)
 * @returns Access token
 */
export function generateAccessToken(user: UserForToken, expiresInSeconds = 24 * 60 * 60): string {
  const jwtSecret = getJwtSecret();

  if (!jwtSecret) {
    throw new Error('JWT_SECRET não configurado');
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const options: SignOptions = { expiresIn: expiresInSeconds };
  return jwt.sign(payload, jwtSecret, options);
}

/**
 * Verifica e decodifica access token
 * @param token - Token JWT a verificar
 * @param fingerprint - Fingerprint para validação adicional (opcional)
 * @returns Payload decodificado ou null se inválido
 */
export function verifyAccessToken(token: string, fingerprint?: string): JwtPayload | null {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) return null;

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // Se tem type definido, verificar se é access
    if (decoded.type && decoded.type !== 'access') return null;

    // Verificar fingerprint se fornecido no token
    if (decoded.fingerprint && fingerprint && decoded.fingerprint !== fingerprint) {
      console.warn('[JWT] Fingerprint mismatch detectado', { userId: decoded.id });
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verifica e decodifica refresh token
 * @param token - Token JWT a verificar
 * @param fingerprint - Fingerprint para validação adicional (opcional)
 * @returns Payload decodificado ou null se inválido
 */
export function verifyRefreshToken(token: string, fingerprint?: string): JwtPayload | null {
  const jwtRefreshSecret = getJwtRefreshSecret();
  if (!jwtRefreshSecret) return null;

  try {
    const decoded = jwt.verify(token, jwtRefreshSecret) as JwtPayload;
    if (decoded.type !== 'refresh') return null;

    // Verificar fingerprint se fornecido
    if (decoded.fingerprint && fingerprint && decoded.fingerprint !== fingerprint) {
      console.warn('[JWT] Refresh token fingerprint mismatch', { userId: decoded.id });
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verifica token genérico (sem verificar type)
 * Para compatibilidade com Netlify Functions
 * @param token - Token JWT a verificar
 * @returns Payload decodificado ou null se inválido
 */
export function verifyToken(token: string): JwtPayload | null {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) return null;

  try {
    return jwt.verify(token, jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}

// ============ HELPERS DE AUTORIZAÇÃO ============

/**
 * Verifica se o usuário é superadmin
 */
export function isSuperAdmin(user: { role?: string; email?: string } | null): boolean {
  if (!user) return false;
  // Aceitar superadmin ou admin@7care.com (compatibilidade com migração antiga)
  return user.role === 'superadmin' || user.email === 'admin@7care.com';
}

/**
 * Verifica se o usuário é pastor
 */
export function isPastor(user: { role?: string } | null): boolean {
  if (!user) return false;
  return user.role === 'pastor';
}

/**
 * Verifica se o usuário tem acesso administrativo (superadmin ou pastor)
 */
export function hasAdminAccess(user: { role?: string } | null): boolean {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'pastor';
}

/**
 * Verifica se o usuário tem uma das roles especificadas
 */
export function hasRole(user: { role?: string } | null, ...allowedRoles: string[]): boolean {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
}

// ============ EXTRAÇÃO DE TOKEN ============

/**
 * Extrai token do header Authorization
 * @param authHeader - Header Authorization (ex: "Bearer token123")
 * @returns Token ou null se não encontrado
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7); // Remove 'Bearer '
}

// ============ EXPORTS DEFAULT ============

export default {
  JWT_CONFIG,
  generateFingerprint,
  generateTokens,
  generateAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyToken,
  extractBearerToken,
  isSuperAdmin,
  isPastor,
  hasAdminAccess,
  hasRole,
  getJwtSecret,
  getJwtRefreshSecret,
};
