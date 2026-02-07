/**
 * Entry point — Production
 * Serve arquivos estáticos pré-compilados, sem Vite dev server
 */

import 'dotenv/config';
import { createApp, createErrorHandler } from './app';
import { registerRoutes } from './routes/index';
import { serveStatic, log } from './static';

const app = createApp();

(async () => {
  const server = await registerRoutes(app);

  // Error handler (DEVE ser registrado após todas as rotas)
  app.use(createErrorHandler());

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
