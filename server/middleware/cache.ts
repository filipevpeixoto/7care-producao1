/**
 * @fileoverview Cache Middleware para rotas frequentes
 * @module server/middleware/cache
 *
 * Middleware que implementa cache para rotas GET frequentes,
 * reduzindo carga no banco de dados e melhorando tempo de resposta.
 */

import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet, cacheDelPattern } from '../services/cacheService';
import { CACHE_TTL as _CACHE_TTL } from '../constants';

/**
 * Gera chave de cache baseada na rota e parâmetros
 */
function generateCacheKey(req: Request, prefix: string): string {
  const userId = req.headers['x-user-id'] || 'anonymous';
  const queryString = JSON.stringify(req.query);
  return `${prefix}:${userId}:${req.path}:${queryString}`;
}

/**
 * Middleware factory para cache de rotas GET
 *
 * @param prefix - Prefixo para a chave de cache
 * @param ttlSeconds - Tempo de vida do cache em segundos
 * @returns Middleware Express
 *
 * @example
 * ```typescript
 * app.get('/api/dashboard/stats',
 *   cacheMiddleware('dashboard', _CACHE_TTL.DASHBOARD),
 *   async (req, res) => { ... }
 * );
 * ```
 */
export function cacheMiddleware(prefix: string, ttlSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Só cacheia requisições GET
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateCacheKey(req, prefix);

    try {
      // Tenta buscar do cache
      const cachedData = await cacheGet(cacheKey);

      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        res.json(cachedData);
        return;
      }

      // Se não encontrou, intercepta a resposta para cachear
      const originalJson = res.json.bind(res);

      res.json = function (data: unknown): Response {
        // Só cacheia respostas de sucesso
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheSet(cacheKey, data, ttlSeconds).catch(err => {
            console.error('[Cache] Erro ao salvar cache:', err);
          });
        }

        res.setHeader('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    } catch (error) {
      // Em caso de erro no cache, continua normalmente
      console.error('[Cache] Erro no middleware:', error);
      next();
    }
  };
}

/**
 * Invalida cache por padrão de prefixo
 *
 * @param pattern - Padrão de prefixo a invalidar
 *
 * @example
 * ```typescript
 * // Após criar/atualizar usuário
 * await invalidateCache('users');
 * ```
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    await cacheDelPattern(`${pattern}:*`);
  } catch (error) {
    console.error('[Cache] Erro ao invalidar:', error);
  }
}

/**
 * Middleware para invalidar cache após mutations (POST, PUT, DELETE)
 *
 * @param patterns - Padrões de cache a invalidar
 * @returns Middleware Express
 */
export function invalidateCacheMiddleware(...patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Intercepta a resposta para invalidar após sucesso
    const originalSend = res.send.bind(res);

    res.send = function (data: unknown): Response {
      // Só invalida em respostas de sucesso de mutations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.method !== 'GET') {
        patterns.forEach(pattern => {
          invalidateCache(pattern).catch(err => {
            console.error('[Cache] Erro ao invalidar:', err);
          });
        });
      }
      return originalSend(data);
    };

    next();
  };
}
