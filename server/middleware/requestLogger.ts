/**
 * Request Logger Middleware
 * Logs de requisições HTTP com métricas de tempo de resposta e correlation ID
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware que loga todas as requisições com tempo de resposta
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const correlationId = (req as unknown as { correlationId?: string }).correlationId || '-';

  // Log ao finalizar a resposta
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    // Não logar health checks para evitar poluição
    if (originalUrl === '/api/status' || originalUrl === '/health') {
      return;
    }

    const logData = {
      method,
      url: originalUrl,
      status: statusCode,
      duration: `${duration}ms`,
      correlationId,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']?.substring(0, 100),
    };

    if (statusCode >= 500) {
      logger.error(`${method} ${originalUrl} ${statusCode} ${duration}ms`, logData);
    } else if (statusCode >= 400) {
      logger.warn(`${method} ${originalUrl} ${statusCode} ${duration}ms`, logData);
    } else if (duration > 3000) {
      // Alerta para requisições lentas (>3s)
      logger.warn(`SLOW REQUEST: ${method} ${originalUrl} ${statusCode} ${duration}ms`, logData);
    } else {
      logger.info(`${method} ${originalUrl} ${statusCode} ${duration}ms`);
    }
  });

  next();
}
