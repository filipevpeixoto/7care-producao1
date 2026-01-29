/**
 * Prometheus Metrics Service
 * Endpoint /metrics para integração com Prometheus/Grafana
 * @module services/prometheusService
 */

import { Request, Response, Router } from 'express';
import { cacheService } from './cacheService';
import { logger } from '../utils/logger';

/**
 * Contadores de métricas
 */
interface MetricsCounters {
  httpRequestsTotal: Map<string, number>;
  httpRequestDuration: Map<string, number[]>;
  activeConnections: number;
  errorCount: Map<string, number>;
  dbQueryCount: number;
  dbQueryDuration: number[];
  cacheHits: number;
  cacheMisses: number;
}

/**
 * Singleton para métricas
 */
class PrometheusService {
  private counters: MetricsCounters = {
    httpRequestsTotal: new Map(),
    httpRequestDuration: new Map(),
    activeConnections: 0,
    errorCount: new Map(),
    dbQueryCount: 0,
    dbQueryDuration: [],
    cacheHits: 0,
    cacheMisses: 0,
  };

  private startTime = Date.now();

  /**
   * Incrementa contador de requisições HTTP
   */
  incrementHttpRequests(method: string, path: string, statusCode: number): void {
    const key = `${method}:${this.normalizePath(path)}:${statusCode}`;
    const current = this.counters.httpRequestsTotal.get(key) || 0;
    this.counters.httpRequestsTotal.set(key, current + 1);
  }

  /**
   * Registra duração de requisição HTTP
   */
  recordHttpDuration(method: string, path: string, durationMs: number): void {
    const key = `${method}:${this.normalizePath(path)}`;
    const durations = this.counters.httpRequestDuration.get(key) || [];
    durations.push(durationMs);
    // Mantém apenas as últimas 1000 medições
    if (durations.length > 1000) {
      durations.shift();
    }
    this.counters.httpRequestDuration.set(key, durations);
  }

  /**
   * Incrementa conexões ativas
   */
  incrementConnections(): void {
    this.counters.activeConnections++;
  }

  /**
   * Decrementa conexões ativas
   */
  decrementConnections(): void {
    this.counters.activeConnections = Math.max(0, this.counters.activeConnections - 1);
  }

  /**
   * Registra erro
   */
  recordError(type: string): void {
    const current = this.counters.errorCount.get(type) || 0;
    this.counters.errorCount.set(type, current + 1);
  }

  /**
   * Registra query do banco
   */
  recordDbQuery(durationMs: number): void {
    this.counters.dbQueryCount++;
    this.counters.dbQueryDuration.push(durationMs);
    if (this.counters.dbQueryDuration.length > 1000) {
      this.counters.dbQueryDuration.shift();
    }
  }

  /**
   * Atualiza métricas de cache
   */
  updateCacheMetrics(): void {
    const stats = cacheService.getStats();
    this.counters.cacheHits = stats.hits;
    this.counters.cacheMisses = stats.misses;
  }

  /**
   * Normaliza path removendo IDs numéricos
   */
  private normalizePath(path: string): string {
    return path.replace(/\/\d+/g, '/:id').replace(/\/[a-f0-9-]{36}/g, '/:uuid');
  }

  /**
   * Calcula percentil
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Gera métricas no formato Prometheus
   */
  generateMetrics(): string {
    this.updateCacheMetrics();

    const lines: string[] = [];
    const processMemory = process.memoryUsage();
    const uptime = (Date.now() - this.startTime) / 1000;

    // Metadata
    lines.push('# HELP app_info Application information');
    lines.push('# TYPE app_info gauge');
    lines.push(`app_info{version="1.0.0",node_version="${process.version}"} 1`);

    // Uptime
    lines.push('# HELP app_uptime_seconds Application uptime in seconds');
    lines.push('# TYPE app_uptime_seconds counter');
    lines.push(`app_uptime_seconds ${uptime.toFixed(2)}`);

    // Memory
    lines.push('# HELP nodejs_heap_used_bytes Node.js heap used bytes');
    lines.push('# TYPE nodejs_heap_used_bytes gauge');
    lines.push(`nodejs_heap_used_bytes ${processMemory.heapUsed}`);

    lines.push('# HELP nodejs_heap_total_bytes Node.js heap total bytes');
    lines.push('# TYPE nodejs_heap_total_bytes gauge');
    lines.push(`nodejs_heap_total_bytes ${processMemory.heapTotal}`);

    lines.push('# HELP nodejs_rss_bytes Node.js RSS bytes');
    lines.push('# TYPE nodejs_rss_bytes gauge');
    lines.push(`nodejs_rss_bytes ${processMemory.rss}`);

    // HTTP Requests Total
    lines.push('# HELP http_requests_total Total HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    for (const [key, count] of this.counters.httpRequestsTotal) {
      const [method, path, status] = key.split(':');
      lines.push(
        `http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}`
      );
    }

    // HTTP Request Duration
    lines.push('# HELP http_request_duration_ms HTTP request duration in milliseconds');
    lines.push('# TYPE http_request_duration_ms summary');
    for (const [key, durations] of this.counters.httpRequestDuration) {
      const [method, path] = key.split(':');
      if (durations.length > 0) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const p50 = this.percentile(durations, 50);
        const p95 = this.percentile(durations, 95);
        const p99 = this.percentile(durations, 99);
        lines.push(
          `http_request_duration_ms{method="${method}",path="${path}",quantile="0.5"} ${p50.toFixed(2)}`
        );
        lines.push(
          `http_request_duration_ms{method="${method}",path="${path}",quantile="0.95"} ${p95.toFixed(2)}`
        );
        lines.push(
          `http_request_duration_ms{method="${method}",path="${path}",quantile="0.99"} ${p99.toFixed(2)}`
        );
        lines.push(
          `http_request_duration_ms_avg{method="${method}",path="${path}"} ${avg.toFixed(2)}`
        );
      }
    }

