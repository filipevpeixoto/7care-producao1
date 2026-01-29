/**
 * @fileoverview Testes do middleware de Correlation ID
 * @module server/__tests__/middleware/correlationId.test
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  correlationIdMiddleware,
  CORRELATION_ID_HEADER,
  getCorrelationId,
  createLogContext,
} from '../../middleware/correlationId';

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Correlation ID Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let _onFinishCallback: () => void;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      method: 'GET',
      path: '/api/test',
      headers: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as unknown as Request['socket'],
    };

    mockRes = {
      setHeader: jest.fn().mockReturnThis() as unknown as Response['setHeader'],
      statusCode: 200,
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          _onFinishCallback = callback;
        }
        return mockRes;
      }) as unknown as Response['on'],
    } as Partial<Response>;

    mockNext = jest.fn() as unknown as NextFunction;
  });

  describe('correlationIdMiddleware', () => {
    it('deve gerar novo correlation ID quando não fornecido', () => {
      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.correlationId).toBeDefined();
      expect(mockReq.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, mockReq.correlationId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('deve reutilizar correlation ID válido do cliente', () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440000';
      mockReq.headers = { [CORRELATION_ID_HEADER]: clientId };

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.correlationId).toBe(clientId);
      expect(mockRes.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, clientId);
    });

    it('deve gerar novo ID quando o do cliente é inválido', () => {
      mockReq.headers = { [CORRELATION_ID_HEADER]: 'invalid-uuid' };

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.correlationId).not.toBe('invalid-uuid');
      expect(mockReq.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('deve registrar evento finish para logging', () => {
      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('deve propagar correlation ID no header da resposta', () => {
      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('x-correlation-id', expect.any(String));
    });
  });

  describe('getCorrelationId', () => {
    it('deve retornar correlation ID do request', () => {
      mockReq.correlationId = 'test-id-123';

      const id = getCorrelationId(mockReq as Request);

      expect(id).toBe('test-id-123');
    });

    it('deve retornar fallback quando não há correlation ID', () => {
      const id = getCorrelationId(mockReq as Request);

      expect(id).toBe('no-correlation-id');
    });
  });

  describe('createLogContext', () => {
    it('deve criar contexto de log com correlation ID e path', () => {
      const testReq = {
        correlationId: 'context-id-456',
        path: '/api/users',
      } as Request;

      const context = createLogContext(testReq);

      expect(context).toEqual({
        correlationId: 'context-id-456',
        path: '/api/users',
      });
    });
  });

  describe('CORRELATION_ID_HEADER', () => {
    it('deve ter o valor correto', () => {
      expect(CORRELATION_ID_HEADER).toBe('x-correlation-id');
    });
  });
});
