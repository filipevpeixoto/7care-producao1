/**
 * Contract Tests para API
 * Valida que a API mantém seu contrato com os consumidores
 */

import { describe, it, expect } from '@jest/globals';

// Esquemas de contrato para cada endpoint
const contracts = {
  // Health Check
  healthCheck: {
    endpoint: '/api/health',
    method: 'GET',
    response: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['ok', 'healthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        uptime: { type: 'number' },
      },
    },
  },

  // Login
  login: {
    endpoint: '/api/login',
    method: 'POST',
    request: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 1 },
      },
    },
    response: {
      success: {
        type: 'object',
        required: ['token', 'user'],
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/definitions/User' },
        },
      },
      error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },

  // Get Users
  getUsers: {
    endpoint: '/api/users',
    method: 'GET',
    response: {
      type: 'array',
      items: { $ref: '#/definitions/User' },
    },
  },

  // Get User by ID
  getUserById: {
    endpoint: '/api/users/:id',
    method: 'GET',
    params: {
      id: { type: 'number' },
    },
    response: {
      success: { $ref: '#/definitions/User' },
      notFound: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },

  // Create User
  createUser: {
    endpoint: '/api/users',
    method: 'POST',
    request: {
      type: 'object',
      required: ['name', 'email', 'password', 'role'],
      properties: {
        name: { type: 'string', minLength: 2 },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 },
        role: {
          type: 'string',
          enum: ['superadmin', 'pastor', 'member', 'interested', 'missionary', 'admin_readonly'],
        },
        church: { type: 'string', nullable: true },
        districtId: { type: 'number', nullable: true },
      },
    },
    response: {
      success: { $ref: '#/definitions/User' },
      error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
          details: { type: 'array' },
        },
      },
    },
  },

  // Get Events
  getEvents: {
    endpoint: '/api/events',
    method: 'GET',
    response: {
      type: 'array',
      items: { $ref: '#/definitions/Event' },
    },
  },

  // Create Event
  createEvent: {
    endpoint: '/api/events',
    method: 'POST',
    request: {
      type: 'object',
      required: ['title', 'date', 'type'],
      properties: {
        title: { type: 'string', minLength: 1 },
        description: { type: 'string', nullable: true },
        date: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time', nullable: true },
        location: { type: 'string', nullable: true },
        type: { type: 'string' },
        churchId: { type: 'number', nullable: true },
      },
    },
    response: {
      success: { $ref: '#/definitions/Event' },
    },
  },

  // Get Districts
  getDistricts: {
    endpoint: '/api/districts',
    method: 'GET',
    response: {
      type: 'array',
      items: { $ref: '#/definitions/District' },
    },
  },

  // Get Churches
  getChurches: {
    endpoint: '/api/churches',
    method: 'GET',
    response: {
      type: 'array',
      items: { $ref: '#/definitions/Church' },
    },
  },

  // Gamification - Get Leaderboard
  getLeaderboard: {
    endpoint: '/api/gamification/leaderboard',
    method: 'GET',
    response: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'points'],
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          points: { type: 'number' },
          rank: { type: 'number' },
          level: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
        },
      },
    },
  },

  // Elections
  getElections: {
    endpoint: '/api/elections',
    method: 'GET',
    response: {
      type: 'array',
      items: { $ref: '#/definitions/Election' },
    },
  },

  // Discipleship Requests
  getDiscipleshipRequests: {
    endpoint: '/api/discipleship-requests',
    method: 'GET',
    response: {
      type: 'array',
      items: { $ref: '#/definitions/DiscipleshipRequest' },
    },
  },
};

