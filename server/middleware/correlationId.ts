/**
 * @fileoverview Middleware de Correlation ID para rastreabilidade
 * @module server/middleware/correlationId
 *
 * Adiciona um identificador único a cada requisição para facilitar
 * o rastreamento de logs e debugging em produção.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

// Estende o tipo Request para incluir correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/** Nome do header para correlation ID */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Middleware que adiciona correlation ID a cada requisição
 *
 * - Se o cliente enviar um correlation ID válido, ele é reutilizado
 * - Caso contrário, um novo UUID é gerado
 * - O ID é propagado no header da resposta
 *
 * @example
 * ```typescript
 * app.use(correlationIdMiddleware);
 *
 * app.get('/api/test', (req, res) => {
 *   logger.info('Processing request', { correlationId: req.correlationId });
 *   res.json({ success: true });
 * });
 * ```
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Tenta usar correlation ID do cliente, ou gera um novo
  const clientCorrelationId = req.headers[CORRELATION_ID_HEADER] as string | undefined;

  // Valida se é um UUID válido
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const correlationId =
    clientCorrelationId && isValidUUID(clientCorrelationId) ? clientCorrelationId : randomUUID();

  // Adiciona ao objeto request
  req.correlationId = correlationId;

  // Propaga na resposta
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  // Log de início da requisição
  logger.debug('Request started', {
    correlationId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.socket.remoteAddress,
  });

  // Mede tempo de resposta
  const startTime = Date.now();

  // Hook para log no final da requisição
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';

    logger[logLevel]('Request completed', {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });

  next();
}

/**
 * Helper para obter correlation ID do contexto atual
 * Útil para funções que não têm acesso direto ao Request
 */
export function getCorrelationId(req: Request): string {
  return req.correlationId || 'no-correlation-id';
}

/**
 * Cria um objeto de log com correlation ID
 *
 * @example
 * ```typescript
 * const logContext = createLogContext(req);
 * logger.info('User created', { ...logContext, userId: 123 });
 * ```
 */
export function createLogContext(req: Request): { correlationId: string; path: string } {
  return {
    correlationId: req.correlationId,
    path: req.path,
  };
}
