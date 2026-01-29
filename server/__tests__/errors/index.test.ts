/**
 * @fileoverview Testes das classes de erro customizadas
 * @module server/__tests__/errors/index.test
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
  TimeoutError,
  DatabaseError,
  ExternalServiceError,
  isOperationalError,
  toApplicationError,
} from '../../errors';

describe('Classes de Erro Customizadas', () => {
  describe('ApplicationError', () => {
    it('deve criar erro com valores padrão', () => {
      const error = new ApplicationError('Erro genérico');

      expect(error.message).toBe('Erro genérico');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('ApplicationError');
    });

    it('deve criar erro com valores customizados', () => {
      const error = new ApplicationError('Custom error', 418, 'TEAPOT', false, { extra: 'data' });

      expect(error.statusCode).toBe(418);
      expect(error.code).toBe('TEAPOT');
      expect(error.isOperational).toBe(false);
      expect(error.details).toEqual({ extra: 'data' });
    });

    it('deve converter para JSON corretamente', () => {
      const error = new ApplicationError('Test error', 400, 'TEST_ERROR', true, { field: 'value' });
      const json = error.toJSON();

      expect(json).toEqual({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: { field: 'value' },
        },
      });
    });
  });

  describe('ValidationError', () => {
    it('deve criar erro de validação com mensagem padrão', () => {
      const error = new ValidationError();

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Dados de entrada inválidos');
    });

    it('deve criar erro com campos específicos', () => {
      const fields = { email: ['Email inválido'], name: ['Nome obrigatório'] };
      const error = new ValidationError('Erro de validação', fields);

      expect(error.fields).toEqual(fields);
      expect(error.details).toEqual({ fields });
    });

    it('deve criar a partir de ZodError', () => {
      const zodError = {
        issues: [
          { path: ['email'], message: 'Email inválido' },
          { path: ['user', 'name'], message: 'Nome obrigatório' },
        ],
      };

      const error = ValidationError.fromZodError(zodError);

      expect(error.fields).toEqual({
        email: ['Email inválido'],
        'user.name': ['Nome obrigatório'],
      });
    });
  });

  describe('AuthenticationError', () => {
    it('deve criar erro 401 com mensagem padrão', () => {
      const error = new AuthenticationError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.message).toBe('Autenticação necessária');
    });
  });

  describe('AuthorizationError', () => {
    it('deve criar erro 403 com mensagem padrão', () => {
      const error = new AuthorizationError();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.message).toBe('Acesso negado');
    });
  });

  describe('NotFoundError', () => {
    it('deve criar erro 404 com recurso genérico', () => {
      const error = new NotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Recurso não encontrado');
    });

    it('deve criar erro 404 com recurso específico e ID', () => {
      const error = new NotFoundError('Usuário', 123);

      expect(error.message).toBe('Usuário com ID 123 não encontrado');
      expect(error.details).toEqual({ resource: 'Usuário', id: 123 });
    });
  });

  describe('ConflictError', () => {
    it('deve criar erro 409', () => {
      const error = new ConflictError('Email já cadastrado');

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Email já cadastrado');
    });
  });

  describe('RateLimitError', () => {
    it('deve criar erro 429 com retry-after', () => {
      const error = new RateLimitError('Muitas requisições', 60);

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.retryAfter).toBe(60);
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('InternalError', () => {
    it('deve criar erro 500 não operacional', () => {
      const error = new InternalError();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(false);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('deve criar erro 503', () => {
      const error = new ServiceUnavailableError('Database');

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.message).toBe('Database temporariamente indisponível');
    });
  });

  describe('TimeoutError', () => {
    it('deve criar erro 504', () => {
      const error = new TimeoutError('Query', 30000);

      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toBe('Query excedeu o tempo limite');
      expect(error.details).toEqual({ timeoutMs: 30000 });
    });
  });

  describe('DatabaseError', () => {
    it('deve criar erro 500 de banco', () => {
      const error = new DatabaseError('Connection failed');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.isOperational).toBe(false);
    });
  });

  describe('ExternalServiceError', () => {
    it('deve criar erro 502', () => {
      const error = new ExternalServiceError('Payment API');

      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.details).toEqual({ service: 'Payment API' });
    });
  });

  describe('isOperationalError', () => {
    it('deve retornar true para erros operacionais', () => {
      expect(isOperationalError(new ValidationError())).toBe(true);
      expect(isOperationalError(new NotFoundError())).toBe(true);
      expect(isOperationalError(new AuthorizationError())).toBe(true);
    });

    it('deve retornar false para erros não operacionais', () => {
      expect(isOperationalError(new InternalError())).toBe(false);
      expect(isOperationalError(new DatabaseError())).toBe(false);
    });

    it('deve retornar false para erros nativos', () => {
      expect(isOperationalError(new Error('Generic'))).toBe(false);
      expect(isOperationalError(new TypeError('Type'))).toBe(false);
    });
  });

  describe('toApplicationError', () => {
    it('deve retornar o mesmo erro se já for ApplicationError', () => {
      const original = new ValidationError();
      const converted = toApplicationError(original);

      expect(converted).toBe(original);
    });

    it('deve converter Error nativo para InternalError', () => {
      const original = new Error('Something broke');
      const converted = toApplicationError(original);

      expect(converted).toBeInstanceOf(InternalError);
      expect(converted.message).toBe('Something broke');
    });

    it('deve converter valor desconhecido para InternalError', () => {
      const converted = toApplicationError('string error');

      expect(converted).toBeInstanceOf(InternalError);
      expect(converted.message).toBe('Erro desconhecido');
    });
  });
});
