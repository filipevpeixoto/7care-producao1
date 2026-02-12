/**
 * Configuração centralizada de segurança JWT
 * 
 * Este arquivo garante que as chaves JWT sejam configuradas corretamente
 * e previne o uso de valores padrão em produção.
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Validação estrita em produção
if (isProduction) {
  if (!process.env.JWT_SECRET) {
    throw new Error('🔒 SEGURANÇA CRÍTICA: JWT_SECRET não configurado em produção! Defina a variável de ambiente JWT_SECRET.');
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('🔒 SEGURANÇA CRÍTICA: JWT_REFRESH_SECRET não configurado em produção! Defina a variável de ambiente JWT_REFRESH_SECRET.');
  }
  
  // Validar comprimento mínimo das chaves
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('🔒 SEGURANÇA: JWT_SECRET deve ter no mínimo 32 caracteres em produção.');
  }
  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('🔒 SEGURANÇA: JWT_REFRESH_SECRET deve ter no mínimo 32 caracteres em produção.');
  }
}

// Valores padrão apenas para desenvolvimento local
export const JWT_SECRET = process.env.JWT_SECRET || 
  (isDevelopment ? '7care-dev-secret-change-in-production-DO-NOT-USE-IN-PROD' : '');

export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 
  (isDevelopment ? '7care-dev-refresh-secret-change-in-production-DO-NOT-USE-IN-PROD' : '');

// Configurações de expiração
export const JWT_EXPIRES_IN = '15m';  // Access token (curto para segurança)
export const JWT_REFRESH_EXPIRES_IN = '7d';  // Refresh token

// Validação final - nunca deve estar vazio
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('🔒 SEGURANÇA CRÍTICA: JWT_SECRET ou JWT_REFRESH_SECRET não configurados!');
}

import { logger } from '../utils/logger';

logger.info('JWT configurado', {
  environment: process.env.NODE_ENV,
  hasSecret: !!process.env.JWT_SECRET,
  hasRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
  secretLength: JWT_SECRET.length,
  accessTokenExpiry: JWT_EXPIRES_IN,
  refreshTokenExpiry: JWT_REFRESH_EXPIRES_IN,
});
