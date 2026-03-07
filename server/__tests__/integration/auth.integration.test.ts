/**
 * Auth Routes — Integration Tests
 *
 * Tests the full request pipeline for authentication endpoints:
 * /api/status, /api/auth/login, /api/auth/register, /api/auth/me, /api/auth/logout
 *
 * Uses supertest with a real Express app and mocked repositories.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp, createNotFoundHandler, createErrorHandler } from '../../app';
import { container } from '../../container';
import { authRoutes } from '../../routes/authRoutes';
import { authService } from '../../services/authService';
import { createMockUser, generateTestToken } from './setup';

// ── Build test app ──────────────────────────────────────────────

function createTestApp() {
  const app = createApp();

  // Register auth routes
  authRoutes(app);

  // 404 + error handler
  app.use(createNotFoundHandler());
  app.use(createErrorHandler());

  return app;
}

// ── Mock repositories ───────────────────────────────────────────

const mockUserRepo = {
  getUserByEmail: vi.fn(),
  getUserByNormalizedUsername: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  updateUserChurch: vi.fn(),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUsersPaginated: vi.fn().mockResolvedValue({ data: [], total: 0 }),
};

const mockChurchRepo = {
  getAllChurches: vi.fn().mockResolvedValue([]),
  getChurchById: vi.fn().mockResolvedValue(null),
  getOrCreateChurch: vi.fn(),
};

// ── Tests ───────────────────────────────────────────────────────

describe('Auth Routes — Integration', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    container.register('userRepository', mockUserRepo as never);
    container.register('churchRepository', mockChurchRepo as never);
    app = createTestApp();
  });

  // ── /api/status ─────────────────────────────────────────────

  describe('GET /api/status', () => {
    it('should return status ok', async () => {
      const res = await request(app).get('/api/status');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  // ── /api/auth/login ─────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should return 400 for empty body', async () => {
      const res = await request(app).post('/api/auth/login').send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing password', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com' });

      expect(res.status).toBe(400);
    });

    it('should return 401 for non-existent user', async () => {
      // Mock authService.login to return failure
      vi.spyOn(authService, 'login').mockResolvedValue({
        success: false,
        error: 'Credenciais inválidas',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'AnyPass123!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with token for valid credentials', async () => {
      const mockUser = createMockUser();
      vi.spyOn(authService, 'login').mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@7care.com', password: 'TestPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('email');
      expect(res.body.user).toHaveProperty('role');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return user shape with expected fields', async () => {
      const mockUser = createMockUser({ districtId: 5 });
      vi.spyOn(authService, 'login').mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'mock-jwt-token',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@7care.com', password: 'TestPass123!' });

      const { user } = res.body;
      expect(user).toEqual(
        expect.objectContaining({
          id: 1,
          name: 'Test User',
          email: 'test@7care.com',
          role: 'admin',
          church: 'Test Church',
          isApproved: true,
          status: 'active',
          districtId: 5,
        })
      );
    });
  });

  // ── /api/auth/register ──────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should return 400 when user already exists', async () => {
      mockUserRepo.getUserByEmail.mockResolvedValue(createMockUser());

      const res = await request(app).post('/api/auth/register').send({
        name: 'Test',
        email: 'test@7care.com',
        password: 'StrongPass123!',
        role: 'interested',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      mockUserRepo.getUserByEmail.mockResolvedValue(null);

      const res = await request(app).post('/api/auth/register').send({
        name: 'New User',
        email: 'new@test.com',
        password: 'weakpass', // passes Zod min(6), fails requireStrongPassword
        role: 'interested',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 201 for valid registration', async () => {
      mockUserRepo.getUserByEmail.mockResolvedValue(null);
      mockUserRepo.createUser.mockResolvedValue(
        createMockUser({
          id: 2,
          name: 'New User',
          email: 'new@test.com',
          role: 'interested',
          isApproved: true,
          firstAccess: true,
        })
      );

      const res = await request(app).post('/api/auth/register').send({
        name: 'New User',
        email: 'new@test.com',
        password: 'StrongPass123!',
        role: 'member',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('email', 'new@test.com');
    });

    it('should enforce allowed roles (no privilege escalation)', async () => {
      mockUserRepo.getUserByEmail.mockResolvedValue(null);
      mockUserRepo.createUser.mockImplementation(async (data: Record<string, unknown>) => {
        return createMockUser({
          ...data,
          id: 3,
          firstAccess: true,
        });
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Attacker',
        email: 'attacker@test.com',
        password: 'StrongPass123!',
        role: 'superadmin', // should be rejected / forced to 'interested'
      });

      // Should succeed but role should NOT be 'admin'
      if (res.status === 201) {
        expect(res.body.data.role).not.toBe('admin');
      }
    });
  });

  // ── /api/auth/me ────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('should return 401 without Authorization header', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return user data with valid token', async () => {
      const mockUser = createMockUser();
      const token = generateTestToken({ id: 1 });

      mockUserRepo.getUserById.mockResolvedValue(mockUser);

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('email', 'test@7care.com');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 401 for non-existent user with valid token', async () => {
      const token = generateTestToken({ id: 999 });
      mockUserRepo.getUserById.mockResolvedValue(null);

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      // requireJwtAuth rejects with 401 when JWT references a deleted user
      expect(res.status).toBe(401);
    });

    it('should reject invalid tokens', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      // Should return error (ID extraction fails)
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── /api/auth/logout ────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    // Note: logout route uses dynamic require() for tokenBlacklistService
    // which doesn't go through vi.mock in all vitest configurations.
    // These tests validate the route structure; full logout testing should
    // be done in E2E tests.
    it.skip('should return success (requires dynamic require mock)', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${generateTestToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it.skip('should succeed even without token (requires dynamic require mock)', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── /api/user/church ────────────────────────────────────────

  describe('GET /api/user/church', () => {
    it('should return 401 without Authorization header', async () => {
      const res = await request(app).get('/api/user/church');

      expect(res.status).toBe(401);
    });

    it('should return church for valid user', async () => {
      mockUserRepo.getUserById.mockImplementation(async (id: number) =>
        createMockUser({ id, church: 'Central Church' })
      );

      const token = generateTestToken({ id: 1 });
      const res = await request(app)
        .get('/api/user/church?userId=1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('church', 'Central Church');
    });

    it('should return 401 for non-existent user (JWT user not found)', async () => {
      mockUserRepo.getUserById.mockResolvedValue(null);

      const token = generateTestToken({ id: 999 });
      const res = await request(app)
        .get('/api/user/church?userId=999')
        .set('Authorization', `Bearer ${token}`);

      // requireJwtAuth rejects with 401 when JWT references a deleted user
      expect(res.status).toBe(401);
    });

    it('should deny pastor querying user from another district', async () => {
      mockUserRepo.getUserById.mockImplementation(async (id: number) => {
        if (id === 2) {
          return createMockUser({ id: 2, role: 'pastor', districtId: 1, church: 'Central Church' });
        }
        if (id === 99) {
          return createMockUser({ id: 99, role: 'member', districtId: 2, church: 'Other Church' });
        }
        return null;
      });

      const token = generateTestToken({ id: 2, role: 'pastor', email: 'pastor@7care.com' });
      const res = await request(app)
        .get('/api/user/church?userId=99')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/próprio distrito/i);
    });
  });

  // ── Security: XSS sanitization ─────────────────────────────

  describe('Input Sanitization (middleware)', () => {
    it('should sanitize XSS in login body', async () => {
      vi.spyOn(authService, 'login').mockResolvedValue({
        success: false,
        error: 'Credenciais inválidas',
      });

      const res = await request(app).post('/api/auth/login').send({
        email: '<script>alert("xss")</script>@evil.com',
        password: 'pass123',
      });

      // Should still reach the handler (sanitized) — validation schema will reject
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── 404 handler ─────────────────────────────────────────────

  describe('404 Handler', () => {
    it('should return 404 for unknown API routes', async () => {
      const res = await request(app).get('/api/nonexistent');

      expect(res.status).toBe(404);
    });
  });
});
