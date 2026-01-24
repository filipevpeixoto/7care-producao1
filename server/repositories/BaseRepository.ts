/**
 * Repository Base
 * Classe abstrata com operações CRUD genéricas
 */

import { db } from '../neonConfig';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
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

/**
 * Helper para criar resposta paginada
 */
export function createPaginatedResult<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
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

/**
 * Pagina um array em memória
 */
export function paginateArray<T>(
  items: T[],
  options?: PaginationOptions
): PaginatedResult<T> {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const total = items.length;
  const offset = (page - 1) * limit;
  const paginatedItems = items.slice(offset, offset + limit);

  return createPaginatedResult(paginatedItems, page, limit, total);
}

export default {
  createPaginatedResult,
  paginateArray,
};