    // Active Connections
    lines.push('# HELP http_active_connections Current active HTTP connections');
    lines.push('# TYPE http_active_connections gauge');
    lines.push(`http_active_connections ${this.counters.activeConnections}`);

    // Errors
    lines.push('# HELP app_errors_total Total application errors');
    lines.push('# TYPE app_errors_total counter');
    for (const [type, count] of this.counters.errorCount) {
      lines.push(`app_errors_total{type="${type}"} ${count}`);
    }

    // Database
    lines.push('# HELP db_queries_total Total database queries');
    lines.push('# TYPE db_queries_total counter');
    lines.push(`db_queries_total ${this.counters.dbQueryCount}`);

    if (this.counters.dbQueryDuration.length > 0) {
      const avgDb =
        this.counters.dbQueryDuration.reduce((a, b) => a + b, 0) /
        this.counters.dbQueryDuration.length;
      lines.push('# HELP db_query_duration_ms Average database query duration');
      lines.push('# TYPE db_query_duration_ms gauge');
      lines.push(`db_query_duration_ms ${avgDb.toFixed(2)}`);
    }

    // Cache
    lines.push('# HELP cache_hits_total Total cache hits');
    lines.push('# TYPE cache_hits_total counter');
    lines.push(`cache_hits_total ${this.counters.cacheHits}`);

    lines.push('# HELP cache_misses_total Total cache misses');
    lines.push('# TYPE cache_misses_total counter');
    lines.push(`cache_misses_total ${this.counters.cacheMisses}`);

    const cacheStats = cacheService.getStats();
    lines.push('# HELP cache_size Current cache size');
    lines.push('# TYPE cache_size gauge');
    lines.push(`cache_size ${cacheStats.size}`);

    lines.push('# HELP cache_hit_rate Cache hit rate');
    lines.push('# TYPE cache_hit_rate gauge');
    lines.push(`cache_hit_rate ${cacheStats.hitRate.toFixed(4)}`);

    return `${lines.join('\n')}\n`;
  }

  /**
   * Cria router para endpoint /metrics
   */
  createRouter(): Router {
    const router = Router();

    router.get('/metrics', (_req: Request, res: Response) => {
      res.set('Content-Type', 'text/plain; version=0.0.4');
      res.send(this.generateMetrics());
    });

    router.get('/metrics/json', (_req: Request, res: Response) => {
      this.updateCacheMetrics();
      res.json({
        uptime: (Date.now() - this.startTime) / 1000,
        memory: process.memoryUsage(),
        http: {
          requests: Object.fromEntries(this.counters.httpRequestsTotal),
          activeConnections: this.counters.activeConnections,
        },
        errors: Object.fromEntries(this.counters.errorCount),
        database: {
          queryCount: this.counters.dbQueryCount,
          avgDuration:
            this.counters.dbQueryDuration.length > 0
              ? this.counters.dbQueryDuration.reduce((a, b) => a + b, 0) /
                this.counters.dbQueryDuration.length
              : 0,
        },
        cache: cacheService.getStats(),
      });
    });

    logger.info('Prometheus metrics endpoint registered at /metrics');
    return router;
  }

  /**
   * Middleware para coletar métricas de requisições
   */
  metricsMiddleware() {
    return (req: Request, res: Response, next: () => void) => {
      const start = Date.now();
      this.incrementConnections();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.incrementHttpRequests(req.method, req.path, res.statusCode);
        this.recordHttpDuration(req.method, req.path, duration);
        this.decrementConnections();

        if (res.statusCode >= 500) {
          this.recordError('5xx');
        } else if (res.statusCode >= 400) {
          this.recordError('4xx');
        }
      });

      next();
    };
  }
}

export const prometheusService = new PrometheusService();
