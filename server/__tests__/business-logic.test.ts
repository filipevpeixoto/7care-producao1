/**
 * Testes para lógica de negócio e utilidades
 */

import { describe, it, expect } from '@jest/globals';

// ===== Funções de Pontuação =====
interface PointsConfig {
  basicPoints: number;
  attendancePoints: number;
  eventPoints: number;
  visitPoints: number;
}

function calculateUserPoints(
  config: PointsConfig,
  activities: { type: string; count: number }[]
): number {
  let total = 0;

  for (const activity of activities) {
    switch (activity.type) {
      case 'basic':
        total += config.basicPoints * activity.count;
        break;
      case 'attendance':
        total += config.attendancePoints * activity.count;
        break;
      case 'event':
        total += config.eventPoints * activity.count;
        break;
      case 'visit':
        total += config.visitPoints * activity.count;
        break;
    }
  }

  return total;
}

function calculateLevel(points: number): string {
  if (points >= 1000) return 'diamond';
  if (points >= 500) return 'gold';
  if (points >= 200) return 'silver';
  if (points >= 50) return 'bronze';
  return 'beginner';
}

// ===== Funções de Permissão =====
type Role = 'super_admin' | 'admin' | 'pastor' | 'missionary' | 'member' | 'interested';

const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 100,
  admin: 80,
  pastor: 60,
  missionary: 40,
  member: 20,
  interested: 10,
};

function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

function canManageUser(managerRole: Role, targetRole: Role): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}

function getVisibleRoles(userRole: Role): Role[] {
  const userLevel = ROLE_HIERARCHY[userRole];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level < userLevel)
    .map(([role]) => role as Role);
}

// ===== Funções de Filtro =====
interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  churchCode: string;
  districtId: number | null;
  isApproved: boolean;
}

function filterUsersByChurch(users: User[], churchCode: string): User[] {
  return users.filter(u => u.churchCode === churchCode);
}

function filterUsersByRole(users: User[], role: Role): User[] {
  return users.filter(u => u.role === role);
}

function filterApprovedUsers(users: User[]): User[] {
  return users.filter(u => u.isApproved);
}

function searchUsers(users: User[], query: string): User[] {
  const lowerQuery = query.toLowerCase();
  return users.filter(
    u => u.name.toLowerCase().includes(lowerQuery) || u.email.toLowerCase().includes(lowerQuery)
  );
}

