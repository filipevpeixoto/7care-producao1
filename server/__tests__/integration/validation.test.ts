/**
 * Testes de Integração - Validação Zod
 * Testa schemas de validação
 */

import { describe, it, expect } from '@jest/globals';
import {
  loginSchema,
  registerSchema,
  createUserSchema,
  updateUserSchema,
  createChurchSchema,
  createEventSchema,
  createMeetingSchema,
  createRelationshipSchema,
  createDiscipleshipRequestSchema,
  createMessageSchema,
  createNotificationSchema,
  createPrayerSchema,
  createEmotionalCheckInSchema,
  pointsConfigSchema,
  googleDriveConfigSchema
} from '../../schemas';

describe('Validation Schemas Tests', () => {
  describe('Login Schema', () => {
    it('deve validar login válido', () => {
      const validLogin = { email: 'user@example.com', password: 'password123' };
      const result = loginSchema.safeParse(validLogin);

      expect(result.success).toBe(true);
    });

    it('deve rejeitar email inválido', () => {
      const invalidLogin = { email: 'notanemail', password: 'password123' };
      const result = loginSchema.safeParse(invalidLogin);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('email');
      }
    });

    it('deve rejeitar senha vazia', () => {
      const invalidLogin = { email: 'user@example.com', password: '' };
      const result = loginSchema.safeParse(invalidLogin);

      expect(result.success).toBe(false);
    });
  });

  describe('Register Schema', () => {
    it('deve validar registro válido', () => {
      const validRegister = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test@123!',
        role: 'member'
      };
      const result = registerSchema.safeParse(validRegister);

      expect(result.success).toBe(true);
    });

    it('deve aceitar registro sem senha (opcional)', () => {
      const validRegister = {
        name: 'Test User',
        email: 'test@example.com'
      };
      const result = registerSchema.safeParse(validRegister);

      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome muito curto', () => {
      const invalidRegister = {
        name: 'A',
        email: 'test@example.com'
      };
      const result = registerSchema.safeParse(invalidRegister);

      expect(result.success).toBe(false);
    });

    it('deve validar roles permitidos', () => {
      const validRoles = ['superadmin', 'pastor', 'member', 'interested', 'missionary', 'admin_readonly'];

      validRoles.forEach(role => {
        const data = { name: 'Test', email: 'test@test.com', role };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar role inválido', () => {
      const invalidRegister = {
        name: 'Test User',
        email: 'test@example.com',
        role: 'invalid_role'
      };
      const result = registerSchema.safeParse(invalidRegister);

      expect(result.success).toBe(false);
    });
  });

  describe('Create User Schema', () => {
    it('deve validar usuário completo', () => {
      const validUser = {
        name: 'Full User',
        email: 'full@example.com',
        role: 'member',
        church: 'Igreja Central',
        birthDate: '1990-01-15',
        phone: '11999999999',
        address: 'Rua Teste, 123',
        isDonor: true,
        isTither: false
      };
      const result = createUserSchema.safeParse(validUser);

      expect(result.success).toBe(true);
    });

    it('deve usar valores default para campos opcionais', () => {
      const minimalUser = {
        name: 'Minimal User',
        email: 'minimal@example.com'
      };
      const result = createUserSchema.safeParse(minimalUser);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('member');
        expect(result.data.isDonor).toBe(false);
        expect(result.data.isTither).toBe(false);
      }
    });
  });

  describe('Update User Schema', () => {
    it('deve permitir atualização parcial', () => {
      const partialUpdate = { name: 'New Name' };
      const result = updateUserSchema.safeParse(partialUpdate);

      expect(result.success).toBe(true);
    });

    it('deve permitir objeto vazio', () => {
      const emptyUpdate = {};
      const result = updateUserSchema.safeParse(emptyUpdate);

      expect(result.success).toBe(true);
    });

    it('deve validar campos extras como firstAccess', () => {
      const updateWithExtras = {
        name: 'Updated Name',
        firstAccess: false,
        status: 'approved'
      };
      const result = updateUserSchema.safeParse(updateWithExtras);

      expect(result.success).toBe(true);
    });
  });

  describe('Create Church Schema', () => {
    it('deve validar igreja válida', () => {
      const validChurch = {
        name: 'Igreja Central',
        code: 'IC001',
        address: 'Rua Principal, 100',
        email: 'contato@igreja.com',
        phone: '1133334444'
      };
      const result = createChurchSchema.safeParse(validChurch);

      expect(result.success).toBe(true);
    });

    it('deve aceitar igreja com apenas nome', () => {
      const minimalChurch = { name: 'Igreja Simples' };
      const result = createChurchSchema.safeParse(minimalChurch);

      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome muito curto', () => {
      const invalidChurch = { name: 'I' };
      const result = createChurchSchema.safeParse(invalidChurch);

      expect(result.success).toBe(false);
    });
  });

  describe('Create Event Schema', () => {
    it('deve validar evento válido', () => {
      const validEvent = {
        title: 'Culto de Sábado',
        description: 'Culto principal',
        date: '2025-01-26',
        location: 'Igreja Central',
        type: 'culto',
        color: '#3b82f6'
      };
      const result = createEventSchema.safeParse(validEvent);

      expect(result.success).toBe(true);
    });

    it('deve rejeitar evento sem título', () => {
      const invalidEvent = {
        title: '',
        date: '2025-01-26'
      };
      const result = createEventSchema.safeParse(invalidEvent);

      expect(result.success).toBe(false);
    });

    it('deve usar valores default', () => {
      const minimalEvent = {
        title: 'Evento Simples',
        date: '2025-01-26'
      };
      const result = createEventSchema.safeParse(minimalEvent);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('evento');
        expect(result.data.isRecurring).toBe(false);
      }
    });
  });

  describe('Create Meeting Schema', () => {
    it('deve validar reunião válida', () => {
      const validMeeting = {
        title: 'Reunião de Oração',
        scheduledAt: '2025-01-26T19:00:00',
        requesterId: 1,
        duration: 60
      };
      const result = createMeetingSchema.safeParse(validMeeting);

      expect(result.success).toBe(true);
    });

    it('deve validar prioridade', () => {
      const validPriorities = ['low', 'medium', 'high'];

      validPriorities.forEach(priority => {
        const meeting = {
          title: 'Test',
          scheduledAt: '2025-01-26T19:00:00',
          requesterId: 1,
          priority
        };
        const result = createMeetingSchema.safeParse(meeting);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Create Relationship Schema', () => {
    it('deve validar relacionamento válido', () => {
      const validRelationship = {
        interestedId: 1,
        missionaryId: 2,
        status: 'active'
      };
      const result = createRelationshipSchema.safeParse(validRelationship);

      expect(result.success).toBe(true);
    });

    it('deve rejeitar IDs negativos', () => {
      const invalidRelationship = {
        interestedId: -1,
        missionaryId: 2
      };
      const result = createRelationshipSchema.safeParse(invalidRelationship);

      expect(result.success).toBe(false);
    });
  });

  describe('Create Emotional Check-in Schema', () => {
    it('deve validar check-in válido', () => {
      const validCheckIn = {
        userId: 1,
        emotionalScore: 4,
        mood: 'happy',
        prayerRequest: 'Oração pela família'
      };
      const result = createEmotionalCheckInSchema.safeParse(validCheckIn);

      expect(result.success).toBe(true);
    });

    it('deve validar score entre 1 e 5', () => {
      const invalidScore = {
        userId: 1,
        emotionalScore: 6
      };
      const result = createEmotionalCheckInSchema.safeParse(invalidScore);

      expect(result.success).toBe(false);
    });
  });

  describe('Points Config Schema', () => {
    it('deve validar configuração válida', () => {
      const validConfig = {
        visitaWeight: 10,
        estudoBiblicoWeight: 15,
        cultoWeight: 20,
        comunhaoWeight: 5,
        ofertaWeight: 10,
        dizimoWeight: 15,
        evangelismoWeight: 10,
        servicoWeight: 5,
        liderancaWeight: 5,
        capacitacaoWeight: 5
      };
      const result = pointsConfigSchema.safeParse(validConfig);

      expect(result.success).toBe(true);
    });

    it('deve permitir campos extras (passthrough)', () => {
      const configWithExtras = {
        visitaWeight: 10,
        customField: 'extra'
      };
      const result = pointsConfigSchema.safeParse(configWithExtras);

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).customField).toBe('extra');
      }
    });
  });

  describe('Google Drive Config Schema', () => {
    it('deve validar configuração válida', () => {
      const validConfig = {
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/123/edit',
        sheetName: 'Eventos',
        apiKey: 'AIza...'
      };
      const result = googleDriveConfigSchema.safeParse(validConfig);

      expect(result.success).toBe(true);
    });

    it('deve rejeitar URL inválida', () => {
      const invalidConfig = {
        spreadsheetUrl: 'not-a-url',
        sheetName: 'Eventos',
        apiKey: 'AIza...'
      };
      const result = googleDriveConfigSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
    });
  });
});

describe('Error Message Tests', () => {
  it('deve retornar mensagem de erro em português para email', () => {
    const result = loginSchema.safeParse({ email: 'invalid', password: 'test' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Email inválido');
    }
  });

  it('deve retornar mensagem de erro para senha obrigatória', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Senha é obrigatória');
    }
  });
});
