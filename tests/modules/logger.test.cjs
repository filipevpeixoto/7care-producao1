/**
 * Testes do módulo de Logger
 */

const logger = require('../../netlify/functions/modules/logger.cjs');

describe('Logger Module', () => {
  let consoleSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleDebugSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('info', () => {
    it('should log info message as JSON', () => {
      logger.info('Test message');
      
      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
      
      expect(loggedData.level).toBe('INFO');
      expect(loggedData.message).toBe('Test message');
      expect(loggedData.timestamp).toBeDefined();
    });

    it('should include context in log', () => {
      logger.info('Test message', { userId: 123 });
      
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(loggedData.userId).toBe(123);
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      logger.error('Error occurred');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      
      expect(loggedData.level).toBe('ERROR');
      expect(loggedData.message).toBe('Error occurred');
    });

    it('should include Error object details', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      
      expect(loggedData.errorName).toBe('Error');
      expect(loggedData.errorMessage).toBe('Test error');
      expect(loggedData.stack).toBeDefined();
    });

    it('should handle non-Error objects', () => {
      logger.error('Error occurred', { custom: 'error' });
      
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(loggedData.custom).toBe('error');
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      logger.warn('Warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      
      expect(loggedData.level).toBe('WARN');
    });
  });

  describe('httpRequest', () => {
    it('should log HTTP request details', () => {
      const mockReq = {
        method: 'GET',
        path: '/api/users',
        headers: {
          'user-agent': 'Jest Test',
          'x-forwarded-for': '127.0.0.1',
          'x-user-id': '123'
        }
      };
      
      logger.httpRequest(mockReq);
      
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
      
      expect(loggedData.method).toBe('GET');
      expect(loggedData.path).toBe('/api/users');
      expect(loggedData.ip).toBe('127.0.0.1');
      expect(loggedData.userId).toBe('123');
    });

    it('should include response status if provided', () => {
      const mockReq = { method: 'GET', path: '/test', headers: {} };
      const mockRes = { statusCode: 200 };
      
      logger.httpRequest(mockReq, mockRes);
      
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(loggedData.statusCode).toBe(200);
    });

    it('should include duration if provided', () => {
      const mockReq = { method: 'GET', path: '/test', headers: {} };
      
      logger.httpRequest(mockReq, null, 150);
      
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(loggedData.durationMs).toBe(150);
    });
  });

  describe('auth', () => {
    it('should log authentication events', () => {
      logger.auth('login_success', 'user123', { ip: '127.0.0.1' });
      
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
      
      expect(loggedData.event).toBe('login_success');
      expect(loggedData.userId).toBe('user123');
      expect(loggedData.ip).toBe('127.0.0.1');
    });
  });

  describe('performance', () => {
    it('should log performance metrics', () => {
      logger.performance('database_query', 150, { table: 'users' });
      
      // Should be DEBUG level for fast operations - can be in console.debug or console.log
      const loggedCall = consoleDebugSpy.mock.calls[0]?.[0] || consoleSpy.mock.calls[0]?.[0] || consoleWarnSpy.mock.calls[0]?.[0];
      expect(loggedCall).toBeDefined();
      
      const loggedData = JSON.parse(loggedCall);
      
      expect(loggedData.operation).toBe('database_query');
      expect(loggedData.durationMs).toBe(150);
      expect(loggedData.table).toBe('users');
    });

    it('should warn for slow operations', () => {
      logger.performance('slow_operation', 6000);
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      
      expect(loggedData.level).toBe('WARN');
      expect(loggedData.durationMs).toBe(6000);
    });
  });

  describe('startTimer', () => {
    it('should measure operation duration', async () => {
      const endTimer = logger.startTimer('test_operation');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const duration = endTimer({ context: 'test' });
      
      expect(duration).toBeGreaterThanOrEqual(50);
      // Allow more time for CI/slow machines
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('businessEvent', () => {
    it('should log business events', () => {
      logger.businessEvent('user_registered', { 
        userId: 123, 
        source: 'web' 
      });
      
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
      
      expect(loggedData.event).toBe('user_registered');
      expect(loggedData.userId).toBe(123);
      expect(loggedData.source).toBe('web');
    });
  });

  describe('sanitizeForLog', () => {
    it('should redact sensitive fields', () => {
      const data = {
        email: 'test@test.com',
        password: 'secret123',
        token: 'jwt-token',
        name: 'John'
      };
      
      const sanitized = logger.sanitizeForLog(data);
      
      expect(sanitized.email).toBe('test@test.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.name).toBe('John');
    });

    it('should handle null/undefined', () => {
      expect(logger.sanitizeForLog(null)).toBe(null);
      expect(logger.sanitizeForLog(undefined)).toBe(undefined);
    });

    it('should handle non-objects', () => {
      expect(logger.sanitizeForLog('string')).toBe('string');
      expect(logger.sanitizeForLog(123)).toBe(123);
    });
  });
});
