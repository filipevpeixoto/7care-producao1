/**
 * Meeting Routes — Integration Tests
 *
 * Tests the full request pipeline for meeting endpoints:
 * GET /api/meetings, POST /api/meetings, PUT /api/meetings/:id,
 * GET /api/meeting-types
 *
 * Uses supertest with a real Express app and mocked repositories.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, createNotFoundHandler, createErrorHandler } from '../../app';
import { container } from '../../container';
import { meetingRoutes } from '../../routes/meetingRoutes';
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

const mockMeetingRepo = {
  getAll: vi.fn().mockResolvedValue([]),
  getById: vi.fn().mockResolvedValue(null),
  create: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
  getMeetingTypes: vi.fn().mockResolvedValue([]),
};

const mockUserRepo = {
  getUserById: vi.fn().mockResolvedValue(null),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUsersPaginated: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getUsersByDistrictId: vi.fn().mockResolvedValue([]),
};

// ── Build test app ──────────────────────────────────────────────

function createTestApp() {
  container.register('meetingRepository', mockMeetingRepo as never);
  container.register('userRepository', mockUserRepo as never);
  const app = createApp();
  meetingRoutes(app);
  app.use(createNotFoundHandler());
  app.use(createErrorHandler());
  return toTestServer(app);
}

// ── Tests ───────────────────────────────────────────────────────

describe('Meeting Routes — Integration', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUserId).mockReturnValue(0);
    mockUserRepo.getUserById.mockResolvedValue(null);
    app = createTestApp();
  });

  // ── GET /api/meetings ───────────────────────────────────────

  describe('GET /api/meetings', () => {
    it('should return list of meetings', async () => {
      const meetings = [
        {
          id: 1,
          title: 'Meeting A',
          requesterId: 1,
          status: 'pending',
          scheduledAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 2,
          title: 'Meeting B',
          requesterId: 2,
          status: 'approved',
          scheduledAt: '2024-01-16T14:00:00Z',
        },
      ];
      mockMeetingRepo.getAll.mockResolvedValue(meetings);

      const res = await request(app).get('/api/meetings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('title', 'Meeting A');
    });

    it('should return empty array when no meetings exist', async () => {
      mockMeetingRepo.getAll.mockResolvedValue([]);

      const res = await request(app).get('/api/meetings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should filter meetings by userId', async () => {
      const meetings = [
        { id: 1, title: 'Meeting A', requesterId: 1, assignedToId: null, status: 'pending' },
        { id: 2, title: 'Meeting B', requesterId: 2, assignedToId: 1, status: 'approved' },
        { id: 3, title: 'Meeting C', requesterId: 3, assignedToId: null, status: 'pending' },
      ];
      mockMeetingRepo.getAll.mockResolvedValue(meetings);

      const res = await request(app).get('/api/meetings?userId=1');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2); // requesterId=1 or assignedToId=1
    });

    it('should filter meetings by status', async () => {
      const meetings = [
        { id: 1, title: 'Meeting A', requesterId: 1, status: 'pending' },
        { id: 2, title: 'Meeting B', requesterId: 2, status: 'approved' },
        { id: 3, title: 'Meeting C', requesterId: 3, status: 'pending' },
      ];
      mockMeetingRepo.getAll.mockResolvedValue(meetings);

      const res = await request(app).get('/api/meetings?status=pending');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((m: { status: string }) => m.status === 'pending')).toBe(true);
    });

    it('should filter meetings by userId and status combined', async () => {
      const meetings = [
        { id: 1, title: 'Meeting A', requesterId: 1, assignedToId: null, status: 'pending' },
        { id: 2, title: 'Meeting B', requesterId: 1, assignedToId: null, status: 'approved' },
        { id: 3, title: 'Meeting C', requesterId: 2, assignedToId: null, status: 'pending' },
      ];
      mockMeetingRepo.getAll.mockResolvedValue(meetings);

      const res = await request(app).get('/api/meetings?userId=1&status=pending');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('title', 'Meeting A');
    });

    it('should filter by district for pastor', async () => {
      vi.mocked(getAuthUserId).mockReturnValue(1);
      const pastor = createMockUser({ role: 'pastor', districtId: 2 });
      mockUserRepo.getUserById.mockResolvedValue(pastor);

      const districtUsers = [{ id: 10 }, { id: 11 }];
      mockUserRepo.getUsersByDistrictId.mockResolvedValue(districtUsers);

      const meetings = [
        {
          id: 1,
          title: 'District Meeting',
          requesterId: 10,
          assignedToId: null,
          status: 'pending',
        },
        { id: 2, title: 'Other Meeting', requesterId: 99, assignedToId: null, status: 'pending' },
      ];
      mockMeetingRepo.getAll.mockResolvedValue(meetings);

      const res = await request(app).get('/api/meetings');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('title', 'District Meeting');
    });
  });

  // ── POST /api/meetings ──────────────────────────────────────

  describe('POST /api/meetings', () => {
    it('should create meeting with valid body', async () => {
      const createdMeeting = {
        id: 10,
        title: 'New Meeting',
        requesterId: 1,
        scheduledAt: '2024-01-15T10:00:00Z',
        status: 'pending',
      };
      mockMeetingRepo.create.mockResolvedValue(createdMeeting);

      const res = await request(app).post('/api/meetings').send({
        title: 'New Meeting',
        requesterId: 1,
        scheduledAt: '2024-01-15T10:00:00Z',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('title', 'New Meeting');
      expect(mockMeetingRepo.create).toHaveBeenCalled();
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app).post('/api/meetings').send({
        requesterId: 1,
        scheduledAt: '2024-01-15T10:00:00Z',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing requesterId', async () => {
      const res = await request(app).post('/api/meetings').send({
        title: 'Meeting',
        scheduledAt: '2024-01-15T10:00:00Z',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing scheduledAt', async () => {
      const res = await request(app).post('/api/meetings').send({
        title: 'Meeting',
        requesterId: 1,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for empty body', async () => {
      const res = await request(app).post('/api/meetings').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should create meeting with optional fields', async () => {
      const createdMeeting = {
        id: 11,
        title: 'Urgent Meeting',
        requesterId: 1,
        scheduledAt: '2024-01-15T10:00:00Z',
        priority: 'high',
        isUrgent: true,
        location: 'Office',
        status: 'pending',
      };
      mockMeetingRepo.create.mockResolvedValue(createdMeeting);

      const res = await request(app).post('/api/meetings').send({
        title: 'Urgent Meeting',
        requesterId: 1,
        scheduledAt: '2024-01-15T10:00:00Z',
        priority: 'high',
        isUrgent: true,
        location: 'Office',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('priority', 'high');
    });
  });

  // ── PUT /api/meetings/:id ───────────────────────────────────

  describe('PUT /api/meetings/:id', () => {
    it('should update an existing meeting', async () => {
      const updatedMeeting = {
        id: 1,
        title: 'Updated Meeting',
        status: 'approved',
      };
      mockMeetingRepo.update.mockResolvedValue(updatedMeeting);

      const res = await request(app)
        .put('/api/meetings/1')
        .send({ title: 'Updated Meeting', status: 'approved' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('title', 'Updated Meeting');
      expect(mockMeetingRepo.update).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should return 404 for non-existent meeting', async () => {
      mockMeetingRepo.update.mockResolvedValue(null);

      const res = await request(app).put('/api/meetings/999').send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/meeting-types ──────────────────────────────────

  describe('GET /api/meeting-types', () => {
    it('should return list of meeting types', async () => {
      const meetingTypes = [
        { id: 1, name: 'Aconselhamento' },
        { id: 2, name: 'Visita Pastoral' },
      ];
      mockMeetingRepo.getMeetingTypes.mockResolvedValue(meetingTypes);

      const res = await request(app).get('/api/meeting-types');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should return empty array when no meeting types exist', async () => {
      mockMeetingRepo.getMeetingTypes.mockResolvedValue([]);

      const res = await request(app).get('/api/meeting-types');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
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
