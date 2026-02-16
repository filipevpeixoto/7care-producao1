/**
 * Event Routes — Integration Tests
 *
 * Tests the full request pipeline for event endpoints:
 * GET /api/events, POST /api/events, DELETE /api/events,
 * GET /api/event-types/:role, GET /api/calendar/events
 *
 * Uses supertest with a real Express app and mocked repositories.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, createNotFoundHandler, createErrorHandler } from '../../app';
import { container } from '../../container';
import { eventRoutes } from '../../routes/eventRoutes';
import { createMockUser } from './setup';
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

const mockEventRepo = {
  getAllEvents: vi.fn().mockResolvedValue([]),
  getEventById: vi.fn().mockResolvedValue(null),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getDistrictEvents: vi.fn().mockResolvedValue([]),
  getEventsByDistrict: vi.fn().mockResolvedValue([]),
};

const mockChurchRepo = {
  getAllChurches: vi.fn().mockResolvedValue([]),
  getChurchById: vi.fn().mockResolvedValue(null),
  getDefaultChurch: vi.fn().mockResolvedValue({ id: 1, name: 'Default Church' }),
  getChurchesByDistrict: vi.fn().mockResolvedValue([]),
  getOrCreateChurch: vi.fn(),
};

const mockUserRepo = {
  getUserById: vi.fn().mockResolvedValue(null),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUsersPaginated: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getUsersByDistrictId: vi.fn().mockResolvedValue([]),
};

// ── Build test app ──────────────────────────────────────────────

function createTestApp() {
  container.register('eventRepository', mockEventRepo as never);
  container.register('churchRepository', mockChurchRepo as never);
  container.register('userRepository', mockUserRepo as never);
  const app = createApp();
  eventRoutes(app);
  app.use(createNotFoundHandler());
  app.use(createErrorHandler());
  return app;
}

// ── Tests ───────────────────────────────────────────────────────

describe('Event Routes — Integration', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUserId).mockReturnValue(0);
    mockChurchRepo.getDefaultChurch.mockResolvedValue({ id: 1, name: 'Default Church' });
    mockUserRepo.getUserById.mockResolvedValue(null);
    app = createTestApp();
  });

  // ── GET /api/events ─────────────────────────────────────────

  describe('GET /api/events', () => {
    it('should return list of events', async () => {
      const events = [
        { id: 1, title: 'Culto Dominical', date: '2024-01-15', church: 'Test Church' },
        { id: 2, title: 'Estudo Bíblico', date: '2024-01-16', church: 'Test Church' },
      ];
      mockEventRepo.getAllEvents.mockResolvedValue(events);

      const res = await request(app).get('/api/events');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('title', 'Culto Dominical');
    });

    it('should return empty array when no events exist', async () => {
      mockEventRepo.getAllEvents.mockResolvedValue([]);

      const res = await request(app).get('/api/events');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should filter events by church query param', async () => {
      const events = [
        { id: 1, title: 'Event A', date: '2024-01-15', church: 'Church A' },
        { id: 2, title: 'Event B', date: '2024-01-16', church: 'Church B' },
      ];
      mockEventRepo.getAllEvents.mockResolvedValue(events);

      const res = await request(app).get('/api/events?church=Church A');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('church', 'Church A');
    });

    it('should filter events by date range', async () => {
      const events = [
        { id: 1, title: 'Early Event', date: '2024-01-10' },
        { id: 2, title: 'Mid Event', date: '2024-01-15' },
        { id: 3, title: 'Late Event', date: '2024-01-20' },
      ];
      mockEventRepo.getAllEvents.mockResolvedValue(events);

      const res = await request(app).get(
        '/api/events?startDate=2024-01-12&endDate=2024-01-18'
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('title', 'Mid Event');
    });

    it('should use district filter for pastor users', async () => {
      vi.mocked(getAuthUserId).mockReturnValue(1);
      const pastor = createMockUser({ role: 'pastor', districtId: 3 });
      mockUserRepo.getUserById.mockResolvedValue(pastor);
      mockEventRepo.getEventsByDistrict.mockResolvedValue([
        { id: 1, title: 'District Event', date: '2024-01-15' },
      ]);

      const res = await request(app)
        .get('/api/events');

      expect(res.status).toBe(200);
      expect(mockEventRepo.getEventsByDistrict).toHaveBeenCalledWith(3);
      expect(res.body.data).toHaveLength(1);
    });
  });

  // ── POST /api/events ────────────────────────────────────────

  describe('POST /api/events', () => {
    it('should create event with valid body', async () => {
      const createdEvent = {
        id: 10,
        title: 'New Event',
        date: '2024-01-15',
        church: 'Default Church',
      };
      mockEventRepo.createEvent.mockResolvedValue(createdEvent);

      const res = await request(app)
        .post('/api/events')
        .send({
          title: 'New Event',
          date: '2024-01-15',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('title', 'New Event');
      expect(mockEventRepo.createEvent).toHaveBeenCalled();
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({ date: '2024-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing date', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({ title: 'Event Without Date' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for empty body', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should resolve church info from default church', async () => {
      const createdEvent = { id: 11, title: 'Event', date: '2024-01-15', church: 'Default Church' };
      mockEventRepo.createEvent.mockResolvedValue(createdEvent);
      mockChurchRepo.getDefaultChurch.mockResolvedValue({ id: 5, name: 'Default Church' });

      const res = await request(app)
        .post('/api/events')
        .send({ title: 'Event', date: '2024-01-15' });

      expect(res.status).toBe(201);
      expect(mockChurchRepo.getDefaultChurch).toHaveBeenCalled();
    });
  });

  // ── DELETE /api/events (batch) ──────────────────────────────

  describe('DELETE /api/events', () => {
    it('should delete multiple events by ids', async () => {
      mockEventRepo.deleteEvent.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/events')
        .send({ ids: [1, 2, 3] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockEventRepo.deleteEvent).toHaveBeenCalledTimes(3);
    });

    it('should return 400 when ids is not provided', async () => {
      const res = await request(app)
        .delete('/api/events')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when ids is not an array', async () => {
      const res = await request(app)
        .delete('/api/events')
        .send({ ids: 'not-an-array' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/event-types/:role ──────────────────────────────

  describe('GET /api/event-types/:role', () => {
    it('should return all event types for superadmin', async () => {
      const res = await request(app).get('/api/event-types/superadmin');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(7);
    });

    it('should return all event types for pastor', async () => {
      const res = await request(app).get('/api/event-types/pastor');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(7);
    });

    it('should return limited event types for member', async () => {
      const res = await request(app).get('/api/event-types/member');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThan(7);
    });
  });

  // ── GET /api/calendar/events ────────────────────────────────

  describe('GET /api/calendar/events', () => {
    it('should return calendar events', async () => {
      const events = [
        { id: 1, title: 'Calendar Event', date: '2024-01-15' },
      ];
      mockEventRepo.getAllEvents.mockResolvedValue(events);

      const res = await request(app).get('/api/calendar/events');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('should filter calendar events by district for pastor', async () => {
      vi.mocked(getAuthUserId).mockReturnValue(1);
      const pastor = createMockUser({ role: 'pastor', districtId: 2 });
      mockUserRepo.getUserById.mockResolvedValue(pastor);
      mockEventRepo.getEventsByDistrict.mockResolvedValue([
        { id: 1, title: 'District Calendar Event', date: '2024-01-15' },
      ]);

      const res = await request(app)
        .get('/api/calendar/events');

      expect(res.status).toBe(200);
      expect(mockEventRepo.getEventsByDistrict).toHaveBeenCalledWith(2);
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
