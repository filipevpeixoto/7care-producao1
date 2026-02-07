/**
 * Express App Configuration
 * Configuração compartilhada do Express entre index.ts e index.prod.ts
 */

import express, { type Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { apiLimiter } from './middleware/rateLimiter';
import { correlationIdMiddleware } from './middleware/correlationId';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { securityHeadersMiddleware } from './middleware/securityHeaders';
import { healthCheckRouter } from './middleware/healthCheck';
import { inputSanitizationMiddleware } from './middleware/inputSanitization';
import { monitoringService } from './services/monitoringService';
import { prometheusService } from './services/prometheusService';
import { logger } from './utils/logger';

/**
 * Cria e configura a instância do Express com todos os middlewares de segurança,
 * compressão, CORS e monitoramento.
 */
export function createApp(): express.Express {
  const app = express();

  // Correlation ID para rastreabilidade (primeiro middleware)
  app.use(correlationIdMiddleware);

  // Request logger (após correlation ID para ter o ID disponível)
  app.use(requestLoggerMiddleware);

  // Monitoring middleware para métricas de performance
  app.use(monitoringService.metricsMiddleware());

  // Security Headers avançados (CSP, HSTS, etc)
  app.use(securityHeadersMiddleware);

  // Helmet para headers de segurança HTTP
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Compressão gzip/brotli para respostas
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6,
    })
  );

  // CORS — origens explícitas (nunca wildcard *)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const defaultOrigins =
      'https://7careadv.netlify.app,http://localhost:3064,http://localhost:5173';
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || defaultOrigins)
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Body parser com limites de segurança
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Input sanitization — previne XSS em body, params e query
  app.use(inputSanitizationMiddleware);

  // Rate limiting global para API
  app.use('/api', apiLimiter);

  // Health Check endpoints
  app.use('/', healthCheckRouter);

  // Prometheus metrics
  app.use('/', prometheusService.createRouter());

  // Health Check simples
  app.get('/api/health', async (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
    });
  });

  return app;
}

/**
 * Cria o error handler padrão da aplicação.
 * Deve ser registrado APÓS todas as rotas.
 */
export function createErrorHandler() {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      (err as { status?: number; statusCode?: number }).status ||
      (err as { status?: number; statusCode?: number }).statusCode ||
      500;
    const message = (err as { message?: string }).message || 'Internal Server Error';

    res.status(status).json({ message });
    logger.error(`[ErrorHandler] ${status} - ${message}`, err instanceof Error ? err.stack : err);
  };
}
