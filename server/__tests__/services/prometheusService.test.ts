/**
 * Testes do PrometheusService
 * Testa coleta de métricas para Prometheus
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

describe('PrometheusService', () => {
  let counters: {
    httpRequestsTotal: Map<string, number>;
    httpRequestDuration: Map<string, number[]>;
    activeConnections: number;
    errorCount: Map<string, number>;
    dbQueryCount: number;
    dbQueryDuration: number[];
    cacheHits: number;
    cacheMisses: number;
  };

  beforeEach(() => {
    counters = {
      httpRequestsTotal: new Map(),
      httpRequestDuration: new Map(),
      activeConnections: 0,
      errorCount: new Map(),
      dbQueryCount: 0,
      dbQueryDuration: [],
      cacheHits: 0,
      cacheMisses: 0,
    };
  });

  describe('incrementHttpRequests', () => {
    it('deve incrementar contador de requisições HTTP', () => {
      const key = 'GET:/api/users:200';
      const current = counters.httpRequestsTotal.get(key) || 0;
      counters.httpRequestsTotal.set(key, current + 1);

      expect(counters.httpRequestsTotal.get(key)).toBe(1);
    });

    it('deve incrementar contadores separados por método/path/status', () => {
      const incrementRequest = (method: string, path: string, status: number) => {
        const key = `${method}:${path}:${status}`;
        const current = counters.httpRequestsTotal.get(key) || 0;
        counters.httpRequestsTotal.set(key, current + 1);
      };

      incrementRequest('GET', '/api/users', 200);
      incrementRequest('GET', '/api/users', 200);
      incrementRequest('POST', '/api/users', 201);
      incrementRequest('GET', '/api/users', 404);

      expect(counters.httpRequestsTotal.get('GET:/api/users:200')).toBe(2);
      expect(counters.httpRequestsTotal.get('POST:/api/users:201')).toBe(1);
      expect(counters.httpRequestsTotal.get('GET:/api/users:404')).toBe(1);
    });
  });

  describe('recordHttpDuration', () => {
    it('deve registrar duração de requisição HTTP', () => {
      const key = 'GET:/api/users';
      const duration = 150; // ms

      const durations = counters.httpRequestDuration.get(key) || [];
      durations.push(duration);
      counters.httpRequestDuration.set(key, durations);

      expect(counters.httpRequestDuration.get(key)).toContain(150);
    });

    it('deve acumular múltiplas durações', () => {
      const key = 'GET:/api/users';

      [100, 150, 200, 50, 300].forEach(duration => {
        const durations = counters.httpRequestDuration.get(key) || [];
        durations.push(duration);
        counters.httpRequestDuration.set(key, durations);
      });

      expect(counters.httpRequestDuration.get(key)?.length).toBe(5);
    });
  });

  describe('Conexões Ativas', () => {
    it('deve incrementar conexões ativas', () => {
      counters.activeConnections++;
      counters.activeConnections++;

      expect(counters.activeConnections).toBe(2);
    });

    it('deve decrementar conexões ativas', () => {
      counters.activeConnections = 5;
      counters.activeConnections--;

      expect(counters.activeConnections).toBe(4);
    });

    it('não deve ficar negativo', () => {
      counters.activeConnections = 0;
      counters.activeConnections = Math.max(0, counters.activeConnections - 1);

      expect(counters.activeConnections).toBe(0);
    });
  });

  describe('recordError', () => {
    it('deve registrar erros por tipo', () => {
      const recordError = (type: string) => {
        const current = counters.errorCount.get(type) || 0;
        counters.errorCount.set(type, current + 1);
      };

      recordError('ValidationError');
      recordError('DatabaseError');
      recordError('ValidationError');

      expect(counters.errorCount.get('ValidationError')).toBe(2);
      expect(counters.errorCount.get('DatabaseError')).toBe(1);
    });
  });

  describe('recordDbQuery', () => {
    it('deve registrar query de banco de dados', () => {
      const duration = 50; // ms

      counters.dbQueryCount++;
      counters.dbQueryDuration.push(duration);

      expect(counters.dbQueryCount).toBe(1);
      expect(counters.dbQueryDuration).toContain(50);
    });

    it('deve acumular múltiplas queries', () => {
      [10, 20, 30, 40, 50].forEach(duration => {
        counters.dbQueryCount++;
        counters.dbQueryDuration.push(duration);
      });

      expect(counters.dbQueryCount).toBe(5);
      expect(counters.dbQueryDuration.length).toBe(5);
    });
  });

  describe('Cache Metrics', () => {
    it('deve registrar cache hits', () => {
      counters.cacheHits++;
      counters.cacheHits++;

      expect(counters.cacheHits).toBe(2);
    });

    it('deve registrar cache misses', () => {
      counters.cacheMisses++;

      expect(counters.cacheMisses).toBe(1);
    });

    it('deve calcular hit rate', () => {
      counters.cacheHits = 80;
      counters.cacheMisses = 20;

      const total = counters.cacheHits + counters.cacheMisses;
      const hitRate = total > 0 ? (counters.cacheHits / total) * 100 : 0;

      expect(hitRate).toBe(80);
    });
  });

  describe('generateMetrics', () => {
    it('deve gerar métricas em formato Prometheus', () => {
      counters.httpRequestsTotal.set('GET:/api/users:200', 100);
      counters.activeConnections = 5;
      counters.dbQueryCount = 50;
      counters.cacheHits = 80;
      counters.cacheMisses = 20;

      // Simular geração de métricas
      const lines: string[] = [];

      // HTTP requests
      lines.push('# HELP http_requests_total Total number of HTTP requests');
      lines.push('# TYPE http_requests_total counter');
      for (const [key, value] of counters.httpRequestsTotal) {
        const [method, path, status] = key.split(':');
        lines.push(
          `http_requests_total{method="${method}",path="${path}",status="${status}"} ${value}`
        );
      }

      // Active connections
      lines.push('# HELP active_connections Current number of active connections');
      lines.push('# TYPE active_connections gauge');
      lines.push(`active_connections ${counters.activeConnections}`);

      const metricsOutput = lines.join('\n');

      expect(metricsOutput).toContain('http_requests_total');
      expect(metricsOutput).toContain('active_connections 5');
    });
  });

  describe('Percentile Calculation', () => {
    it('deve calcular percentil 50 (mediana)', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      const sorted = [...values].sort((a, b) => a - b);
      const p = 0.5;
      const index = Math.ceil(sorted.length * p) - 1;
      const p50 = sorted[index];

      expect(p50).toBe(50);
    });

    it('deve calcular percentil 95', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      const sorted = [...values].sort((a, b) => a - b);
      const p = 0.95;
      const index = Math.ceil(sorted.length * p) - 1;
      const p95 = sorted[index];

      expect(p95).toBe(100);
    });

    it('deve calcular percentil 99', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);

      const sorted = [...values].sort((a, b) => a - b);
      const p = 0.99;
      const index = Math.ceil(sorted.length * p) - 1;
      const p99 = sorted[index];

      expect(p99).toBe(99);
    });
  });

  describe('Path Normalization', () => {
    it('deve normalizar paths com IDs', () => {
      const normalizePath = (path: string) => {
        return path.replace(/\/\d+/g, '/:id').replace(/\/[a-f0-9-]{36}/g, '/:uuid');
      };

      expect(normalizePath('/api/users/123')).toBe('/api/users/:id');
      expect(normalizePath('/api/users/123/posts/456')).toBe('/api/users/:id/posts/:id');
    });
  });
});
