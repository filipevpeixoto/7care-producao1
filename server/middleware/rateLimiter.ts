/**
 * Rate Limiting Middleware
 * Protege endpoints contra abuso e ataques de força bruta
 *
 * NOTA: express-rate-limit usa MemoryStore por padrão.
 * Em serverless (Vercel/Netlify), cada instance tem seu próprio store.
 * Para rate limiting distribuído, configurar REDIS_URL e instalar rate-limit-redis.
 * Quando Redis estiver disponível, será usado automaticamente.
 */

import rateLimit, { type Options } from 'express-rate-limit';
import { ErrorCodes } from '../types';
import { logger } from '../utils/logger';

/**
 * Tenta criar um RedisStore para rate limiting distribuído.
 * Retorna undefined se Redis não estiver configurado/disponível.
 */
function getRedisStore(): Options['store'] | undefined {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return undefined;

  try {
    // Tentar importar rate-limit-redis dinamicamente
     
    const { RedisStore } = require('rate-limit-redis');
     
    const { createClient } = require('redis');

    const client = createClient({ url: redisUrl });
    client.connect().catch((err: Error) => {
      logger.warn(`⚠️ Redis rate-limit store connection failed: ${err.message}`);
    });

    logger.info('✅ Rate limiting: usando Redis store distribuído');
    return new RedisStore({
      sendCommand: (...args: string[]) => client.sendCommand(args),
      prefix: '7care:rl:',
    });
  } catch {
    logger.info('📦 Rate limiting: usando MemoryStore (rate-limit-redis não instalado)');
    return undefined;
  }
}

// Store compartilhado — Redis quando disponível, MemoryStore como fallback
const sharedStore = getRedisStore();

/**
 * Helper para gerar chave segura para IPv6
 * Normaliza o IP para evitar problemas com diferentes formatos de IPv6
 */
const _normalizeIp = (ip: string | undefined): string => {
  if (!ip) return 'unknown';
  // Remove prefixo IPv6 mapeado para IPv4
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
};

/**
 * Rate limiter para endpoints de autenticação
 * Mais restritivo para prevenir ataques de força bruta
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas por janela (aumentado)
  message: {
    success: false,
    error: 'Muitas tentativas de login. Por favor, aguarde 15 minutos.',
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true, // Retorna rate limit info nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*` antigos
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
  // Validação de IP desabilitada para permitir keyGenerator customizado
  validate: { ip: false },
  ...(sharedStore ? { store: sharedStore } : {}),
});

/**
 * Rate limiter para registro de novos usuários
 * Previne criação em massa de contas
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 registros por hora
  message: {
    success: false,
    error: 'Muitas tentativas de registro. Por favor, aguarde 1 hora.',
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(sharedStore ? { store: sharedStore } : {}),
});

/**
 * Rate limiter geral para API
 * Mais permissivo para uso normal
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 300, // 300 requisições por minuto (aumentado para uso normal)
  message: {
    success: false,
    error: 'Muitas requisições. Por favor, aguarde um momento.',
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development', // Skip em desenvolvimento
  ...(sharedStore ? { store: sharedStore } : {}),
});

/**
 * Rate limiter para operações sensíveis
 * Reset de senha, alteração de email, etc.
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 tentativas por hora
  message: {
    success: false,
    error: 'Muitas tentativas. Por favor, aguarde 1 hora.',
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(sharedStore ? { store: sharedStore } : {}),
});

/**
 * Rate limiter para upload de arquivos
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // 50 uploads por hora
  message: {
    success: false,
    error: 'Limite de uploads atingido. Por favor, aguarde 1 hora.',
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(sharedStore ? { store: sharedStore } : {}),
});

/**
 * Rate limiter para envio de notificações push
 */
export const pushNotificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 notificações por minuto
  message: {
    success: false,
    error: 'Limite de notificações atingido. Por favor, aguarde.',
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(sharedStore ? { store: sharedStore } : {}),
});

/**
 * Rate limiter para endpoints de debug (apenas desenvolvimento)
 */
export const debugLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requisições por minuto
  message: {
    success: false,
    error: 'Rate limit exceeded for debug endpoints.',
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'production', // Skip em produção
  ...(sharedStore ? { store: sharedStore } : {}),
});

/**
 * Obtém estatísticas do rate limiter
 * Nota: express-rate-limit usa MemoryStore por padrão que não expõe dados detalhados
 * Em produção, usar Redis store para métricas completas
 */
export function getRateLimitStats(): {
  message: string;
  usingRedis: boolean;
  limiters: Array<{ name: string; windowMs: number; maxRequests: number }>;
} {
  return {
    message: sharedStore
      ? 'Rate limit stats - usando Redis store distribuído.'
      : 'Rate limit stats - usando MemoryStore padrão. Configure REDIS_URL para rate limiting distribuído.',
    usingRedis: !!sharedStore,
    limiters: [
      { name: 'apiLimiter', windowMs: 60000, maxRequests: 100 },
      { name: 'authLimiter', windowMs: 900000, maxRequests: 10 },
      { name: 'registerLimiter', windowMs: 3600000, maxRequests: 10 },
      { name: 'passwordResetLimiter', windowMs: 3600000, maxRequests: 3 },
      { name: 'uploadLimiter', windowMs: 3600000, maxRequests: 50 },
      { name: 'pushNotificationLimiter', windowMs: 60000, maxRequests: 10 },
    ],
  };
}
