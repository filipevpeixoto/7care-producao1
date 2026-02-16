/**
 * TokenBlacklistService unit tests
 * Tests the REAL in-memory implementation (not the mocked singleton from setup.ts).
 * Redis is mocked to fail connection so we test pure in-memory behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock redis before any imports ───────────────────────────────
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    on: vi.fn(),
    connect: vi.fn().mockRejectedValue(new Error('No Redis in tests')),
    set: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn(),
    quit: vi.fn().mockResolvedValue(undefined),
  })),
}));

// ── Unmock tokenBlacklistService (setup.ts mocks it globally) ───
vi.unmock('../services/tokenBlacklistService');

describe('TokenBlacklistService', () => {
  // We dynamically import to get a fresh instance each test
  let TokenBlacklistModule: typeof import('../services/tokenBlacklistService');
  let blacklist: typeof import('../services/tokenBlacklistService').tokenBlacklist;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset module to get fresh singleton
    vi.resetModules();

    // Re-apply redis mock after resetModules
    vi.doMock('redis', () => ({
      createClient: vi.fn(() => ({
        on: vi.fn(),
        connect: vi.fn().mockRejectedValue(new Error('No Redis in tests')),
        set: vi.fn(),
        get: vi.fn().mockResolvedValue(null),
        del: vi.fn(),
        quit: vi.fn().mockResolvedValue(undefined),
      })),
    }));

    TokenBlacklistModule = await import('../services/tokenBlacklistService');
    blacklist = TokenBlacklistModule.tokenBlacklist;
  });

  afterEach(() => {
    // Clean up intervals
    blacklist?.destroy();
    vi.useRealTimers();
  });

  describe('add()', () => {
    it('stores a token in memory', async () => {
      await blacklist.add('token-abc', 60_000);

      const result = await blacklist.isBlacklisted('token-abc');

      expect(result).toBe(true);
    });

    it('stores multiple tokens', async () => {
      await blacklist.add('t1', 60_000);
      await blacklist.add('t2', 60_000);

      expect(await blacklist.isBlacklisted('t1')).toBe(true);
      expect(await blacklist.isBlacklisted('t2')).toBe(true);
    });
  });

  describe('isBlacklisted()', () => {
    it('returns true for a blacklisted token', async () => {
      await blacklist.add('revoked-jwt', 60_000);

      expect(await blacklist.isBlacklisted('revoked-jwt')).toBe(true);
    });

    it('returns false for an unknown token', async () => {
      expect(await blacklist.isBlacklisted('never-added')).toBe(false);
    });
  });

  describe('TTL expiration', () => {
    it('token expires after TTL elapses', async () => {
      await blacklist.add('expiring-token', 10_000); // 10s TTL

      expect(await blacklist.isBlacklisted('expiring-token')).toBe(true);

      vi.advanceTimersByTime(11_000); // 11s later

      expect(await blacklist.isBlacklisted('expiring-token')).toBe(false);
    });

    it('token is still valid just before TTL', async () => {
      await blacklist.add('still-valid', 10_000);

      vi.advanceTimersByTime(9_000);

      expect(await blacklist.isBlacklisted('still-valid')).toBe(true);
    });
  });

  describe('size', () => {
    it('returns 0 for empty blacklist', () => {
      expect(blacklist.size).toBe(0);
    });

    it('returns correct count after adding tokens', async () => {
      await blacklist.add('a', 60_000);
      await blacklist.add('b', 60_000);
      await blacklist.add('c', 60_000);

      expect(blacklist.size).toBe(3);
    });

    it('decreases after expiration and access', async () => {
      await blacklist.add('short-lived', 5_000);
      await blacklist.add('long-lived', 60_000);

      expect(blacklist.size).toBe(2);

      vi.advanceTimersByTime(6_000);

      // Access the expired token to trigger removal
      await blacklist.isBlacklisted('short-lived');

      expect(blacklist.size).toBe(1);
    });
  });

  describe('destroy()', () => {
    it('clears the blacklist and intervals', async () => {
      await blacklist.add('t1', 60_000);
      await blacklist.add('t2', 60_000);

      expect(blacklist.size).toBe(2);

      blacklist.destroy();

      expect(blacklist.size).toBe(0);
      expect(await blacklist.isBlacklisted('t1')).toBe(false);
    });
  });

  describe('usingRedis', () => {
    it('returns false when Redis is unavailable', () => {
      expect(blacklist.usingRedis).toBe(false);
    });
  });
});
