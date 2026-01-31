/**
 * Async Handler Utility
 *
 * Wrapper para handlers assíncronos que automaticamente captura erros
 * e os passa para o middleware de erro do Express.
 *
 * @module utils/asyncHandler
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from './logger';
import { sendInternalError } from './apiResponse';

/**
 * Tipo para função handler assíncrona
 */
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * Wrapper para handlers assíncronos
 *
 * Captura automaticamente erros em funções assíncronas e:
 * - Loga o erro
 * - Envia resposta de erro padrão (se a resposta ainda não foi enviada)
 * - Passa o erro para o próximo middleware de erro
 *
 * @example
 * ```typescript
 * // Ao invés de:
 * app.get('/api/users', async (req, res) => {
 *   try {
 *     const users = await getUsers();
 *     res.json({ success: true, data: users });
 *   } catch (error) {
 *     console.error(error);
 *     res.status(500).json({ success: false, error: 'Erro interno' });
 *   }
 * });
 *
 * // Use:
 * app.get('/api/users', asyncHandler(async (req, res) => {
 *   const users = await getUsers();
 *   res.json({ success: true, data: users });
 * }));
 * ```
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error: Error) => {
      // Log do erro
      logger.error('Erro em handler assíncrono:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
      });

      // Se a resposta já foi enviada, não tentar enviar outra
      if (res.headersSent) {
        return next(error);
      }

      // Enviar resposta de erro padrão
      sendInternalError(res);
    });
  };
}

/**
 * Wrapper que também valida se um recurso existe
 *
 * @example
 * ```typescript
 * app.get('/api/users/:id', asyncHandlerWithNotFound(
 *   async (req, res) => {
 *     const user = await getUserById(req.params.id);
 *     return user; // Se null, envia 404 automaticamente
 *   },
 *   'Usuário'
 * ));
 * ```
 */
export function asyncHandlerWithNotFound<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T | null>,
  resourceName = 'Recurso'
): RequestHandler {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = await fn(req, res, next);
    if (result === null) {
      res.status(404).json({
        success: false,
        error: `${resourceName} não encontrado`,
        code: 'NOT_FOUND',
      });
      return;
    }
    res.json({ success: true, data: result });
  });
}

export default asyncHandler;
