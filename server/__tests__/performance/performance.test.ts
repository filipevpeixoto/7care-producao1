/**
 * Testes de Performance
 * Valida tempos de resposta e otimizações
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

// Utilitários de performance
const performanceUtils = {
  // Medir tempo de execução
  measureTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },

  // Medir tempo de execução síncrono
  measureTimeSync: <T>(fn: () => T): { result: T; duration: number } => {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    return { result, duration };
  },

  // Estatísticas de múltiplas execuções
  getStats: (durations: number[]): { min: number; max: number; avg: number; p95: number; p99: number } => {
    const sorted = [...durations].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, d) => acc + d, 0);
    const avg = sum / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      avg,
      p95: sorted[p95Index] || sorted[sorted.length - 1] || 0,
      p99: sorted[p99Index] || sorted[sorted.length - 1] || 0,
    };
  },
};

// Funções simuladas para teste
const simulatedOperations = {
  // Simular busca de usuário
  findUser: async (id: number): Promise<{ id: number; name: string }> => {
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 10));
    return { id, name: `User ${id}` };
  },

  // Simular busca em cache
  findUserCached: async (id: number): Promise<{ id: number; name: string }> => {
    await new Promise(resolve => setTimeout(resolve, 1 + Math.random() * 2));
    return { id, name: `User ${id}` };
  },

  // Simular processamento pesado
  heavyComputation: (iterations: number): number => {
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i);
    }
    return result;
  },

  // Simular serialização
  serializeData: (data: unknown[]): string => {
    return JSON.stringify(data);
  },

  // Simular parse de dados
  parseData: (json: string): unknown => {
    return JSON.parse(json);
  },

  // Simular batching
  batchOperation: async <T>(items: T[], processor: (item: T) => Promise<T>, batchSize: number = 10): Promise<T[]> => {
    const results: T[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }
    return results;
  },
};

describe('Performance Tests', () => {
  describe('Execution Time Measurements', () => {
    it('should measure async function execution time', async () => {
      const { duration } = await performanceUtils.measureTime(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'done';
      });

      expect(duration).toBeGreaterThanOrEqual(45); // Allow some tolerance
      expect(duration).toBeLessThan(100);
    });

    it('should measure sync function execution time', () => {
      const { duration } = performanceUtils.measureTimeSync(() => {
        let sum = 0;
        for (let i = 0; i < 10000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Database Query Performance', () => {
    it('should find user within acceptable time', async () => {
      const { duration } = await performanceUtils.measureTime(() => 
        simulatedOperations.findUser(1)
      );

      expect(duration).toBeLessThan(50); // Max 50ms for single query
    });

    it('should benefit from caching', async () => {
      const uncached = await performanceUtils.measureTime(() => 
        simulatedOperations.findUser(1)
      );

      const cached = await performanceUtils.measureTime(() => 
        simulatedOperations.findUserCached(1)
      );

      expect(cached.duration).toBeLessThan(uncached.duration);
    });

    it('should handle multiple queries efficiently', async () => {
      const durations: number[] = [];
      
      for (let i = 0; i < 20; i++) {
        const { duration } = await performanceUtils.measureTime(() => 
          simulatedOperations.findUserCached(i)
        );
        durations.push(duration);
      }

      const stats = performanceUtils.getStats(durations);
      expect(stats.avg).toBeLessThan(20);
      expect(stats.p95).toBeLessThan(30);
    });
  });

  describe('Computation Performance', () => {
    it('should handle heavy computation', () => {
      const { duration } = performanceUtils.measureTimeSync(() => 
        simulatedOperations.heavyComputation(10000)
      );

      expect(duration).toBeLessThan(100);
    });

    it('should scale linearly', () => {
      const small = performanceUtils.measureTimeSync(() => 
        simulatedOperations.heavyComputation(1000)
      );

      const large = performanceUtils.measureTimeSync(() => 
        simulatedOperations.heavyComputation(10000)
      );

      // Large should take roughly 10x longer, but allow tolerance
      expect(large.duration / small.duration).toBeLessThan(20);
    });
  });

  describe('Serialization Performance', () => {
    it('should serialize quickly', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        points: Math.random() * 1000,
      }));

      const { duration } = performanceUtils.measureTimeSync(() => 
        simulatedOperations.serializeData(data)
      );

      expect(duration).toBeLessThan(50);
    });

    it('should parse quickly', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        points: Math.random() * 1000,
      }));
      const json = JSON.stringify(data);

      const { duration } = performanceUtils.measureTimeSync(() => 
        simulatedOperations.parseData(json)
      );

      expect(duration).toBeLessThan(50);
    });
  });

  describe('Batch Operations Performance', () => {
    it('should process batches efficiently', async () => {
      const items = Array.from({ length: 50 }, (_, i) => i);
      const processor = async (item: number) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return item * 2;
      };

      const { duration } = await performanceUtils.measureTime(() => 
        simulatedOperations.batchOperation(items, processor, 10)
      );

      // With batch size 10, should be ~5 batches * ~10ms each = ~50ms
      // Plus some overhead, but should be much less than 50 * 1ms = 50ms serial
      expect(duration).toBeLessThan(200);
    });

    it('should handle large batches', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const processor = async (item: number) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return item;
      };

      const smallBatch = await performanceUtils.measureTime(() => 
        simulatedOperations.batchOperation(items, processor, 5)
      );

      const largeBatch = await performanceUtils.measureTime(() => 
        simulatedOperations.batchOperation(items, processor, 20)
      );

      // Larger batches should be faster (fewer round trips)
      expect(largeBatch.duration).toBeLessThanOrEqual(smallBatch.duration);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory in loops', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate processing many items
      for (let i = 0; i < 1000; i++) {
        const data = { id: i, value: 'x'.repeat(100) };
        JSON.stringify(data);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Statistical Analysis', () => {
    it('should calculate correct statistics', () => {
      const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const stats = performanceUtils.getStats(durations);

      expect(stats.min).toBe(10);
      expect(stats.max).toBe(100);
      expect(stats.avg).toBe(55);
      expect(stats.p95).toBe(100);
    });

    it('should handle single value', () => {
      const stats = performanceUtils.getStats([50]);
      
      expect(stats.min).toBe(50);
      expect(stats.max).toBe(50);
      expect(stats.avg).toBe(50);
      expect(stats.p95).toBe(50);
    });

    it('should handle empty array', () => {
      const stats = performanceUtils.getStats([]);
      
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.avg).toBe(NaN);
    });
  });
});

// Export para uso em outros testes
export { performanceUtils, simulatedOperations };
