/**
 * Fixtures de Usuários para Testes
 * Dados de teste padronizados
 */

import { User } from '../../shared/schema';

// Interface para testes - compatível com User do schema
interface TestUser {
  id?: number;
  name?: string;
  email?: string;
  password?: string;
  role?: User['role'];
  church?: string;
  churchCode?: string;
  districtId?: number | null;
  isApproved?: boolean;
  status?: string;
  firstAccess?: boolean;
  points?: number;
  level?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Cria um usuário base com valores padrão
 */
export const createUserFixture = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  password: '$2b$10$hashedpassword',
  role: 'member',
  church: 'Test Church',
  churchCode: 'TC001',
  districtId: 1,
  isApproved: true,
  status: 'approved',
  firstAccess: false,
  points: 0,
  level: 'Iniciante',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
});

/**
 * Fixtures pré-definidas por role
 */
export const userFixtures = {
  superadmin: createUserFixture({
    id: 1,
    name: 'Super Admin',
    email: 'superadmin@test.com',
    role: 'superadmin',
    districtId: null
  }),

  pastor: createUserFixture({
    id: 2,
    name: 'Pastor Test',
    email: 'pastor@test.com',
    role: 'pastor',
    districtId: 1
  }),

  member: createUserFixture({
    id: 3,
    name: 'Member Test',
    email: 'member@test.com',
    role: 'member',
    districtId: 1
  }),

  missionary: createUserFixture({
    id: 4,
    name: 'Missionary Test',
    email: 'missionary@test.com',
    role: 'missionary',
    districtId: 1
  }),

  interested: createUserFixture({
    id: 5,
    name: 'Interested Test',
    email: 'interested@test.com',
    role: 'interested',
    isApproved: false,
    status: 'pending',
    firstAccess: true,
    districtId: 1
  }),

  adminReadonly: createUserFixture({
    id: 6,
    name: 'Readonly Admin',
    email: 'readonly@test.com',
    role: 'admin_readonly',
    districtId: 1
  }),

  nullUser: null as TestUser | null,

  undefinedUser: undefined as TestUser | undefined
};

/**
 * Fixtures de requisição de login
 */
export const loginFixtures = {
  validCredentials: {
    email: 'member@test.com',
    password: 'password123'
  },

  invalidEmail: {
    email: 'notexist@test.com',
    password: 'password123'
  },

  invalidPassword: {
    email: 'member@test.com',
    password: 'wrongpassword'
  },

  emptyCredentials: {
    email: '',
    password: ''
  },

  defaultPassword: {
    email: 'newuser@test.com',
    password: 'meu7care' // Senha padrão
  }
};

/**
 * Fixtures de criação de usuário
 */
export const createUserRequestFixtures = {
  validMember: {
    name: 'New Member',
    email: 'newmember@test.com',
    password: 'securepass123',
    role: 'member',
    church: 'Test Church'
  },

  validInterested: {
    name: 'New Interested',
    email: 'newinterested@test.com',
    role: 'interested',
    church: 'Test Church'
  },

  duplicateEmail: {
    name: 'Duplicate User',
    email: 'member@test.com', // Email já existe
    password: 'password123',
    role: 'member'
  },

  invalidRole: {
    name: 'Invalid Role User',
    email: 'invalid@test.com',
    password: 'password123',
    role: 'admin' // Role inválida
  },

  missingRequired: {
    email: 'incomplete@test.com'
    // Falta name
  }
};

/**
 * Cenários de permissão para testes
 */
export const permissionScenarios = {
  // Superadmin pode tudo
  superadminAccess: {
    user: userFixtures.superadmin,
    expectedAccess: {
      hasAdminAccess: true,
      isSuperAdmin: true,
      isPastor: false,
      canManagePastors: true,
      canAccessAllChurches: true
    }
  },

  // Pastor tem acesso admin mas limitado ao distrito
  pastorAccess: {
    user: userFixtures.pastor,
    expectedAccess: {
      hasAdminAccess: true,
      isSuperAdmin: false,
      isPastor: true,
      canManagePastors: false,
      canAccessAllChurches: false
    }
  },

  // Membro não tem acesso admin
  memberAccess: {
    user: userFixtures.member,
    expectedAccess: {
      hasAdminAccess: false,
      isSuperAdmin: false,
      isPastor: false,
      canManagePastors: false,
      canAccessAllChurches: false
    }
  },

  // Usuário nulo não tem acesso
  nullAccess: {
    user: null,
    expectedAccess: {
      hasAdminAccess: false,
      isSuperAdmin: false,
      isPastor: false,
      canManagePastors: false,
      canAccessAllChurches: false
    }
  }
};

export default userFixtures;
