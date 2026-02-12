import { describe, it, expect } from 'vitest';
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
} from '../errors';

// ─── ApplicationError (base) ────────────────────────────────────
describe('ApplicationError', () => {
  it('creates with default values', () => {
    const err = new ApplicationError('something broke');
    expect(err.message).toBe('something broke');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.isOperational).toBe(true);
    expect(err.details).toBeUndefined();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApplicationError');
    expect(err.stack).toBeDefined();
  });

  it('creates with custom values', () => {
    const err = new ApplicationError('bad', 400, 'BAD', false, { field: 'x' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD');
    expect(err.isOperational).toBe(false);
    expect(err.details).toEqual({ field: 'x' });
  });

  it('serialises to JSON', () => {
    const err = new ApplicationError('oops', 422, 'UNPROCESSABLE', true, { a: 1 });
    const json = err.toJSON();
    expect(json).toEqual({
      error: { code: 'UNPROCESSABLE', message: 'oops', details: { a: 1 } },
    });
  });

  it('omits details when not provided', () => {
    const err = new ApplicationError('oops');
    const json = err.toJSON();
    expect(json.error).not.toHaveProperty('details');
  });
});

// ─── Subclasses ─────────────────────────────────────────────────
describe('ValidationError', () => {
  it('defaults to 400 + VALIDATION_ERROR', () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.isOperational).toBe(true);
    expect(err.message).toBe('Dados de entrada inválidos');
  });

  it('stores field errors', () => {
    const fields = { email: ['invalid format'], name: ['required'] };
    const err = new ValidationError('bad data', fields);
    expect(err.fields).toEqual(fields);
    expect(err.details).toEqual({ fields });
  });

  it('fromZodError converts issues to field map', () => {
    const zodError = {
      issues: [
        { path: ['email'], message: 'invalid' },
        { path: ['email'], message: 'too short' },
        { path: ['name'], message: 'required' },
        { path: ['address', 'zip'], message: 'bad format' },
      ],
    };
    const err = ValidationError.fromZodError(zodError);
    expect(err.fields).toEqual({
      email: ['invalid', 'too short'],
      name: ['required'],
      'address.zip': ['bad format'],
    });
    expect(err.statusCode).toBe(400);
  });
});

describe('AuthenticationError', () => {
  it('defaults to 401', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
    expect(err.isOperational).toBe(true);
  });

  it('accepts custom message', () => {
    const err = new AuthenticationError('token expired');
    expect(err.message).toBe('token expired');
  });
});

describe('AuthorizationError', () => {
  it('defaults to 403', () => {
    const err = new AuthorizationError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('AUTHORIZATION_ERROR');
  });
});

describe('NotFoundError', () => {
  it('builds message with resource name', () => {
    const err = new NotFoundError('User');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('User não encontrado');
    expect(err.details).toEqual({ resource: 'User', id: undefined });
  });

  it('builds message with resource + id', () => {
    const err = new NotFoundError('User', 42);
    expect(err.message).toBe('User com ID 42 não encontrado');
    expect(err.details).toEqual({ resource: 'User', id: 42 });
  });
});

describe('ConflictError', () => {
  it('defaults to 409', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });
});

describe('RateLimitError', () => {
  it('defaults to 429', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('stores retryAfter', () => {
    const err = new RateLimitError('slow down', 60);
    expect(err.retryAfter).toBe(60);
    expect(err.details).toEqual({ retryAfter: 60 });
  });
});

describe('InternalError', () => {
  it('returns 500 and isOperational=false', () => {
    const err = new InternalError();
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(false);
  });
});

describe('ServiceUnavailableError', () => {
  it('returns 503 with service name in message', () => {
    const err = new ServiceUnavailableError('Redis');
    expect(err.statusCode).toBe(503);
    expect(err.message).toContain('Redis');
  });
});

describe('TimeoutError', () => {
  it('returns 504 with operation name', () => {
    const err = new TimeoutError('DB query', 5000);
    expect(err.statusCode).toBe(504);
    expect(err.message).toContain('DB query');
    expect(err.details).toEqual({ timeoutMs: 5000 });
  });
});

describe('DatabaseError', () => {
  it('returns 500, isOperational=false', () => {
    const err = new DatabaseError('conn lost');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(false);
    expect(err.code).toBe('DATABASE_ERROR');
  });
});

describe('ExternalServiceError', () => {
  it('returns 502 with service details', () => {
    const err = new ExternalServiceError('Stripe');
    expect(err.statusCode).toBe(502);
    expect(err.details).toEqual({ service: 'Stripe' });
  });
});

// ─── Helper functions ───────────────────────────────────────────
describe('isOperationalError', () => {
  it('returns true for operational ApplicationError', () => {
    expect(isOperationalError(new ValidationError())).toBe(true);
    expect(isOperationalError(new AuthenticationError())).toBe(true);
    expect(isOperationalError(new NotFoundError())).toBe(true);
  });

  it('returns false for non-operational errors', () => {
    expect(isOperationalError(new InternalError())).toBe(false);
    expect(isOperationalError(new DatabaseError())).toBe(false);
  });

  it('returns false for plain Error', () => {
    expect(isOperationalError(new Error('oops'))).toBe(false);
  });
});

describe('toApplicationError', () => {
  it('returns same instance for ApplicationError', () => {
    const original = new NotFoundError('User');
    const result = toApplicationError(original);
    expect(result).toBe(original);
  });

  it('wraps plain Error into InternalError', () => {
    const result = toApplicationError(new Error('oops'));
    expect(result).toBeInstanceOf(InternalError);
    expect(result.message).toBe('oops');
  });

  it('wraps non-Error values', () => {
    const result = toApplicationError('string error');
    expect(result).toBeInstanceOf(InternalError);
    expect(result.message).toBe('Erro desconhecido');
  });

  it('wraps null/undefined', () => {
    expect(toApplicationError(null)).toBeInstanceOf(InternalError);
    expect(toApplicationError(undefined)).toBeInstanceOf(InternalError);
  });
});
