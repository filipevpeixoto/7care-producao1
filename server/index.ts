/**
 * Entry point — Development
 * Usa Vite dev server para HMR e serve o frontend em desenvolvimento
 */

import 'dotenv/config';
import { createApp, createErrorHandler } from './app';
import { registerRoutes } from './routes/index';
import { log } from './static';
import { logger } from './utils/logger';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger/config';
import { processDracmaSubmissions } from './jobs/dracmaSubmissionJob';

const app = createApp();

// Swagger UI — apenas em desenvolvimento
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
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// Request logging (dev only: inclui body)
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

(async () => {
  const server = await registerRoutes(app);

  // Error handler (DEVE ser registrado após todas as rotas)
  app.use(createErrorHandler());

  // Vite dev server em desenvolvimento
  if (app.get('env') === 'development') {
    const { setupVite } = await import('./vite');
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import('./static');
    serveStatic(app);
  }

  const port = process.env.PORT || 3065;
  server.listen(
    {
      port,
      host: '0.0.0.0',
    },
    () => {
      logger.info(`🚀 Church Plus Manager rodando em http://localhost:${port}`);
      logger.info(`📊 Dashboard: http://localhost:${port}/dashboard`);
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`📚 API Docs: http://localhost:${port}/api-docs`);
        if (process.env.ADMIN_EMAIL) {
          logger.info(`🔐 Login Admin: ${process.env.ADMIN_EMAIL}`);
        }
      }
      logger.info(`✅ Servidor iniciado com sucesso!`);

      // Background job — Dracma submission (a cada 5 minutos)
      logger.info('🔄 Iniciando job de submissão ao Dracma...');
      setInterval(
        async () => {
          try {
            await processDracmaSubmissions();
          } catch (error) {
            logger.error('❌ Erro no job de submissão ao Dracma:', error);
          }
        },
        5 * 60 * 1000
      );
      logger.info('✅ Job de submissão ao Dracma agendado (a cada 5 minutos)');
    }
  );
})();
