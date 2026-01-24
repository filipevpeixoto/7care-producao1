/**
 * Testes para funções de autenticação
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock do localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Funções de Autenticação', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Estado inicial', () => {
    it('deve retornar usuário null quando não logado', () => {
      const getStoredUser = () => {
        const stored = localStorage.getItem('7care_user');
        return stored ? JSON.parse(stored) : null;
      };

      const user = getStoredUser();
      expect(user).toBeNull();
    });

    it('deve recuperar usuário do localStorage se existir', () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'member',
      };
      localStorage.setItem('7care_user', JSON.stringify(mockUser));

      const stored = localStorage.getItem('7care_user');
      const user = stored ? JSON.parse(stored) : null;
      
      expect(user).toEqual(mockUser);
      expect(user.id).toBe(1);
      expect(user.role).toBe('member');
    });
  });

  describe('Logout', () => {
    it('deve limpar dados ao fazer logout', () => {
      localStorage.setItem('7care_user', JSON.stringify({ id: 1 }));
      localStorage.setItem('7care_token', 'fake-token');

      localStorage.removeItem('7care_user');
      localStorage.removeItem('7care_token');

      expect(localStorage.getItem('7care_user')).toBeNull();
      expect(localStorage.getItem('7care_token')).toBeNull();
    });
  });

  describe('Permissões', () => {
    it('deve identificar superadmin corretamente', () => {
      const isSuperAdmin = (role: string) => role === 'superadmin';
      
      expect(isSuperAdmin('superadmin')).toBe(true);
      expect(isSuperAdmin('pastor')).toBe(false);
      expect(isSuperAdmin('member')).toBe(false);
    });

    it('deve identificar acesso admin (superadmin ou pastor)', () => {
      const hasAdminAccess = (role: string) => 
        role === 'superadmin' || role === 'pastor';
      
      expect(hasAdminAccess('superadmin')).toBe(true);
      expect(hasAdminAccess('pastor')).toBe(true);
      expect(hasAdminAccess('member')).toBe(false);
      expect(hasAdminAccess('interested')).toBe(false);
    });

    it('deve identificar hierarquia de papéis', () => {
      const roleHierarchy: Record<string, number> = {
        superadmin: 4,
        pastor: 3,
        leader: 2,
        member: 1,
        interested: 0,
      };

      const hasRole = (userRole: string, requiredRole: string): boolean => {
        return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
      };

      expect(hasRole('superadmin', 'member')).toBe(true);
      expect(hasRole('pastor', 'leader')).toBe(true);
      expect(hasRole('member', 'pastor')).toBe(false);
      expect(hasRole('interested', 'member')).toBe(false);
    });
  });
});

describe('Token Management', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('deve armazenar token corretamente', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    localStorage.setItem('7care_token', token);
    
    expect(localStorage.getItem('7care_token')).toBe(token);
  });

  it('deve verificar expiração do token', () => {
    const isTokenExpired = (token: string): boolean => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
      } catch {
        return true;
      }
    };

    const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }));
    const expiredToken = `header.${expiredPayload}.signature`;
    expect(isTokenExpired(expiredToken)).toBe(true);

    const validPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    const validToken = `header.${validPayload}.signature`;
    expect(isTokenExpired(validToken)).toBe(false);
  });

  it('deve tratar token inválido como expirado', () => {
    const isTokenExpired = (token: string): boolean => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
      } catch {
        return true;
      }
    };

    expect(isTokenExpired('')).toBe(true);
    expect(isTokenExpired('invalid')).toBe(true);
    expect(isTokenExpired('a.b.c')).toBe(true);
  });
});

describe('Validação de Credenciais', () => {
  it('deve validar formato de email', () => {
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.org')).toBe(true);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
  });

  it('deve validar força da senha', () => {
    const isStrongPassword = (password: string): boolean => {
      const minLength = password.length >= 8;
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[@$!%*?&]/.test(password);
      return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
    };

    expect(isStrongPassword('Test@123')).toBe(true);
    expect(isStrongPassword('MyP@ssw0rd!')).toBe(true);
    expect(isStrongPassword('weak')).toBe(false);
    expect(isStrongPassword('NoSpecial1')).toBe(false);
    expect(isStrongPassword('noupperlower1!')).toBe(false);
  });
});
