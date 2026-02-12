import { describe, it, expect } from 'vitest';

/**
 * Tests for express-rate-limit middleware instances.
 *
 * All limiters in rateLimiters.ts skip when NODE_ENV=test (via setup.ts).
 * We therefore test the structural contracts rather than actual throttling.
 */
import {
  authRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
  sensitiveRateLimiter,
  searchRateLimiter,
  webhookRateLimiter,
  createUserBasedRateLimiter,
} from '../middleware/rateLimiters';

describe('rateLimiters module', () => {
  it('exports all named limiters as functions', () => {
    expect(typeof authRateLimiter).toBe('function');
    expect(typeof apiRateLimiter).toBe('function');
    expect(typeof uploadRateLimiter).toBe('function');
    expect(typeof sensitiveRateLimiter).toBe('function');
    expect(typeof searchRateLimiter).toBe('function');
    expect(typeof webhookRateLimiter).toBe('function');
  });

  it('createUserBasedRateLimiter returns a middleware function', () => {
    const limiter = createUserBasedRateLimiter(60_000, 100, 200);
    expect(typeof limiter).toBe('function');
  });
});

import {
  authLimiter,
  registerLimiter,
  apiLimiter,
  sensitiveLimiter,
  uploadLimiter,
  pushNotificationLimiter,
  debugLimiter,
  getRateLimitStats,
} from '../middleware/rateLimiter';

describe('rateLimiter module', () => {
  it('exports all named limiters as functions', () => {
    expect(typeof authLimiter).toBe('function');
    expect(typeof registerLimiter).toBe('function');
    expect(typeof apiLimiter).toBe('function');
    expect(typeof sensitiveLimiter).toBe('function');
    expect(typeof uploadLimiter).toBe('function');
    expect(typeof pushNotificationLimiter).toBe('function');
    expect(typeof debugLimiter).toBe('function');
  });

  it('getRateLimitStats returns structured metadata', () => {
    const stats = getRateLimitStats();
    expect(stats).toHaveProperty('message');
    expect(stats).toHaveProperty('limiters');
    expect(Array.isArray(stats.limiters)).toBe(true);
    expect(stats.limiters.length).toBeGreaterThan(0);

    // Each limiter should have name and maxRequests
    for (const limiter of stats.limiters) {
      expect(limiter).toHaveProperty('name');
      expect(limiter).toHaveProperty('maxRequests');
    }
  });
});
