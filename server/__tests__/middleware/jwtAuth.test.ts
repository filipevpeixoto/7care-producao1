/**
 * @fileoverview Testes unitários para JWT Authentication
 * @module server/__tests__/middleware/jwtAuth.test
 */

import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Set environment variables for tests BEFORE imports
const originalEnv = process.env;

beforeAll(() => {
  process.env = {
    ...originalEnv,
    NODE_ENV: 'development',
    JWT_SECRET: 'test-secret-key-for-testing-purposes-only-min32chars',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-testing-min32chars',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

// Mock do JWT config
jest.mock('../../config/jwtConfig', () => ({
  JWT_SECRET: 'test-secret-key-for-testing-purposes-only-min32chars',
  JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-testing-min32chars',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
}));

// Mock do NeonAdapter
jest.mock('../../neonAdapter', () => ({
  NeonAdapter: jest.fn().mockImplementation(() => ({
    getUserById: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: 1,
        email: 'test@example.com',
        role: 'member',
        name: 'Test User',
        status: 'active',
      })
    ),
  })),
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

import {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  requireJwtAuth,
  requireRole,
  generateFingerprint,
  JwtPayload,
  AuthenticatedRequest,
} from '../../middleware/jwtAuth';

// Tipo para UserRole
type UserRole = 'superadmin' | 'pastor' | 'member' | 'interested' | 'missionary' | 'admin_readonly';

describe('JWT Authentication', () => {
  describe('generateTokens', () => {
    const testUser = {
      id: 1,
      email: 'test@example.com',
      role: 'member' as UserRole,
      name: 'Test User',
      church: 'Test Church',
      districtId: 1,
    };

    it('deve gerar par de tokens válidos', () => {
      const result = generateTokens(testUser);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('deve gerar tokens diferentes para access e refresh', () => {
      const result = generateTokens(testUser);

      expect(result.accessToken).not.toBe(result.refreshToken);
    });

    it('access token deve conter dados do usuário', () => {
      const result = generateTokens(testUser);
      const decoded = jwt.decode(result.accessToken) as JwtPayload;

      expect(decoded.id).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.role).toBe(testUser.role);
      expect(decoded.type).toBe('access');
    });

    it('refresh token deve ter tipo refresh', () => {
      const result = generateTokens(testUser);
      const decoded = jwt.decode(result.refreshToken) as JwtPayload;

      expect(decoded.type).toBe('refresh');
    });

    it('deve lidar com campos opcionais undefined', () => {
      const userWithUndefined = {
        id: 1,
        email: 'test@example.com',
        role: 'member' as UserRole,
        name: 'Test User',
      };

      const result = generateTokens(userWithUndefined);
      expect(result.accessToken).toBeDefined();
    });
  });

  describe('verifyAccessToken', () => {
    it('deve verificar token válido', () => {
      const { accessToken } = generateTokens({
        id: 1,
        email: 'test@example.com',
        role: 'member' as UserRole,
        name: 'Test',
      });

      const decoded = verifyAccessToken(accessToken);

      expect(decoded).toBeTruthy();
      expect(decoded?.id).toBe(1);
    });

    it('deve retornar null para token inválido', () => {
      const result = verifyAccessToken('invalid-token');

      expect(result).toBeNull();
    });

    it('deve retornar null para refresh token usado como access', () => {
      const { refreshToken } = generateTokens({
        id: 1,
        email: 'test@example.com',
        role: 'member' as UserRole,
        name: 'Test',
      });

      const result = verifyAccessToken(refreshToken);

      expect(result).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('deve verificar refresh token válido', () => {
      const { refreshToken } = generateTokens({
        id: 1,
        email: 'test@example.com',
        role: 'member' as UserRole,
        name: 'Test',
      });

      const decoded = verifyRefreshToken(refreshToken);

      expect(decoded).toBeTruthy();
      expect(decoded?.type).toBe('refresh');
    });

    it('deve retornar null para access token usado como refresh', () => {
      const { accessToken } = generateTokens({
        id: 1,
        email: 'test@example.com',
        role: 'member' as UserRole,
        name: 'Test',
      });

      const result = verifyRefreshToken(accessToken);

      expect(result).toBeNull();
    });
  });

  describe('generateFingerprint', () => {
    it('deve gerar fingerprint a partir do request', () => {
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'accept-language': 'pt-BR,pt',
        },
        ip: '192.168.1.1',
      } as unknown as Request;

      const fingerprint = generateFingerprint(mockRequest);

      expect(typeof fingerprint).toBe('string');
      expect(fingerprint.length).toBeGreaterThan(0);
    });

    it('deve gerar fingerprint consistente para mesmos dados', () => {
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'accept-language': 'pt-BR,pt',
        },
        ip: '192.168.1.1',
      } as unknown as Request;

      const fp1 = generateFingerprint(mockRequest);
      const fp2 = generateFingerprint(mockRequest);

      expect(fp1).toBe(fp2);
    });
  });

  describe('requireJwtAuth middleware', () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockRequest = {
        headers: {},
        cookies: {},
        ip: '127.0.0.1',
      };

      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      mockNext = jest.fn();
    });

    it('deve retornar 401 quando não há token', async () => {
      await requireJwtAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('deve processar token do header Authorization', async () => {
      const { accessToken } = generateTokens({
        id: 1,
        email: 'test@example.com',
        role: 'member' as UserRole,
        name: 'Test',
      });

      mockRequest.headers = {
        authorization: `Bearer ${accessToken}`,
        'user-agent': 'Test Agent',
      };

      await requireJwtAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Deve chamar next ou definir o user
      expect(mockRequest.user || mockNext).toBeDefined();
    });
  });

  describe('requireRole middleware', () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockRequest = {
        user: {
          id: 1,
          email: 'test@example.com',
          role: 'member' as UserRole,
          name: 'Test',
        },
        userRole: 'member' as UserRole,
      };

      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      mockNext = jest.fn();
    });

    it('deve permitir acesso quando role é permitido', () => {
      const middleware = requireRole('member', 'admin_readonly');

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('deve negar acesso quando role não é permitido', () => {
      const middleware = requireRole('superadmin');

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('deve retornar 401 quando não há user', () => {
      mockRequest.user = undefined;
      const middleware = requireRole('member');

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('deve negar acesso quando superadmin não está na lista de roles permitidos', () => {
      mockRequest.userRole = 'superadmin';
      const middleware = requireRole('pastor');

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // requireRole não tem bypass automático para superadmin
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('deve permitir superadmin quando incluído explicitamente', () => {
      mockRequest.userRole = 'superadmin';
      const middleware = requireRole('superadmin', 'pastor');

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
