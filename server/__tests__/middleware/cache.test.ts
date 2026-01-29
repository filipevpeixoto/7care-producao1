/**
 * @fileoverview Testes do middleware de cache
 * @module server/__tests__/middleware/cache.test
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  cacheMiddleware,
  invalidateCacheMiddleware,
  invalidateCache,
} from '../../middleware/cache';

// Mock do cacheService
jest.mock('../../services/cacheService', () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  cacheDelPattern: jest.fn(),
}));

import { cacheGet, cacheSet, cacheDelPattern } from '../../services/cacheService';

const mockCacheGet = cacheGet as jest.MockedFunction<typeof cacheGet>;
const mockCacheSet = cacheSet as jest.MockedFunction<typeof cacheSet>;
const mockCacheDelPattern = cacheDelPattern as jest.MockedFunction<typeof cacheDelPattern>;

describe('Cache Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      method: 'GET',
      path: '/api/test',
      query: {},
      headers: { 'x-user-id': '123' },
    };

    mockRes = {
      json: jest.fn().mockReturnThis() as unknown as Response['json'],
      setHeader: jest.fn().mockReturnThis() as unknown as Response['setHeader'],
      statusCode: 200,
      send: jest.fn().mockReturnThis() as unknown as Response['send'],
    };

    mockNext = jest.fn() as unknown as NextFunction;
  });

  describe('cacheMiddleware', () => {
    it('deve retornar dados do cache quando disponível (cache HIT)', async () => {
      const cachedData = { foo: 'bar' };
      mockCacheGet.mockResolvedValue(cachedData);

      const middleware = cacheMiddleware('test', 300);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCacheGet).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(mockRes.json).toHaveBeenCalledWith(cachedData);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve chamar next quando cache não tem dados (cache MISS)', async () => {
      mockCacheGet.mockResolvedValue(null);

      const middleware = cacheMiddleware('test', 300);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCacheGet).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('deve ignorar requisições que não são GET', async () => {
      mockReq.method = 'POST';

      const middleware = cacheMiddleware('test', 300);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCacheGet).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('deve cachear resposta após MISS bem-sucedido', async () => {
      mockCacheGet.mockResolvedValue(null);
      mockCacheSet.mockResolvedValue(true);

      const middleware = cacheMiddleware('test', 300);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      // Simula chamada do handler original
      const responseData = { result: 'data' };
      (mockRes.json as jest.Mock)(responseData);

      // Aguarda o cache set assíncrono
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCacheSet).toHaveBeenCalled();
    });

    it('deve continuar normalmente em caso de erro no cache', async () => {
      mockCacheGet.mockRejectedValue(new Error('Cache error'));

      const middleware = cacheMiddleware('test', 300);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('deve gerar chave de cache incluindo userId e query', async () => {
      mockCacheGet.mockResolvedValue(null);
      mockReq.query = { page: '1', limit: '10' };
      mockReq.headers = { 'x-user-id': '456' };

      const middleware = cacheMiddleware('myprefix', 300);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCacheGet).toHaveBeenCalledWith(expect.stringContaining('myprefix:456:/api/test'));
    });
  });

  describe('invalidateCache', () => {
    it('deve invalidar cache por padrão', async () => {
      mockCacheDelPattern.mockResolvedValue(undefined);

      await invalidateCache('users');

      expect(mockCacheDelPattern).toHaveBeenCalledWith('users:*');
    });

    it('deve lidar com erro graciosamente', async () => {
      mockCacheDelPattern.mockRejectedValue(new Error('Del error'));

      // Não deve lançar exceção
      await expect(invalidateCache('users')).resolves.not.toThrow();
    });
  });

  describe('invalidateCacheMiddleware', () => {
    it('deve invalidar cache após resposta bem-sucedida de mutation', async () => {
      mockReq.method = 'POST';
      mockRes.statusCode = 201;
      mockCacheDelPattern.mockResolvedValue(undefined);

      const middleware = invalidateCacheMiddleware('users', 'dashboard');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Simula envio de resposta
      (mockRes.send as jest.Mock)('OK');

      // Aguarda invalidação assíncrona
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCacheDelPattern).toHaveBeenCalledWith('users:*');
      expect(mockCacheDelPattern).toHaveBeenCalledWith('dashboard:*');
    });

    it('deve não invalidar cache para requisições GET', async () => {
      mockReq.method = 'GET';
      mockRes.statusCode = 200;

      const middleware = invalidateCacheMiddleware('users');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      (mockRes.send as jest.Mock)('OK');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCacheDelPattern).not.toHaveBeenCalled();
    });

    it('deve não invalidar cache para respostas de erro', async () => {
      mockReq.method = 'POST';
      mockRes.statusCode = 400;

      const middleware = invalidateCacheMiddleware('users');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      (mockRes.send as jest.Mock)('Error');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCacheDelPattern).not.toHaveBeenCalled();
    });
  });
});
