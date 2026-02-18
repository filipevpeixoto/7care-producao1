/**
 * Cache Middleware Tests
 * Testa cacheMiddleware, invalidateCache, invalidateCacheMiddleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ── Hoisted mocks ───────────────────────────────────────────────

const { mockCacheGet, mockCacheSet, mockCacheDelPattern } = vi.hoisted(() => ({
  mockCacheGet: vi.fn(),
  mockCacheSet: vi.fn().mockResolvedValue(true),
  mockCacheDelPattern: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/cacheService', () => ({
  cacheGet: mockCacheGet,
  cacheSet: mockCacheSet,
  cacheDelPattern: mockCacheDelPattern,
}));

vi.mock('../constants', () => ({
  CACHE_TTL: { DASHBOARD: 60, USERS: 120 },
}));

import { cacheMiddleware, invalidateCache, invalidateCacheMiddleware } from '../middleware/cache';

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

function createMockRes(): Partial<Response> & {
  _headers: Record<string, string>;
  _status: number;
  _json: unknown;
} {
  const res: any = {
    _headers: {} as Record<string, string>,
    _status: 200,
    _json: null,
    headersSent: false,
    statusCode: 200,
    setHeader(key: string, value: string) {
      res._headers[key] = value;
      return res;
    },
    getHeader(key: string) {
      return res._headers[key];
    },
    status(code: number) {
      res._status = code;
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res._json = data;
      res.headersSent = true;
      return res;
    },
    send(data: unknown) {
      res._json = data;
      res.headersSent = true;
      return res;
    },
    on: vi.fn(),
  };
  return res;
}

// ── Tests ───────────────────────────────────────────────────────

describe('Cache Middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheSet.mockResolvedValue(true);
    mockCacheDelPattern.mockResolvedValue(undefined);
    next = vi.fn();
  });

  describe('cacheMiddleware', () => {
    it('uses authenticated user context for cache key instead of x-user-id header', async () => {
      mockCacheGet.mockResolvedValueOnce(null);

      const req = createMockReq({
        headers: { 'x-user-id': 'spoofed-user' },
        userId: 42,
        userRole: 'superadmin',
        user: { districtId: 9 },
      });
      const res = createMockRes();

      const middleware = cacheMiddleware('users', 60);
      await middleware(req as Request, res as Response, next);

      expect(mockCacheGet).toHaveBeenCalledWith(
        expect.stringContaining('users:user:42:role:superadmin:district:9')
      );
    });

    it('returns cached data with X-Cache: HIT header on cache hit', async () => {
      const cachedPayload = { success: true, data: [1, 2, 3] };
      mockCacheGet.mockResolvedValueOnce(cachedPayload);

      const req = createMockReq({ headers: { 'x-user-id': 'user-1' } });
      const res = createMockRes();

      const middleware = cacheMiddleware('test', 60);
      await middleware(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._headers['X-Cache']).toBe('HIT');
      expect(res._json).toEqual(cachedPayload);
    });

    it('calls next() and sets X-Cache: MISS on cache miss', async () => {
      mockCacheGet.mockResolvedValueOnce(null);

      const req = createMockReq({ headers: { 'x-user-id': 'user-1' } });
      const res = createMockRes();

      const middleware = cacheMiddleware('test', 60);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();

      // Simulate the intercepted json call to verify MISS header
      const responseData = { success: true };
      res.json(responseData);

      expect(res._headers['X-Cache']).toBe('MISS');
    });

    it('caches successful response (status 200)', async () => {
      mockCacheGet.mockResolvedValueOnce(null);

      const req = createMockReq({
        path: '/api/dashboard',
        headers: { 'x-user-id': 'user-2' },
        query: {},
      });
      const res = createMockRes();

      const middleware = cacheMiddleware('dashboard', 60);
      await middleware(req as Request, res as Response, next);

      // Simulate controller sending response via the intercepted json
      const responseData = { stats: { total: 100 } };
      res.json(responseData);

      // Allow the async cacheSet to be scheduled
      await vi.waitFor(() => {
        expect(mockCacheSet).toHaveBeenCalledWith(
          expect.stringContaining('dashboard:'),
          responseData,
          60
        );
      });
    });

    it('does NOT cache non-GET requests', async () => {
      const req = createMockReq({ method: 'POST' });
      const res = createMockRes();

      const middleware = cacheMiddleware('test', 60);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
      expect(mockCacheGet).not.toHaveBeenCalled();
    });

    it('handles cache errors gracefully (calls next)', async () => {
      mockCacheGet.mockRejectedValueOnce(new Error('Redis down'));

      const req = createMockReq({ headers: { 'x-user-id': 'user-1' } });
      const res = createMockRes();

      const middleware = cacheMiddleware('test', 60);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('invalidateCache', () => {
    it('calls cacheDelPattern with pattern:* suffix', async () => {
      await invalidateCache('users');

      expect(mockCacheDelPattern).toHaveBeenCalledWith('users:*');
    });
  });

  describe('invalidateCacheMiddleware', () => {
    it('invalidates patterns after successful mutation', async () => {
      const req = createMockReq({ method: 'POST' });
      const res = createMockRes();

      const middleware = invalidateCacheMiddleware('users', 'dashboard');
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();

      // Simulate a successful response via the intercepted send
      res.statusCode = 201;
      res._status = 201;
      res.send({ success: true });

      // Allow async invalidation to fire
      await vi.waitFor(() => {
        expect(mockCacheDelPattern).toHaveBeenCalledWith('users:*');
        expect(mockCacheDelPattern).toHaveBeenCalledWith('dashboard:*');
      });
    });
  });
});
