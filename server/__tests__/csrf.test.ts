/**
 * CSRF Middleware Tests
 * Testa proteção contra Cross-Site Request Forgery (double submit cookie pattern)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { generateCsrfToken, csrfCookie, csrfProtection } from '../middleware/csrf';

// Helper para criar mock request
function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/api/test',
    headers: {},
    cookies: {},
    ...overrides,
  } as unknown as Request;
}

// Helper para criar mock response
function createMockRes(): Response {
  const res = {
    cookie: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    header: vi.fn(),
  } as unknown as Response;
  return res;
}

describe('CSRF Middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  describe('generateCsrfToken', () => {
    it('gera um token hex de 64 caracteres (32 bytes)', () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('gera tokens únicos a cada chamada', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('csrfCookie', () => {
    it('define cookie CSRF quando não existe', () => {
      const req = createMockReq();
      const res = createMockRes();

      csrfCookie(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        'csrf-token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: false,
          sameSite: 'strict',
          path: '/',
        })
      );
      expect(next).toHaveBeenCalled();
    });

    it('reutiliza cookie existente quando já presente', () => {
      const existingToken = 'existing-token-123';
      const req = createMockReq({
        headers: { cookie: `csrf-token=${existingToken}` },
      });
      const res = createMockRes();

      csrfCookie(req, res, next);

      // Não deve criar novo cookie
      expect(res.cookie).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('csrfProtection', () => {
    it('permite métodos seguros (GET) sem verificação', () => {
      const req = createMockReq({ method: 'GET' });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('permite métodos seguros (HEAD) sem verificação', () => {
      const req = createMockReq({ method: 'HEAD' });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('permite rotas isentas (login)', () => {
      const req = createMockReq({
        method: 'POST',
        path: '/api/auth/login',
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('permite rotas isentas (register)', () => {
      const req = createMockReq({
        method: 'POST',
        path: '/api/auth/register',
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('permite rotas isentas (health)', () => {
      const req = createMockReq({
        method: 'POST',
        path: '/api/health',
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('rejeita POST sem cookie CSRF', () => {
      const req = createMockReq({
        method: 'POST',
        path: '/api/users',
        headers: { 'x-csrf-token': 'some-token' },
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CSRF_TOKEN_MISSING' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('rejeita POST sem header CSRF', () => {
      const token = generateCsrfToken();
      const req = createMockReq({
        method: 'POST',
        path: '/api/users',
        headers: { cookie: `csrf-token=${token}` },
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CSRF_TOKEN_MISSING' })
      );
    });

    it('rejeita POST com tokens diferentes (cookie vs header)', () => {
      const cookieToken = generateCsrfToken();
      const headerToken = generateCsrfToken();
      const req = createMockReq({
        method: 'POST',
        path: '/api/users',
        headers: {
          'x-csrf-token': headerToken,
          cookie: `csrf-token=${cookieToken}`,
        },
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CSRF_TOKEN_INVALID' })
      );
    });

    it('permite POST quando cookie e header CSRF são iguais', () => {
      const token = generateCsrfToken();
      const req = createMockReq({
        method: 'POST',
        path: '/api/users',
        headers: {
          'x-csrf-token': token,
          cookie: `csrf-token=${token}`,
        },
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('verifica PUT, PATCH e DELETE da mesma forma', () => {
      const token = generateCsrfToken();

      for (const method of ['PUT', 'PATCH', 'DELETE']) {
        const req = createMockReq({
          method,
          path: '/api/users/1',
          headers: {
            'x-csrf-token': token,
            cookie: `csrf-token=${token}`,
          },
        });
        const res = createMockRes();
        const nextFn = vi.fn();

        csrfProtection(req, res, nextFn);

        expect(nextFn).toHaveBeenCalled();
      }
    });
  });
});
