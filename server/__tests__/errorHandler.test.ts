import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler, asyncHandler } from '../middleware/errorHandler';
import {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  InternalError,
  NotFoundError,
} from '../errors';
import { ZodError } from 'zod';

// ── Helpers ─────────────────────────────────────────────────────
function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    path: '/api/test',
    method: 'GET',
    ...overrides,
  } as Request;
}

function mockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

const noop: NextFunction = vi.fn();

// ─── errorHandler ───────────────────────────────────────────────
describe('errorHandler', () => {
  let res: ReturnType<typeof mockRes>;

  beforeEach(() => {
    res = mockRes();
  });

  it('handles ApplicationError and returns matching status', () => {
    const err = new AuthenticationError('bad token');
    errorHandler(err, mockReq(), res as unknown as Response, noop);

    expect(res.status).toHaveBeenCalledWith(401);
    const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock
      .calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(body.error.message).toBe('bad token');
  });

  it('handles ValidationError with field details', () => {
    const err = new ValidationError('invalid', { email: ['required'] });
    errorHandler(err, mockReq(), res as unknown as Response, noop);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock
      .calls[0][0];
    expect(body.error.details).toEqual({ fields: { email: ['required'] } });
  });

  it('converts ZodError to ValidationError', () => {
    const zod = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string',
      },
    ]);
    errorHandler(zod, mockReq(), res as unknown as Response, noop);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock
      .calls[0][0];
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('wraps plain Error as 500 InternalError', () => {
    const err = new Error('unexpected');
    errorHandler(err, mockReq(), res as unknown as Response, noop);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock
      .calls[0][0];
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('includes correlationId when present', () => {
    const req = mockReq() as Request & { correlationId: string };
    (req as Record<string, unknown>).correlationId = 'abc-123';
    const err = new NotFoundError('User');

    errorHandler(err, req, res as unknown as Response, noop);

    const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock
      .calls[0][0];
    expect(body.error.requestId).toBe('abc-123');
  });

  it('hides internal error details in production', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new InternalError('db conn lost');
    errorHandler(err, mockReq(), res as unknown as Response, noop);

    const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock
      .calls[0][0];
    expect(body.error.message).toBe('Erro interno do servidor');
    expect(body.error.details).toBeUndefined();

    process.env.NODE_ENV = original;
  });

  it('shows operational error details even in production', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new ValidationError('invalid', { name: ['required'] });
    errorHandler(err, mockReq(), res as unknown as Response, noop);

    const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock
      .calls[0][0];
    // Operational errors keep their real message
    expect(body.error.message).toBe('invalid');

    process.env.NODE_ENV = original;
  });
});

// ─── notFoundHandler ────────────────────────────────────────────
describe('notFoundHandler', () => {
  it('returns 404 with method and path', () => {
    const res = mockRes();
    const req = mockReq({ method: 'POST', path: '/api/missing' });
    notFoundHandler(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock
      .calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('POST');
    expect(body.error.message).toContain('/api/missing');
  });
});

// ─── asyncHandler ───────────────────────────────────────────────
describe('asyncHandler', () => {
  it('calls the wrapped async function', async () => {
    const res = mockRes();
    const handler = asyncHandler(async (_req, r) => {
      (r as unknown as ReturnType<typeof mockRes>).status(200);
    });

    await handler(mockReq(), res as unknown as Response, noop);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('forwards errors to next()', async () => {
    const next = vi.fn();
    const handler = asyncHandler(async () => {
      throw new ApplicationError('fail', 500);
    });

    await handler(mockReq(), mockRes() as unknown as Response, next);

    // Give the microtask a tick
    await new Promise(r => setTimeout(r, 0));
    expect(next).toHaveBeenCalledWith(expect.any(ApplicationError));
  });
});
