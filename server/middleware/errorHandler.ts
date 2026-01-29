/**
 * @fileoverview Middleware centralizado de tratamento de erros
 * @module server/middleware/errorHandler
 *
 * Captura e processa todos os erros da aplicação de forma consistente
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  ApplicationError,
  ValidationError,
  isOperationalError,
  toApplicationError,
} from '../errors';
import { logger } from '../utils/logger';
import { captureException } from '../services/sentryService';
import { ErrorCodes } from '../types';

/**
 * Interface para resposta de erro padronizada
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

/**
 * Middleware de tratamento de erros
 * Deve ser registrado APÓS todas as rotas
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Obter correlation ID se disponível
  const requestId = (req as { correlationId?: string }).correlationId;

  // Converter para ApplicationError se necessário
  let appError: ApplicationError;

  if (err instanceof ZodError) {
    // Converter erro Zod para ValidationError
    appError = ValidationError.fromZodError(err);
  } else if (err instanceof ApplicationError) {
    appError = err;
  } else {
    appError = toApplicationError(err);
  }

  // Determinar nível de log baseado no tipo de erro
  if (isOperationalError(appError)) {
    // Erros operacionais são esperados (ex: validação, auth)
    logger.warn('Erro operacional', {
      code: appError.code,
      message: appError.message,
      path: req.path,
      method: req.method,
      requestId,
    });
  } else {
    // Erros não operacionais são bugs e devem ser investigados
    logger.error('Erro não operacional (bug)', {
      code: appError.code,
      message: appError.message,
      stack: appError.stack,
      path: req.path,
      method: req.method,
      requestId,
    });

    // Enviar para Sentry apenas erros não operacionais
    captureException(err, {
      path: req.path,
      method: req.method,
      requestId,
      userId: (req as { userId?: number }).userId,
    });
  }

  // Construir resposta
  const response: ErrorResponse = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details && { details: appError.details }),
      ...(requestId && { requestId }),
    },
  };

  // Em produção, não expor detalhes de erros internos
  if (process.env.NODE_ENV === 'production' && !isOperationalError(appError)) {
    response.error.message = 'Erro interno do servidor';
    delete response.error.details;
  }

  res.status(appError.statusCode).json(response);
}

/**
 * Middleware para rotas não encontradas
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: `Rota ${req.method} ${req.path} não encontrada`,
    },
  };

  res.status(404).json(response);
}

/**
 * Wrapper para async handlers
 * Captura erros de funções assíncronas automaticamente
 *
 * @example
 * ```typescript
 * app.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userRepository.getAll();
 *   res.json(users);
 * }));
 * ```
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handler para erros não capturados
 * Deve ser configurado no início da aplicação
 */
export function setupGlobalErrorHandlers(): void {
  // Uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack,
    });
    captureException(error, { type: 'uncaughtException' });

    // Em produção, reiniciar graciosamente
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  // Unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('Unhandled Rejection', {
      message: error.message,
      stack: error.stack,
    });
    captureException(error, { type: 'unhandledRejection' });
  });

  // SIGTERM handling para graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM recebido, iniciando graceful shutdown...');
    process.exit(0);
  });

  // SIGINT handling
  process.on('SIGINT', () => {
    logger.info('SIGINT recebido, iniciando graceful shutdown...');
    process.exit(0);
  });
}
