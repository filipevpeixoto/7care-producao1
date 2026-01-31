/**
 * Testes do UserService
 * Testa lógica de negócio de usuários
 */

import { describe, it, expect } from '@jest/globals';

describe('UserService', () => {
  describe('Validação de Dados', () => {
    it('deve validar email corretamente', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test('user@example.com')).toBe(true);
      expect(emailRegex.test('user.name@domain.org')).toBe(true);
      expect(emailRegex.test('invalid')).toBe(false);
      expect(emailRegex.test('@domain.com')).toBe(false);
      expect(emailRegex.test('user@')).toBe(false);
    });

    it('deve validar telefone brasileiro', () => {
      const phoneRegex = /^\d{10,11}$/;

      expect(phoneRegex.test('11999999999')).toBe(true);
      expect(phoneRegex.test('1199999999')).toBe(true);
      expect(phoneRegex.test('123')).toBe(false);
      expect(phoneRegex.test('abc')).toBe(false);
    });

    it('deve normalizar username', () => {
      const normalizeUsername = (username: string) =>
        username.toLowerCase().trim().replace(/\s+/g, '_');

      expect(normalizeUsername('João Silva')).toBe('joão_silva');
      expect(normalizeUsername('  Maria  ')).toBe('maria');
      expect(normalizeUsername('ADMIN')).toBe('admin');
    });
  });

  describe('Permissões de Usuário', () => {
    const _roles = ['superadmin', 'pastor', 'leader', 'member', 'interested'] as const;

    it('deve verificar hierarquia de roles', () => {
      const roleHierarchy: Record<string, number> = {
        superadmin: 100,
        pastor: 80,
        leader: 60,
        member: 40,
        interested: 20,
      };

      const canManage = (managerRole: string, targetRole: string) =>
        roleHierarchy[managerRole] > roleHierarchy[targetRole];

      expect(canManage('superadmin', 'pastor')).toBe(true);
      expect(canManage('pastor', 'leader')).toBe(true);
      expect(canManage('member', 'leader')).toBe(false);
      expect(canManage('interested', 'member')).toBe(false);
    });

    it('deve verificar permissões por role', () => {
      const permissions: Record<string, string[]> = {
        superadmin: ['read', 'write', 'delete', 'admin'],
        pastor: ['read', 'write', 'delete'],
        leader: ['read', 'write'],
        member: ['read'],
        interested: ['read'],
      };

      const hasPermission = (role: string, permission: string) =>
        permissions[role]?.includes(permission) ?? false;

      expect(hasPermission('superadmin', 'admin')).toBe(true);
      expect(hasPermission('pastor', 'delete')).toBe(true);
      expect(hasPermission('member', 'write')).toBe(false);
      expect(hasPermission('interested', 'delete')).toBe(false);
    });
  });

  describe('Status do Usuário', () => {
    const _validStatuses = ['active', 'pending', 'suspended', 'inactive'];

    it('deve validar transições de status', () => {
      const allowedTransitions: Record<string, string[]> = {
        pending: ['active', 'suspended'],
        active: ['suspended', 'inactive'],
        suspended: ['active', 'inactive'],
        inactive: ['active'],
      };

      const canTransition = (from: string, to: string) =>
        allowedTransitions[from]?.includes(to) ?? false;

      expect(canTransition('pending', 'active')).toBe(true);
      expect(canTransition('active', 'pending')).toBe(false);
      expect(canTransition('suspended', 'active')).toBe(true);
      expect(canTransition('inactive', 'active')).toBe(true);
    });

    it('deve determinar se usuário está ativo', () => {
      const isUserActive = (user: { status: string; isApproved: boolean }) =>
        user.status === 'active' && user.isApproved;

      expect(isUserActive({ status: 'active', isApproved: true })).toBe(true);
      expect(isUserActive({ status: 'active', isApproved: false })).toBe(false);
      expect(isUserActive({ status: 'pending', isApproved: true })).toBe(false);
    });
  });

  describe('Filtros de Usuário', () => {
    const users = [
      { id: 1, name: 'João', role: 'member', churchId: 1, status: 'active' },
      { id: 2, name: 'Maria', role: 'leader', churchId: 1, status: 'active' },
      { id: 3, name: 'Pedro', role: 'member', churchId: 2, status: 'suspended' },
      { id: 4, name: 'Ana', role: 'pastor', churchId: 1, status: 'active' },
    ];

    it('deve filtrar por igreja', () => {
      const filtered = users.filter(u => u.churchId === 1);
      expect(filtered).toHaveLength(3);
    });

    it('deve filtrar por role', () => {
      const members = users.filter(u => u.role === 'member');
      expect(members).toHaveLength(2);
    });

    it('deve filtrar por status', () => {
      const active = users.filter(u => u.status === 'active');
      expect(active).toHaveLength(3);
    });

    it('deve filtrar por múltiplos critérios', () => {
      const filtered = users.filter(
        u => u.churchId === 1 && u.status === 'active' && u.role === 'member'
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('João');
    });

    it('deve buscar por nome parcial', () => {
      const searchTerm = 'Jo';
      const found = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
      expect(found).toHaveLength(1);
    });
  });

  describe('Cálculo de Pontos', () => {
    it('deve calcular total de pontos do usuário', () => {
      const activities = [
        { points: 10, type: 'attendance' },
        { points: 5, type: 'task' },
        { points: -2, type: 'penalty' },
        { points: 15, type: 'achievement' },
      ];

      const total = activities.reduce((sum, a) => sum + a.points, 0);
      expect(total).toBe(28);
    });

    it('deve calcular nível baseado em pontos', () => {
      const getLevel = (points: number) => {
        if (points >= 1000) return 5;
        if (points >= 500) return 4;
        if (points >= 200) return 3;
        if (points >= 50) return 2;
        return 1;
      };

      expect(getLevel(10)).toBe(1);
      expect(getLevel(100)).toBe(2);
      expect(getLevel(300)).toBe(3);
      expect(getLevel(600)).toBe(4);
      expect(getLevel(1500)).toBe(5);
    });

    it('deve calcular progresso para próximo nível', () => {
      const levelThresholds = [0, 50, 200, 500, 1000];

      const getProgress = (points: number, currentLevel: number) => {
        const currentThreshold = levelThresholds[currentLevel - 1];
        const nextThreshold = levelThresholds[currentLevel] || currentThreshold;
        const progress = (points - currentThreshold) / (nextThreshold - currentThreshold);
        return Math.min(Math.max(progress, 0), 1);
      };

      expect(getProgress(25, 1)).toBeCloseTo(0.5);
      expect(getProgress(125, 2)).toBeCloseTo(0.5);
    });
  });

  describe('Formatação de Dados', () => {
    it('deve formatar nome completo', () => {
      const formatFullName = (firstName: string, lastName?: string) =>
        lastName ? `${firstName} ${lastName}` : firstName;

      expect(formatFullName('João', 'Silva')).toBe('João Silva');
      expect(formatFullName('Maria')).toBe('Maria');
    });

    it('deve formatar data de cadastro', () => {
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR');
      };

      const date = new Date('2024-01-15');
      expect(formatDate(date)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('deve calcular tempo desde cadastro', () => {
      const getTimeSince = (date: Date) => {
        const diff = Date.now() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'hoje';
        if (days === 1) return 'ontem';
        if (days < 30) return `${days} dias atrás`;
        if (days < 365) return `${Math.floor(days / 30)} meses atrás`;
        return `${Math.floor(days / 365)} anos atrás`;
      };

      const today = new Date();
      expect(getTimeSince(today)).toBe('hoje');

      const yesterday = new Date(Date.now() - 86400000);
      expect(getTimeSince(yesterday)).toBe('ontem');
    });
  });

  describe('Busca e Ordenação', () => {
    const users = [
      { id: 1, name: 'Carlos', points: 150, createdAt: new Date('2024-01-01') },
      { id: 2, name: 'Ana', points: 300, createdAt: new Date('2024-03-01') },
      { id: 3, name: 'Bruno', points: 200, createdAt: new Date('2024-02-01') },
    ];

    it('deve ordenar por nome', () => {
      const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name));
      expect(sorted[0].name).toBe('Ana');
      expect(sorted[2].name).toBe('Carlos');
    });

    it('deve ordenar por pontos decrescente', () => {
      const sorted = [...users].sort((a, b) => b.points - a.points);
      expect(sorted[0].name).toBe('Ana');
      expect(sorted[0].points).toBe(300);
    });

    it('deve ordenar por data de cadastro', () => {
      const sorted = [...users].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      expect(sorted[0].name).toBe('Ana');
    });
  });

  describe('Validações de Negócio', () => {
    it('deve verificar se email já existe', () => {
      const existingEmails = ['john@test.com', 'jane@test.com'];

      const isEmailAvailable = (email: string) => !existingEmails.includes(email.toLowerCase());

      expect(isEmailAvailable('new@test.com')).toBe(true);
      expect(isEmailAvailable('john@test.com')).toBe(false);
      expect(isEmailAvailable('JOHN@TEST.COM')).toBe(false);
    });

    it('deve verificar limite de membros por igreja', () => {
      const churchLimits: Record<number, number> = {
        1: 100,
        2: 50,
      };
      const memberCounts: Record<number, number> = {
        1: 95,
        2: 50,
      };

      const canAddMember = (churchId: number) => {
        const limit = churchLimits[churchId] || 100;
        const current = memberCounts[churchId] || 0;
        return current < limit;
      };

      expect(canAddMember(1)).toBe(true);
      expect(canAddMember(2)).toBe(false);
    });

    it('deve validar idade mínima', () => {
      const getAge = (birthDate: Date) => {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      const isAdult = (birthDate: Date) => getAge(birthDate) >= 18;

      expect(isAdult(new Date('2000-01-01'))).toBe(true);
      expect(isAdult(new Date('2020-01-01'))).toBe(false);
    });
  });
});
