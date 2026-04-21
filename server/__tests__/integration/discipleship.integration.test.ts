import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, createNotFoundHandler, createErrorHandler } from '../../app';
import { container } from '../../container';
import { discipleshipRoutes } from '../../routes/discipleshipRoutes';
import { createMockUser, toTestServer } from './setup';
import { getAuthUserId, getAuthUserRole } from '../../utils/authHelpers';

vi.mock('../../utils/authHelpers', () => ({
  getAuthUserId: vi.fn().mockReturnValue(0),
  getAuthUser: vi.fn().mockReturnValue(null),
  getAuthUserRole: vi.fn().mockReturnValue(undefined),
  getAuthUserDistrictId: vi.fn().mockReturnValue(undefined),
}));

const mockUserRepo = {
  getUserById: vi.fn().mockResolvedValue(null),
};

const mockDiscipleshipRepo = {
  getAll: vi.fn().mockResolvedValue([]),
  getById: vi.fn().mockResolvedValue(null),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockRelationshipRepo = {
  create: vi.fn(),
};

function createTestApp() {
  container.register('userRepository', mockUserRepo as never);
  container.register('discipleshipRepository', mockDiscipleshipRepo as never);
  container.register('relationshipRepository', mockRelationshipRepo as never);

  const app = createApp();
  discipleshipRoutes(app);
  app.use(createNotFoundHandler());
  app.use(createErrorHandler());
  return toTestServer(app);
}

describe('Discipleship Routes — Integration', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUserId).mockReturnValue(0);
    vi.mocked(getAuthUserRole).mockReturnValue(undefined);
    app = createTestApp();
  });

  describe('GET /api/discipleship-requests', () => {
    it('should filter requests by district for pastor', async () => {
      vi.mocked(getAuthUserId).mockReturnValue(10);
      vi.mocked(getAuthUserRole).mockReturnValue('pastor');

      mockDiscipleshipRepo.getAll.mockResolvedValue([
        { id: 1, missionaryId: 21, interestedId: 31, status: 'pending' },
        { id: 2, missionaryId: 22, interestedId: 32, status: 'pending' },
      ]);

      mockUserRepo.getUserById.mockImplementation(async (id: number) => {
        switch (id) {
          case 10:
            return createMockUser({ id: 10, role: 'pastor', districtId: 1, church: 'Central' });
          case 21:
            return createMockUser({ id: 21, role: 'missionary', districtId: 1, church: 'Central' });
          case 31:
            return createMockUser({ id: 31, role: 'interested', districtId: 1, church: 'Central' });
          case 22:
            return createMockUser({ id: 22, role: 'missionary', districtId: 2, church: 'Outra' });
          case 32:
            return createMockUser({ id: 32, role: 'interested', districtId: 2, church: 'Outra' });
          default:
            return null;
        }
      });

      const res = await request(app).get('/api/discipleship-requests');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('id', 1);
    });
  });
});
