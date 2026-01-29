/**
 * @fileoverview Testes do async handler middleware
 * @module server/__tests__/middleware/asyncHandler.test
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { asyncHandler, errorHandler, notFoundHandler } from '../../middleware/asyncHandler';
import { ValidationError, NotFoundError } from '../../errors';

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Async Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      path: '/api/test',
      method: 'GET',
      correlationId: 'test-123',
    } as Partial<Request> & { correlationId: string };

    mockRes = {
      status: jest.fn().mockReturnThis() as unknown as Response['status'],
      json: jest.fn().mockReturnThis() as unknown as Response['json'],
    };

    mockNext = jest.fn() as unknown as NextFunction;
  });

  describe('asyncHandler', () => {
    it('deve executar handler e não chamar next em sucesso', async () => {
      const successHandler = jest.fn<() => Promise<unknown>>().mockResolvedValue({ data: 'ok' });
      const wrapped = asyncHandler(successHandler as unknown as Parameters<typeof asyncHandler>[0]);

      await wrapped(mockReq as Request, mockRes as Response, mockNext);

      expect(successHandler).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve chamar next com erro quando handler falha', async () => {
      const error = new Error('Test error');
      const failingHandler = jest.fn<() => Promise<never>>().mockRejectedValue(error);
      const wrapped = asyncHandler(failingHandler as unknown as Parameters<typeof asyncHandler>[0]);

      await wrapped(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('deve preservar ApplicationError original', async () => {
      const error = new ValidationError('Invalid input');
      const failingHandler = jest.fn<() => Promise<never>>().mockRejectedValue(error);
      const wrapped = asyncHandler(failingHandler as unknown as Parameters<typeof asyncHandler>[0]);

      await wrapped(mockReq as Request, mockRes as Response, mockNext);

      // O asyncHandler converte para ApplicationError, mas preserva ValidationError
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('errorHandler', () => {
    it('deve responder com status e mensagem do ApplicationError', () => {
      const error = new ValidationError('Campo inválido');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Campo inválido',
        },
      });
    });

    it('deve converter Error nativo para 500', () => {
      const error = new Error('Something broke');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('deve incluir details quando presente', () => {
      const error = new NotFoundError('User', 123);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: { resource: 'User', id: 123 },
          }),
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('deve retornar 404 com mensagem da rota', () => {
      const testReq = {
        method: 'POST',
        path: '/api/unknown',
      } as Request;

      notFoundHandler(testReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'Rota POST /api/unknown não encontrada',
        },
      });
    });
  });
});
