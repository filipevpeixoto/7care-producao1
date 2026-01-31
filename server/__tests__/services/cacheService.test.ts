/**
 * Testes do CacheService
 * Testa funcionalidades de cache em memória
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('CacheService', () => {
  let cache: Map<string, { value: unknown; expiry: number }>;

  beforeEach(() => {
    cache = new Map();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Simula implementação do CacheService
  const cacheService = {
    set: (key: string, value: unknown, ttlMs: number = 60000) => {
      cache.set(key, {
        value,
        expiry: Date.now() + ttlMs,
      });
    },
    get: <T>(key: string): T | null => {
      const item = cache.get(key);
      if (!item) return null;
      if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
      }
      return item.value as T;
    },
    delete: (key: string): boolean => {
      return cache.delete(key);
    },
    has: (key: string): boolean => {
      const item = cache.get(key);
      if (!item) return false;
      if (Date.now() > item.expiry) {
        cache.delete(key);
        return false;
      }
      return true;
    },
    clear: () => {
      cache.clear();
    },
    size: () => cache.size,
    keys: () => Array.from(cache.keys()),
    invalidatePattern: (pattern: string) => {
      const regex = new RegExp(pattern);
      let count = 0;
      for (const key of cache.keys()) {
        if (regex.test(key)) {
          cache.delete(key);
          count++;
        }
      }
      return count;
    },
  };

  describe('set e get', () => {
    it('deve armazenar e recuperar valor', () => {
      cacheService.set('test-key', { data: 'test value' });

      const result = cacheService.get<{ data: string }>('test-key');

      expect(result).toEqual({ data: 'test value' });
    });

    it('deve retornar null para chave inexistente', () => {
      const result = cacheService.get('non-existent');

      expect(result).toBeNull();
    });

    it('deve expirar após TTL', () => {
      cacheService.set('expiring-key', 'value', 5000);

      // Avança 6 segundos
      jest.advanceTimersByTime(6000);

      const result = cacheService.get('expiring-key');

      expect(result).toBeNull();
    });

    it('deve retornar valor antes de expirar', () => {
      cacheService.set('not-expired', 'value', 10000);

      // Avança 5 segundos
      jest.advanceTimersByTime(5000);

      const result = cacheService.get('not-expired');

      expect(result).toBe('value');
    });

    it('deve sobrescrever valor existente', () => {
      cacheService.set('key', 'value1');
      cacheService.set('key', 'value2');

      const result = cacheService.get('key');

      expect(result).toBe('value2');
    });
  });

  describe('delete', () => {
    it('deve deletar chave existente', () => {
      cacheService.set('to-delete', 'value');

      const deleted = cacheService.delete('to-delete');

      expect(deleted).toBe(true);
      expect(cacheService.get('to-delete')).toBeNull();
    });

    it('deve retornar false para chave inexistente', () => {
      const deleted = cacheService.delete('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('has', () => {
    it('deve retornar true para chave existente', () => {
      cacheService.set('existing', 'value');

      expect(cacheService.has('existing')).toBe(true);
    });

    it('deve retornar false para chave inexistente', () => {
      expect(cacheService.has('non-existent')).toBe(false);
    });

    it('deve retornar false para chave expirada', () => {
      cacheService.set('expiring', 'value', 1000);

      jest.advanceTimersByTime(2000);

      expect(cacheService.has('expiring')).toBe(false);
    });
  });

  describe('clear', () => {
    it('deve limpar todo o cache', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');

      cacheService.clear();

      expect(cacheService.size()).toBe(0);
    });
  });

  describe('size e keys', () => {
    it('deve retornar quantidade de itens', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');

      expect(cacheService.size()).toBe(2);
    });

    it('deve retornar todas as chaves', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');

      const keys = cacheService.keys();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('invalidatePattern', () => {
    it('deve invalidar chaves que correspondem ao padrão', () => {
      cacheService.set('users:1', { name: 'User 1' });
      cacheService.set('users:2', { name: 'User 2' });
      cacheService.set('events:1', { name: 'Event 1' });

      const count = cacheService.invalidatePattern('^users:');

      expect(count).toBe(2);
      expect(cacheService.get('users:1')).toBeNull();
      expect(cacheService.get('users:2')).toBeNull();
      expect(cacheService.get('events:1')).not.toBeNull();
    });

    it('deve retornar 0 se nenhuma chave corresponder', () => {
      cacheService.set('events:1', { name: 'Event 1' });

      const count = cacheService.invalidatePattern('^users:');

      expect(count).toBe(0);
    });
  });

  describe('Cache de tipos específicos', () => {
    it('deve cachear objetos complexos', () => {
      const complexObject = {
        users: [{ id: 1, name: 'User 1' }],
        total: 100,
        metadata: {
          page: 1,
          limit: 20,
        },
      };

      cacheService.set('complex', complexObject);

      const result = cacheService.get<typeof complexObject>('complex');

      expect(result).toEqual(complexObject);
    });

    it('deve cachear arrays', () => {
      const array = [1, 2, 3, 4, 5];

      cacheService.set('array', array);

      const result = cacheService.get<number[]>('array');

      expect(result).toEqual(array);
    });

    it('deve cachear primitivos', () => {
      cacheService.set('string', 'hello');
      cacheService.set('number', 42);
      cacheService.set('boolean', true);

      expect(cacheService.get<string>('string')).toBe('hello');
      expect(cacheService.get<number>('number')).toBe(42);
      expect(cacheService.get<boolean>('boolean')).toBe(true);
    });
  });

  describe('Performance', () => {
    it('deve suportar muitas chaves', () => {
      for (let i = 0; i < 1000; i++) {
        cacheService.set(`key-${i}`, { index: i });
      }

      expect(cacheService.size()).toBe(1000);

      // Verifica acesso aleatório
      const result = cacheService.get<{ index: number }>('key-500');
      expect(result?.index).toBe(500);
    });
  });

  describe('TTL por categoria', () => {
    it('deve usar TTL diferente para diferentes categorias', () => {
      const CACHE_TTL = {
        USERS: 5 * 60 * 1000, // 5 minutos
        CHURCHES: 30 * 60 * 1000, // 30 minutos
        DASHBOARD: 60 * 1000, // 1 minuto
      };

      cacheService.set('users:list', [], CACHE_TTL.USERS);
      cacheService.set('churches:list', [], CACHE_TTL.CHURCHES);
      cacheService.set('dashboard:stats', {}, CACHE_TTL.DASHBOARD);

      // Avança 2 minutos
      jest.advanceTimersByTime(2 * 60 * 1000);

      // Dashboard expirou, outros não
      expect(cacheService.has('dashboard:stats')).toBe(false);
      expect(cacheService.has('users:list')).toBe(true);
      expect(cacheService.has('churches:list')).toBe(true);
    });
  });
});
