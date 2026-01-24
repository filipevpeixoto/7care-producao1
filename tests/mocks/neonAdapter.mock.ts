/**
 * Mock do NeonAdapter para testes
 * Simula operações de banco de dados sem conexão real
 */

import type { User } from '../../shared/schema';

// Dados de teste
export const mockUsers: User[] = [
  {
    id: 1,
    name: 'Super Admin',
    email: 'superadmin@test.com',
    password: '$2b$10$hashedpassword123', // 'password123' hashed
    role: 'superadmin',
    church: 'Igreja Central',
    churchCode: 'IC001',
    districtId: 1,
    isApproved: true,
    status: 'approved',
    firstAccess: false,
    points: 100,
    level: 'Avançado',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 2,
    name: 'Pastor João',
    email: 'pastor@test.com',
    password: '$2b$10$hashedpassword123',
    role: 'pastor',
    church: 'Igreja Norte',
    churchCode: 'IN001',
    districtId: 1,
    isApproved: true,
    status: 'approved',
    firstAccess: false,
    points: 80,
    level: 'Intermediário',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 3,
    name: 'Maria Membro',
    email: 'member@test.com',
    password: '$2b$10$hashedpassword123',
    role: 'member',
    church: 'Igreja Norte',
    churchCode: 'IN001',
    districtId: 1,
    isApproved: true,
    status: 'approved',
    firstAccess: false,
    points: 50,
    level: 'Iniciante',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },
  {
    id: 4,
    name: 'Carlos Missionário',
    email: 'missionary@test.com',
    password: '$2b$10$hashedpassword123',
    role: 'missionary',
    church: 'Igreja Norte',
    churchCode: 'IN001',
    districtId: 1,
    isApproved: true,
    status: 'approved',
    firstAccess: false,
    points: 70,
    level: 'Intermediário',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15')
  },
  {
    id: 5,
    name: 'Ana Interessada',
    email: 'interested@test.com',
    password: '$2b$10$hashedpassword123',
    role: 'interested',
    church: 'Igreja Norte',
    churchCode: 'IN001',
    districtId: 1,
    isApproved: false,
    status: 'pending',
    firstAccess: true,
    points: 0,
    level: 'Iniciante',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01')
  },
  {
    id: 6,
    name: 'Readonly User',
    email: 'readonly@test.com',
    password: '$2b$10$hashedpassword123',
    role: 'admin_readonly',
    church: 'Igreja Central',
    churchCode: 'IC001',
    districtId: 1,
    isApproved: true,
    status: 'approved',
    firstAccess: false,
    points: 0,
    level: 'Iniciante',
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-03-15')
  }
];

export const mockChurches = [
  {
    id: 1,
    name: 'Igreja Central',
    code: 'IC001',
    districtId: 1,
    address: 'Rua Central, 100',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 2,
    name: 'Igreja Norte',
    code: 'IN001',
    districtId: 1,
    address: 'Rua Norte, 200',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

export const mockDistricts = [
  {
    id: 1,
    name: 'Distrito Central',
    code: 'DC01',
    pastorId: 2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

/**
 * Mock do NeonAdapter
 */
export class MockNeonAdapter {
  private users = [...mockUsers];
  private churches = [...mockChurches];
  private districts = [...mockDistricts];

  // Users
  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const newUser: User = {
      id: this.users.length + 1,
      name: userData.name || '',
      email: userData.email || '',
      password: userData.password || '',
      role: userData.role || 'interested',
      church: userData.church,
      churchCode: userData.churchCode,
      districtId: userData.districtId || null,
      isApproved: userData.isApproved || false,
      status: userData.status || 'pending',
      firstAccess: userData.firstAccess ?? true,
      points: userData.points || 0,
      level: userData.level || 'Iniciante',
      createdAt: new Date(),
      updatedAt: new Date()
    } as User;
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    this.users[index] = { ...this.users[index], ...updates, updatedAt: new Date() };
    return this.users[index];
  }

  async deleteUser(id: number): Promise<boolean> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    this.users.splice(index, 1);
    return true;
  }

  // Churches
  async getAllChurches() {
    return this.churches;
  }

  async getChurchById(id: number) {
    return this.churches.find(c => c.id === id) || null;
  }

  async getChurchByCode(code: string) {
    return this.churches.find(c => c.code === code) || null;
  }

  // Districts
  async getAllDistricts() {
    return this.districts;
  }

  async getDistrictById(id: number) {
    return this.districts.find(d => d.id === id) || null;
  }

  // Reset para limpar estado entre testes
  reset() {
    this.users = [...mockUsers];
    this.churches = [...mockChurches];
    this.districts = [...mockDistricts];
  }
}

// Instância singleton para testes
export const mockStorage = new MockNeonAdapter();

// Factory para criar mock do módulo
export const createNeonAdapterMock = () => ({
  NeonAdapter: jest.fn().mockImplementation(() => mockStorage)
});
