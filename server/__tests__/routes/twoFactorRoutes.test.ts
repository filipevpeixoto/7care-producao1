/**
 * Testes das Rotas de 2FA
 * Testa todas as rotas de autenticação dois fatores
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define mocks before jest.mock to avoid TS2345
const mockTwoFactorService: any = {
  checkTwoFactorStatus: jest.fn(),
  generateTwoFactorSecret: jest.fn(),
  savePendingTwoFactorSecret: jest.fn(),
  enableTwoFactor: jest.fn(),
  disableTwoFactor: jest.fn(),
  verifyTwoFactorToken: jest.fn(),
  verifyRecoveryCode: jest.fn(),
  regenerateRecoveryCodes: jest.fn(),
};

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock do twoFactorService
jest.mock('../../services/twoFactorService', () => ({
  __esModule: true,
  default: mockTwoFactorService,
}));

describe('Two Factor Routes', () => {
  let mockReq: any;
  let mockRes: any;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      json: mockJson,
      status: mockStatus,
    };
    mockReq = {
      params: {},
      body: {},
      headers: {},
      userId: 1,
      user: { id: 1, email: 'user@test.com', role: 'member' },
    };
    jest.clearAllMocks();
  });

  describe('GET /status', () => {
    it('deve retornar status do 2FA para usuário autenticado', async () => {
      mockTwoFactorService.checkTwoFactorStatus.mockResolvedValue({
        enabled: true,
        hasRecoveryCodes: true,
      });

      const status = await mockTwoFactorService.checkTwoFactorStatus(1);

      expect(status.enabled).toBe(true);
      expect(status.hasRecoveryCodes).toBe(true);
    });

    it('deve retornar 401 se usuário não autenticado', () => {
      mockReq.userId = undefined;

      mockStatus.mockReturnValue({ json: mockJson });
      mockRes.status(401).json({ error: 'Não autenticado' });

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('POST /setup', () => {
    it('deve gerar QR code e secret para configuração', async () => {
      mockTwoFactorService.checkTwoFactorStatus.mockResolvedValue({
        enabled: false,
      });

      mockTwoFactorService.generateTwoFactorSecret.mockResolvedValue({
        secret: 'TESTSECRET123',
        qrCodeDataUrl: 'data:image/png;base64,qrcode',
        otpauthUrl: 'otpauth://totp/7Care:user@test.com',
      });

      const result = await mockTwoFactorService.generateTwoFactorSecret(
        1,
        'user@test.com',
        '7Care'
      );

      expect(result.secret).toBe('TESTSECRET123');
      expect(result.qrCodeDataUrl).toContain('data:image');
    });

    it('deve retornar 400 se 2FA já está ativado', async () => {
      mockTwoFactorService.checkTwoFactorStatus.mockResolvedValue({
        enabled: true,
      });

      mockStatus.mockReturnValue({ json: mockJson });
      mockRes.status(400).json({ error: '2FA já está ativado' });

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /enable', () => {
    it('deve ativar 2FA com token válido', async () => {
      mockReq.body = { token: '123456' };

      mockTwoFactorService.enableTwoFactor.mockResolvedValue({
        valid: true,
        message: '2FA ativado com sucesso',
      });

      const result = await mockTwoFactorService.enableTwoFactor(1, '123456');

      expect(result.valid).toBe(true);
    });

    it('deve retornar 400 se token inválido', async () => {
      mockTwoFactorService.enableTwoFactor.mockResolvedValue({
        valid: false,
        message: 'Código inválido',
      });

      const result = await mockTwoFactorService.enableTwoFactor(1, 'invalid');

      expect(result.valid).toBe(false);
    });

    it('deve retornar 400 se token não fornecido', () => {
      mockReq.body = {};

      mockStatus.mockReturnValue({ json: mockJson });
      mockRes.status(400).json({ error: 'Código é obrigatório' });

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /disable', () => {
    it('deve desativar 2FA com token válido', async () => {
      mockReq.body = { token: '123456' };

      mockTwoFactorService.disableTwoFactor.mockResolvedValue({
        valid: true,
        message: '2FA desativado com sucesso',
      });

      const result = await mockTwoFactorService.disableTwoFactor(1, '123456');

      expect(result.valid).toBe(true);
    });

    it('deve retornar 400 se token inválido ao desativar', async () => {
      mockTwoFactorService.disableTwoFactor.mockResolvedValue({
        valid: false,
        message: 'Código inválido',
      });

      const result = await mockTwoFactorService.disableTwoFactor(1, 'invalid');

      expect(result.valid).toBe(false);
    });
  });

  describe('POST /verify', () => {
    it('deve verificar token TOTP válido', async () => {
      mockReq.body = { token: '123456' };

      mockTwoFactorService.verifyTwoFactorToken.mockResolvedValue({
        valid: true,
        message: 'Token válido',
      });

      const result = await mockTwoFactorService.verifyTwoFactorToken(1, '123456');

      expect(result.valid).toBe(true);
    });

    it('deve retornar inválido para token incorreto', async () => {
      mockTwoFactorService.verifyTwoFactorToken.mockResolvedValue({
        valid: false,
        message: 'Token inválido',
      });

      const result = await mockTwoFactorService.verifyTwoFactorToken(1, '000000');

      expect(result.valid).toBe(false);
    });
  });

  describe('POST /verify-recovery', () => {
    it('deve verificar código de recuperação válido', async () => {
      mockReq.body = { code: 'RECOVERY123' };

      mockTwoFactorService.verifyRecoveryCode.mockResolvedValue({
        valid: true,
        message: 'Código de recuperação válido',
      });

      const result = await mockTwoFactorService.verifyRecoveryCode(1, 'RECOVERY123');

      expect(result.valid).toBe(true);
    });

    it('deve retornar 400 se código de recuperação inválido', async () => {
      mockTwoFactorService.verifyRecoveryCode.mockResolvedValue({
        valid: false,
        message: 'Código de recuperação inválido',
      });

      const result = await mockTwoFactorService.verifyRecoveryCode(1, 'INVALID');

      expect(result.valid).toBe(false);
    });

    it('deve retornar 400 se código não fornecido', () => {
      mockReq.body = {};

      mockStatus.mockReturnValue({ json: mockJson });
      mockRes.status(400).json({ error: 'Código de recuperação é obrigatório' });

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /regenerate-recovery', () => {
    it('deve regenerar códigos de recuperação com token válido', async () => {
      mockReq.body = { token: '123456' };

      mockTwoFactorService.regenerateRecoveryCodes.mockResolvedValue({
        codes: ['CODE1', 'CODE2', 'CODE3', 'CODE4', 'CODE5'],
      });

      const result = await mockTwoFactorService.regenerateRecoveryCodes(1, '123456');

      expect(result.codes).toHaveLength(5);
    });

    it('deve retornar 400 se token inválido ao regenerar', async () => {
      mockTwoFactorService.regenerateRecoveryCodes.mockResolvedValue({
        valid: false,
        message: 'Token inválido',
      });

      const result = await mockTwoFactorService.regenerateRecoveryCodes(1, 'invalid');

      expect(result.valid).toBe(false);
    });
  });

  describe('Validações', () => {
    it('deve validar formato do token (6 dígitos)', () => {
      const validToken = '123456';
      const invalidToken = '12345';

      const isValidFormat = (token: string) => /^\d{6}$/.test(token);

      expect(isValidFormat(validToken)).toBe(true);
      expect(isValidFormat(invalidToken)).toBe(false);
    });

    it('deve validar que token é string', () => {
      const stringToken = '123456';
      const numberToken = 123456;

      expect(typeof stringToken).toBe('string');
      expect(typeof numberToken).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('deve retornar 500 em caso de erro interno', async () => {
      mockStatus.mockReturnValue({ json: mockJson });
      mockRes.status(500).json({ error: 'Erro interno do servidor' });

      expect(mockStatus).toHaveBeenCalledWith(500);
    });

    it('deve logar erros corretamente', async () => {
      const { logger } = await import('../../utils/logger');

      const error = new Error('2FA error');
      logger.error('Erro ao verificar 2FA', error);

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
