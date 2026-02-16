/**
 * Validation Middleware Tests
 * Testa validateBody, validateQuery, validateParams, combineValidations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams, combineValidations } from '../middleware/validation';

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

// ── Schemas ─────────────────────────────────────────────────────

const bodySchema = z.object({ name: z.string(), age: z.number() });
const querySchema = z.object({ page: z.string(), limit: z.string() });
const paramsSchema = z.object({ id: z.string().uuid() });

// ── Tests ───────────────────────────────────────────────────────

describe('Validation Middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  // ── validateBody ────────────────────────────────────────────

  describe('validateBody', () => {
    it('calls next() when body is valid', () => {
      const req = createMockReq({ body: { name: 'Alice', age: 30 } });
      const res = createMockRes();

      validateBody(bodySchema)(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res._status).toBe(200);
    });

    it('returns 400 with VALIDATION_ERROR code when body is invalid', () => {
      const req = createMockReq({ body: { name: 123 } });
      const res = createMockRes();

      validateBody(bodySchema)(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(400);
      expect(res._json).toEqual(
        expect.objectContaining({
          success: false,
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
          ]),
        }),
      );
    });

    it('sets req.validatedBody on success', () => {
      const req = createMockReq({ body: { name: 'Bob', age: 25 } });
      const res = createMockRes();

      validateBody(bodySchema)(req as Request, res as Response, next);

      expect((req as any).validatedBody).toEqual({ name: 'Bob', age: 25 });
    });
  });

  // ── validateQuery ───────────────────────────────────────────

  describe('validateQuery', () => {
    it('calls next() when query is valid', () => {
      const req = createMockReq({ query: { page: '1', limit: '10' } });
      const res = createMockRes();

      validateQuery(querySchema)(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns 400 when query is invalid', () => {
      const req = createMockReq({ query: {} });
      const res = createMockRes();

      validateQuery(querySchema)(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(400);
      expect(res._json).toEqual(
        expect.objectContaining({
          success: false,
          code: 'VALIDATION_ERROR',
        }),
      );
    });

    it('sets req.validatedQuery on success', () => {
      const req = createMockReq({ query: { page: '2', limit: '20' } });
      const res = createMockRes();

      validateQuery(querySchema)(req as Request, res as Response, next);

      expect((req as any).validatedQuery).toEqual({ page: '2', limit: '20' });
    });
  });

  // ── validateParams ──────────────────────────────────────────

  describe('validateParams', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';

    it('calls next() when params are valid', () => {
      const req = createMockReq({ params: { id: validUUID } });
      const res = createMockRes();

      validateParams(paramsSchema)(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns 400 when params are invalid', () => {
      const req = createMockReq({ params: { id: 'not-a-uuid' } });
      const res = createMockRes();

      validateParams(paramsSchema)(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(400);
      expect(res._json).toEqual(
        expect.objectContaining({
          success: false,
          code: 'VALIDATION_ERROR',
        }),
      );
    });
  });

  // ── combineValidations ──────────────────────────────────────

  describe('combineValidations', () => {
    it('runs validators sequentially and calls next() if all pass', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const req = createMockReq({
        params: { id: validUUID },
        body: { name: 'Charlie', age: 40 },
      });
      const res = createMockRes();

      const combined = combineValidations(
        validateParams(paramsSchema),
        validateBody(bodySchema),
      );

      await combined(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('stops on first failure and does not call next()', async () => {
      const failingValidator = (_req: Request, res: Response, _next: NextFunction) => {
        res.status(400).json({ error: 'validation failed' });
        // Simulates real validators that call next() after responding
        // to unblock the combineValidations promise
        _next();
      };
      const secondValidator = vi.fn();

      const req = createMockReq({ body: { name: 'Charlie', age: 40 } });
      const res = createMockRes();

      const combined = combineValidations(failingValidator, secondValidator);

      await combined(req as Request, res as Response, next);

      // Should stop after first validator fails (headersSent is true)
      expect(res.headersSent).toBe(true);
      expect(res._status).toBe(400);
      expect(secondValidator).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
