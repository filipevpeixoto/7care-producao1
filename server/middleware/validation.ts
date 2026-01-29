/**
 * Validation Middleware
 * Middleware para validação de requests usando Zod
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ErrorCodes } from '../types';

/**
 * Interface para request com body validado
 */
export interface ValidatedRequest<T> extends Request {
  validatedBody: T;
}

/**
 * Formata erros do Zod para resposta amigável
 */
const formatZodErrors = (error: ZodError): { field: string; message: string }[] => {
  return error.errors.map(err => ({
    field: err.path.join('.') || 'body',
    message: err.message,
  }));
};

/**
 * Middleware factory para validação de body
 *
 * @example
 * ```typescript
 * app.post('/api/users', validateBody(createUserSchema), async (req, res) => {
 *   const userData = req.validatedBody; // Tipado corretamente
 *   // ...
 * });
 * ```
 */
export const validateBody = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: 'Erro de validação',
          code: ErrorCodes.VALIDATION_ERROR,
          details: formatZodErrors(result.error),
        });
        return;
      }

      // Adiciona os dados validados ao request
      (req as ValidatedRequest<T>).validatedBody = result.data;
      next();
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno de validação',
        code: ErrorCodes.INTERNAL_ERROR,
      });
    }
  };
};

/**
 * Middleware factory para validação de query params
 */
export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: 'Parâmetros de consulta inválidos',
          code: ErrorCodes.VALIDATION_ERROR,
          details: formatZodErrors(result.error),
        });
        return;
      }

      // Substitui query pelos dados validados
      req.query = result.data as Record<string, string>;
      next();
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno de validação',
        code: ErrorCodes.INTERNAL_ERROR,
      });
    }
  };
};

/**
 * Middleware factory para validação de path params
 */
export const validateParams = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: 'Parâmetros de rota inválidos',
          code: ErrorCodes.VALIDATION_ERROR,
          details: formatZodErrors(result.error),
        });
        return;
      }

      req.params = result.data as Record<string, string>;
      next();
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno de validação',
        code: ErrorCodes.INTERNAL_ERROR,
      });
    }
  };
};

/**
 * Combina múltiplas validações
 *
 * @example
 * ```typescript
 * app.put('/api/users/:id',
 *   combineValidations(
 *     validateParams(userIdSchema),
 *     validateBody(updateUserSchema)
 *   ),
 *   async (req, res) => { ... }
 * );
 * ```
 */
export const combineValidations = (
  ...validators: ((req: Request, res: Response, next: NextFunction) => void)[]
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    for (const validator of validators) {
      let hasError = false;

      await new Promise<void>(resolve => {
        validator(req, res, (err?: unknown) => {
          if (err) {
            hasError = true;
          }
          resolve();
        });
      });

      if (hasError || res.headersSent) {
        return;
      }
    }
    next();
  };
};