// ===== Funções de Paginação =====
function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function getPaginationInfo(totalItems: number, page: number, pageSize: number) {
  const totalPages = Math.ceil(totalItems / pageSize);
  return {
    currentPage: page,
    totalPages,
    totalItems,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// ===== Funções de Data =====
function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

function _isBirthdayThisWeek(birthDate: string): boolean {
  const birth = new Date(birthDate);
  const today = new Date();
  const weekFromNow = new Date(today);
  weekFromNow.setDate(today.getDate() + 7);

  // Adjust birth year to current year
  birth.setFullYear(today.getFullYear());

  return birth >= today && birth <= weekFromNow;
}

function getDaysBetween(date1: Date, date2: Date): number {
  const diff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ===== Testes =====

describe('Sistema de Pontuação', () => {
  const defaultConfig: PointsConfig = {
    basicPoints: 10,
    attendancePoints: 25,
    eventPoints: 50,
    visitPoints: 15,
  };

  describe('calculateUserPoints', () => {
    it('should calculate points for basic activities', () => {
      const activities = [{ type: 'basic', count: 5 }];
      expect(calculateUserPoints(defaultConfig, activities)).toBe(50);
    });

    it('should calculate points for attendance', () => {
      const activities = [{ type: 'attendance', count: 4 }];
      expect(calculateUserPoints(defaultConfig, activities)).toBe(100);
    });

    it('should calculate combined points', () => {
      const activities = [
        { type: 'basic', count: 5 },
        { type: 'attendance', count: 4 },
        { type: 'event', count: 2 },
        { type: 'visit', count: 3 },
      ];
      expect(calculateUserPoints(defaultConfig, activities)).toBe(50 + 100 + 100 + 45);
    });

    it('should return 0 for empty activities', () => {
      expect(calculateUserPoints(defaultConfig, [])).toBe(0);
    });

    it('should ignore unknown activity types', () => {
      const activities = [{ type: 'unknown', count: 10 }];
      expect(calculateUserPoints(defaultConfig, activities)).toBe(0);
    });
  });

  describe('calculateLevel', () => {
    it('should return beginner for low points', () => {
      expect(calculateLevel(0)).toBe('beginner');
      expect(calculateLevel(49)).toBe('beginner');
    });

    it('should return bronze for 50+ points', () => {
      expect(calculateLevel(50)).toBe('bronze');
      expect(calculateLevel(199)).toBe('bronze');
    });

    it('should return silver for 200+ points', () => {
      expect(calculateLevel(200)).toBe('silver');
      expect(calculateLevel(499)).toBe('silver');
    });

    it('should return gold for 500+ points', () => {
      expect(calculateLevel(500)).toBe('gold');
      expect(calculateLevel(999)).toBe('gold');
    });

    it('should return diamond for 1000+ points', () => {
      expect(calculateLevel(1000)).toBe('diamond');
      expect(calculateLevel(5000)).toBe('diamond');
    });
  });
});

describe('Sistema de Permissões', () => {
  describe('hasPermission', () => {
    it('should allow super_admin all permissions', () => {
      expect(hasPermission('super_admin', 'super_admin')).toBe(true);
      expect(hasPermission('super_admin', 'admin')).toBe(true);
      expect(hasPermission('super_admin', 'member')).toBe(true);
    });

    it('should allow admin to manage lower roles', () => {
      expect(hasPermission('admin', 'admin')).toBe(true);
      expect(hasPermission('admin', 'pastor')).toBe(true);
      expect(hasPermission('admin', 'super_admin')).toBe(false);
    });

    it('should restrict member permissions', () => {
      expect(hasPermission('member', 'member')).toBe(true);
      expect(hasPermission('member', 'pastor')).toBe(false);
      expect(hasPermission('member', 'admin')).toBe(false);
    });

    it('should restrict interested permissions', () => {
      expect(hasPermission('interested', 'interested')).toBe(true);
      expect(hasPermission('interested', 'member')).toBe(false);
    });
  });

  describe('canManageUser', () => {
    it('should allow super_admin to manage all', () => {
      expect(canManageUser('super_admin', 'admin')).toBe(true);
      expect(canManageUser('super_admin', 'pastor')).toBe(true);
      expect(canManageUser('super_admin', 'member')).toBe(true);
    });

    it('should not allow managing same level', () => {
      expect(canManageUser('admin', 'admin')).toBe(false);
      expect(canManageUser('pastor', 'pastor')).toBe(false);
    });

    it('should not allow managing higher level', () => {
      expect(canManageUser('pastor', 'admin')).toBe(false);
      expect(canManageUser('member', 'missionary')).toBe(false);
    });
  });

  describe('getVisibleRoles', () => {
    it('should return all lower roles for super_admin', () => {
      const roles = getVisibleRoles('super_admin');
      expect(roles).toContain('admin');
      expect(roles).toContain('pastor');
      expect(roles).toContain('member');
      expect(roles).toContain('interested');
      expect(roles).not.toContain('super_admin');
    });

    it('should return limited roles for pastor', () => {
      const roles = getVisibleRoles('pastor');
      expect(roles).toContain('missionary');
      expect(roles).toContain('member');
      expect(roles).toContain('interested');
      expect(roles).not.toContain('admin');
    });

    it('should return minimal roles for member', () => {
      const roles = getVisibleRoles('member');
      expect(roles).toContain('interested');
      expect(roles).not.toContain('member');
    });
  });
});

describe('Filtros de Usuários', () => {
  const sampleUsers: User[] = [
    {
      id: 1,
      name: 'John Admin',
      email: 'john@church.com',
      role: 'admin',
      churchCode: 'CTR',
      districtId: 1,
      isApproved: true,
    },
    {
      id: 2,
      name: 'Jane Pastor',
      email: 'jane@church.com',
      role: 'pastor',
      churchCode: 'CTR',
      districtId: 1,
      isApproved: true,
    },
    {
      id: 3,
      name: 'Bob Member',
      email: 'bob@church.com',
      role: 'member',
      churchCode: 'CTR',
      districtId: 1,
      isApproved: false,
    },
    {
      id: 4,
      name: 'Alice Member',
      email: 'alice@other.com',
      role: 'member',
      churchCode: 'OTH',
      districtId: 2,
      isApproved: true,
    },
  ];

  describe('filterUsersByChurch', () => {
    it('should filter users by church code', () => {
      const result = filterUsersByChurch(sampleUsers, 'CTR');
      expect(result.length).toBe(3);
      expect(result.every(u => u.churchCode === 'CTR')).toBe(true);
    });

    it('should return empty for non-existent church', () => {
      const result = filterUsersByChurch(sampleUsers, 'XYZ');
      expect(result.length).toBe(0);
    });
  });

  describe('filterUsersByRole', () => {
    it('should filter users by role', () => {
      const result = filterUsersByRole(sampleUsers, 'member');
      expect(result.length).toBe(2);
      expect(result.every(u => u.role === 'member')).toBe(true);
    });

    it('should return empty for non-existent role', () => {
      const result = filterUsersByRole(sampleUsers, 'super_admin');
      expect(result.length).toBe(0);
    });
  });

  describe('filterApprovedUsers', () => {
    it('should filter only approved users', () => {
      const result = filterApprovedUsers(sampleUsers);
      expect(result.length).toBe(3);
      expect(result.every(u => u.isApproved)).toBe(true);
    });
  });

  describe('searchUsers', () => {
    it('should search by name', () => {
      const result = searchUsers(sampleUsers, 'john');
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('John Admin');
    });

    it('should search by email', () => {
      const result = searchUsers(sampleUsers, '@other.com');
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Alice Member');
    });

    it('should be case insensitive', () => {
      const result = searchUsers(sampleUsers, 'ALICE');
      expect(result.length).toBe(1);
    });

    it('should return empty for no matches', () => {
      const result = searchUsers(sampleUsers, 'xyz');
      expect(result.length).toBe(0);
    });
  });
});

describe('Paginação', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  describe('paginate', () => {
    it('should return first page', () => {
      const result = paginate(items, 1, 3);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should return middle page', () => {
      const result = paginate(items, 2, 3);
      expect(result).toEqual([4, 5, 6]);
    });

    it('should return last page with remaining items', () => {
      const result = paginate(items, 4, 3);
      expect(result).toEqual([10]);
    });

    it('should return empty for page beyond data', () => {
      const result = paginate(items, 10, 3);
      expect(result).toEqual([]);
    });
  });

  describe('getPaginationInfo', () => {
    it('should calculate pagination info', () => {
      const info = getPaginationInfo(10, 1, 3);
      expect(info.totalPages).toBe(4);
      expect(info.hasNextPage).toBe(true);
      expect(info.hasPrevPage).toBe(false);
    });

    it('should detect last page', () => {
      const info = getPaginationInfo(10, 4, 3);
      expect(info.hasNextPage).toBe(false);
      expect(info.hasPrevPage).toBe(true);
    });

    it('should handle single page', () => {
      const info = getPaginationInfo(3, 1, 10);
      expect(info.totalPages).toBe(1);
      expect(info.hasNextPage).toBe(false);
      expect(info.hasPrevPage).toBe(false);
    });
  });
});

describe('Funções de Data', () => {
  describe('isToday', () => {
    it('should return true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('getDaysBetween', () => {
    it('should calculate days between dates', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-10');
      expect(getDaysBetween(date1, date2)).toBe(9);
    });

    it('should return 0 for same day', () => {
      const date = new Date('2024-01-01');
      expect(getDaysBetween(date, date)).toBe(0);
    });

    it('should work regardless of order', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-10');
      expect(getDaysBetween(date2, date1)).toBe(9);
    });
  });
});

describe('Ordenação e Agrupamento', () => {
  interface Event {
    id: number;
    title: string;
    date: string;
    category: string;
  }

  const events: Event[] = [
    { id: 1, title: 'Culto', date: '2024-01-15', category: 'worship' },
    { id: 2, title: 'Estudo Bíblico', date: '2024-01-10', category: 'study' },
    { id: 3, title: 'Oração', date: '2024-01-20', category: 'prayer' },
    { id: 4, title: 'Jovens', date: '2024-01-12', category: 'youth' },
  ];

  describe('sortByDate', () => {
    const sortByDate = (events: Event[], ascending = true) => {
      return [...events].sort((a, b) => {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return ascending ? diff : -diff;
      });
    };

    it('should sort ascending', () => {
      const sorted = sortByDate(events, true);
      expect(sorted[0].date).toBe('2024-01-10');
      expect(sorted[3].date).toBe('2024-01-20');
    });

    it('should sort descending', () => {
      const sorted = sortByDate(events, false);
      expect(sorted[0].date).toBe('2024-01-20');
      expect(sorted[3].date).toBe('2024-01-10');
    });
  });

  describe('groupByCategory', () => {
    const groupByCategory = (events: Event[]) => {
      return events.reduce(
        (acc, event) => {
          if (!acc[event.category]) {
            acc[event.category] = [];
          }
          acc[event.category].push(event);
          return acc;
        },
        {} as Record<string, Event[]>
      );
    };

    it('should group events by category', () => {
      const grouped = groupByCategory(events);
      expect(Object.keys(grouped)).toEqual(['worship', 'study', 'prayer', 'youth']);
      expect(grouped['worship'].length).toBe(1);
    });
  });
});
