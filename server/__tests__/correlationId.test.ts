/**
 * Correlation ID Middleware Tests
 * Testa correlationIdMiddleware, getCorrelationId, createLogContext
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  correlationIdMiddleware,
  getCorrelationId,
  createLogContext,
  CORRELATION_ID_HEADER,
} from '../middleware/correlationId';

// ── Helpers ─────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

describe('Correlation ID Middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  describe('correlationIdMiddleware', () => {
    it('generates a new UUID when no correlation ID header is provided', () => {
      const req = createMockReq();
      const res = createMockRes();

      correlationIdMiddleware(req as Request, res as Response, next);

      expect((req as any).correlationId).toMatch(UUID_REGEX);
    });

    it('reuses a valid UUID from x-correlation-id header', () => {
      const existingId = '550e8400-e29b-41d4-a716-446655440000';
      const req = createMockReq({
        headers: { [CORRELATION_ID_HEADER]: existingId },
      });
      const res = createMockRes();

      correlationIdMiddleware(req as Request, res as Response, next);

      expect((req as any).correlationId).toBe(existingId);
    });

    it('rejects invalid correlation ID and generates a new one', () => {
      const req = createMockReq({
        headers: { [CORRELATION_ID_HEADER]: 'not-a-valid-uuid' },
      });
      const res = createMockRes();

      correlationIdMiddleware(req as Request, res as Response, next);

      expect((req as any).correlationId).not.toBe('not-a-valid-uuid');
      expect((req as any).correlationId).toMatch(UUID_REGEX);
    });

    it('sets x-correlation-id on response header', () => {
      const req = createMockReq();
      const res = createMockRes();

      correlationIdMiddleware(req as Request, res as Response, next);

      expect(res._headers[CORRELATION_ID_HEADER]).toMatch(UUID_REGEX);
    });

    it('sets req.correlationId', () => {
      const req = createMockReq();
      const res = createMockRes();

      correlationIdMiddleware(req as Request, res as Response, next);

      expect((req as any).correlationId).toBeDefined();
      expect(typeof (req as any).correlationId).toBe('string');
    });

    it('calls next()', () => {
      const req = createMockReq();
      const res = createMockRes();

      correlationIdMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls res.on("finish", ...) for response time logging', () => {
      const req = createMockReq();
      const res = createMockRes();

      correlationIdMiddleware(req as Request, res as Response, next);

      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('getCorrelationId', () => {
    it('returns the correlationId from req', () => {
      const req = createMockReq() as any;
      req.correlationId = 'abc-123-def';

      expect(getCorrelationId(req as Request)).toBe('abc-123-def');
    });

    it('returns "no-correlation-id" when missing', () => {
      const req = createMockReq() as any;
      // correlationId not set

      expect(getCorrelationId(req as Request)).toBe('no-correlation-id');
    });
  });

  describe('createLogContext', () => {
    it('returns object with correlationId and path', () => {
      const req = createMockReq({ path: '/api/users' }) as any;
      req.correlationId = '550e8400-e29b-41d4-a716-446655440000';

      const ctx = createLogContext(req as Request);

      expect(ctx).toEqual({
        correlationId: '550e8400-e29b-41d4-a716-446655440000',
        path: '/api/users',
      });
    });
  });
});
