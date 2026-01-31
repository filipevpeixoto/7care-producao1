/**
 * Utilitários para respostas padronizadas da API
 *
 * Este módulo fornece funções helper para criar respostas consistentes
 * em toda a API, facilitando o tratamento de erros no frontend.
 *
 * @module utils/apiResponse
 */

import { Response } from 'express';
import { ErrorCodes } from '../types';

// ============ TIPOS ============

/**
 * Resposta de sucesso padrão
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Resposta de erro padrão
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Resposta paginada
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============ FUNÇÕES HELPER ============

/**
 * Cria uma resposta de sucesso
 * @param data - Dados a serem retornados
 * @param message - Mensagem opcional
 */
export function success<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Cria uma resposta de erro
 * @param message - Mensagem de erro
 * @param code - Código do erro (opcional)
 * @param details - Detalhes adicionais (opcional)
 */
export function error(message: string, code?: string, details?: unknown): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: message,
  };
  if (code) response.code = code;
  if (details) response.details = details;
  return response;
}

/**
 * Cria uma resposta paginada
 */
export function paginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// ============ RESPOSTAS PRÉ-DEFINIDAS ============

/**
 * Envia resposta de sucesso
 */
export function sendSuccess<T>(res: Response, data: T, status = 200, message?: string): void {
  res.status(status).json(success(data, message));
}

/**
 * Envia resposta de criação (201)
 */
export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, 201, message);
}

/**
 * Envia resposta de erro
 */
export function sendError(
  res: Response,
  message: string,
  status = 400,
  code?: string,
  details?: unknown
): void {
  res.status(status).json(error(message, code, details));
}

/**
 * Envia erro de não encontrado (404)
 */
export function sendNotFound(res: Response, resource = 'Recurso'): void {
  sendError(res, `${resource} não encontrado`, 404, ErrorCodes.NOT_FOUND);
}

/**
 * Envia erro de não autorizado (401)
 */
export function sendUnauthorized(res: Response, message = 'Não autorizado'): void {
  sendError(res, message, 401, ErrorCodes.UNAUTHORIZED);
}

/**
 * Envia erro de proibido (403)
 */
export function sendForbidden(res: Response, message = 'Acesso negado'): void {
  sendError(res, message, 403, ErrorCodes.FORBIDDEN);
}

/**
 * Envia erro de validação (400)
 */
export function sendValidationError(res: Response, details: unknown): void {
  sendError(res, 'Erro de validação', 400, ErrorCodes.VALIDATION_ERROR, details);
}

/**
 * Envia erro interno (500)
 */
export function sendInternalError(res: Response, message = 'Erro interno do servidor'): void {
  sendError(res, message, 500, ErrorCodes.INTERNAL_ERROR);
}

/**
 * Envia resposta paginada
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): void {
  res.status(200).json(paginated(data, page, limit, total));
}

// ============ EXPORT DEFAULT ============

export default {
  success,
  error,
  paginated,
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendValidationError,
  sendInternalError,
  sendPaginated,
};
