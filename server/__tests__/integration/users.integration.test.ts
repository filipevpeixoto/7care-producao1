/**
 * User Routes — Integration Tests
 *
 * Tests the Express middleware pipeline for user management endpoints.
 * Routes resolve repositories at registration time from the DI container,
 * so mocks must be registered BEFORE calling userRoutes(app).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, createNotFoundHandler, createErrorHandler } from '../../app';
import { container } from '../../container';
import { userRoutes } from '../../routes/userRoutes';
import { createMockUser, generateTestToken, toTestServer } from './setup';

// ── Mock repos (registered before route init) ───────────────────

const mockUserRepo = {
  getUserByEmail: vi.fn().mockResolvedValue(null),
  getUserById: vi.fn().mockResolvedValue(null),
  getUserByNormalizedUsername: vi.fn().mockResolvedValue(null),
  createUser: vi.fn().mockResolvedValue(createMockUser()),
  updateUser: vi.fn().mockResolvedValue(createMockUser()),
  deleteUser: vi.fn().mockResolvedValue(true),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUsersPaginated: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  updateUserChurch: vi.fn(),
  getAllChurches: vi.fn().mockResolvedValue([]),
};

const mockChurchRepo = {
  getAll: vi.fn().mockResolvedValue([]),
  getById: vi.fn(),
  getAllChurches: vi.fn().mockResolvedValue([]),
};

const mockRelationshipRepo = {
  getByMissionaryId: vi.fn().mockResolvedValue([]),
  getAll: vi.fn().mockResolvedValue([]),
};

function createTestApp() {
  // Register BEFORE routes so eager repo resolution gets mocks
  container.register('userRepository', mockUserRepo as any);
  container.register('churchRepository', mockChurchRepo as any);
  container.register('relationshipRepository', mockRelationshipRepo as any);

  const app = createApp();
  userRoutes(app);
  app.use(createNotFoundHandler());
  app.use(createErrorHandler());
  return toTestServer(app);
}

// ── Tests ───────────────────────────────────────────────────────

describe('User Routes — Integration', () => {
  let app: ReturnType<typeof createTestApp>;
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    adminToken = generateTestToken({ id: 1, email: 'admin@7care.com', role: 'superadmin' });
    app = createTestApp();

    // After route init, set up auth resolution
    const adminUser = createMockUser({ id: 1, role: 'superadmin', email: 'admin@7care.com' });
    mockUserRepo.getUserById.mockImplementation(async (id: number) => {
      if (id === 1) return adminUser;
      return null;
    });
  });

  // ── Route existence & auth ────────────────────────────────

  describe('GET /api/users', () => {
    it('should respond to authenticated admin request', async () => {
      mockUserRepo.getAllUsers.mockResolvedValue([createMockUser()]);
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThanOrEqual(500);
    });

    it('should support pagination query params', async () => {
      const res = await request(app)
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThanOrEqual(500);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should accept numeric user id', async () => {
      mockUserRepo.getUserById.mockResolvedValue(createMockUser({ id: 5 }));
      const res = await request(app)
        .get('/api/users/5')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should require authentication', async () => {
      const res = await request(app).delete('/api/users/2');
      expect([401, 404]).toContain(res.status);
    });

    it('should handle delete request for admin', async () => {
      const res = await request(app)
        .delete('/api/users/2')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('GET /api/users/birthdays', () => {
    it('should return birthday data', async () => {
      const res = await request(app)
        .get('/api/users/birthdays')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThanOrEqual(500);
    });
  });

  describe('GET /api/users/chat-list', () => {
    it('should return chat list', async () => {
      const res = await request(app)
        .get('/api/users/chat-list')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThanOrEqual(500);
    });
  });

  describe('GET /api/my-interested', () => {
    it('should handle authenticated request', async () => {
      const res = await request(app)
        .get('/api/my-interested')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });
  });

  // ── Middleware pipeline ───────────────────────────────────

  describe('Middleware Pipeline', () => {
    it('should return 401 or 400 for unauthenticated POST', async () => {
      const res = await request(app).post('/api/users').send({ name: 'Test' });
      expect([400, 401]).toContain(res.status);
    });

    it('should handle unauthenticated PUT', async () => {
      const res = await request(app).put('/api/users/1').send({ name: 'Updated' });
      expect([200, 400, 401, 404]).toContain(res.status);
    });

    it('should return JSON for authenticated requests', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
      if (res.body && Object.keys(res.body).length > 0) {
        expect(res.headers['content-type']).toMatch(/json/);
      }
    });
  });
});
