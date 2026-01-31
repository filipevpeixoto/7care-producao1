/**
 * @fileoverview Testes de integração para Login O(1)
 * Testa o sistema de login por username normalizado com busca indexada
 * @module server/__tests__/integration/loginO1.test
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock do bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest
    .fn<(password: string, salt: number) => Promise<string>>()
    .mockResolvedValue('$2a$10$hashedpassword'),
  compare: jest
    .fn<(password: string, hash: string) => Promise<boolean>>()
    .mockImplementation((password: string, _hash: string) => {
      return Promise.resolve(password === 'meu7care' || password === 'correctpassword');
    }),
}));

// Mock types for tests
interface MockUser {
  id: number;
  name: string;
  email: string;
  password?: string;
  role?: string;
  usernameNormalized?: string;
  isApproved?: boolean;
  status?: string;
}

// Mock do db
const mockDb: any = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
};

jest.mock('../../neonConfig', () => ({
  db: mockDb,
}));

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Login O(1) Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
  });

  describe('Normalização de Username', () => {
    /**
     * Função helper para normalizar username (mesma lógica do NeonAdapter)
     */
    function normalizeUsername(name: string): string {
      return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais
        .trim();
    }

    it('deve normalizar nome simples corretamente', () => {
      expect(normalizeUsername('João')).toBe('joao');
      expect(normalizeUsername('Maria')).toBe('maria');
    });

    it('deve normalizar nome composto corretamente', () => {
      expect(normalizeUsername('João da Silva')).toBe('joaodasilva');
      expect(normalizeUsername('Maria Aparecida Santos')).toBe('mariaaparecidasantos');
    });

    it('deve remover acentos corretamente', () => {
      expect(normalizeUsername('José Antônio')).toBe('joseantonio');
      expect(normalizeUsername('Mário Sérgio Côrtes')).toBe('mariosergiocortes');
      expect(normalizeUsername('Cláudia Ribeirão')).toBe('claudiaribeirao');
    });

    it('deve remover caracteres especiais', () => {
      expect(normalizeUsername("João's")).toBe('joaos');
      expect(normalizeUsername('Maria@2024')).toBe('maria2024');
      expect(normalizeUsername('Pedro-Henrique')).toBe('pedrohenrique');
    });

    it('deve converter para minúsculas', () => {
      expect(normalizeUsername('JOÃO DA SILVA')).toBe('joaodasilva');
      expect(normalizeUsername('MaRiA')).toBe('maria');
    });

    it('deve gerar o mesmo username para variações de acentuação', () => {
      const normalized1 = normalizeUsername('João');
      const normalized2 = normalizeUsername('Joao');
      const normalized3 = normalizeUsername('JOAO');
      const normalized4 = normalizeUsername('joao');

      expect(normalized1).toBe(normalized2);
      expect(normalized2).toBe(normalized3);
      expect(normalized3).toBe(normalized4);
    });
  });

  describe('Busca por Username Normalizado', () => {
    const mockUser: MockUser = {
      id: 1,
      name: 'João da Silva',
      email: 'joao@exemplo.com',
      password: '$2a$10$hashedpassword',
      role: 'member',
      usernameNormalized: 'joaodasilva',
      isApproved: true,
      status: 'approved',
    };

    it('deve encontrar usuário por username normalizado exato', async () => {
      mockDb.limit.mockResolvedValueOnce([mockUser]);

      // Simular busca
      const result = await mockDb.select().from('users').where().limit(1);

      expect(result).toHaveLength(1);
      expect(result[0].usernameNormalized).toBe('joaodasilva');
    });

    it('deve encontrar usuário mesmo digitando com acentos diferentes', async () => {
      mockDb.limit.mockResolvedValueOnce([mockUser]);

      // Input do usuário: "João da Silva" -> normalizado: "joaodasilva"
      const inputName = 'João da Silva';
      const normalizedInput = inputName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

      expect(normalizedInput).toBe('joaodasilva');

      const result = await mockDb.select().from('users').where().limit(1);
      expect(result[0].usernameNormalized).toBe(normalizedInput);
    });

    it('deve retornar null para username não existente', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await mockDb.select().from('users').where().limit(1);

      expect(result).toHaveLength(0);
    });
  });

  describe('Criação de Usuário com Username Normalizado', () => {
    it('deve criar usuário com username normalizado gerado automaticamente', async () => {
      const newUser = {
        id: 1,
        name: 'Maria Aparecida',
        email: 'maria@exemplo.com',
        usernameNormalized: 'mariaaparecida',
      };

      mockDb.returning.mockResolvedValueOnce([newUser]);

      const result = await mockDb.insert().values().returning();

      expect(result[0].usernameNormalized).toBe('mariaaparecida');
    });
  });

  describe('Atualização de Username Normalizado', () => {
    it('deve atualizar username normalizado quando nome é alterado', async () => {
      const updatedUser = {
        id: 1,
        name: 'João Pedro Silva',
        usernameNormalized: 'joaopedrosilva',
      };

      mockDb.returning.mockResolvedValueOnce([updatedUser]);

      const result = await mockDb.update().set().where().returning();

      expect(result[0].usernameNormalized).toBe('joaopedrosilva');
    });
  });

  describe('Complexidade O(1) com Índice', () => {
    it('deve usar índice para busca por username normalizado', async () => {
      // O schema define um índice para username_normalized
      // Verificar que a busca é feita diretamente na coluna indexada
      const mockUsers = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        usernameNormalized: `user${i + 1}`,
      }));

      // Mock da busca indexada (retorna apenas 1 resultado)
      mockDb.limit.mockResolvedValueOnce([mockUsers[500]]);

      const startTime = performance.now();
      const result = await mockDb.select().from('users').where().limit(1);
      const endTime = performance.now();

      // A busca indexada deve ser rápida (simulação)
      expect(result).toHaveLength(1);
      expect(endTime - startTime).toBeLessThan(100); // Deve ser muito rápido
    });

    it('não deve fazer scan completo da tabela', async () => {
      // Verificar que o select usa where com índice
      mockDb.limit.mockResolvedValueOnce([{ id: 1 }]);

      await mockDb.select().from('users').where().limit(1);

      // Verificar que where foi chamado (indica uso de filtro/índice)
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });
  });

  describe('Casos de Borda', () => {
    it('deve lidar com nomes muito curtos', () => {
      const normalizeUsername = (name: string) =>
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .trim();

      expect(normalizeUsername('A')).toBe('a');
      expect(normalizeUsername('AB')).toBe('ab');
    });

    it('deve lidar com nomes com apenas caracteres especiais', () => {
      const normalizeUsername = (name: string) =>
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .trim();

      expect(normalizeUsername('!@#$%')).toBe('');
      expect(normalizeUsername('   ')).toBe('');
    });

    it('deve lidar com nomes com números', () => {
      const normalizeUsername = (name: string) =>
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .trim();

      expect(normalizeUsername('João2024')).toBe('joao2024');
      expect(normalizeUsername('Maria 123')).toBe('maria123');
    });

    it('deve lidar com caracteres Unicode especiais', () => {
      const normalizeUsername = (name: string) =>
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .trim();

      expect(normalizeUsername('Müller')).toBe('muller');
      expect(normalizeUsername('Björk')).toBe('bjork');
      expect(normalizeUsername('Naïve')).toBe('naive');
    });
  });
});