// Definições de tipos compartilhados
const definitions = {
  User: {
    type: 'object',
    required: ['id', 'name', 'email', 'role'],
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: {
        type: 'string',
        enum: ['superadmin', 'pastor', 'member', 'interested', 'missionary', 'admin_readonly'],
      },
      church: { type: 'string', nullable: true },
      churchId: { type: 'number', nullable: true },
      districtId: { type: 'number', nullable: true },
      points: { type: 'number' },
      level: { type: ['string', 'number'] },
      status: { type: 'string', enum: ['active', 'inactive', 'pending', 'visited'] },
      avatarUrl: { type: 'string', nullable: true },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
  },

  Event: {
    type: 'object',
    required: ['id', 'title', 'date', 'type'],
    properties: {
      id: { type: 'number' },
      title: { type: 'string' },
      description: { type: 'string', nullable: true },
      date: { type: 'string' },
      endDate: { type: 'string', nullable: true },
      location: { type: 'string', nullable: true },
      type: { type: 'string' },
      churchId: { type: 'number', nullable: true },
      createdBy: { type: 'number', nullable: true },
      isRecurring: { type: 'boolean' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
  },

  District: {
    type: 'object',
    required: ['id', 'name', 'code'],
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      code: { type: 'string' },
      pastorId: { type: 'number', nullable: true },
      description: { type: 'string', nullable: true },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
  },

  Church: {
    type: 'object',
    required: ['id', 'name', 'code'],
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      code: { type: 'string' },
      address: { type: 'string', nullable: true },
      email: { type: 'string', nullable: true },
      phone: { type: 'string', nullable: true },
      pastor: { type: 'string', nullable: true },
      districtId: { type: 'number', nullable: true },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
  },

  Election: {
    type: 'object',
    required: ['id', 'title', 'status'],
    properties: {
      id: { type: 'number' },
      title: { type: 'string' },
      description: { type: 'string', nullable: true },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      status: { type: 'string', enum: ['draft', 'active', 'closed', 'cancelled'] },
      churchId: { type: 'number', nullable: true },
      createdBy: { type: 'number' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
  },

  DiscipleshipRequest: {
    type: 'object',
    required: ['id', 'status'],
    properties: {
      id: { type: 'number' },
      interestedId: { type: 'number', nullable: true },
      missionaryId: { type: 'number', nullable: true },
      status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'completed'] },
      notes: { type: 'string', nullable: true },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
  },
};

// Funções de validação de contrato
type SchemaProperty = {
  type: string | string[];
  enum?: string[];
  format?: string;
  minLength?: number;
  nullable?: boolean;
  items?: SchemaProperty;
  required?: string[];
  properties?: Record<string, SchemaProperty>;
  $ref?: string;
};

type Schema = {
  type: string;
  required?: string[];
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  $ref?: string;
};

function validateType(value: unknown, expectedType: string | string[]): boolean {
  const types = Array.isArray(expectedType) ? expectedType : [expectedType];
  const actualType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  return types.includes(actualType);
}

function resolveRef(ref: string): Schema {
  const name = ref.replace('#/definitions/', '');
  return definitions[name as keyof typeof definitions] as Schema;
}

function validateSchema(data: unknown, schema: Schema, path = ''): string[] {
  const errors: string[] = [];

  if (!schema) {
    return errors;
  }

  // Resolver referência se existir
  if (schema.$ref) {
    return validateSchema(data, resolveRef(schema.$ref), path);
  }

  // Validar tipo
  if (schema.type) {
    if (!validateType(data, schema.type)) {
      errors.push(`${path}: expected ${schema.type}, got ${typeof data}`);
      return errors;
    }
  }

  // Validar objeto
  if (schema.type === 'object' && data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    // Validar campos obrigatórios
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in obj)) {
          errors.push(`${path}.${field}: required field missing`);
        }
      }
    }

    // Validar propriedades
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj) {
          const value = obj[key];
          // Se o valor é null e o campo é nullable, não é erro
          if (value === null && propSchema.nullable) {
            continue;
          }
          const propErrors = validateSchema(value, propSchema as Schema, `${path}.${key}`);
          errors.push(...propErrors);
        }
      }
    }
  }

  // Validar array
  if (schema.type === 'array' && Array.isArray(data)) {
    if (schema.items) {
      data.forEach((item, index) => {
        const itemErrors = validateSchema(item, schema.items as Schema, `${path}[${index}]`);
        errors.push(...itemErrors);
      });
    }
  }

  return errors;
}

