/**
 * Reports Routes — Integration Tests
 *
 * Tests the Express middleware pipeline for report endpoints.
 * Report routes resolve repositories eagerly at registration time,
 * so mocks must be registered BEFORE calling reportsRoutes(app).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, createNotFoundHandler, createErrorHandler } from '../../app';
import { container } from '../../container';
import { reportsRoutes } from '../../routes/reportsRoutes';
import { sql } from '../../neonConfig';
import { createMockUser, generateTestToken, toTestServer } from './setup';

// ── Mock repos ──────────────────────────────────────────────────

const mockUserRepo = {
  getUserById: vi.fn(),
  getUserByEmail: vi.fn().mockResolvedValue(null),
  getUserByNormalizedUsername: vi.fn().mockResolvedValue(null),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUsersByDistrictId: vi.fn().mockResolvedValue([]),
  getUsersPaginated: vi.fn().mockResolvedValue({ data: [], total: 0 }),
};

const mockChurchRepo = {
  getAll: vi.fn().mockResolvedValue([]),
  getById: vi.fn(),
  getAllChurches: vi.fn().mockResolvedValue([]),
  getChurchesByDistrict: vi.fn().mockResolvedValue([]),
};

const mockEventRepo = {
  getAll: vi.fn().mockResolvedValue([]),
  getById: vi.fn(),
  getAllEvents: vi.fn().mockResolvedValue([]),
};

function createTestApp() {
  container.register('userRepository', mockUserRepo as any);
  container.register('churchRepository', mockChurchRepo as any);
  container.register('eventRepository', mockEventRepo as any);

  const app = createApp();
  reportsRoutes(app);
  app.use(createNotFoundHandler());
  app.use(createErrorHandler());
  return toTestServer(app);
}

// ── Tests ───────────────────────────────────────────────────────

describe('Reports Routes — Integration', () => {
  let app: ReturnType<typeof createTestApp>;
  let adminToken: string;
  let pastorToken: string;

  beforeEach(() => {
    vi.clearAllMocks();

    // Re-set sql mock (cleared by mockReset) — report handlers use sql`...` for raw queries
    (sql as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    adminToken = generateTestToken({ id: 1, email: 'admin@7care.com', role: 'superadmin' });
    pastorToken = generateTestToken({ id: 2, email: 'pastor@7care.com', role: 'pastor' });
    app = createTestApp();

    // Re-set repo mocks (cleared by mockReset)
    mockUserRepo.getAllUsers.mockResolvedValue([]);
    mockUserRepo.getUsersByDistrictId.mockResolvedValue([]);
    mockChurchRepo.getAllChurches.mockResolvedValue([]);
    mockChurchRepo.getChurchesByDistrict.mockResolvedValue([]);
    mockEventRepo.getAllEvents.mockResolvedValue([]);

    // Set up auth user resolution
    const adminUser = createMockUser({ id: 1, role: 'superadmin', email: 'admin@7care.com' });
    const pastorUser = createMockUser({
      id: 2,
      role: 'pastor',
      email: 'pastor@7care.com',
      districtId: 1,
    });

    mockUserRepo.getUserById.mockImplementation(async (id: number) => {
      if (id === 1) return adminUser;
      if (id === 2) return pastorUser;
      return null;
    });
  });

  // ── All report endpoints should respond without 500 ───────

  const reportEndpoints = [
    '/api/reports/overview',
    '/api/reports/spiritual-funnel',
    '/api/reports/church-comparison',
    '/api/reports/engagement-analysis',
    '/api/reports/growth-trends',
    '/api/reports/missionary-performance',
    '/api/reports/goals',
    '/api/reports/insights',
  ];

  describe.each(reportEndpoints)('GET %s', (endpoint) => {
    it('should respond for authenticated admin', async () => {
      const res = await request(app).get(endpoint).set('Authorization', `Bearer ${adminToken}`);
      // Accept 200 (success) or 403 (role check) but NOT 500 (server error)
      expect(res.status).toBeLessThan(500);
    });

    it('should return JSON response', async () => {
      const res = await request(app).get(endpoint).set('Authorization', `Bearer ${adminToken}`);
      if (res.status === 200) {
        expect(res.headers['content-type']).toMatch(/json/);
      }
    });
  });

  // ── District comparison: SuperAdmin only ──────────────────

  describe('GET /api/reports/district-comparison', () => {
    it('should respond for superadmin', async () => {
      const res = await request(app)
        .get('/api/reports/district-comparison')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });

    it('should restrict member access', async () => {
      const memberToken = generateTestToken({ id: 3, role: 'member', email: 'member@7care.com' });
      mockUserRepo.getUserById.mockImplementation(async (id: number) => {
        if (id === 3) return createMockUser({ id: 3, role: 'member' });
        return null;
      });

      const res = await request(app)
        .get('/api/reports/district-comparison')
        .set('Authorization', `Bearer ${memberToken}`);

      // Should be 403 (forbidden) or similar non-200
      expect([403, 401]).toContain(res.status);
    });
  });

  // ── Unauthenticated access ────────────────────────────────

  describe('Unauthenticated access', () => {
    it('should handle unauthenticated request to /api/reports/overview', async () => {
      const res = await request(app).get('/api/reports/overview');
      // Reports do inline auth — should return 403 or handle gracefully
      expect(res.status).toBeLessThan(500);
    });
  });
});
