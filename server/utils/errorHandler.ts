/**
 * Handler de Erros Padronizado
 * Funções utilitárias para respostas de erro consistentes
 */

import { Response } from 'express';
import { ApiErrorResponse, ErrorCodes, ErrorCode } from '../types';
import { logger } from './logger';

/**
 * Envia uma resposta de erro padronizada
 */
export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  code?: ErrorCode,
  details?: unknown
): void => {
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: message,
    code: code || ErrorCodes.INTERNAL_ERROR,
    ...(details && process.env.NODE_ENV === 'development' ? { details } : {})
  };

  res.status(statusCode).json(errorResponse);
};

/**
 * Trata erro genérico e envia resposta apropriada
 */
export const handleError = (
  res: Response,
  error: unknown,
  context: string
): void => {
  logger.error(`[${context}]`, error);

  // Determinar mensagem de erro
  let message = 'Internal server error';
  let code: ErrorCode = ErrorCodes.INTERNAL_ERROR;

  if (error instanceof Error) {
    // Em desenvolvimento, mostrar mensagem real
    if (process.env.NODE_ENV === 'development') {
      message = error.message;
    }

    // Detectar tipos específicos de erro
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      message = 'Resource already exists';
      code = ErrorCodes.ALREADY_EXISTS;
      sendError(res, 409, message, code);
      return;
    }

    if (error.message.includes('not found')) {
      message = 'Resource not found';
      code = ErrorCodes.NOT_FOUND;
      sendError(res, 404, message, code);
      return;
    }

    if (error.message.includes('validation')) {
      message = error.message;
      code = ErrorCodes.VALIDATION_ERROR;
      sendError(res, 400, message, code);
      return;
    }
  }

  sendError(res, 500, message, code, error);
};

/**
 * Resposta para recurso não encontrado
 */
export const handleNotFound = (
  res: Response,
  resource: string
): void => {
  sendError(res, 404, `${resource} not found`, ErrorCodes.NOT_FOUND);
};

/**
 * Resposta para requisição inválida
 */
export const handleBadRequest = (
  res: Response,
  message: string
): void => {
  sendError(res, 400, message, ErrorCodes.VALIDATION_ERROR);
};

/**
 * Resposta para acesso negado
 */
export const handleForbidden = (
  res: Response,
  message: string = 'Access denied'
): void => {
  sendError(res, 403, message, ErrorCodes.FORBIDDEN);
};

/**
 * Resposta para não autenticado
 */
export const handleUnauthorized = (
  res: Response,
  message: string = 'Authentication required'
): void => {
  sendError(res, 401, message, ErrorCodes.UNAUTHORIZED);
};

/**
 * Resposta para conflito (recurso já existe)
 */
export const handleConflict = (
  res: Response,
  message: string
): void => {
  sendError(res, 409, message, ErrorCodes.CONFLICT);
};

/**
 * Resposta para rate limit excedido
 */
export const handleRateLimit = (
  res: Response
): void => {
  sendError(res, 429, 'Too many requests. Please try again later.', ErrorCodes.RATE_LIMIT_EXCEEDED);
};

/**
 * Valida campos obrigatórios e retorna erro se faltar algum
 * Retorna true se todos os campos estão presentes
 */
export const validateRequiredFields = (
  res: Response,
  data: Record<string, unknown>,
  requiredFields: string[]
): boolean => {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    sendError(
      res,
      400,
      `Missing required fields: ${missingFields.join(', ')}`,
      ErrorCodes.MISSING_REQUIRED_FIELD,
      { missingFields }
    );
    return false;
  }

  return true;
};
