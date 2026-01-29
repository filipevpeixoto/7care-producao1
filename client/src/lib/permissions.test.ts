import { describe, it, expect } from 'vitest';
import {
  hasAdminAccess,
  isSuperAdmin,
  isPastor,
  canManagePastors,
  canAccessAllChurches,
  getRoleDisplayName,
} from './permissions';

describe('permissions', () => {
  describe('hasAdminAccess', () => {
    it('returns true for superadmin', () => {
      expect(hasAdminAccess({ role: 'superadmin' })).toBe(true);
    });

    it('returns true for pastor', () => {
      expect(hasAdminAccess({ role: 'pastor' })).toBe(true);
    });

    it('returns false for missionary', () => {
      expect(hasAdminAccess({ role: 'missionary' })).toBe(false);
    });

    it('returns false for member', () => {
      expect(hasAdminAccess({ role: 'member' })).toBe(false);
    });

    it('returns false for null user', () => {
      expect(hasAdminAccess(null)).toBe(false);
    });

    it('returns false for undefined user', () => {
      expect(hasAdminAccess(undefined)).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    it('returns true for superadmin', () => {
      expect(isSuperAdmin({ role: 'superadmin' })).toBe(true);
    });

    it('returns false for pastor', () => {
      expect(isSuperAdmin({ role: 'pastor' })).toBe(false);
    });

    it('returns false for null', () => {
      expect(isSuperAdmin(null)).toBe(false);
    });
  });

  describe('isPastor', () => {
    it('returns true for pastor', () => {
      expect(isPastor({ role: 'pastor' })).toBe(true);
    });

    it('returns false for superadmin', () => {
      expect(isPastor({ role: 'superadmin' })).toBe(false);
    });

    it('returns false for member', () => {
      expect(isPastor({ role: 'member' })).toBe(false);
    });
  });

  describe('canManagePastors', () => {
    it('returns true only for superadmin', () => {
      expect(canManagePastors({ role: 'superadmin' })).toBe(true);
      expect(canManagePastors({ role: 'pastor' })).toBe(false);
      expect(canManagePastors({ role: 'member' })).toBe(false);
    });
  });

  describe('canAccessAllChurches', () => {
    it('returns true only for superadmin', () => {
      expect(canAccessAllChurches({ role: 'superadmin' })).toBe(true);
      expect(canAccessAllChurches({ role: 'pastor' })).toBe(false);
      expect(canAccessAllChurches({ role: 'member' })).toBe(false);
    });
  });

  describe('getRoleDisplayName', () => {
    it('returns correct display name for each role', () => {
      expect(getRoleDisplayName('superadmin')).toBe('Superadmin');
      expect(getRoleDisplayName('pastor')).toBe('Pastor');
      expect(getRoleDisplayName('missionary')).toBe('Missionário');
      expect(getRoleDisplayName('member')).toBe('Membro');
      expect(getRoleDisplayName('interested')).toBe('Interessado');
    });

    it('returns role itself for unknown role', () => {
      expect(getRoleDisplayName('custom_role')).toBe('custom_role');
    });

    it('returns "Usuário" for undefined role', () => {
      expect(getRoleDisplayName(undefined)).toBe('Usuário');
    });
  });
});
