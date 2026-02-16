/**
 * Global test setup for server tests.
 * Mocks heavy dependencies (DB, Sentry, logger) so tests stay fast & isolated.
 */
import { vi } from 'vitest';

// ── Silence console noise during tests ──────────────────────────
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// ── Mock logger ─────────────────────────────────────────────────
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    authSuccess: vi.fn(),
    authFailure: vi.fn(),
  },
}));

// ── Mock Sentry ─────────────────────────────────────────────────
vi.mock('../services/sentryService', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  initSentry: vi.fn(),
  sentryRequestHandler: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  sentryTracingHandler: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  sentryErrorHandler: vi.fn(
    () => (err: Error, _req: unknown, _res: unknown, next: (err?: Error) => void) => next(err)
  ),
  sentryUserContext: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

// ── Mock NeonAdapter (DB) ───────────────────────────────────────
vi.mock('../neonAdapter', () => ({
  NeonAdapter: vi.fn().mockImplementation(() => ({
    getUserById: vi.fn().mockResolvedValue(null),
    getChurchById: vi.fn().mockResolvedValue(null),
  })),
  default: vi.fn().mockImplementation(() => ({
    getUserById: vi.fn().mockResolvedValue(null),
  })),
}));

// ── Mock neonConfig (Drizzle db) ────────────────────────────────
vi.mock('../neonConfig', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  },
  sql: vi.fn(),
  neonSql: vi.fn(),
}));

// ── Mock monitoring ─────────────────────────────────────────────
vi.mock('../services/monitoringService', () => ({
  monitoringService: {
    metricsMiddleware: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
    recordMetric: vi.fn(),
  },
  default: {
    metricsMiddleware: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
    recordMetric: vi.fn(),
  },
}));

// ── Mock prometheus ─────────────────────────────────────────────
vi.mock('../utils/prometheus', () => ({
  prometheusMetricsRouter: { use: vi.fn() },
  default: { use: vi.fn() },
}));

// ── Mock tokenBlacklistService ──────────────────────────────────
vi.mock('../services/tokenBlacklistService', () => ({
  tokenBlacklist: {
    isBlacklisted: vi.fn().mockReturnValue(false),
    blacklist: vi.fn(),
  },
  default: {
    isBlacklisted: vi.fn().mockReturnValue(false),
    blacklist: vi.fn(),
  },
}));

// ── Env defaults ────────────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-that-is-at-least-32-chars-long!!';
