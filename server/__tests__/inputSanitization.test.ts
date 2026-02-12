import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { inputSanitizationMiddleware } from '../middleware/inputSanitization';

/**
 * Helper: build a minimal Express-like request
 */
function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    query: {},
    params: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  return {} as Response;
}

describe('inputSanitizationMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  // ── Passthrough ───────────────────────────────────────────────
  it('calls next and does not alter safe body', () => {
    const req = mockReq({ body: { name: 'John', email: 'a@b.com' } });
    inputSanitizationMiddleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.body).toEqual({ name: 'John', email: 'a@b.com' });
  });

  it('leaves numbers and booleans untouched', () => {
    const req = mockReq({ body: { age: 30, active: true } });
    inputSanitizationMiddleware(req, mockRes(), next);
    expect(req.body).toEqual({ age: 30, active: true });
  });

  // ── XSS: <script> ────────────────────────────────────────────
  it('escapes <script> tags in body', () => {
    const req = mockReq({
      body: { comment: '<script>alert("xss")</script>' },
    });
    inputSanitizationMiddleware(req, mockRes(), next);

    expect(req.body.comment).not.toContain('<script');
    expect(req.body.comment).toContain('&lt;script');
    expect(next).toHaveBeenCalledOnce();
  });

  // ── XSS: javascript: protocol ─────────────────────────────────
  it('escapes javascript: protocol', () => {
    const req = mockReq({
      body: { url: 'javascript:alert(1)' },
    });
    inputSanitizationMiddleware(req, mockRes(), next);

    // The dangerous pattern should be escaped
    expect(req.body.url).not.toMatch(/javascript\s*:/i);
  });

  // ── XSS: event handlers ──────────────────────────────────────
  it('escapes inline event handlers (onerror=)', () => {
    const req = mockReq({
      body: { img: '<img onerror="alert(1)" />' },
    });
    inputSanitizationMiddleware(req, mockRes(), next);

    expect(req.body.img).not.toContain('onerror=');
    expect(req.body.img).toContain('&lt;img');
  });

  // ── Nested objects ────────────────────────────────────────────
  it('sanitises nested objects', () => {
    const req = mockReq({
      body: {
        user: {
          bio: '<script>bad</script>',
          address: { city: 'Safe City' },
        },
      },
    });
    inputSanitizationMiddleware(req, mockRes(), next);

    expect(req.body.user.bio).toContain('&lt;script');
    expect(req.body.user.address.city).toBe('Safe City');
  });

  // ── Arrays ────────────────────────────────────────────────────
  it('sanitises values inside arrays', () => {
    const req = mockReq({
      body: { tags: ['safe', '<script>x</script>', 'also safe'] },
    });
    inputSanitizationMiddleware(req, mockRes(), next);

    expect(req.body.tags[0]).toBe('safe');
    expect(req.body.tags[1]).toContain('&lt;script');
    expect(req.body.tags[2]).toBe('also safe');
  });

  // ── Query params ──────────────────────────────────────────────
  it('sanitises query parameters', () => {
    const req = mockReq({
      query: { search: '<script>x</script>' } as unknown as Request['query'],
    });
    inputSanitizationMiddleware(req, mockRes(), next);

    expect((req.query as Record<string, string>).search).toContain('&lt;script');
  });

  // ── Path params ───────────────────────────────────────────────
  it('sanitises path params', () => {
    const req = mockReq({
      params: { id: '<script>x</script>' } as Record<string, string>,
    });
    inputSanitizationMiddleware(req, mockRes(), next);

    expect(req.params.id).toContain('&lt;script');
  });

  // ── data:text/html ────────────────────────────────────────────
  it('escapes data:text/html payloads', () => {
    const req = mockReq({
      body: { content: 'data:text/html,<h1>Hi</h1>' },
    });
    inputSanitizationMiddleware(req, mockRes(), next);

    expect(req.body.content).not.toMatch(/data\s*:\s*text\/html/i);
  });

  // ── vbscript: protocol ────────────────────────────────────────
  it('escapes vbscript: protocol', () => {
    const req = mockReq({
      body: { link: 'vbscript:MsgBox("xss")' },
    });
    inputSanitizationMiddleware(req, mockRes(), next);

    expect(req.body.link).not.toMatch(/vbscript\s*:/i);
  });

  // ── Depth limit ───────────────────────────────────────────────
  it('does not crash on deeply nested objects (depth limit 10)', () => {
    // Build a 15-level deep object
    let obj: Record<string, unknown> = { val: '<script>x</script>' };
    for (let i = 0; i < 14; i++) {
      obj = { nested: obj };
    }
    const req = mockReq({ body: obj });
    inputSanitizationMiddleware(req, mockRes(), next);

    // Should not throw, should call next
    expect(next).toHaveBeenCalledOnce();
  });

  // ── Empty / null body ─────────────────────────────────────────
  it('handles null body gracefully', () => {
    const req = mockReq({ body: null });
    inputSanitizationMiddleware(req, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('handles undefined body', () => {
    const req = mockReq({ body: undefined });
    inputSanitizationMiddleware(req, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });
});
