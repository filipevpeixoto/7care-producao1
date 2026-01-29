/**
 * @fileoverview Testes unitários para middleware de validação
 * @module server/__tests__/middleware/validation.test
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation';

describe('Validation Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string().min(3),
      email: z.string().email(),
      age: z.number().optional(),
    });

    it('deve passar quando body é válido', () => {
      mockRequest.body = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const middleware = validateBody(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest).toHaveProperty('validatedBody');
    });

    it('deve retornar 400 quando body é inválido', () => {
      mockRequest.body = {
        name: 'Jo', // muito curto
        email: 'invalid-email',
      };

      const middleware = validateBody(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Erro de validação',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve incluir detalhes dos campos inválidos', () => {
      mockRequest.body = {
        name: 'Jo',
        email: 'invalid',
      };

      const middleware = validateBody(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([expect.objectContaining({ field: expect.any(String) })]),
        })
      );
    });

    it('deve preservar campos opcionais quando não fornecidos', () => {
      mockRequest.body = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const middleware = validateBody(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('deve validar campos opcionais quando fornecidos', () => {
      mockRequest.body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      };

      const middleware = validateBody(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.validatedBody.age).toBe(25);
    });
  });

  describe('validateQuery', () => {
    const querySchema = z.object({
      page: z.coerce.number().positive().default(1),
      limit: z.coerce.number().positive().max(100).default(10),
      search: z.string().optional(),
    });

    it('deve passar com query válida', () => {
      mockRequest.query = {
        page: '1',
        limit: '20',
      };

      const middleware = validateQuery(querySchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('deve usar valores default quando query está vazia', () => {
      mockRequest.query = {};

      const middleware = validateQuery(querySchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // O middleware substitui req.query pelos dados validados
      expect(mockRequest.query.page).toBe(1);
      expect(mockRequest.query.limit).toBe(10);
    });

    it('deve rejeitar valores inválidos', () => {
      mockRequest.query = {
        page: '-1',
        limit: '200', // acima do max
      };

      const middleware = validateQuery(querySchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateParams', () => {
    const paramsSchema = z.object({
      id: z.coerce.number().positive(),
    });

    it('deve passar com params válidos', () => {
      mockRequest.params = {
        id: '123',
      };

      const middleware = validateParams(paramsSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // O middleware substitui req.params pelos dados validados
      expect(mockRequest.params.id).toBe(123);
    });

    it('deve rejeitar params inválidos', () => {
      mockRequest.params = {
        id: 'abc', // não é número
      };

      const middleware = validateParams(paramsSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('deve rejeitar params negativos', () => {
      mockRequest.params = {
        id: '-1',
      };

      const middleware = validateParams(paramsSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Tratamento de erros edge cases', () => {
    it('deve lidar com body undefined', () => {
      const schema = z.object({ name: z.string() });
      mockRequest.body = undefined;

      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('deve lidar com schema complexo aninhado', () => {
      const complexSchema = z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            street: z.string(),
            city: z.string(),
          }),
        }),
      });

      mockRequest.body = {
        user: {
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'NYC',
          },
        },
      };

      const middleware = validateBody(complexSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
