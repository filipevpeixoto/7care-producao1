/**
 * @fileoverview Testes unitários para classes de erro customizadas
 * @module server/__tests__/errors/errors.test
 */

import { describe, it, expect } from '@jest/globals';
import {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  ServiceUnavailableError,
} from '../../errors';

describe('Error Classes', () => {
  describe('ApplicationError', () => {
    it('deve criar erro com valores padrão', () => {
      const error = new ApplicationError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('ApplicationError');
    });

    it('deve criar erro com valores customizados', () => {
      const error = new ApplicationError('Custom error', 400, 'CUSTOM_CODE', false, {
        field: 'test',
      });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.isOperational).toBe(false);
      expect(error.details).toEqual({ field: 'test' });
    });

    it('deve converter para JSON corretamente', () => {
      const error = new ApplicationError('JSON error', 400, 'TEST_CODE');
      const json = error.toJSON();

      expect(json).toHaveProperty('error');
      expect(json.error).toHaveProperty('code', 'TEST_CODE');
      expect(json.error).toHaveProperty('message', 'JSON error');
    });

    it('deve incluir details no JSON quando presente', () => {
      const error = new ApplicationError('Error with details', 400, 'CODE', true, {
        extra: 'info',
      });
      const json = error.toJSON();

      expect(json.error).toHaveProperty('details', { extra: 'info' });
    });

    it('deve ter stack trace capturado', () => {
      const error = new ApplicationError('Stack trace test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApplicationError');
    });
  });

  describe('ValidationError', () => {
    it('deve criar com valores padrão', () => {
      const error = new ValidationError();

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Dados de entrada inválidos');
    });

    it('deve incluir campos de erro', () => {
      const fields = {
        email: ['Email inválido'],
        password: ['Senha muito curta', 'Deve conter números'],
      };
      const error = new ValidationError('Erro de validação', fields);

      expect(error.fields).toEqual(fields);
      expect(error.details).toEqual({ fields });
    });

    it('deve criar a partir de erro Zod', () => {
      const zodError = {
        issues: [
          { path: ['email'], message: 'Invalid email' },
          { path: ['user', 'name'], message: 'Required' },
        ],
      };

      const error = ValidationError.fromZodError(zodError);

      expect(error.fields).toHaveProperty('email', ['Invalid email']);
      // O path 'user.name' é uma string composta, não um objeto aninhado
      expect(error.fields!['user.name']).toEqual(['Required']);
    });
  });

  describe('AuthenticationError', () => {
    it('deve ter status 401', () => {
      const error = new AuthenticationError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('deve aceitar mensagem customizada', () => {
      const error = new AuthenticationError('Token expirado');

      expect(error.message).toBe('Token expirado');
    });
  });

  describe('AuthorizationError', () => {
    it('deve ter status 403', () => {
      const error = new AuthorizationError();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('deve aceitar mensagem customizada', () => {
      const error = new AuthorizationError('Sem permissão para esta ação');

      expect(error.message).toBe('Sem permissão para esta ação');
    });
  });

  describe('NotFoundError', () => {
    it('deve ter status 404', () => {
      const error = new NotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('deve aceitar recurso específico', () => {
      const error = new NotFoundError('Usuário');

      expect(error.message).toContain('Usuário');
    });
  });

  describe('ConflictError', () => {
    it('deve ter status 409', () => {
      const error = new ConflictError();

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('RateLimitError', () => {
    it('deve ter status 429', () => {
      const error = new RateLimitError();

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('InternalError', () => {
    it('deve ter status 500', () => {
      const error = new InternalError();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });

    it('deve ser marcado como não operacional', () => {
      const error = new InternalError();

      expect(error.isOperational).toBe(false);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('deve ter status 503', () => {
      const error = new ServiceUnavailableError();

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('Error Inheritance', () => {
    it('todos os erros devem estender ApplicationError', () => {
      const errors = [
        new ValidationError(),
        new AuthenticationError(),
        new AuthorizationError(),
        new NotFoundError(),
        new ConflictError(),
        new RateLimitError(),
        new InternalError(),
        new ServiceUnavailableError(),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(ApplicationError);
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('todos os erros devem ter método toJSON', () => {
      const errors = [new ValidationError(), new AuthenticationError(), new NotFoundError()];

      errors.forEach(error => {
        expect(typeof error.toJSON).toBe('function');
        const json = error.toJSON();
        expect(json).toHaveProperty('error');
      });
    });
  });
});