// Testes de Contrato
describe('API Contract Tests', () => {
  describe('Contract Definitions', () => {
    it('should have all required contracts defined', () => {
      expect(contracts.healthCheck).toBeDefined();
      expect(contracts.login).toBeDefined();
      expect(contracts.getUsers).toBeDefined();
      expect(contracts.getUserById).toBeDefined();
      expect(contracts.createUser).toBeDefined();
      expect(contracts.getEvents).toBeDefined();
      expect(contracts.createEvent).toBeDefined();
      expect(contracts.getDistricts).toBeDefined();
      expect(contracts.getChurches).toBeDefined();
      expect(contracts.getLeaderboard).toBeDefined();
      expect(contracts.getElections).toBeDefined();
      expect(contracts.getDiscipleshipRequests).toBeDefined();
    });

    it('should have all type definitions', () => {
      expect(definitions.User).toBeDefined();
      expect(definitions.Event).toBeDefined();
      expect(definitions.District).toBeDefined();
      expect(definitions.Church).toBeDefined();
      expect(definitions.Election).toBeDefined();
      expect(definitions.DiscipleshipRequest).toBeDefined();
    });
  });

  describe('User Contract Validation', () => {
    it('should validate a valid user object', () => {
      const validUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'member',
        points: 100,
        level: 'Bronze',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const errors = validateSchema(validUser, definitions.User as Schema);
      expect(errors).toHaveLength(0);
    });

    it('should reject user without required fields', () => {
      const invalidUser = {
        name: 'Test User',
        // missing id, email, role
      };

      const errors = validateSchema(invalidUser, definitions.User as Schema);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('id'))).toBe(true);
      expect(errors.some(e => e.includes('email'))).toBe(true);
      expect(errors.some(e => e.includes('role'))).toBe(true);
    });

    it('should validate user with nullable fields', () => {
      const userWithNulls = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'member',
        church: null,
        churchId: null,
        districtId: null,
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const errors = validateSchema(userWithNulls, definitions.User as Schema);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Event Contract Validation', () => {
    it('should validate a valid event object', () => {
      const validEvent = {
        id: 1,
        title: 'Test Event',
        description: 'Event description',
        date: new Date().toISOString(),
        type: 'worship',
        isRecurring: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const errors = validateSchema(validEvent, definitions.Event as Schema);
      expect(errors).toHaveLength(0);
    });

    it('should reject event without required fields', () => {
      const invalidEvent = {
        description: 'No title or date',
      };

      const errors = validateSchema(invalidEvent, definitions.Event as Schema);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Login Contract Validation', () => {
    it('should validate login request schema', () => {
      const validRequest = {
        email: 'user@example.com',
        password: 'password123',
      };

      const schema = contracts.login.request as Schema;
      const errors = validateSchema(validRequest, schema);
      expect(errors).toHaveLength(0);
    });

    it('should reject login request without email', () => {
      const invalidRequest = {
        password: 'password123',
      };

      const schema = contracts.login.request as Schema;
      const errors = validateSchema(invalidRequest, schema);
      expect(errors.some(e => e.includes('email'))).toBe(true);
    });
  });

  describe('Create User Contract Validation', () => {
    it('should validate create user request', () => {
      const validRequest = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'securepassword',
        role: 'member',
      };

      const schema = contracts.createUser.request as Schema;
      const errors = validateSchema(validRequest, schema);
      expect(errors).toHaveLength(0);
    });

    it('should allow optional fields in create user', () => {
      const requestWithOptional = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'securepassword',
        role: 'member',
        church: 'Test Church',
        districtId: 1,
      };

      const schema = contracts.createUser.request as Schema;
      const errors = validateSchema(requestWithOptional, schema);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Array Response Contract Validation', () => {
    it('should validate users array response', () => {
      const usersResponse = [
        {
          id: 1,
          name: 'User 1',
          email: 'user1@example.com',
          role: 'member',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'User 2',
          email: 'user2@example.com',
          role: 'pastor',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const schema = contracts.getUsers.response as Schema;
      const errors = validateSchema(usersResponse, schema);
      expect(errors).toHaveLength(0);
    });

    it('should validate events array response', () => {
      const eventsResponse = [
        {
          id: 1,
          title: 'Event 1',
          date: new Date().toISOString(),
          type: 'worship',
          isRecurring: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const schema = contracts.getEvents.response as Schema;
      const errors = validateSchema(eventsResponse, schema);
      expect(errors).toHaveLength(0);
    });

    it('should validate leaderboard response', () => {
      const leaderboardResponse = [
        { id: 1, name: 'Top User', points: 1000, rank: 1, level: 'Gold' },
        { id: 2, name: 'Second User', points: 800, rank: 2, level: 'Silver' },
      ];

      const schema = contracts.getLeaderboard.response as Schema;
      const errors = validateSchema(leaderboardResponse, schema);
      expect(errors).toHaveLength(0);
    });
  });

  describe('District and Church Contract Validation', () => {
    it('should validate district object', () => {
      const validDistrict = {
        id: 1,
        name: 'District 1',
        code: 'DST001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const errors = validateSchema(validDistrict, definitions.District as Schema);
      expect(errors).toHaveLength(0);
    });

    it('should validate church object', () => {
      const validChurch = {
        id: 1,
        name: 'Church 1',
        code: 'CHR001',
        address: '123 Main St',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const errors = validateSchema(validChurch, definitions.Church as Schema);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Election Contract Validation', () => {
    it('should validate election object', () => {
      const validElection = {
        id: 1,
        title: 'Board Election 2024',
        description: 'Annual board election',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'active',
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const errors = validateSchema(validElection, definitions.Election as Schema);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Discipleship Request Contract Validation', () => {
    it('should validate discipleship request object', () => {
      const validRequest = {
        id: 1,
        interestedId: 2,
        missionaryId: 3,
        status: 'pending',
        notes: 'Initial contact',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const errors = validateSchema(validRequest, definitions.DiscipleshipRequest as Schema);
      expect(errors).toHaveLength(0);
    });
  });
});

// Export para uso em outros testes
export { contracts, definitions, validateSchema };
