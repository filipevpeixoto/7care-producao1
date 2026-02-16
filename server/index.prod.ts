/**
 * Entry point — Production
 * Serve arquivos estáticos pré-compilados, sem Vite dev server
 */

import 'dotenv/config';
import { createApp, createErrorHandler, createNotFoundHandler } from './app';
import { registerRoutes } from './routes/index';
import { serveStatic, log } from './static';
import { initSentry, sentryErrorHandler } from './services/sentryService';

const app = createApp();
initSentry(app);

(async () => {
  const server = await registerRoutes(app);

  // Serve static files in production
  serveStatic(app);

  // 404 handler para rotas não encontradas (após static)
  app.use(createNotFoundHandler());

  // Error handler (DEVE ser registrado após todas as rotas e o 404 handler)
  app.use(sentryErrorHandler());
  app.use(createErrorHandler());

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
