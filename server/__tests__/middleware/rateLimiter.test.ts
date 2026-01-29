/**
 * @fileoverview Testes unitários para Rate Limiter
 * @module server/__tests__/middleware/rateLimiter.test
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Mock do express-rate-limit antes de importar
jest.mock('express-rate-limit', () => {
  interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    message?: { error: string };
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    skip?: (req: Request) => boolean;
    keyGenerator?: (req: Request) => string;
  }

  return {
    __esModule: true,
    default: (options: RateLimitOptions) => {
      const store = new Map<string, { count: number; resetTime: number }>();

      return (req: Request, res: Response, next: NextFunction) => {
        const key = options.keyGenerator ? options.keyGenerator(req) : req.ip || 'unknown';
        const now = Date.now();
        const windowMs = options.windowMs || 60000;
        const max = options.max || 100;

        // Verificar se deve pular
        if (options.skip && options.skip(req)) {
          next();
          return;
        }

        let entry = store.get(key);

        // Limpar entrada expirada
        if (entry && now > entry.resetTime) {
          store.delete(key);
          entry = undefined;
        }

        if (!entry) {
          entry = { count: 0, resetTime: now + windowMs };
          store.set(key, entry);
        }

        entry.count++;

        if (entry.count > max) {
          res.status(429).json(options.message || { error: 'Too many requests' });
          return;
        }

        next();
      };
    },
  };
});

// Importar após os mocks
import {
  authLimiter,
  registerLimiter,
  apiLimiter,
  sensitiveLimiter,
} from '../../middleware/rateLimiter';

describe('Rate Limiter', () => {
  let mockRequest: any;

  let mockResponse: any;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      ip: '192.168.1.1',
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('authLimiter', () => {
    it('deve ser uma função middleware', () => {
      expect(typeof authLimiter).toBe('function');
    });

    it('deve permitir primeira requisição', () => {
      authLimiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('deve permitir requisições dentro do limite', () => {
      // Simulando múltiplas requisições de IPs diferentes
      for (let i = 0; i < 5; i++) {
        const req = { ...mockRequest, ip: `192.168.1.${i}` };
        authLimiter(req as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
    });
  });

  describe('registerLimiter', () => {
    it('deve ser uma função middleware', () => {
      expect(typeof registerLimiter).toBe('function');
    });

    it('deve permitir requisição inicial', () => {
      const req = { ...mockRequest, ip: '10.0.0.1' };
      registerLimiter(req as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('apiLimiter', () => {
    it('deve ser uma função middleware', () => {
      expect(typeof apiLimiter).toBe('function');
    });

    it('deve permitir requisições normais', () => {
      const req = { ...mockRequest, ip: '172.16.0.1' };
      apiLimiter(req as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('sensitiveLimiter', () => {
    it('deve ser uma função middleware', () => {
      expect(typeof sensitiveLimiter).toBe('function');
    });

    it('deve permitir requisição inicial', () => {
      const req = { ...mockRequest, ip: '10.10.10.1' };
      sensitiveLimiter(req as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Comportamento de rate limiting', () => {
    it('deve identificar cliente por IP', () => {
      const req1 = { ...mockRequest, ip: '1.1.1.1' };
      const req2 = { ...mockRequest, ip: '2.2.2.2' };

      authLimiter(req1 as Request, mockResponse as Response, mockNext);
      authLimiter(req2 as Request, mockResponse as Response, mockNext);

      // Ambos devem passar pois são IPs diferentes
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('deve tratar IP undefined', () => {
      const reqNoIp = { ...mockRequest, ip: undefined };

      // Não deve lançar erro
      expect(() => {
        authLimiter(reqNoIp as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });
  });
});
