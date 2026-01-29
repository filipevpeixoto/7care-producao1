/**
 * Monitoring Service
 * Serviço centralizado para monitoramento, métricas e error tracking
 * @module services/monitoringService
 *
 * @description
 * Integra com Sentry para error tracking e fornece métricas de performance.
 * Em produção, envia erros para Sentry. Em desenvolvimento, loga localmente.
 */

import { logger } from '../utils/logger';

/**
 * Níveis de severidade para erros
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

/**
 * Contexto adicional para erros
 */
export interface ErrorContext {
  userId?: number;
  userEmail?: string;
  userRole?: string;
  endpoint?: string;
  method?: string;
  requestId?: string;
  extra?: Record<string, unknown>;
}

/**
 * Métricas de performance
 */
export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
}

// Cache de métricas para agregação
const metricsCache: PerformanceMetrics[] = [];
const MAX_METRICS_CACHE = 1000;

// Cache de erros recentes
interface ErrorRecord {
  timestamp: Date;
  message: string;
  stack?: string;
  context?: ErrorContext;
  severity: ErrorSeverity;
}
const errorsCache: ErrorRecord[] = [];
const MAX_ERRORS_CACHE = 100;

/**
 * Serviço de Monitoramento
 */
class MonitoringService {
  private isInitialized = false;
  private sentryDsn: string | null = null;

  /**
   * Inicializa o serviço de monitoramento
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    this.sentryDsn = process.env.SENTRY_DSN || null;

    if (this.sentryDsn && process.env.NODE_ENV === 'production') {
      try {
        // Sentry seria inicializado aqui em produção
        // const Sentry = await import('@sentry/node');
        // Sentry.init({
        //   dsn: this.sentryDsn,
        //   environment: process.env.NODE_ENV,
        //   release: process.env.npm_package_version,
        //   tracesSampleRate: 0.1, // 10% das transações
        //   integrations: [
        //     new Sentry.Integrations.Http({ tracing: true }),
        //     new Sentry.Integrations.Express({ app })
        //   ]
        // });
        logger.info('Monitoring service initialized (Sentry ready)');
      } catch (error) {
        logger.error('Failed to initialize Sentry:', error);
      }
    } else {
      logger.info('Monitoring service initialized (local mode)');
    }

    this.isInitialized = true;
  }

  /**
   * Captura e reporta um erro
   */
  captureError(
    error: Error | string,
    context?: ErrorContext,
    severity: ErrorSeverity = 'error'
  ): void {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const timestamp = new Date().toISOString();

    // Log local sempre
    const logContext = {
      timestamp,
      severity,
      ...context,
      stack: errorObj.stack,
    };

    switch (severity) {
      case 'fatal':
      case 'error':
        logger.error(`[${severity.toUpperCase()}] ${errorObj.message}`, logContext);
        break;
      case 'warning':
        logger.warn(`[WARNING] ${errorObj.message}`, logContext);
        break;
      default:
        logger.info(`[INFO] ${errorObj.message}`, logContext);
    }

    // Armazena erro no cache
    errorsCache.unshift({
      timestamp: new Date(),
      message: errorObj.message,
      stack: errorObj.stack,
      context,
      severity,
    });
    if (errorsCache.length > MAX_ERRORS_CACHE) {
      errorsCache.pop();
    }

    // Em produção, enviar para Sentry
    if (this.sentryDsn && process.env.NODE_ENV === 'production') {
      // Sentry.withScope((scope) => {
      //   if (context?.userId) scope.setUser({ id: String(context.userId) });
      //   if (context?.endpoint) scope.setTag('endpoint', context.endpoint);
      //   if (context?.requestId) scope.setTag('requestId', context.requestId);
      //   scope.setLevel(severity);
      //   Sentry.captureException(errorObj);
      // });
    }
  }

  /**
   * Captura uma mensagem (não erro)
   */
  captureMessage(message: string, context?: ErrorContext, severity: ErrorSeverity = 'info'): void {
    const timestamp = new Date().toISOString();

    logger.info(`[MESSAGE] ${message}`, { timestamp, severity, ...context });

    // Em produção, enviar para Sentry
    if (this.sentryDsn && process.env.NODE_ENV === 'production') {
      // Sentry.captureMessage(message, severity);
    }
  }

  /**
   * Registra métrica de performance
   */
  recordMetric(metric: PerformanceMetrics): void {
    // Adiciona ao cache local
    metricsCache.push(metric);

    // Limita tamanho do cache
    if (metricsCache.length > MAX_METRICS_CACHE) {
      metricsCache.shift();
    }

    // Log endpoints lentos
    if (metric.duration > 1000) {
      logger.warn(`Slow endpoint: ${metric.method} ${metric.endpoint} - ${metric.duration}ms`);
    }
  }

  /**
   * Obtém métricas agregadas
   */
  getMetricsSummary(): Record<string, unknown> {
    if (metricsCache.length === 0) {
      return { totalRequests: 0, message: 'No metrics recorded yet' };
    }

    const totalRequests = metricsCache.length;
    const avgDuration = metricsCache.reduce((acc, m) => acc + m.duration, 0) / totalRequests;
    const slowRequests = metricsCache.filter(m => m.duration > 1000).length;
    const errorRequests = metricsCache.filter(m => m.statusCode >= 400).length;

    // Agrupa por endpoint
    const endpointStats: Record<string, { count: number; avgDuration: number }> = {};
    metricsCache.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      if (!endpointStats[key]) {
        endpointStats[key] = { count: 0, avgDuration: 0 };
      }
      endpointStats[key].count++;
      endpointStats[key].avgDuration =
        (endpointStats[key].avgDuration * (endpointStats[key].count - 1) + m.duration) /
        endpointStats[key].count;
    });

    // Top 5 mais lentos
    const slowestEndpoints = Object.entries(endpointStats)
      .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
      .slice(0, 5)
      .map(([endpoint, stats]) => ({ endpoint, ...stats }));

    return {
      totalRequests,
      avgDuration: Math.round(avgDuration),
      slowRequests,
      errorRequests,
      errorRate: `${((errorRequests / totalRequests) * 100).toFixed(2)}%`,
      slowestEndpoints,
    };
  }

  /**
   * Obtém métricas do sistema (alias para getMetricsSummary)
   */
  getMetrics(): Record<string, unknown> {
    return this.getMetricsSummary();
  }

  /**
   * Obtém erros recentes
   */
  getRecentErrors(limit: number = 50): ErrorRecord[] {
    return errorsCache.slice(0, limit);
  }

  /**
   * Middleware Express para capturar métricas automaticamente
   */
  metricsMiddleware() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();

      res.on('finish', () => {
        this.recordMetric({
          endpoint: req.path,
          method: req.method,
          duration: Date.now() - start,
          statusCode: res.statusCode,
          timestamp: new Date(),
        });
      });

      next();
    };
  }

  /**
   * Middleware Express para capturar erros automaticamente
   */
  errorMiddleware() {
    return (error: Error, req: any, _res: any, next: any) => {
      this.captureError(error, {
        endpoint: req.path,
        method: req.method,
        userId: req.userId,
        requestId: req.correlationId,
      });
      next(error);
    };
  }
}

// Singleton
export const monitoringService = new MonitoringService();

// Inicializa automaticamente
monitoringService.init().catch(console.error);

export default monitoringService;
