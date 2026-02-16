/**
 * Utilitários de Paginação
 * Helpers para paginação consistente em toda a API
 */

import type { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Limites de paginação
export const PAGINATION_LIMITS = {
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 20,
  DEFAULT_PAGE: 1,
} as const;

export function getPaginationLimits() {
  const maxLimit =
    parseInt(process.env.PAGINATION_MAX_LIMIT || '') || PAGINATION_LIMITS.MAX_LIMIT;
  const defaultLimit =
    parseInt(process.env.PAGINATION_DEFAULT_LIMIT || '') || PAGINATION_LIMITS.DEFAULT_LIMIT;

  return {
    ...PAGINATION_LIMITS,
    MAX_LIMIT: Math.max(PAGINATION_LIMITS.MIN_LIMIT, maxLimit),
    DEFAULT_LIMIT: Math.min(Math.max(PAGINATION_LIMITS.MIN_LIMIT, defaultLimit), maxLimit),
  };
}

/**
 * Extrai parâmetros de paginação do request
 */
export function extractPaginationParams(
  req: Request,
  defaults?: Partial<PaginationParams>
): PaginationParams {
  const limits = getPaginationLimits();
  const page = Math.max(
    limits.DEFAULT_PAGE,
    parseInt(req.query.page as string) || defaults?.page || limits.DEFAULT_PAGE
  );

  const requestedLimit =
    parseInt(req.query.limit as string) || defaults?.limit || limits.DEFAULT_LIMIT;
  const limit = Math.min(
    Math.max(limits.MIN_LIMIT, requestedLimit),
    limits.MAX_LIMIT
  );

  const offset = (page - 1) * limit;

  const sortBy = (req.query.sortBy as string) || defaults?.sortBy || 'id';
  const sortOrderParam = (req.query.sortOrder as string)?.toLowerCase();
  const sortOrder: 'asc' | 'desc' = sortOrderParam === 'desc' ? 'desc' : 'asc';

  return { page, limit, offset, sortBy, sortOrder };
}

/**
 * Cria metadados de paginação
 */
export function createPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Cria resposta paginada completa
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: createPaginationMeta(page, limit, total),
  };
}

/**
 * Pagina um array em memória (para casos onde não há paginação no DB)
 */
export function paginateArray<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
  const total = items.length;
  const offset = (page - 1) * limit;
  const paginatedItems = items.slice(offset, offset + limit);

  return createPaginatedResponse(paginatedItems, page, limit, total);
}

/**
 * Valida se parâmetros de paginação são válidos
 */
export function validatePaginationParams(
  page: number,
  limit: number
): { valid: boolean; errors: string[] } {
  const limits = getPaginationLimits();
  const errors: string[] = [];

  if (page < 1) {
    errors.push('Página deve ser maior que 0');
  }

  if (limit < limits.MIN_LIMIT) {
    errors.push(`Limite mínimo é ${limits.MIN_LIMIT}`);
  }

  if (limit > limits.MAX_LIMIT) {
    errors.push(`Limite máximo é ${limits.MAX_LIMIT}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gera links de navegação para paginação (HATEOAS)
 */
export function generatePaginationLinks(
  baseUrl: string,
  page: number,
  totalPages: number,
  limit: number
): Record<string, string | null> {
  const createUrl = (p: number) => `${baseUrl}?page=${p}&limit=${limit}`;

  return {
    self: createUrl(page),
    first: createUrl(1),
    last: createUrl(totalPages),
    next: page < totalPages ? createUrl(page + 1) : null,
    prev: page > 1 ? createUrl(page - 1) : null,
  };
}

export default {
  extractPaginationParams,
  createPaginationMeta,
  createPaginatedResponse,
  paginateArray,
  validatePaginationParams,
  generatePaginationLinks,
  PAGINATION_LIMITS,
};
