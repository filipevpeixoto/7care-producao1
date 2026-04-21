/**
 * Church Routes — Integration Tests
 *
 * Tests the full request pipeline for church endpoints:
 * GET /api/churches, POST /api/churches, PATCH /api/churches/:id
 *
 * Uses supertest with a real Express app and mocked repositories.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, createNotFoundHandler, createErrorHandler } from '../../app';
import { container } from '../../container';
import { churchRoutes } from '../../routes/churchRoutes';
import { createMockUser, toTestServer } from './setup';
import { getAuthUserId } from '../../utils/authHelpers';

// Mock auth helpers so we control userId without depending on JWT middleware
vi.mock('../../utils/authHelpers', () => ({
  getAuthUserId: vi.fn().mockReturnValue(0),
  getAuthUser: vi.fn().mockReturnValue(null),
  getAuthUserRole: vi.fn().mockReturnValue(undefined),
  getAuthUserDistrictId: vi.fn().mockReturnValue(undefined),
}));

// Mock cache middleware to prevent stale cached responses between tests
vi.mock('../../middleware/cache', () => ({
  cacheMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  invalidateCacheMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ── Mock repositories ───────────────────────────────────────────

const mockUserRepo = {
  getUserById: vi.fn(),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUsersPaginated: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  updateUser: vi.fn(),
  updateUserChurch: vi.fn(),
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
};

const mockChurchRepo = {
  getAllChurches: vi.fn().mockResolvedValue([]),
  getChurchById: vi.fn().mockResolvedValue(null),
  getDefaultChurch: vi.fn().mockResolvedValue(null),
  getChurchesByDistrict: vi.fn().mockResolvedValue([]),
  createChurch: vi.fn(),
  updateChurch: vi.fn(),
  deleteChurch: vi.fn(),
  getOrCreateChurch: vi.fn(),
};

// ── Build test app ──────────────────────────────────────────────

function createTestApp() {
  container.register('userRepository', mockUserRepo as never);
  container.register('churchRepository', mockChurchRepo as never);
  const app = createApp();
  churchRoutes(app);
  app.use(createNotFoundHandler());
  app.use(createErrorHandler());
  return toTestServer(app);
}

// ── Tests ───────────────────────────────────────────────────────

describe('Church Routes — Integration', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no auth (userId=0)
    vi.mocked(getAuthUserId).mockReturnValue(0);
    app = createTestApp();
  });

  // ── GET /api/churches ───────────────────────────────────────

  describe('GET /api/churches', () => {
    it('should return list of churches for superadmin', async () => {
      const adminUser = createMockUser({ role: 'superadmin' });
      vi.mocked(getAuthUserId).mockReturnValue(1);
      mockUserRepo.getUserById.mockResolvedValue(adminUser);

      const churches = [
        { id: 1, name: 'Church A', address: 'Rua A' },
        { id: 2, name: 'Church B', address: 'Rua B' },
      ];
      mockChurchRepo.getAllChurches.mockResolvedValue(churches);

      const res = await request(app).get('/api/churches');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('name', 'Church A');
    });

    it('should return empty list when no churches exist', async () => {
      vi.mocked(getAuthUserId).mockReturnValue(1);
      const adminUser = createMockUser({ role: 'superadmin' });
      mockUserRepo.getUserById.mockResolvedValue(adminUser);
      mockChurchRepo.getAllChurches.mockResolvedValue([]);

      const res = await request(app).get('/api/churches');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should filter churches by district for pastor', async () => {
      vi.mocked(getAuthUserId).mockReturnValue(2);
      const pastorUser = createMockUser({ role: 'pastor', districtId: 2 });
      mockUserRepo.getUserById.mockResolvedValue(pastorUser);

      const districtChurches = [{ id: 3, name: 'District Church', address: 'Rua C' }];
      mockChurchRepo.getChurchesByDistrict.mockResolvedValue(districtChurches);

      const res = await request(app).get('/api/churches');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(mockChurchRepo.getChurchesByDistrict).toHaveBeenCalledWith(2);
    });

    it('should return only user church for regular member', async () => {
      vi.mocked(getAuthUserId).mockReturnValue(3);
      const memberUser = createMockUser({ role: 'member', church: 'My Church' });
      mockUserRepo.getUserById.mockResolvedValue(memberUser);

      const allChurches = [
        { id: 1, name: 'My Church', address: 'Rua A' },
        { id: 2, name: 'Other Church', address: 'Rua B' },
      ];
      mockChurchRepo.getAllChurches.mockResolvedValue(allChurches);

      const res = await request(app).get('/api/churches');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('My Church');
    });
  });

  // ── POST /api/churches ──────────────────────────────────────

  describe('POST /api/churches', () => {
    it('should create a new church with valid body', async () => {
      const newChurch = { id: 10, name: 'New Church' };
      mockChurchRepo.getOrCreateChurch.mockResolvedValue(newChurch);

      const res = await request(app).post('/api/churches').send({ name: 'New Church' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'New Church');
      expect(mockChurchRepo.getOrCreateChurch).toHaveBeenCalledWith('New Church');
    });

    it('should return 400 with empty body', async () => {
      const res = await request(app).post('/api/churches').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when name is too short', async () => {
      const res = await request(app).post('/api/churches').send({ name: 'A' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── PATCH /api/churches/:id ─────────────────────────────────

  describe('PATCH /api/churches/:id', () => {
    it('should update an existing church', async () => {
      const oldChurch = { id: 1, name: 'Old Name' };
      const updatedChurch = { id: 1, name: 'Updated Name' };

      mockChurchRepo.getAllChurches.mockResolvedValue([oldChurch]);
      mockChurchRepo.updateChurch.mockResolvedValue(updatedChurch);
      mockUserRepo.getAllUsers.mockResolvedValue([]);

      const res = await request(app).patch('/api/churches/1').send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'Updated Name');
    });

    it('should return 404 for non-existent church', async () => {
      mockChurchRepo.getAllChurches.mockResolvedValue([]);
      mockChurchRepo.updateChurch.mockResolvedValue(null);

      const res = await request(app).patch('/api/churches/999').send({ name: 'Updated Name' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should update users when church name changes', async () => {
      const oldChurch = { id: 1, name: 'Old Church' };
      const updatedChurch = { id: 1, name: 'New Church' };
      const usersInOldChurch = [
        createMockUser({ id: 10, church: 'Old Church' }),
        createMockUser({ id: 11, church: 'Old Church' }),
      ];

      mockChurchRepo.getAllChurches.mockResolvedValue([oldChurch]);
      mockChurchRepo.updateChurch.mockResolvedValue(updatedChurch);
      mockUserRepo.getAllUsers.mockResolvedValue(usersInOldChurch);
      mockUserRepo.updateUser.mockResolvedValue({});

      const res = await request(app).patch('/api/churches/1').send({ name: 'New Church' });

      expect(res.status).toBe(200);
      expect(mockUserRepo.updateUser).toHaveBeenCalledTimes(2);
      expect(mockUserRepo.updateUser).toHaveBeenCalledWith(10, { church: 'New Church' });
      expect(mockUserRepo.updateUser).toHaveBeenCalledWith(11, { church: 'New Church' });
    });
  });

  // ── GET /api/user/church ────────────────────────────────────

  describe('GET /api/user/church', () => {
    it('should return church for valid user', async () => {
      mockUserRepo.getUserById.mockResolvedValue(createMockUser({ church: 'Central Church' }));

      const res = await request(app).get('/api/user/church?userId=1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('church', 'Central Church');
    });

    it('should return 400 without userId', async () => {
      const res = await request(app).get('/api/user/church');

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      mockUserRepo.getUserById.mockResolvedValue(null);

      const res = await request(app).get('/api/user/church?userId=999');

      expect(res.status).toBe(404);
    });
  });

  // ── 404 handler ─────────────────────────────────────────────

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/churches/nonexistent/route');

      expect(res.status).toBe(404);
    });
  });
});
