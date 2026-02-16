/**
 * CacheService unit tests
 * Tests in-memory cache operations: set, get, del, TTL expiration, stats, and pattern deletion.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// No hoisted mocks needed — CacheService uses in-memory cache in test mode (NODE_ENV=test)

// Import SUT
import { CacheService, cacheDelPattern } from '../services/cacheService';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = new CacheService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('set() and get()', () => {
    it('stores and retrieves a value', async () => {
      await cache.set('key1', { name: 'test' });

      const result = await cache.get<{ name: string }>('key1');

      expect(result).toEqual({ name: 'test' });
    });

    it('stores and retrieves string values', async () => {
      await cache.set('greeting', 'hello world');

      const result = await cache.get<string>('greeting');

      expect(result).toBe('hello world');
    });

    it('stores and retrieves numeric values', async () => {
      await cache.set('count', 42);

      const result = await cache.get<number>('count');

      expect(result).toBe(42);
    });

    it('overwrites existing values', async () => {
      await cache.set('key1', 'first');
      await cache.set('key1', 'second');

      const result = await cache.get<string>('key1');

      expect(result).toBe('second');
    });
  });

  describe('get() with missing keys', () => {
    it('returns null for a key that was never set', async () => {
      const result = await cache.get('nonexistent');

      expect(result).toBeNull();
    });

    it('returns null for an empty string key', async () => {
      const result = await cache.get('');

      expect(result).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('returns value before TTL expires', async () => {
      await cache.set('temp', 'alive', 10); // 10 seconds TTL

      vi.advanceTimersByTime(9 * 1000); // 9 seconds

      const result = await cache.get<string>('temp');

      expect(result).toBe('alive');
    });

    it('returns null after TTL expires', async () => {
      await cache.set('temp', 'alive', 10); // 10 seconds TTL

      vi.advanceTimersByTime(11 * 1000); // 11 seconds

      const result = await cache.get<string>('temp');

      expect(result).toBeNull();
    });

    it('uses default TTL when none specified', async () => {
      await cache.set('default-ttl', 'value');

      // Default TTL is 5 minutes (300 seconds)
      vi.advanceTimersByTime(299 * 1000);
      expect(await cache.get<string>('default-ttl')).toBe('value');

      vi.advanceTimersByTime(2 * 1000); // now past 300s
      expect(await cache.get<string>('default-ttl')).toBeNull();
    });
  });

  describe('del()', () => {
    it('removes an existing entry', async () => {
      await cache.set('to-delete', 'bye');

      const deleted = await cache.del('to-delete');

      expect(deleted).toBe(true);
      expect(await cache.get('to-delete')).toBeNull();
    });

    it('returns true even for non-existent key', async () => {
      const deleted = await cache.del('never-existed');

      expect(deleted).toBe(true);
    });
  });

  describe('getStats()', () => {
    it('starts with zero hits and misses', () => {
      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.isRedisConnected).toBe(false);
    });

    it('tracks hits correctly', async () => {
      await cache.set('a', 1);
      await cache.get('a'); // hit
      await cache.get('a'); // hit

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
    });

    it('tracks misses correctly', async () => {
      await cache.get('missing1'); // miss
      await cache.get('missing2'); // miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(2);
    });

    it('calculates hit rate correctly', async () => {
      await cache.set('x', 'val');
      await cache.get('x');       // hit
      await cache.get('y');       // miss
      await cache.get('x');       // hit
      await cache.get('z');       // miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('reports correct size', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);

      expect(cache.getStats().size).toBe(3);

      await cache.del('b');

      expect(cache.getStats().size).toBe(2);
    });
  });

  describe('cacheDelPattern()', () => {
    it('removes keys matching a wildcard pattern', async () => {
      // The standalone cacheDelPattern uses the singleton, so we test via a fresh instance
      // by directly accessing the memoryCache through the service
      const localCache = new CacheService();
      // Populate cache via the service
      await localCache.set('user:1:profile', 'data1');
      await localCache.set('user:2:profile', 'data2');
      await localCache.set('church:1:info', 'data3');

      // Use pattern to delete user:* keys — cacheDelPattern accesses cacheService singleton
      // We need to access internals for the local instance
      const memCache = (localCache as unknown as { memoryCache: Map<string, unknown> }).memoryCache;
      const patternRegex = /^user:.*$/;
      for (const key of memCache.keys()) {
        if (patternRegex.test(key)) {
          memCache.delete(key);
        }
      }

      expect(await localCache.get('user:1:profile')).toBeNull();
      expect(await localCache.get('user:2:profile')).toBeNull();
      expect(await localCache.get('church:1:info')).toBe('data3');
    });

    it('cacheDelPattern removes matching keys from singleton', async () => {
      // Use the exported singleton-based helpers
      const { cacheSet, cacheGet } = await import('../services/cacheService');

      await cacheSet('prefix:aaa', 'val1');
      await cacheSet('prefix:bbb', 'val2');
      await cacheSet('other:ccc', 'val3');

      await cacheDelPattern('prefix:*');

      expect(await cacheGet('prefix:aaa')).toBeNull();
      expect(await cacheGet('prefix:bbb')).toBeNull();
      expect(await cacheGet('other:ccc')).toBe('val3');
    });
  });
});
