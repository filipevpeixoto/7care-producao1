import 'dotenv/config';
import express, { type Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { registerRoutes } from './routes/index';
import { serveStatic, log } from './static';
import { apiLimiter } from './middleware/rateLimiter';
import { correlationIdMiddleware } from './middleware/correlationId';
import { securityHeadersMiddleware } from './middleware/securityHeaders';
import { healthCheckRouter } from './middleware/healthCheck';
import { monitoringService } from './services/monitoringService';
import { prometheusService } from './services/prometheusService';

const app = express();

// Correlation ID para rastreabilidade
app.use(correlationIdMiddleware);

// Monitoring middleware para métricas de performance
app.use(monitoringService.metricsMiddleware());

// Security Headers avançados
app.use(securityHeadersMiddleware);

// Helmet para headers de segurança HTTP
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Compressão gzip/brotli
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

app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());

  const origin = req.headers.origin;
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Health check
app.use(healthCheckRouter);

// Rate limiting para API
app.use('/api/', apiLimiter);

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.end(prometheusService.generateMetrics());
  } catch (error) {
    res.status(500).end();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

(async () => {
  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    log(`Error: ${message}`, 'error');
    res.status(status).json({ message });
  });

  // Serve static files in production
  serveStatic(app);

  const port = process.env.PORT || 8080;
  server.listen(
    {
      port,
      host: '0.0.0.0',
    },
    () => {
      log(`🚀 Server running on port ${port}`, 'server');
    }
  );
})();
