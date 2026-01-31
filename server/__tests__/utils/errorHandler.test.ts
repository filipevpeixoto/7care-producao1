/**
 * Testes para errorHandler
 * @module tests/utils/errorHandler
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Response } from 'express';
import {
  sendError,
  handleError,
  handleNotFound,
  handleBadRequest,
  handleForbidden,
  handleUnauthorized,
  handleConflict,
  handleRateLimit,
  validateRequiredFields,
} from '../../utils/errorHandler';
import { ErrorCodes } from '../../types';

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock do Response do Express
const createMockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis() as any,
    json: jest.fn().mockReturnThis() as any,
  };
  return res as Response;
};

describe('errorHandler', () => {
  let mockRes: Response;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('sendError()', () => {
    it('deve enviar erro com status e mensagem', () => {
      sendError(mockRes, 400, 'Bad request');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Bad request',
        code: ErrorCodes.INTERNAL_ERROR,
      });
    });

    it('deve incluir código de erro quando fornecido', () => {
      sendError(mockRes, 404, 'Not found', ErrorCodes.NOT_FOUND);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not found',
        code: ErrorCodes.NOT_FOUND,
      });
    });

    it('não deve incluir detalhes em produção', () => {
      process.env.NODE_ENV = 'production';
      sendError(mockRes, 500, 'Error', undefined, { stack: 'sensitive' });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error',
        code: ErrorCodes.INTERNAL_ERROR,
      });
    });

    it('deve incluir detalhes em desenvolvimento', () => {
      process.env.NODE_ENV = 'development';
      sendError(mockRes, 500, 'Error', undefined, { stack: 'trace' });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error',
        code: ErrorCodes.INTERNAL_ERROR,
        details: { stack: 'trace' },
      });
    });
  });

  describe('handleError()', () => {
    it('deve logar o erro', () => {
      const { logger } = require('../../utils/logger');
      const error = new Error('Test error');

      handleError(mockRes, error, 'TestContext');

      expect(logger.error).toHaveBeenCalledWith('[TestContext]', error);
    });

    it('deve enviar erro 500 para erros genéricos', () => {
      const error = new Error('Generic error');

      handleError(mockRes, error, 'Test');

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('deve detectar erro de duplicata', () => {
      const error = new Error('duplicate key value violates unique constraint');

      handleError(mockRes, error, 'Test');

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.ALREADY_EXISTS,
        })
      );
    });

    it('deve detectar erro de não encontrado', () => {
      const error = new Error('Resource not found');

      handleError(mockRes, error, 'Test');

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.NOT_FOUND,
        })
      );
    });

    it('deve detectar erro de validação', () => {
      const error = new Error('validation failed');

      handleError(mockRes, error, 'Test');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.VALIDATION_ERROR,
        })
      );
    });

    it('deve mostrar mensagem real em desenvolvimento', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Specific error message');

      handleError(mockRes, error, 'Test');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Specific error message',
        })
      );
    });

    it('deve tratar erros não-Error', () => {
      handleError(mockRes, 'string error', 'Test');

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('handleNotFound()', () => {
    it('deve enviar erro 404 com nome do recurso', () => {
      handleNotFound(mockRes, 'User');

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
        code: ErrorCodes.NOT_FOUND,
      });
    });
  });

  describe('handleBadRequest()', () => {
    it('deve enviar erro 400', () => {
      handleBadRequest(mockRes, 'Invalid input');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid input',
        code: ErrorCodes.VALIDATION_ERROR,
      });
    });
  });

  describe('handleForbidden()', () => {
    it('deve enviar erro 403 com mensagem padrão', () => {
      handleForbidden(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
        code: ErrorCodes.FORBIDDEN,
      });
    });

    it('deve aceitar mensagem customizada', () => {
      handleForbidden(mockRes, 'Insufficient permissions');

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
        code: ErrorCodes.FORBIDDEN,
      });
    });
  });

  describe('handleUnauthorized()', () => {
    it('deve enviar erro 401 com mensagem padrão', () => {
      handleUnauthorized(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: ErrorCodes.UNAUTHORIZED,
      });
    });

    it('deve aceitar mensagem customizada', () => {
      handleUnauthorized(mockRes, 'Token expired');

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired',
        code: ErrorCodes.UNAUTHORIZED,
      });
    });
  });

  describe('handleConflict()', () => {
    it('deve enviar erro 409', () => {
      handleConflict(mockRes, 'Resource already exists');

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource already exists',
        code: ErrorCodes.CONFLICT,
      });
    });
  });

  describe('handleRateLimit()', () => {
    it('deve enviar erro 429', () => {
      handleRateLimit(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Too many requests. Please try again later.',
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      });
    });
  });

  describe('validateRequiredFields()', () => {
    it('deve retornar true quando todos os campos estão presentes', () => {
      const data = { name: 'John', email: 'john@test.com' };
      const result = validateRequiredFields(mockRes, data, ['name', 'email']);

      expect(result).toBe(true);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('deve retornar false e enviar erro quando campos estão faltando', () => {
      const data = { name: 'John' };
      const result = validateRequiredFields(mockRes, data, ['name', 'email', 'phone']);

      expect(result).toBe(false);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required fields: email, phone',
          code: ErrorCodes.MISSING_REQUIRED_FIELD,
        })
      );
    });

    it('deve detectar campos null', () => {
      const data = { name: 'John', email: null };
      const result = validateRequiredFields(mockRes, data, ['name', 'email']);

      expect(result).toBe(false);
    });

    it('deve detectar campos undefined', () => {
      const data = { name: 'John', email: undefined };
      const result = validateRequiredFields(mockRes, data, ['name', 'email']);

      expect(result).toBe(false);
    });

    it('deve detectar strings vazias', () => {
      const data = { name: 'John', email: '' };
      const result = validateRequiredFields(mockRes, data, ['name', 'email']);

      expect(result).toBe(false);
    });

    it('deve aceitar zero como valor válido', () => {
      const data = { name: 'John', count: 0 };
      const result = validateRequiredFields(mockRes, data, ['name', 'count']);

      expect(result).toBe(true);
    });

    it('deve aceitar false como valor válido', () => {
      const data = { name: 'John', active: false };
      const result = validateRequiredFields(mockRes, data, ['name', 'active']);

      expect(result).toBe(true);
    });
  });
});
