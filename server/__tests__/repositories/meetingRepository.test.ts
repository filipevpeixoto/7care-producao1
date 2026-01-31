/**
 * @jest-environment node
 * @description Tests for MeetingRepository
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock do db - usando any para evitar problemas de tipagem
const mockDb: any = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
};

jest.mock('../../neonConfig', () => ({
  db: mockDb,
}));

// Import apos os mocks
import { MeetingRepository } from '../../repositories/meetingRepository';

describe('MeetingRepository', () => {
  let repository: MeetingRepository;
  const mockMeeting = {
    id: 1,
    title: 'Reuniao de Oracao',
    description: 'Reuniao semanal',
    scheduledAt: new Date('2024-01-15T10:00:00Z'),
    duration: 60,
    location: 'Igreja Central',
    requesterId: 1,
    assignedToId: 2,
    typeId: 1,
    priority: 'medium',
    isUrgent: false,
    status: 'pending',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new MeetingRepository();
    jest.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.limit.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();
  });

  describe('getAll', () => {
    it('should return all meetings ordered by scheduledAt', async () => {
      const mockMeetings = [mockMeeting, { ...mockMeeting, id: 2 }];
      mockDb.orderBy.mockResolvedValue(mockMeetings);

      const result = await repository.getAll();

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should return empty array on error', async () => {
      mockDb.orderBy.mockRejectedValue(new Error('Database error'));

      const result = await repository.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getByUserId', () => {
    it('should return meetings for specific user', async () => {
      const mockMeetings = [mockMeeting];
      mockDb.orderBy.mockResolvedValue(mockMeetings);

      const result = await repository.getByUserId(1);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should return empty array on error', async () => {
      mockDb.orderBy.mockRejectedValue(new Error('Database error'));

      const result = await repository.getByUserId(1);

      expect(result).toEqual([]);
    });
  });

  describe('getByStatus', () => {
    it('should return meetings with specific status', async () => {
      const mockMeetings = [mockMeeting];
      mockDb.orderBy.mockResolvedValue(mockMeetings);

      const result = await repository.getByStatus('pending');

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should return empty array on error', async () => {
      mockDb.orderBy.mockRejectedValue(new Error('Database error'));

      const result = await repository.getByStatus('pending');

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return meeting by id', async () => {
      mockDb.limit.mockResolvedValue([mockMeeting]);

      const result = await repository.getById(1);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
      expect(result).toBeDefined();
    });

    it('should return null if meeting not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await repository.getById(999);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockDb.limit.mockRejectedValue(new Error('Database error'));

      const result = await repository.getById(1);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create new meeting', async () => {
      mockDb.returning.mockResolvedValue([mockMeeting]);

      const input = {
        title: 'Reuniao de Oracao',
        description: 'Reuniao semanal',
        scheduledAt: '2024-01-15T10:00:00Z',
        duration: 60,
        location: 'Igreja Central',
        requesterId: 1,
        assignedToId: 2,
        typeId: 1,
        priority: 'medium' as const,
        isUrgent: false,
        status: 'pending' as const,
      };

      const result = await repository.create(input);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error on creation failure', async () => {
      mockDb.returning.mockRejectedValue(new Error('Insert failed'));

      const input = {
        title: 'Reuniao',
        description: 'Descricao',
        scheduledAt: '2024-01-15T10:00:00Z',
        duration: 60,
        requesterId: 1,
        priority: 'medium' as const,
        isUrgent: false,
        status: 'pending' as const,
      };

      await expect(repository.create(input)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update meeting', async () => {
      mockDb.returning.mockResolvedValue([{ ...mockMeeting, title: 'Updated' }]);

      const result = await repository.update(1, { title: 'Updated' });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return null if meeting not found', async () => {
      mockDb.returning.mockResolvedValue([]);

      const result = await repository.update(999, { title: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete meeting', async () => {
      mockDb.where.mockResolvedValue({ rowCount: 1 });

      const result = await repository.delete(1);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false on delete error', async () => {
      mockDb.where.mockRejectedValue(new Error('Delete failed'));

      const result = await repository.delete(1);

      expect(result).toBe(false);
    });
  });
});
