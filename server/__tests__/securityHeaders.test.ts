/**
 * Security Headers Middleware Tests
 * Testa securityHeadersMiddleware e apiSecurityHeaders
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { securityHeadersMiddleware, apiSecurityHeaders } from '../middleware/securityHeaders';

// ── Helpers ─────────────────────────────────────────────────────

function createMockReq(overrides = {}): Partial<Request> {
  return {
    method: 'GET',
    path: '/api/test',
    headers: {},
    query: {},
    params: {},
    body: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' } as any,
    ...overrides,
  };
}

function createMockRes(): Partial<Response> & { _headers: Record<string, string>; _status: number; _json: unknown } {
  const res: any = {
    _headers: {} as Record<string, string>,
    _status: 200,
    _json: null,
    headersSent: false,
    statusCode: 200,
    setHeader(key: string, value: string) { res._headers[key] = value; return res; },
    getHeader(key: string) { return res._headers[key]; },
    status(code: number) { res._status = code; res.statusCode = code; return res; },
    json(data: unknown) { res._json = data; res.headersSent = true; return res; },
    send(data: unknown) { res._json = data; res.headersSent = true; return res; },
    on: vi.fn(),
  };
  return res;
}

// ── Tests ───────────────────────────────────────────────────────

describe('Security Headers Middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  describe('securityHeadersMiddleware', () => {
    it('sets X-Frame-Options to SAMEORIGIN', () => {
      const req = createMockReq();
      const res = createMockRes();

      securityHeadersMiddleware(req as Request, res as Response, next);

      expect(res._headers['X-Frame-Options']).toBe('SAMEORIGIN');
    });

    it('sets X-Content-Type-Options to nosniff', () => {
      const req = createMockReq();
      const res = createMockRes();

      securityHeadersMiddleware(req as Request, res as Response, next);

      expect(res._headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('sets X-XSS-Protection to 1; mode=block', () => {
      const req = createMockReq();
      const res = createMockRes();

      securityHeadersMiddleware(req as Request, res as Response, next);

      expect(res._headers['X-XSS-Protection']).toBe('1; mode=block');
    });

    it('sets Referrer-Policy to strict-origin-when-cross-origin', () => {
      const req = createMockReq();
      const res = createMockRes();

      securityHeadersMiddleware(req as Request, res as Response, next);

      expect(res._headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('sets Permissions-Policy with restricted features', () => {
      const req = createMockReq();
      const res = createMockRes();

      securityHeadersMiddleware(req as Request, res as Response, next);

      const policy = res._headers['Permissions-Policy'];
      expect(policy).toBeDefined();
      expect(policy).toContain('geolocation=()');
      expect(policy).toContain('camera=()');
      expect(policy).toContain('microphone=()');
    });

    it('sets Cross-Origin-Opener-Policy to same-origin', () => {
      const req = createMockReq();
      const res = createMockRes();

      securityHeadersMiddleware(req as Request, res as Response, next);

      expect(res._headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    });

    it('sets Cross-Origin-Resource-Policy to same-origin', () => {
      const req = createMockReq();
      const res = createMockRes();

      securityHeadersMiddleware(req as Request, res as Response, next);

      expect(res._headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
    });

    it('sets Content-Security-Policy-Report-Only in test env (not CSP)', () => {
      const req = createMockReq();
      const res = createMockRes();

      securityHeadersMiddleware(req as Request, res as Response, next);

      expect(res._headers['Content-Security-Policy-Report-Only']).toBeDefined();
      expect(res._headers['Content-Security-Policy']).toBeUndefined();
    });

    it('does NOT set HSTS header in test env', () => {
      const req = createMockReq();
      const res = createMockRes();

      securityHeadersMiddleware(req as Request, res as Response, next);

      expect(res._headers['Strict-Transport-Security']).toBeUndefined();
    });

    it('sets Cache-Control for API routes (/api/...)', () => {
      const req = createMockReq({ path: '/api/users' });
      const res = createMockRes();

      securityHeadersMiddleware(req as Request, res as Response, next);

      expect(res._headers['Cache-Control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
    });

    it('does NOT set Cache-Control for non-API routes', () => {
      const req = createMockReq({ path: '/about' });
      const res = createMockRes();

      securityHeadersMiddleware(req as Request, res as Response, next);

      expect(res._headers['Cache-Control']).toBeUndefined();
    });

    it('calls next()', () => {
      const req = createMockReq();
      const res = createMockRes();

      securityHeadersMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('apiSecurityHeaders', () => {
    it('sets X-Frame-Options to DENY', () => {
      const req = createMockReq();
      const res = createMockRes();

      apiSecurityHeaders(req as Request, res as Response, next);

      expect(res._headers['X-Frame-Options']).toBe('DENY');
    });

    it('sets Cache-Control to no-store, no-cache, must-revalidate', () => {
      const req = createMockReq();
      const res = createMockRes();

      apiSecurityHeaders(req as Request, res as Response, next);

      expect(res._headers['Cache-Control']).toBe('no-store, no-cache, must-revalidate');
    });

    it('calls next()', () => {
      const req = createMockReq();
      const res = createMockRes();

      apiSecurityHeaders(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
