/**
 * Prayer Routes — Integration Tests
 *
 * Tests the full request pipeline for prayer endpoints:
 * GET /api/prayers, POST /api/prayers, POST /api/prayers/:id/answer,
 * DELETE /api/prayers/:id, POST /api/prayers/:id/intercessor,
 * GET /api/prayers/:id/intercessors
 *
 * Uses supertest with a real Express app and mocked repositories.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, createNotFoundHandler, createErrorHandler } from '../../app';
import { container } from '../../container';
import { prayerRoutes } from '../../routes/prayerRoutes';
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

const mockPrayerRepo = {
  getAll: vi.fn().mockResolvedValue([]),
  getById: vi.fn().mockResolvedValue(null),
  create: vi.fn(),
  delete: vi.fn(),
  getByDistrict: vi.fn().mockResolvedValue([]),
  update: vi.fn(),
  markAsAnswered: vi.fn(),
  addIntercessor: vi.fn(),
  removeIntercessor: vi.fn(),
  getIntercessors: vi.fn().mockResolvedValue([]),
  getPrayersUserIsPrayingFor: vi.fn().mockResolvedValue([]),
};

const mockUserRepo = {
  getUserById: vi.fn().mockResolvedValue(null),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUsersPaginated: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getUsersByDistrictId: vi.fn().mockResolvedValue([]),
};

// ── Build test app ──────────────────────────────────────────────

function createTestApp() {
  container.register('prayerRepository', mockPrayerRepo as never);
  container.register('userRepository', mockUserRepo as never);
  const app = createApp();
  prayerRoutes(app);
  app.use(createNotFoundHandler());
  app.use(createErrorHandler());
  return toTestServer(app);
}

// ── Tests ───────────────────────────────────────────────────────

describe('Prayer Routes — Integration', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUserId).mockReturnValue(0);
    mockUserRepo.getUserById.mockResolvedValue(null);
    app = createTestApp();
  });

  // ── GET /api/prayers ────────────────────────────────────────

  describe('GET /api/prayers', () => {
    it('should return all prayers', async () => {
      const prayers = [
        { id: 1, userId: 1, title: 'Prayer 1', isPublic: true, isAnswered: false },
        { id: 2, userId: 2, title: 'Prayer 2', isPublic: false, isAnswered: true },
      ];
      mockPrayerRepo.getAll.mockResolvedValue(prayers);

      const res = await request(app).get('/api/prayers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should return empty array when no prayers exist', async () => {
      mockPrayerRepo.getAll.mockResolvedValue([]);

      const res = await request(app).get('/api/prayers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should filter prayers by isPublic', async () => {
      const prayers = [
        { id: 1, userId: 1, title: 'Public Prayer', isPublic: true, isAnswered: false },
        { id: 2, userId: 2, title: 'Private Prayer', isPublic: false, isAnswered: false },
      ];
      mockPrayerRepo.getAll.mockResolvedValue(prayers);

      const res = await request(app).get('/api/prayers?isPublic=true');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('title', 'Public Prayer');
    });

    it('should filter prayers by isAnswered', async () => {
      const prayers = [
        { id: 1, userId: 1, title: 'Unanswered', isPublic: true, isAnswered: false },
        { id: 2, userId: 2, title: 'Answered', isPublic: true, isAnswered: true },
      ];
      mockPrayerRepo.getAll.mockResolvedValue(prayers);

      const res = await request(app).get('/api/prayers?isAnswered=true');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('title', 'Answered');
    });

    it('should use district filter for pastor', async () => {
      vi.mocked(getAuthUserId).mockReturnValue(1);
      const pastor = createMockUser({ role: 'pastor', districtId: 3 });
      mockUserRepo.getUserById.mockResolvedValue(pastor);

      const districtPrayers = [
        { id: 1, userId: 10, title: 'District Prayer', isPublic: true, isAnswered: false },
      ];
      mockPrayerRepo.getByDistrict.mockResolvedValue(districtPrayers);

      const res = await request(app).get('/api/prayers');

      expect(res.status).toBe(200);
      expect(mockPrayerRepo.getByDistrict).toHaveBeenCalledWith(3);
      expect(res.body.data).toHaveLength(1);
    });

    it('should enrich prayers with requester name', async () => {
      const prayers = [{ id: 1, userId: 5, title: 'My Prayer', isPublic: true, isAnswered: false }];
      mockPrayerRepo.getAll.mockResolvedValue(prayers);

      const requesterUser = createMockUser({
        id: 5,
        name: 'Maria',
        church: 'Church A',
        profilePhoto: 'photo.jpg',
      });
      mockUserRepo.getUserById.mockResolvedValue(requesterUser);

      const res = await request(app).get('/api/prayers');

      expect(res.status).toBe(200);
      expect(res.body.data[0]).toHaveProperty('requesterName', 'Maria');
      expect(res.body.data[0]).toHaveProperty('requesterChurch', 'Church A');
    });
  });

  // ── POST /api/prayers ───────────────────────────────────────

  describe('POST /api/prayers', () => {
    it('should create prayer request with valid body', async () => {
      const createdPrayer = {
        id: 10,
        userId: 1,
        title: 'Please pray for me',
        isPublic: true,
        isAnswered: false,
      };
      mockPrayerRepo.create.mockResolvedValue(createdPrayer);

      const res = await request(app).post('/api/prayers').send({
        userId: 1,
        title: 'Please pray for me',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('title', 'Please pray for me');
      expect(mockPrayerRepo.create).toHaveBeenCalled();
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app).post('/api/prayers').send({ title: 'Prayer' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app).post('/api/prayers').send({ userId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for empty body', async () => {
      const res = await request(app).post('/api/prayers').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should create prayer with optional description', async () => {
      const createdPrayer = {
        id: 11,
        userId: 1,
        title: 'Prayer with desc',
        description: 'Detailed prayer request',
        isPublic: true,
        isAnswered: false,
      };
      mockPrayerRepo.create.mockResolvedValue(createdPrayer);

      const res = await request(app).post('/api/prayers').send({
        userId: 1,
        title: 'Prayer with desc',
        description: 'Detailed prayer request',
        isPublic: true,
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('description', 'Detailed prayer request');
    });

    it('should resolve districtId from creator user', async () => {
      const creator = createMockUser({ id: 1, districtId: 5 });
      mockUserRepo.getUserById.mockResolvedValue(creator);

      const createdPrayer = { id: 12, userId: 1, title: 'Test', districtId: 5 };
      mockPrayerRepo.create.mockResolvedValue(createdPrayer);

      const res = await request(app).post('/api/prayers').send({ userId: 1, title: 'Test' });

      expect(res.status).toBe(201);
      expect(mockPrayerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ districtId: 5 })
      );
    });
  });

  // ── POST /api/prayers/:id/answer ────────────────────────────

  describe('POST /api/prayers/:id/answer', () => {
    it('should mark prayer as answered', async () => {
      const answeredPrayer = {
        id: 1,
        userId: 1,
        title: 'Answered Prayer',
        isAnswered: true,
      };
      mockPrayerRepo.markAsAnswered.mockResolvedValue(answeredPrayer);

      const res = await request(app)
        .post('/api/prayers/1/answer')
        .send({ testimony: 'God answered my prayer!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('isAnswered', true);
      expect(mockPrayerRepo.markAsAnswered).toHaveBeenCalledWith(1, 'God answered my prayer!');
    });

    it('should return 404 for non-existent prayer', async () => {
      mockPrayerRepo.markAsAnswered.mockResolvedValue(null);

      const res = await request(app).post('/api/prayers/999/answer').send({});

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should mark as answered without testimony', async () => {
      const answeredPrayer = { id: 1, isAnswered: true };
      mockPrayerRepo.markAsAnswered.mockResolvedValue(answeredPrayer);

      const res = await request(app).post('/api/prayers/1/answer').send({});

      expect(res.status).toBe(200);
      expect(mockPrayerRepo.markAsAnswered).toHaveBeenCalledWith(1, undefined);
    });
  });

  // ── DELETE /api/prayers/:id ─────────────────────────────────

  describe('DELETE /api/prayers/:id', () => {
    it('should delete prayer when user is the owner', async () => {
      const prayer = { id: 1, userId: 1, title: 'My Prayer' };
      mockPrayerRepo.getById.mockResolvedValue(prayer);
      mockPrayerRepo.delete.mockResolvedValue(true);

      vi.mocked(getAuthUserId).mockReturnValue(1);
      const ownerUser = createMockUser({ id: 1 });
      mockUserRepo.getUserById.mockResolvedValue(ownerUser);

      const res = await request(app).delete('/api/prayers/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrayerRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should delete prayer when user is superadmin', async () => {
      const prayer = { id: 1, userId: 99, title: 'Someone Prayer' };
      mockPrayerRepo.getById.mockResolvedValue(prayer);
      mockPrayerRepo.delete.mockResolvedValue(true);

      vi.mocked(getAuthUserId).mockReturnValue(1);
      const adminUser = createMockUser({ id: 1, role: 'superadmin' });
      mockUserRepo.getUserById.mockResolvedValue(adminUser);

      const res = await request(app).delete('/api/prayers/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent prayer', async () => {
      mockPrayerRepo.getById.mockResolvedValue(null);

      vi.mocked(getAuthUserId).mockReturnValue(1);
      const res = await request(app).delete('/api/prayers/999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when user is not owner and not admin', async () => {
      const prayer = { id: 1, userId: 99, title: 'Not Mine' };
      mockPrayerRepo.getById.mockResolvedValue(prayer);

      vi.mocked(getAuthUserId).mockReturnValue(1);
      const regularUser = createMockUser({ id: 1, role: 'member' });
      mockUserRepo.getUserById.mockResolvedValue(regularUser);

      const res = await request(app).delete('/api/prayers/1');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /api/prayers/:id/intercessor ───────────────────────

  describe('POST /api/prayers/:id/intercessor', () => {
    it('should add intercessor to prayer', async () => {
      const result = { prayerId: 1, intercessorId: 5 };
      mockPrayerRepo.addIntercessor.mockResolvedValue(result);

      const res = await request(app).post('/api/prayers/1/intercessor').send({ intercessorId: 5 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockPrayerRepo.addIntercessor).toHaveBeenCalledWith(1, 5);
    });

    it('should return 400 when intercessorId is missing', async () => {
      const res = await request(app).post('/api/prayers/1/intercessor').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── DELETE /api/prayers/:id/intercessor/:intercessorId ──────

  describe('DELETE /api/prayers/:id/intercessor/:intercessorId', () => {
    it('should remove intercessor from prayer', async () => {
      mockPrayerRepo.removeIntercessor.mockResolvedValue(true);

      const res = await request(app).delete('/api/prayers/1/intercessor/5');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrayerRepo.removeIntercessor).toHaveBeenCalledWith(1, 5);
    });
  });

  // ── GET /api/prayers/:id/intercessors ───────────────────────

  describe('GET /api/prayers/:id/intercessors', () => {
    it('should return list of intercessors', async () => {
      const intercessors = [
        { id: 5, name: 'Intercessor A' },
        { id: 6, name: 'Intercessor B' },
      ];
      mockPrayerRepo.getIntercessors.mockResolvedValue(intercessors);

      const res = await request(app).get('/api/prayers/1/intercessors');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should return empty array when no intercessors', async () => {
      mockPrayerRepo.getIntercessors.mockResolvedValue([]);

      const res = await request(app).get('/api/prayers/1/intercessors');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  // ── GET /api/prayers/user/:userId/interceding ───────────────

  describe('GET /api/prayers/user/:userId/interceding', () => {
    it('should return prayers the user is praying for', async () => {
      const prayers = [{ id: 1, title: 'Prayer I intercede' }];
      mockPrayerRepo.getPrayersUserIsPrayingFor.mockResolvedValue(prayers);

      const res = await request(app).get('/api/prayers/user/5/interceding');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(mockPrayerRepo.getPrayersUserIsPrayingFor).toHaveBeenCalledWith(5);
    });
  });

  // ── 404 handler ─────────────────────────────────────────────

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');

      expect(res.status).toBe(404);
    });
  });
});
