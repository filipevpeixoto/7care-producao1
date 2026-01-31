import 'dotenv/config';
import express, { type Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { registerRoutes } from './routes/index';
import { serveStatic, log } from './static';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger/config';
import { apiLimiter } from './middleware/rateLimiter';
import { correlationIdMiddleware } from './middleware/correlationId';
import { securityHeadersMiddleware } from './middleware/securityHeaders';
import { healthCheckRouter } from './middleware/healthCheck';
import { monitoringService } from './services/monitoringService';
import { prometheusService } from './services/prometheusService';

const app = express();

// Correlation ID para rastreabilidade (primeiro middleware para capturar todas as requisições)
app.use(correlationIdMiddleware);

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

// Compressão gzip/brotli para respostas - melhora performance
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Bom balanço entre compressão e CPU
  })
);

app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const origin = req.headers.origin;
  const allowAll = allowedOrigins.includes('*');

  if (origin && (allowAll || allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  } else if (allowAll) {
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Id'
  );

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('Referrer-Policy', 'no-referrer');
  res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (process.env.NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Limites de body parser - Reduzido para segurança (evita ataques DoS)
// Para uploads grandes, usar endpoint específico com multer
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Rate limiting global para API (100 req/min)
app.use('/api', apiLimiter);

// Health Check endpoints avançados
app.use('/', healthCheckRouter);

// Prometheus metrics endpoint
app.use('/', prometheusService.createRouter());

// Swagger UI - Documentação da API (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: '7Care API Documentation',
    })
  );
  // Endpoint para obter spec em JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && process.env.NODE_ENV !== 'production') {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = `${logLine.slice(0, 79)}…`;
      }

      log(logLine);
    }
  });

  next();
});

// Health Check Endpoint para monitoramento
app.get('/api/health', async (_req: Request, res: Response) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    },
  };

  res.status(200).json(healthCheck);
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      (err as { status?: number; statusCode?: number }).status ||
      (err as { status?: number; statusCode?: number }).statusCode ||
      500;
    const message = (err as { message?: string }).message || 'Internal Server Error';

    res.status(status).json({ message });
    throw err;
  });

  if (app.get('env') === 'development') {
    // Dynamic import para evitar carregar vite em produção
    const { setupVite } = await import('./vite');
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = process.env.PORT || 3065;
  server.listen(
    {
      port,
      host: '0.0.0.0',
    },
    () => {
      console.log(`🚀 Church Plus Manager rodando em http://localhost:${port}`);
      console.log(`📊 Dashboard: http://localhost:${port}/dashboard`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📚 API Docs: http://localhost:${port}/api-docs`);
        // Credenciais apenas em desenvolvimento e via variáveis de ambiente
        if (process.env.ADMIN_EMAIL) {
          console.log(`🔐 Login Admin: ${process.env.ADMIN_EMAIL}`);
        }
      }
      console.log(`✅ Servidor iniciado com sucesso!`);
    }
  );
})();

// Inicialização otimizada
