/**
 * @fileoverview Testes das constantes do servidor
 * @module server/__tests__/constants.test
 */

import { describe, it, expect } from '@jest/globals';
import {
  PAGINATION,
  UPLOAD,
  RATE_LIMITS,
  CACHE_TTL,
  AUTH,
  VALIDATION,
  GAMIFICATION,
  HTTP_STATUS,
  ROLES,
  DATABASE,
  isProduction,
  isDevelopment,
  isTest,
} from '../constants';

describe('Constantes do Servidor', () => {
  describe('PAGINATION', () => {
    it('deve ter valores válidos de paginação', () => {
      expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
      expect(PAGINATION.MAX_PAGE_SIZE).toBeGreaterThan(PAGINATION.DEFAULT_PAGE_SIZE);
      expect(PAGINATION.MIN_PAGE_SIZE).toBe(1);
    });
  });

  describe('UPLOAD', () => {
    it('deve ter limite de tamanho razoável', () => {
      expect(UPLOAD.MAX_FILE_SIZE).toBeGreaterThan(0);
      expect(UPLOAD.MAX_FILE_SIZE).toBeLessThanOrEqual(50 * 1024 * 1024); // Max 50MB
    });

    it('deve ter tipos MIME permitidos', () => {
      expect(UPLOAD.ALLOWED_MIME_TYPES).toContain('image/jpeg');
      expect(UPLOAD.ALLOWED_MIME_TYPES).toContain('image/png');
    });

    it('deve ter extensões correspondentes aos MIME types', () => {
      expect(UPLOAD.ALLOWED_EXTENSIONS).toContain('.jpg');
      expect(UPLOAD.ALLOWED_EXTENSIONS).toContain('.png');
    });
  });

  describe('RATE_LIMITS', () => {
    it('deve ter limites para rotas gerais', () => {
      expect(RATE_LIMITS.GENERAL.WINDOW_MS).toBeGreaterThan(0);
      expect(RATE_LIMITS.GENERAL.MAX_REQUESTS).toBeGreaterThan(0);
    });

    it('deve ter limites mais restritivos para auth', () => {
      expect(RATE_LIMITS.AUTH.MAX_REQUESTS).toBeLessThan(RATE_LIMITS.GENERAL.MAX_REQUESTS);
    });
  });

  describe('CACHE_TTL', () => {
    it('deve ter TTLs em segundos positivos', () => {
      expect(CACHE_TTL.DISTRICTS).toBeGreaterThan(0);
      expect(CACHE_TTL.CHURCHES).toBeGreaterThan(0);
      expect(CACHE_TTL.DASHBOARD).toBeGreaterThan(0);
    });

    it('deve ter TTL menor para dados mais dinâmicos', () => {
      expect(CACHE_TTL.PROFILE).toBeLessThan(CACHE_TTL.DISTRICTS);
      expect(CACHE_TTL.USERS).toBeLessThan(CACHE_TTL.SETTINGS);
    });
  });

  describe('AUTH', () => {
    it('deve ter configurações de token válidas', () => {
      expect(AUTH.TOKEN_EXPIRY).toBeGreaterThan(0);
      expect(AUTH.REFRESH_TOKEN_EXPIRY).toBeGreaterThan(AUTH.TOKEN_EXPIRY);
    });

    it('deve ter bcrypt rounds seguro', () => {
      expect(AUTH.BCRYPT_ROUNDS).toBeGreaterThanOrEqual(10);
      expect(AUTH.BCRYPT_ROUNDS).toBeLessThanOrEqual(15); // Não muito lento
    });

    it('deve ter tamanho mínimo de senha razoável', () => {
      expect(AUTH.MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(8);
    });
  });

  describe('VALIDATION', () => {
    it('deve ter limites de texto definidos', () => {
      expect(VALIDATION.TEXT.NAME_MIN).toBeGreaterThan(0);
      expect(VALIDATION.TEXT.NAME_MAX).toBeGreaterThan(VALIDATION.TEXT.NAME_MIN);
    });

    it('deve ter padrões regex válidos', () => {
      expect(VALIDATION.PATTERNS.PHONE).toBeInstanceOf(RegExp);
      expect(VALIDATION.PATTERNS.CPF).toBeInstanceOf(RegExp);
      expect(VALIDATION.PATTERNS.CEP).toBeInstanceOf(RegExp);
    });

    it('deve validar CPF corretamente', () => {
      expect('123.456.789-00').toMatch(VALIDATION.PATTERNS.CPF);
      expect('12345678900').toMatch(VALIDATION.PATTERNS.CPF);
    });
  });

  describe('GAMIFICATION', () => {
    it('deve ter pontos positivos para ações', () => {
      expect(GAMIFICATION.POINTS.ATTENDANCE).toBeGreaterThan(0);
      expect(GAMIFICATION.POINTS.TASK_COMPLETE).toBeGreaterThan(0);
    });
  });

  describe('HTTP_STATUS', () => {
    it('deve ter códigos HTTP padrão', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });

  describe('ROLES', () => {
    it('deve ter todos os perfis do sistema', () => {
      expect(ROLES.SUPERADMIN).toBe('superadmin');
      expect(ROLES.PASTOR).toBe('pastor');
      expect(ROLES.MEMBER).toBe('member');
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.LEADER).toBe('leader');
    });
  });

  describe('DATABASE', () => {
    it('deve ter configurações de pool', () => {
      expect(DATABASE.POOL.MIN_CONNECTIONS).toBeGreaterThanOrEqual(0);
      expect(DATABASE.POOL.MAX_CONNECTIONS).toBeGreaterThan(DATABASE.POOL.MIN_CONNECTIONS);
    });

    it('deve ter timeout razoável', () => {
      expect(DATABASE.POOL.CONNECTION_TIMEOUT_MS).toBeGreaterThan(0);
      expect(DATABASE.POOL.IDLE_TIMEOUT_MS).toBeGreaterThan(0);
    });

    it('deve ter configuração de retry', () => {
      expect(DATABASE.RETRY.MAX_ATTEMPTS).toBeGreaterThan(0);
      expect(DATABASE.RETRY.INITIAL_DELAY_MS).toBeGreaterThan(0);
    });
  });

  describe('Environment helpers', () => {
    it('deve retornar boolean para isProduction', () => {
      expect(typeof isProduction()).toBe('boolean');
    });

    it('deve retornar boolean para isDevelopment', () => {
      expect(typeof isDevelopment()).toBe('boolean');
    });

    it('deve retornar boolean para isTest', () => {
      expect(typeof isTest()).toBe('boolean');
    });
  });
});
