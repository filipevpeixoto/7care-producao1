/**
 * @fileoverview Async Handler Wrapper
 * @module server/middleware/asyncHandler
 *
 * Wrapper para handlers async que captura erros automaticamente
 * e os passa para o middleware de erro do Express.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ApplicationError, toApplicationError } from '../errors';
import { logger } from '../utils/logger';

/**
 * Tipo para handler async
 */
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wrapper para handlers async
 * Captura erros de promises e os passa para next()
 *
 * @example
 * ```typescript
 * app.get('/api/users', asyncHandler(async (req, res) => {
 *   const users = await getUsersFromDB();
 *   res.json(users);
 * }));
 * ```
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((error: unknown) => {
      // Log do erro com contexto
      const correlationId = (req as Request & { correlationId?: string }).correlationId;

      logger.error('Async handler error', {
        correlationId,
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Converte para ApplicationError se necessário
      const appError = toApplicationError(error);
      next(appError);
    });
  };
}

/**
 * Middleware de tratamento de erros global
 * Deve ser o último middleware registrado
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,

  _next: NextFunction
): void {
  const correlationId = (req as Request & { correlationId?: string }).correlationId;

  // Converte para ApplicationError
  const appError = error instanceof ApplicationError ? error : toApplicationError(error);

  // Log baseado na severidade
  if (appError.statusCode >= 500) {
    logger.error('Server error', {
      correlationId,
      code: appError.code,
      message: appError.message,
      stack: appError.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn('Client error', {
      correlationId,
      code: appError.code,
      message: appError.message,
      path: req.path,
      method: req.method,
    });
  }

  // Resposta
  res.status(appError.statusCode).json(appError.toJSON());
}

/**
 * Middleware para rotas não encontradas (404)
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Rota ${req.method} ${req.path} não encontrada`,
    },
  });
}
