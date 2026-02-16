/**
 * Express App Configuration
 * Configuração compartilhada do Express entre index.ts e index.prod.ts
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { apiLimiter } from './middleware/rateLimiter';
import { correlationIdMiddleware } from './middleware/correlationId';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { securityHeadersMiddleware } from './middleware/securityHeaders';
import { healthCheckRouter } from './middleware/healthCheck';
import { inputSanitizationMiddleware } from './middleware/inputSanitization';
import { optionalJwtAuth } from './middleware/jwtAuth';
import { csrfCookie, csrfProtection } from './middleware/csrf';
import { monitoringService } from './services/monitoringService';
import { prometheusService } from './services/prometheusService';
import { errorHandler, notFoundHandler, setupGlobalErrorHandlers } from './middleware/errorHandler';
import apmService from './services/apmService';
import { initFeatureFlags, featureFlagsMiddleware } from './services/featureFlagsService';
import {
  sentryRequestHandler,
  sentryTracingHandler,
  sentryUserContext,
} from './services/sentryService';

// Configura handlers globais (uncaughtException, unhandledRejection, SIGTERM/SIGINT)
setupGlobalErrorHandlers();

/**
 * Cria e configura a instância do Express com todos os middlewares de segurança,
 * compressão, CORS e monitoramento.
 */
export function createApp(): express.Express {
  const app = express();
  initFeatureFlags();

  app.use(sentryRequestHandler());
  app.use(sentryTracingHandler());

  // Correlation ID para rastreabilidade (primeiro middleware)
  app.use(correlationIdMiddleware);

  // Request logger (após correlation ID para ter o ID disponível)
  app.use(requestLoggerMiddleware);

  // Monitoring middleware para métricas de performance
  app.use(monitoringService.metricsMiddleware());
  if (process.env.ENABLE_APM === 'true') {
    app.use(apmService.metricsMiddleware);
    app.use(apmService.tracingMiddleware);
  }

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
      'https://7care-app.vercel.app,https://7care.netlify.app,http://localhost:3064,http://localhost:5173,http://localhost:3065,tauri://localhost,https://tauri.localhost';
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || defaultOrigins)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-user-role, x-csrf-token'
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

  // JWT auth opcional — tenta autenticar via Bearer token em todas as rotas /api/*
  // Define req.userId, req.user, req.userRole se token válido estiver presente
  // Não bloqueia se não houver token (usar requireJwtAuth para rotas protegidas)
  app.use('/api', optionalJwtAuth);
  app.use('/api', sentryUserContext);
  app.use('/api', featureFlagsMiddleware);

  // CSRF Protection — feature flag para rollout gradual
  // Ativar via ENABLE_CSRF=true em produção quando frontend enviar x-csrf-token
  if (process.env.ENABLE_CSRF === 'true') {
    app.use(csrfCookie);
    app.use('/api', csrfProtection);
  }

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
 * Retorna o middleware de 404 para rotas não encontradas.
 * Deve ser registrado APÓS todas as rotas e ANTES do error handler.
 */
export function createNotFoundHandler() {
  return notFoundHandler;
}

/**
 * Retorna o error handler centralizado da aplicação.
 * Usa ApplicationError, Zod, Sentry e logging estruturado.
 * Deve ser registrado APÓS todas as rotas e o notFoundHandler.
 */
export function createErrorHandler() {
  return errorHandler;
}
