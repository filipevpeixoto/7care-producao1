/**
 * Testes do Sistema de Permissões
 * Cobertura completa das 11 funções de verificação de permissão
 */

import { describe, it, expect } from '@jest/globals';
import {
  hasAdminAccess,
  isSuperAdmin,
  isPastor,
  isPastorOrSuperAdmin,
  canManagePastors,
  canAccessAllChurches,
  canAccessDistrictChurches,
  canCreateUserWithRole,
  canAccessDistrict,
  canImportChurches,
  canImportChurchesToDistrict
} from '../utils/permissions';

import { userFixtures, permissionScenarios } from '../../tests/fixtures/users.fixture';

describe('Permission System', () => {

  // ============================================
  // hasAdminAccess
  // ============================================
  describe('hasAdminAccess', () => {
    it('should return true for superadmin', () => {
      expect(hasAdminAccess(userFixtures.superadmin)).toBe(true);
    });

    it('should return true for pastor', () => {
      expect(hasAdminAccess(userFixtures.pastor)).toBe(true);
    });

    it('should return false for member', () => {
      expect(hasAdminAccess(userFixtures.member)).toBe(false);
    });

    it('should return false for missionary', () => {
      expect(hasAdminAccess(userFixtures.missionary)).toBe(false);
    });

    it('should return false for interested', () => {
      expect(hasAdminAccess(userFixtures.interested)).toBe(false);
    });

    it('should return false for admin_readonly', () => {
      expect(hasAdminAccess(userFixtures.adminReadonly)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(hasAdminAccess(null)).toBe(false);
    });

    it('should return false for undefined user', () => {
      expect(hasAdminAccess(undefined)).toBe(false);
    });

    it('should return false for user without role', () => {
      expect(hasAdminAccess({ id: 1, email: 'test@test.com' })).toBe(false);
    });
  });

  // ============================================
  // isSuperAdmin
  // ============================================
  describe('isSuperAdmin', () => {
    it('should return true only for superadmin', () => {
      expect(isSuperAdmin(userFixtures.superadmin)).toBe(true);
    });

    it('should return false for pastor', () => {
      expect(isSuperAdmin(userFixtures.pastor)).toBe(false);
    });

    it('should return false for member', () => {
      expect(isSuperAdmin(userFixtures.member)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isSuperAdmin(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSuperAdmin(undefined)).toBe(false);
    });
  });

  // ============================================
  // isPastor
  // ============================================
  describe('isPastor', () => {
    it('should return true only for pastor', () => {
      expect(isPastor(userFixtures.pastor)).toBe(true);
    });

    it('should return false for superadmin (superadmin is not pastor)', () => {
      expect(isPastor(userFixtures.superadmin)).toBe(false);
    });

    it('should return false for member', () => {
      expect(isPastor(userFixtures.member)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isPastor(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isPastor(undefined)).toBe(false);
    });
  });

  // ============================================
  // isPastorOrSuperAdmin
  // ============================================
  describe('isPastorOrSuperAdmin', () => {
    it('should return true for superadmin', () => {
      expect(isPastorOrSuperAdmin(userFixtures.superadmin)).toBe(true);
    });

    it('should return true for pastor', () => {
      expect(isPastorOrSuperAdmin(userFixtures.pastor)).toBe(true);
    });

    it('should return false for member', () => {
      expect(isPastorOrSuperAdmin(userFixtures.member)).toBe(false);
    });

    it('should return false for missionary', () => {
      expect(isPastorOrSuperAdmin(userFixtures.missionary)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isPastorOrSuperAdmin(null)).toBe(false);
    });
  });

  // ============================================
  // canManagePastors
  // ============================================
  describe('canManagePastors', () => {
    it('should return true only for superadmin', () => {
      expect(canManagePastors(userFixtures.superadmin)).toBe(true);
    });

    it('should return false for pastor (cannot manage other pastors)', () => {
      expect(canManagePastors(userFixtures.pastor)).toBe(false);
    });

    it('should return false for member', () => {
      expect(canManagePastors(userFixtures.member)).toBe(false);
    });

    it('should return false for null', () => {
      expect(canManagePastors(null)).toBe(false);
    });
  });

  // ============================================
  // canAccessAllChurches
  // ============================================
  describe('canAccessAllChurches', () => {
    it('should return true only for superadmin', () => {
      expect(canAccessAllChurches(userFixtures.superadmin)).toBe(true);
    });

    it('should return false for pastor (limited to district)', () => {
      expect(canAccessAllChurches(userFixtures.pastor)).toBe(false);
    });

    it('should return false for member', () => {
      expect(canAccessAllChurches(userFixtures.member)).toBe(false);
    });

    it('should return false for null', () => {
      expect(canAccessAllChurches(null)).toBe(false);
    });
  });

  // ============================================
  // canAccessDistrictChurches
  // ============================================
  describe('canAccessDistrictChurches', () => {
    const pastorDistrict1 = { ...userFixtures.pastor, districtId: 1 };
    const pastorDistrict2 = { ...userFixtures.pastor, districtId: 2 };

    it('should return true for superadmin accessing any district', () => {
      expect(canAccessDistrictChurches(userFixtures.superadmin, 1)).toBe(true);
      expect(canAccessDistrictChurches(userFixtures.superadmin, 2)).toBe(true);
      expect(canAccessDistrictChurches(userFixtures.superadmin, 999)).toBe(true);
    });

    it('should return true for pastor accessing own district', () => {
      expect(canAccessDistrictChurches(pastorDistrict1, 1)).toBe(true);
    });

    it('should return false for pastor accessing different district', () => {
      expect(canAccessDistrictChurches(pastorDistrict1, 2)).toBe(false);
    });

    it('should return false for member', () => {
      expect(canAccessDistrictChurches(userFixtures.member, 1)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(canAccessDistrictChurches(null, 1)).toBe(false);
    });

    it('should return false for null district', () => {
      expect(canAccessDistrictChurches(pastorDistrict1, null)).toBe(false);
    });

    it('should return true for superadmin even with null district', () => {
      expect(canAccessDistrictChurches(userFixtures.superadmin, null)).toBe(true);
    });
  });

  // ============================================
  // canCreateUserWithRole
  // ============================================
  describe('canCreateUserWithRole', () => {
    describe('superadmin permissions', () => {
      it('should allow creating superadmin', () => {
        expect(canCreateUserWithRole(userFixtures.superadmin, 'superadmin')).toBe(true);
      });

      it('should allow creating pastor', () => {
        expect(canCreateUserWithRole(userFixtures.superadmin, 'pastor')).toBe(true);
      });

      it('should allow creating member', () => {
        expect(canCreateUserWithRole(userFixtures.superadmin, 'member')).toBe(true);
      });

      it('should allow creating missionary', () => {
        expect(canCreateUserWithRole(userFixtures.superadmin, 'missionary')).toBe(true);
      });

      it('should allow creating interested', () => {
        expect(canCreateUserWithRole(userFixtures.superadmin, 'interested')).toBe(true);
      });
    });

    describe('pastor permissions', () => {
      it('should NOT allow creating superadmin', () => {
        expect(canCreateUserWithRole(userFixtures.pastor, 'superadmin')).toBe(false);
      });

      it('should NOT allow creating pastor', () => {
        expect(canCreateUserWithRole(userFixtures.pastor, 'pastor')).toBe(false);
      });

      it('should allow creating member', () => {
        expect(canCreateUserWithRole(userFixtures.pastor, 'member')).toBe(true);
      });

      it('should allow creating missionary', () => {
        expect(canCreateUserWithRole(userFixtures.pastor, 'missionary')).toBe(true);
      });

      it('should allow creating interested', () => {
        expect(canCreateUserWithRole(userFixtures.pastor, 'interested')).toBe(true);
      });
    });

    describe('member permissions', () => {
      it('should NOT allow creating any user', () => {
        expect(canCreateUserWithRole(userFixtures.member, 'member')).toBe(false);
        expect(canCreateUserWithRole(userFixtures.member, 'interested')).toBe(false);
        expect(canCreateUserWithRole(userFixtures.member, 'missionary')).toBe(false);
      });
    });

    describe('null/undefined user', () => {
      it('should return false for null user', () => {
        expect(canCreateUserWithRole(null, 'member')).toBe(false);
      });

      it('should return false for undefined user', () => {
        expect(canCreateUserWithRole(undefined, 'member')).toBe(false);
      });
    });
  });

  // ============================================
  // canAccessDistrict
  // ============================================
  describe('canAccessDistrict', () => {
    const pastorDistrict1 = { ...userFixtures.pastor, districtId: 1 };

    it('should return true for superadmin accessing any district', () => {
      expect(canAccessDistrict(userFixtures.superadmin, 1)).toBe(true);
      expect(canAccessDistrict(userFixtures.superadmin, 2)).toBe(true);
      expect(canAccessDistrict(userFixtures.superadmin, null)).toBe(true);
    });

    it('should return true for pastor accessing own district', () => {
      expect(canAccessDistrict(pastorDistrict1, 1)).toBe(true);
    });

    it('should return false for pastor accessing different district', () => {
      expect(canAccessDistrict(pastorDistrict1, 2)).toBe(false);
    });

    it('should return false for member', () => {
      expect(canAccessDistrict(userFixtures.member, 1)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(canAccessDistrict(null, 1)).toBe(false);
    });
  });

  // ============================================
  // canImportChurches
  // ============================================
  describe('canImportChurches', () => {
    it('should return true for superadmin', () => {
      expect(canImportChurches(userFixtures.superadmin)).toBe(true);
    });

    it('should return true for pastor', () => {
      expect(canImportChurches(userFixtures.pastor)).toBe(true);
    });

    it('should return false for member', () => {
      expect(canImportChurches(userFixtures.member)).toBe(false);
    });

    it('should return false for missionary', () => {
      expect(canImportChurches(userFixtures.missionary)).toBe(false);
    });

    it('should return false for null', () => {
      expect(canImportChurches(null)).toBe(false);
    });
  });

  // ============================================
  // canImportChurchesToDistrict
  // ============================================
  describe('canImportChurchesToDistrict', () => {
    const pastorDistrict1 = { ...userFixtures.pastor, districtId: 1 };

    it('should return true for superadmin importing to any district', () => {
      expect(canImportChurchesToDistrict(userFixtures.superadmin, 1)).toBe(true);
      expect(canImportChurchesToDistrict(userFixtures.superadmin, 2)).toBe(true);
      expect(canImportChurchesToDistrict(userFixtures.superadmin, null)).toBe(true);
    });

    it('should return true for pastor importing to own district', () => {
      expect(canImportChurchesToDistrict(pastorDistrict1, 1)).toBe(true);
    });

    it('should return false for pastor importing to different district', () => {
      expect(canImportChurchesToDistrict(pastorDistrict1, 2)).toBe(false);
    });

    it('should return false for member', () => {
      expect(canImportChurchesToDistrict(userFixtures.member, 1)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(canImportChurchesToDistrict(null, 1)).toBe(false);
    });
  });

  // ============================================
  // Integration: Permission Scenarios
  // ============================================
  describe('Permission Scenarios Integration', () => {
    Object.entries(permissionScenarios).forEach(([scenarioName, scenario]) => {
      describe(`Scenario: ${scenarioName}`, () => {
        it('should match expected hasAdminAccess', () => {
          expect(hasAdminAccess(scenario.user)).toBe(scenario.expectedAccess.hasAdminAccess);
        });

        it('should match expected isSuperAdmin', () => {
          expect(isSuperAdmin(scenario.user)).toBe(scenario.expectedAccess.isSuperAdmin);
        });

        it('should match expected isPastor', () => {
          expect(isPastor(scenario.user)).toBe(scenario.expectedAccess.isPastor);
        });

        it('should match expected canManagePastors', () => {
          expect(canManagePastors(scenario.user)).toBe(scenario.expectedAccess.canManagePastors);
        });

        it('should match expected canAccessAllChurches', () => {
          expect(canAccessAllChurches(scenario.user)).toBe(scenario.expectedAccess.canAccessAllChurches);
        });
      });
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle user with empty role string', () => {
      const userEmptyRole = { id: 1, email: 'test@test.com', role: '' as any };
      expect(hasAdminAccess(userEmptyRole)).toBe(false);
      expect(isSuperAdmin(userEmptyRole)).toBe(false);
      expect(isPastor(userEmptyRole)).toBe(false);
    });

    it('should handle user with invalid role', () => {
      const userInvalidRole = { id: 1, email: 'test@test.com', role: 'invalid_role' as any };
      expect(hasAdminAccess(userInvalidRole)).toBe(false);
      expect(isSuperAdmin(userInvalidRole)).toBe(false);
      expect(isPastor(userInvalidRole)).toBe(false);
    });

    it('should handle user with only required fields', () => {
      const minimalUser = { role: 'superadmin' as const };
      expect(hasAdminAccess(minimalUser)).toBe(true);
      expect(isSuperAdmin(minimalUser)).toBe(true);
    });

    it('should be case sensitive for roles', () => {
      const upperCaseRole = { role: 'SUPERADMIN' as any };
      const mixedCaseRole = { role: 'SuperAdmin' as any };

      expect(isSuperAdmin(upperCaseRole)).toBe(false);
      expect(isSuperAdmin(mixedCaseRole)).toBe(false);
    });

    it('should handle numeric districtId comparison', () => {
      const pastor = { role: 'pastor' as const, districtId: 1 };

      // String vs number comparison
      expect(canAccessDistrict(pastor, 1)).toBe(true);
      // @ts-ignore - Testing runtime behavior with wrong type
      expect(canAccessDistrict(pastor, '1')).toBe(false); // Strict equality
    });
  });
});
