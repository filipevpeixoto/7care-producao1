/**
 * Testes para Logger
 * @module tests/utils/logger
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Precisamos recarregar o módulo para testar diferentes ambientes
let logger: typeof import('../../utils/logger').logger;

describe('logger', () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleSpy: {
    log: ReturnType<typeof jest.spyOn>;
    error: ReturnType<typeof jest.spyOn>;
    warn: ReturnType<typeof jest.spyOn>;
  };

  beforeEach(() => {
    // Limpar cache do módulo para recarregar com novo NODE_ENV
    jest.resetModules();

    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
  });

  describe('em ambiente de desenvolvimento', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const module = await import('../../utils/logger');
      logger = module.logger;
    });

    it('logger.info deve logar mensagem', () => {
      logger.info('Test message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0][0] as string;
      expect(call).toContain('[INFO]');
      expect(call).toContain('Test message');
    });

    it('logger.warn deve logar warning', () => {
      logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
      const call = consoleSpy.warn.mock.calls[0][0] as string;
      expect(call).toContain('[WARN]');
    });

    it('logger.debug deve logar debug info', () => {
      logger.debug('Debug info');

      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0][0] as string;
      expect(call).toContain('[DEBUG]');
    });

    it('logger.error deve logar erro', () => {
      logger.error('Error occurred');

      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0][0] as string;
      expect(call).toContain('[ERROR]');
    });

    it('logger.request deve logar requisição HTTP', () => {
      logger.request('GET', '/api/users', 200, 45);

      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0][0] as string;
      expect(call).toContain('[HTTP]');
      expect(call).toContain('GET');
      expect(call).toContain('/api/users');
      expect(call).toContain('200');
      expect(call).toContain('45ms');
    });

    it('logger.db deve logar operação de banco', () => {
      logger.db('SELECT', 'users', 12);

      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0][0] as string;
      expect(call).toContain('[DB]');
      expect(call).toContain('SELECT');
      expect(call).toContain('users');
      expect(call).toContain('12ms');
    });

    it('logger.authSuccess deve logar sucesso de autenticação', () => {
      logger.authSuccess(123, 'user@test.com');

      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0][0] as string;
      expect(call).toContain('[AUTH]');
      expect(call).toContain('successful');
      expect(call).toContain('123');
      // Email deve estar mascarado
      expect(call).toContain('u***@test.com');
    });

    it('logger.authFailure deve logar falha de autenticação', () => {
      logger.authFailure('invalid_password', 'user@test.com');

      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0][0] as string;
      expect(call).toContain('[AUTH]');
      expect(call).toContain('failed');
      expect(call).toContain('invalid_password');
    });
  });

  describe('em ambiente de teste', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      const module = await import('../../utils/logger');
      logger = module.logger;
    });

    it('logger.info não deve logar', () => {
      logger.info('Test message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('logger.warn não deve logar', () => {
      logger.warn('Warning');
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it('logger.debug não deve logar', () => {
      logger.debug('Debug');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('logger.error não deve logar em teste', () => {
      logger.error('Error');
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('sanitização de dados sensíveis', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const module = await import('../../utils/logger');
      logger = module.logger;
    });

    it('deve sanitizar password', () => {
      logger.info('User data:', { name: 'John', password: 'secret123' });

      const call = consoleSpy.log.mock.calls[0];
      const loggedData = call[1] as any;
      expect(loggedData.password).toBe('[REDACTED]');
    });

    it('deve sanitizar token', () => {
      logger.info('Auth:', { token: 'eyJhbG...', user: 'john' });

      const call = consoleSpy.log.mock.calls[0];
      const loggedData = call[1] as any;
      expect(loggedData.token).toBe('[REDACTED]');
    });

    it('deve sanitizar cpf', () => {
      logger.info('Document:', { cpf: '123.456.789-00' });

      const call = consoleSpy.log.mock.calls[0];
      const loggedData = call[1] as any;
      expect(loggedData.cpf).toBe('[REDACTED]');
    });

    it('deve mascarar email parcialmente', () => {
      logger.info('Contact:', { email: 'john.doe@example.com' });

      const call = consoleSpy.log.mock.calls[0];
      const loggedData = call[1] as any;
      expect(loggedData.email).toContain('@example.com');
      expect(loggedData.email).toContain('***');
    });

    it('deve mascarar telefone parcialmente', () => {
      logger.info('Contact:', { phone: '11999998888' });

      const call = consoleSpy.log.mock.calls[0];
      const loggedData = call[1] as any;
      expect(loggedData.phone).toContain('***');
      expect(loggedData.phone).toContain('8888');
    });

    it('deve sanitizar objetos aninhados', () => {
      logger.info('Nested:', {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
      });

      const call = consoleSpy.log.mock.calls[0];
      const loggedData = call[1] as any;
      expect(loggedData.user.credentials.password).toBe('[REDACTED]');
      expect(loggedData.user.credentials.apiKey).toBe('[REDACTED]');
    });

    it('deve sanitizar arrays', () => {
      logger.info('Users:', [
        { name: 'John', password: 'pass1' },
        { name: 'Jane', password: 'pass2' },
      ]);

      const call = consoleSpy.log.mock.calls[0];
      const loggedData = call[1] as any[];
      expect(loggedData[0].password).toBe('[REDACTED]');
      expect(loggedData[1].password).toBe('[REDACTED]');
    });

    it('deve lidar com null e undefined', () => {
      logger.info('Data:', { value: null, other: undefined });

      const call = consoleSpy.log.mock.calls[0];
      const loggedData = call[1] as any;
      expect(loggedData.value).toBeNull();
      expect(loggedData.other).toBeUndefined();
    });

    it('deve proteger contra recursão infinita', () => {
      const obj: any = { name: 'test' };
      // Criar estrutura profunda (>10 níveis)
      let current = obj;
      for (let i = 0; i < 15; i++) {
        current.nested = { level: i };
        current = current.nested;
      }

      // Não deve lançar erro
      expect(() => {
        logger.info('Deep:', obj);
      }).not.toThrow();
    });
  });

  describe('logger.sanitized()', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const module = await import('../../utils/logger');
      logger = module.logger;
    });

    it('deve sanitizar e formatar JSON', () => {
      logger.sanitized('Formatted data:', { name: 'John', password: 'secret' });

      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0];
      const jsonStr = call[1] as string;

      // Deve ser JSON formatado
      const parsed = JSON.parse(jsonStr);
      expect(parsed.name).toBe('John');
      expect(parsed.password).toBe('[REDACTED]');
    });
  });

  describe('formatação de timestamp', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const module = await import('../../utils/logger');
      logger = module.logger;
    });

    it('deve incluir timestamp ISO', () => {
      logger.info('Test');

      const call = consoleSpy.log.mock.calls[0][0] as string;
      // Deve ter formato ISO: 2024-01-01T00:00:00.000Z
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]/);
    });
  });
});
