/**
 * Testes para shared/auth/jwtUtils
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateFingerprint,
  isSuperAdmin,
  isPastor,
  hasAdminAccess,
  hasRole,
  extractBearerToken,
  type FingerprintRequest,
} from '../../../shared/auth/jwtUtils';

describe('jwtUtils', () => {
  describe('generateFingerprint()', () => {
    it('deve gerar fingerprint a partir de headers', () => {
      const req: FingerprintRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'accept-language': 'pt-BR',
        },
        ip: '192.168.1.1',
      };

      const fingerprint = generateFingerprint(req);

      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe('string');
      expect(fingerprint.length).toBe(16);
    });

    it('deve gerar mesmo fingerprint para mesma request', () => {
      const req: FingerprintRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'accept-language': 'pt-BR',
        },
        ip: '192.168.1.1',
      };

      const fp1 = generateFingerprint(req);
      const fp2 = generateFingerprint(req);

      expect(fp1).toBe(fp2);
    });

    it('deve gerar fingerprints diferentes para requests diferentes', () => {
      const req1: FingerprintRequest = {
        headers: { 'user-agent': 'Chrome' },
        ip: '192.168.1.1',
      };

      const req2: FingerprintRequest = {
        headers: { 'user-agent': 'Firefox' },
        ip: '192.168.1.1',
      };

      const fp1 = generateFingerprint(req1);
      const fp2 = generateFingerprint(req2);

      expect(fp1).not.toBe(fp2);
    });

    it('deve lidar com headers vazios', () => {
      const req: FingerprintRequest = {
        headers: {},
      };

      const fingerprint = generateFingerprint(req);

      expect(fingerprint).toBeDefined();
      expect(fingerprint.length).toBe(16);
    });
  });

  describe('isSuperAdmin()', () => {
    it('deve retornar true para role superadmin', () => {
      const user = { role: 'superadmin', email: 'test@test.com' };
      expect(isSuperAdmin(user)).toBe(true);
    });

    it('deve retornar true para admin@7care.com (compatibilidade)', () => {
      const user = { role: 'admin', email: 'admin@7care.com' };
      expect(isSuperAdmin(user)).toBe(true);
    });

    it('deve retornar false para outras roles', () => {
      const pastor = { role: 'pastor', email: 'test@test.com' };
      const member = { role: 'member', email: 'test@test.com' };

      expect(isSuperAdmin(pastor)).toBe(false);
      expect(isSuperAdmin(member)).toBe(false);
    });

    it('deve retornar false para user null', () => {
      expect(isSuperAdmin(null)).toBe(false);
    });
  });

  describe('isPastor()', () => {
    it('deve retornar true para role pastor', () => {
      const user = { role: 'pastor' };
      expect(isPastor(user)).toBe(true);
    });

    it('deve retornar false para outras roles', () => {
      const superadmin = { role: 'superadmin' };
      const member = { role: 'member' };

      expect(isPastor(superadmin)).toBe(false);
      expect(isPastor(member)).toBe(false);
    });

    it('deve retornar false para user null', () => {
      expect(isPastor(null)).toBe(false);
    });
  });

  describe('hasAdminAccess()', () => {
    it('deve retornar true para superadmin', () => {
      const user = { role: 'superadmin' };
      expect(hasAdminAccess(user)).toBe(true);
    });

    it('deve retornar true para pastor', () => {
      const user = { role: 'pastor' };
      expect(hasAdminAccess(user)).toBe(true);
    });

    it('deve retornar false para member', () => {
      const user = { role: 'member' };
      expect(hasAdminAccess(user)).toBe(false);
    });

    it('deve retornar false para user null', () => {
      expect(hasAdminAccess(null)).toBe(false);
    });
  });

  describe('hasRole()', () => {
    it('deve retornar true quando user tem role permitida', () => {
      const user = { role: 'pastor' };
      expect(hasRole(user, 'pastor', 'superadmin')).toBe(true);
    });

    it('deve retornar false quando user não tem role permitida', () => {
      const user = { role: 'member' };
      expect(hasRole(user, 'pastor', 'superadmin')).toBe(false);
    });

    it('deve retornar false para user null', () => {
      expect(hasRole(null, 'pastor')).toBe(false);
    });

    it('deve retornar false quando user não tem role definida', () => {
      const user = {};
      expect(hasRole(user, 'pastor')).toBe(false);
    });
  });

  describe('extractBearerToken()', () => {
    it('deve extrair token do header Bearer', () => {
      const token = extractBearerToken('Bearer abc123xyz');
      expect(token).toBe('abc123xyz');
    });

    it('deve retornar null para header sem Bearer', () => {
      const token = extractBearerToken('abc123xyz');
      expect(token).toBeNull();
    });

    it('deve retornar null para header vazio', () => {
      const token = extractBearerToken('');
      expect(token).toBeNull();
    });

    it('deve retornar null para header undefined', () => {
      const token = extractBearerToken(undefined);
      expect(token).toBeNull();
    });

    it('deve lidar com espaços extras', () => {
      const token = extractBearerToken('Bearer   abc123xyz   ');
      expect(token).toBe('  abc123xyz   '); // slice(7) mantém espaços após Bearer
    });
  });
});
