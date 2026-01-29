/**
 * Rate Limiting Avançado por Endpoint
 * Limites específicos para diferentes tipos de rotas
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Configuração de mensagens de erro
 */
const errorMessages = {
  default: 'Muitas requisições. Tente novamente em alguns minutos.',
  auth: 'Muitas tentativas de login. Aguarde 15 minutos.',
  api: 'Limite de requisições atingido. Aguarde alguns segundos.',
  upload: 'Muitos uploads. Aguarde antes de enviar mais arquivos.',
  sensitive: 'Operação bloqueada temporariamente por segurança.',
};

/**
 * Handler de rate limit atingido
 */
function createLimitHandler(type: keyof typeof errorMessages) {
  return (req: Request, res: Response) => {
    logger.warn(`Rate limit atingido: ${type}`, {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: errorMessages[type],
      retryAfter: res.getHeader('Retry-After'),
    });
  };
}

/**
 * Rate limit para autenticação (mais restritivo)
 * 5 tentativas por 15 minutos
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: errorMessages.auth,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('auth'),
  skip: _req => process.env.NODE_ENV === 'test',
});

/**
 * Rate limit geral para API
 * 100 requisições por minuto
 */
export const apiRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: errorMessages.api,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('api'),
  skip: _req => process.env.NODE_ENV === 'test',
});

/**
 * Rate limit para uploads
 * 10 uploads por 5 minutos
 */
export const uploadRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10,
  message: errorMessages.upload,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('upload'),
  skip: _req => process.env.NODE_ENV === 'test',
});

/**
 * Rate limit para operações sensíveis (delete, bulk, etc.)
 * 20 operações por hora
 */
export const sensitiveRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  message: errorMessages.sensitive,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('sensitive'),
  skip: _req => process.env.NODE_ENV === 'test',
});

/**
 * Rate limit para busca/pesquisa
 * 30 buscas por minuto
 */
export const searchRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30,
  message: errorMessages.default,
  standardHeaders: true,
  legacyHeaders: false,
  skip: _req => process.env.NODE_ENV === 'test',
});

/**
 * Rate limit para webhooks
 * 1000 requisições por minuto (mais permissivo)
 */
export const webhookRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 1000,
  message: errorMessages.default,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limit dinâmico baseado em usuário autenticado
 */
export function createUserBasedRateLimiter(
  windowMs: number,
  maxForAnonymous: number,
  maxForAuthenticated: number
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max: (req: Request) => {
      const userId = (req as Request & { userId?: number }).userId;
      return userId ? maxForAuthenticated : maxForAnonymous;
    },
    message: errorMessages.default,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: req => {
      const userId = (req as Request & { userId?: number }).userId;
      return userId ? `user:${userId}` : req.ip || 'unknown';
    },
    validate: { ip: false },
  });
}

/**
 * Rate limiters por rota
 */
export const rateLimiters = {
  auth: authRateLimiter,
  api: apiRateLimiter,
  upload: uploadRateLimiter,
  sensitive: sensitiveRateLimiter,
  search: searchRateLimiter,
  webhook: webhookRateLimiter,
  custom: createUserBasedRateLimiter,
};

export default rateLimiters;
