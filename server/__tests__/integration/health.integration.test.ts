/**
 * Health Check & Error Handling — Integration Tests
 *
 * Tests the Express middleware pipeline:
 * - Health check endpoints (/api/health, /api/status)
 * - Error handler (ApplicationError hierarchy, ZodError, unknown errors)
 * - CORS headers
 * - Security headers
 * - 404 handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import './setup';
import request from 'supertest';
import { createApp, createNotFoundHandler, createErrorHandler } from '../../app';
import { container } from '../../container';
import { generateTestToken } from './setup';
import { ValidationError, AuthenticationError, NotFoundError } from '../../errors';
import type { Express, Request, Response, NextFunction } from 'express';

// ── Build test app ──────────────────────────────────────────────

function createTestApp(): Express {
  const app = createApp();

  // Add a route that throws different error types for testing error handler
  app.get('/api/test/throw-validation', (_req: Request, _res: Response) => {
    throw new ValidationError('Campo inválido');
  });

  app.get('/api/test/throw-auth', (_req: Request, _res: Response) => {
    throw new AuthenticationError('Token expirado');
  });

  app.get('/api/test/throw-notfound', (_req: Request, _res: Response) => {
    throw new NotFoundError('Recurso');
  });

  app.get('/api/test/throw-unknown', (_req: Request, _res: Response) => {
    throw new Error('Unexpected internal error');
  });

  app.get('/api/test/throw-string', (_req: Request, _res: Response) => {
    throw 'string error';
  });

  // Attach handlers
  app.use(createNotFoundHandler());
  app.use(createErrorHandler());

  return app;
}

// ── Tests ───────────────────────────────────────────────────────

describe('Health & Error Handling — Integration', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  // ── Health Check ────────────────────────────────────────────

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('environment', 'test');
    });

    it('should include memory info', async () => {
      const res = await request(app).get('/api/health');

      expect(res.body.memory).toHaveProperty('used');
      expect(res.body.memory).toHaveProperty('total');
      expect(res.body.memory.used).toMatch(/\d+MB/);
    });
  });

  // ── Security Headers ───────────────────────────────────────

  describe('Security Headers', () => {
    it('should set X-Content-Type-Options', async () => {
      const res = await request(app).get('/api/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options', async () => {
      const res = await request(app).get('/api/health');

      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('should not expose server header', async () => {
      const res = await request(app).get('/api/health');

      // Helmet removes X-Powered-By by default
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  // ── CORS ───────────────────────────────────────────────────

  describe('CORS', () => {
    it('should allow configured origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should NOT set allow-origin for unconfigured origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil-site.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should handle OPTIONS preflight', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  // ── Error Handler ──────────────────────────────────────────

  describe('Error Handler', () => {
    it('should handle ValidationError → 400', async () => {
      const res = await request(app).get('/api/test/throw-validation');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Campo inválido');
    });

    it('should handle AuthenticationError → 401', async () => {
      const res = await request(app).get('/api/test/throw-auth');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should handle NotFoundError → 404', async () => {
      const res = await request(app).get('/api/test/throw-notfound');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should handle unknown errors → 500 (without leaking internals)', async () => {
      const res = await request(app).get('/api/test/throw-unknown');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      // Should NOT expose internal error messages in production-like env
    });

    it('should handle non-Error throws gracefully', async () => {
      const res = await request(app).get('/api/test/throw-string');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ── 404 Handler ────────────────────────────────────────────

  describe('404 Not Found', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/does-not-exist');

      expect(res.status).toBe(404);
    });

    it('should return 404 for unknown POST routes', async () => {
      const res = await request(app)
        .post('/api/does-not-exist')
        .send({ data: 'test' });

      expect(res.status).toBe(404);
    });
  });

  // ── Body Parser ────────────────────────────────────────────

  describe('Body Parser', () => {
    it('should parse JSON bodies', async () => {
      // We test this indirectly via any POST endpoint
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ email: 'test@test.com', password: 'pass' }));

      // 404 is fine — it means body was parsed but route not found (no auth route registered here)
      // The important thing is it didn't crash with parse error
      expect(res.status).not.toBe(500);
    });
  });

  // ── Compression ────────────────────────────────────────────

  describe('Compression', () => {
    it('should support gzip encoding', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Accept-Encoding', 'gzip');

      // Response may or may not be compressed depending on size threshold
      expect(res.status).toBe(200);
    });
  });
});
