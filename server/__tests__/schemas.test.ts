/**
 * Testes para Schemas Zod
 * Validação de entrada de dados
 */

import { describe, it, expect } from '@jest/globals';
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  resetPasswordSchema,
  createUserSchema,
  updateUserSchema,
  createChurchSchema,
  createEventSchema,
  createMeetingSchema,
  createRelationshipSchema,
  createPrayerSchema,
  createMessageSchema,
  createNotificationSchema,
  createEmotionalCheckInSchema,
  createDiscipleshipRequestSchema
} from '../schemas';

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      };
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123'
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: ''
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Test@123!',
        role: 'member'
      };
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short name', () => {
      const invalidData = {
        name: 'J',
        email: 'john@example.com'
      };
      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional password', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com'
      };
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'invalid_role'
      };
      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate correct change password data', () => {
      const validData = {
        userId: 1,
        currentPassword: 'OldPass@123',
        newPassword: 'NewPass@456'
      };
      const result = changePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short new password', () => {
      const invalidData = {
        userId: 1,
        currentPassword: 'oldpass',
        newPassword: '12345'
      };
      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject weak new password without special chars', () => {
      const invalidData = {
        userId: 1,
        currentPassword: 'oldpass',
        newPassword: 'NewPass123'
      };
      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid userId', () => {
      const invalidData = {
        userId: -1,
        currentPassword: 'oldpass',
        newPassword: 'newpass123'
      };
      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate correct email', () => {
      const validData = { email: 'test@example.com' };
      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = { email: 'not-an-email' };
      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe('User Schemas', () => {
  describe('createUserSchema', () => {
    it('should validate correct user data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'member'
      };
      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should set default role to member', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com'
      };
      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('member');
      }
    });

    it('should accept all valid roles', () => {
      const roles = ['superadmin', 'pastor', 'member', 'interested', 'missionary', 'admin_readonly'];

      roles.forEach(role => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          role
        };
        const result = createUserSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should accept optional fields', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '11999999999',
        address: 'Rua Teste, 123',
        birthDate: '1990-01-01',
        church: 'Igreja Central'
      };
      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('updateUserSchema', () => {
    it('should accept partial updates', () => {
      const validData = {
        name: 'Jane Doe'
      };
      const result = updateUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe('Church Schemas', () => {
  describe('createChurchSchema', () => {
    it('should validate correct church data', () => {
      const validData = {
        name: 'Igreja Central'
      };
      const result = createChurchSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short name', () => {
      const invalidData = {
        name: 'A'
      };
      const result = createChurchSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const validData = {
        name: 'Igreja Central',
        address: 'Rua Principal, 100',
        email: 'contato@igreja.com',
        phone: '11999999999'
      };
      const result = createChurchSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});

describe('Event Schemas', () => {
  describe('createEventSchema', () => {
    it('should validate correct event data', () => {
      const validData = {
        title: 'Culto Dominical',
        date: '2024-01-15'
      };
      const result = createEventSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing title', () => {
      const invalidData = {
        date: '2024-01-15'
      };
      const result = createEventSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing date', () => {
      const invalidData = {
        title: 'Culto'
      };
      const result = createEventSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const validData = {
        title: 'Culto Dominical',
        date: '2024-01-15',
        description: 'Culto de adoração',
        location: 'Igreja Central',
        type: 'culto',
        isRecurring: true
      };
      const result = createEventSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});

describe('Meeting Schemas', () => {
  describe('createMeetingSchema', () => {
    it('should validate correct meeting data', () => {
      const validData = {
        title: 'Reunião de Líderes',
        scheduledAt: '2024-01-15T10:00:00Z',
        requesterId: 1
      };
      const result = createMeetingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid requesterId', () => {
      const invalidData = {
        title: 'Reunião',
        scheduledAt: '2024-01-15T10:00:00Z',
        requesterId: -1
      };
      const result = createMeetingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should set default values', () => {
      const validData = {
        title: 'Reunião',
        scheduledAt: '2024-01-15T10:00:00Z',
        requesterId: 1
      };
      const result = createMeetingSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('medium');
        expect(result.data.status).toBe('pending');
        expect(result.data.duration).toBe(60);
      }
    });
  });
});

describe('Relationship Schemas', () => {
  describe('createRelationshipSchema', () => {
    it('should validate correct relationship data', () => {
      const validData = {
        interestedId: 1,
        missionaryId: 2
      };
      const result = createRelationshipSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid IDs', () => {
      const invalidData = {
        interestedId: 0,
        missionaryId: -1
      };
      const result = createRelationshipSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should set default status to active', () => {
      const validData = {
        interestedId: 1,
        missionaryId: 2
      };
      const result = createRelationshipSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
      }
    });
  });
});

describe('Prayer Schemas', () => {
  describe('createPrayerSchema', () => {
    it('should validate correct prayer data', () => {
      const validData = {
        userId: 1,
        title: 'Pedido de oração'
      };
      const result = createPrayerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing title', () => {
      const invalidData = {
        userId: 1
      };
      const result = createPrayerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should set default values', () => {
      const validData = {
        userId: 1,
        title: 'Pedido'
      };
      const result = createPrayerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPublic).toBe(true);
        expect(result.data.allowIntercessors).toBe(true);
      }
    });
  });
});

describe('Message Schemas', () => {
  describe('createMessageSchema', () => {
    it('should validate correct message data', () => {
      const validData = {
        conversationId: 1,
        senderId: 2,
        content: 'Hello!'
      };
      const result = createMessageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const invalidData = {
        conversationId: 1,
        senderId: 2,
        content: ''
      };
      const result = createMessageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should set default messageType to text', () => {
      const validData = {
        conversationId: 1,
        senderId: 2,
        content: 'Hello!'
      };
      const result = createMessageSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.messageType).toBe('text');
      }
    });
  });
});

describe('Notification Schemas', () => {
  describe('createNotificationSchema', () => {
    it('should validate correct notification data', () => {
      const validData = {
        userId: 1,
        title: 'Nova mensagem',
        message: 'Você recebeu uma nova mensagem'
      };
      const result = createNotificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing fields', () => {
      const invalidData = {
        userId: 1
      };
      const result = createNotificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe('Emotional Check-in Schemas', () => {
  describe('createEmotionalCheckInSchema', () => {
    it('should validate correct check-in data', () => {
      const validData = {
        userId: 1,
        emotionalScore: 4,
        mood: 'happy'
      };
      const result = createEmotionalCheckInSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid score range', () => {
      const invalidData = {
        userId: 1,
        emotionalScore: 10
      };
      const result = createEmotionalCheckInSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept score in valid range (1-5)', () => {
      for (let score = 1; score <= 5; score++) {
        const validData = {
          userId: 1,
          emotionalScore: score
        };
        const result = createEmotionalCheckInSchema.safeParse(validData);
        expect(result.success).toBe(true);
      }
    });
  });
});

describe('Discipleship Schemas', () => {
  describe('createDiscipleshipRequestSchema', () => {
    it('should validate correct discipleship request data', () => {
      const validData = {
        interestedId: 1,
        missionaryId: 2
      };
      const result = createDiscipleshipRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid IDs', () => {
      const invalidData = {
        interestedId: 0,
        missionaryId: 0
      };
      const result = createDiscipleshipRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional notes', () => {
      const validData = {
        interestedId: 1,
        missionaryId: 2,
        notes: 'Pedido de acompanhamento'
      };
      const result = createDiscipleshipRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
