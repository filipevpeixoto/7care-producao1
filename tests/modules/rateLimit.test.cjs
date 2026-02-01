/**
 * Testes do módulo de Rate Limiting
 */

const {
  RATE_LIMIT_CONFIG,
  checkRateLimitSimple,
  resetRateLimit,
  getRateLimitStatus
} = require('../../netlify/functions/modules/rateLimit.cjs');

// Alias para compatibilidade com testes
const checkRateLimit = checkRateLimitSimple;

describe('Rate Limit Module', () => {
  beforeEach(() => {
    // Reset all rate limits before each test
    resetRateLimit('test-ip');
    resetRateLimit('test-user');
    resetRateLimit('blocked-ip');
    resetRateLimit('retry-ip');
    resetRateLimit('bulk-ip');
    resetRateLimit('ip-1');
    resetRateLimit('ip-2');
    resetRateLimit('reset-ip');
    resetRateLimit('status-ip');
    resetRateLimit('unknown-ip');
  });

  describe('RATE_LIMIT_CONFIG', () => {
    it('should have auth config', () => {
      expect(RATE_LIMIT_CONFIG.auth).toBeDefined();
      expect(RATE_LIMIT_CONFIG.auth.maxRequests).toBe(10);
      expect(RATE_LIMIT_CONFIG.auth.windowMs).toBe(15 * 60 * 1000);
    });

    it('should have api config', () => {
      expect(RATE_LIMIT_CONFIG.api).toBeDefined();
      expect(RATE_LIMIT_CONFIG.api.maxRequests).toBe(100);
    });

    it('should have write config', () => {
      expect(RATE_LIMIT_CONFIG.write).toBeDefined();
      expect(RATE_LIMIT_CONFIG.write.maxRequests).toBe(30);
    });

    it('should have bulk config', () => {
      expect(RATE_LIMIT_CONFIG.bulk).toBeDefined();
      expect(RATE_LIMIT_CONFIG.bulk.maxRequests).toBe(5);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests under the limit', () => {
      const result = checkRateLimit('test-ip', 'api');
      expect(result.allowed).toBe(true);
    });

    it('should track request count', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-ip', 'api');
      }
      
      const status = getRateLimitStatus('test-ip', 'api');
      expect(status.count).toBe(5);
    });

    it('should block requests over the limit', () => {
      // Make 10 auth requests (limit)
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit('blocked-ip', 'auth');
        expect(result.allowed).toBe(true);
      }
      
      // 11th request should be blocked
      const result = checkRateLimit('blocked-ip', 'auth');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    it('should return retryAfter when blocked', () => {
      // Exceed limit
      for (let i = 0; i < 11; i++) {
        checkRateLimit('retry-ip', 'auth');
      }
      
      const result = checkRateLimit('retry-ip', 'auth');
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(15 * 60); // 15 minutes max
    });

    it('should use different limits for different types', () => {
      // 5 bulk requests is the limit
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit('bulk-ip', 'bulk').allowed).toBe(true);
      }
      expect(checkRateLimit('bulk-ip', 'bulk').allowed).toBe(false);
      
      // Same IP should still have 100 api requests available
      expect(checkRateLimit('bulk-ip', 'api').allowed).toBe(true);
    });

    it('should track different identifiers separately', () => {
      // Max out one identifier
      for (let i = 0; i < 10; i++) {
        checkRateLimit('ip-1', 'auth');
      }
      
      // Different identifier should still have quota
      expect(checkRateLimit('ip-2', 'auth').allowed).toBe(true);
    });

    it('should handle unknown rate limit types gracefully', () => {
      const result = checkRateLimit('test-ip', 'unknown');
      // Should use default (api) config and allow
      expect(result.allowed).toBe(true);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for identifier', () => {
      // Add some requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit('reset-ip', 'api');
      }
      
      // Reset
      resetRateLimit('reset-ip');
      
      // Should be back to 0
      const status = getRateLimitStatus('reset-ip', 'api');
      expect(status.count).toBe(0);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current status', () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimit('status-ip', 'api');
      }
      
      const status = getRateLimitStatus('status-ip', 'api');
      
      expect(status.count).toBe(3);
      expect(status.remaining).toBe(97); // 100 - 3
      expect(status.limit).toBe(100);
    });

    it('should return empty status for unknown identifier', () => {
      const status = getRateLimitStatus('unknown-ip', 'api');
      
      expect(status.count).toBe(0);
      expect(status.remaining).toBe(100);
    });
  });
});
