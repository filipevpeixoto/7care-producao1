/**
 * Integration test setup.
 * Creates a real Express app with mocked repositories for integration testing.
 * Tests the full middleware pipeline: CORS → body parser → sanitization → rate limit → auth → route → error handler.
 */
import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

// ── Silence console noise ───────────────────────────────────────
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// ── Env defaults ────────────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-that-is-at-least-32-chars-long!!';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

// ── Mock logger ─────────────────────────────────────────────────
vi.mock('../../utils/logger', () => ({
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
vi.mock('../../services/sentryService', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// ── Mock monitoring ─────────────────────────────────────────────
vi.mock('../../services/monitoringService', () => ({
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
vi.mock('../../services/prometheusService', () => ({
  prometheusService: {
    createRouter: vi.fn(() => {
      const { Router } = require('express');
      return Router();
    }),
  },
  default: {
    createRouter: vi.fn(() => {
      const { Router } = require('express');
      return Router();
    }),
  },
}));

vi.mock('../../utils/prometheus', () => ({
  prometheusMetricsRouter: { use: vi.fn() },
  default: { use: vi.fn() },
}));

// ── Mock tokenBlacklistService ──────────────────────────────────
vi.mock('../../services/tokenBlacklistService', () => ({
  tokenBlacklist: {
    isBlacklisted: vi.fn().mockReturnValue(false),
    blacklist: vi.fn(),
    add: vi.fn().mockResolvedValue(undefined),
  },
  default: {
    isBlacklisted: vi.fn().mockReturnValue(false),
    blacklist: vi.fn(),
    add: vi.fn().mockResolvedValue(undefined),
  },
}));

// ── Mock neonConfig (Drizzle db) ────────────────────────────────
vi.mock('../../neonConfig', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
  sql: vi.fn(),
  neonSql: vi.fn(),
}));

// ── Mock NeonAdapter ────────────────────────────────────────────
vi.mock('../../neonAdapter', () => ({
  NeonAdapter: vi.fn().mockImplementation(() => ({
    getUserById: vi.fn().mockResolvedValue(null),
    getChurchById: vi.fn().mockResolvedValue(null),
  })),
  default: vi.fn().mockImplementation(() => ({
    getUserById: vi.fn().mockResolvedValue(null),
  })),
}));

// ── Shared mock factories ───────────────────────────────────────

/** Creates a mock user object */
export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@7care.com',
    password: '$2a$12$LJ3mPkHGtSxHjKTQxO14IuDhPd8a.5ry7dGjkFkBJ.WQGdqZqC1xG', // bcrypt of 'TestPass123!'
    role: 'admin',
    church: 'Test Church',
    churchCode: 'TC001',
    isApproved: true,
    status: 'active',
    firstAccess: false,
    districtId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    extraData: null,
    ...overrides,
  };
}

/** Generates a valid JWT token for testing */
export function generateTestToken(user: Record<string, unknown> = {}) {
  const payload = {
    id: user.id ?? 1,
    email: user.email ?? 'test@7care.com',
    role: user.role ?? 'admin',
    name: user.name ?? 'Test User',
  };
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '24h' });
}

/** Creates a mock repository with common methods */
export function createMockRepository(extraMethods: Record<string, unknown> = {}) {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(true),
    ...extraMethods,
  };
}
