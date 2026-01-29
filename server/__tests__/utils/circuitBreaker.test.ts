/**
 * @fileoverview Testes do Circuit Breaker
 * @module server/__tests__/utils/circuitBreaker.test
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CircuitBreaker, CircuitState, getCircuitBreaker } from '../../utils/circuitBreaker';

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    jest.clearAllMocks();
    breaker = new CircuitBreaker({
      name: 'test-service',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
    });
  });

  describe('Estado Inicial', () => {
    it('deve iniciar no estado CLOSED', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('deve ter contadores zerados', () => {
      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.lastFailureTime).toBeUndefined();
    });
  });

  describe('Execução com Sucesso', () => {
    it('deve executar função e retornar resultado', async () => {
      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('deve manter estado CLOSED após sucessos', async () => {
      await breaker.execute(async () => 'ok');
      await breaker.execute(async () => 'ok');
      await breaker.execute(async () => 'ok');

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Tratamento de Falhas', () => {
    it('deve contar falhas', async () => {
      const failingFn = async () => {
        throw new Error('fail');
      };

      await expect(breaker.execute(failingFn)).rejects.toThrow('fail');

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(1);
    });

    it('deve abrir circuito após atingir threshold', async () => {
      const failingFn = async () => {
        throw new Error('fail');
      };

      // 3 falhas = threshold
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingFn)).rejects.toThrow('fail');
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('deve rejeitar requisições quando OPEN', async () => {
      const failingFn = async () => {
        throw new Error('fail');
      };

      // Abre o circuito
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingFn)).rejects.toThrow('fail');
      }

      // Próxima requisição deve ser rejeitada imediatamente
      await expect(breaker.execute(async () => 'ok')).rejects.toThrow(
        'temporariamente indisponível'
      );
    });
  });

  describe('Recuperação (HALF_OPEN)', () => {
    it('deve transitar para HALF_OPEN após timeout', async () => {
      const failingFn = async () => {
        throw new Error('fail');
      };

      // Abre o circuito
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingFn)).rejects.toThrow();
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Espera o timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Próxima execução deve tentar (HALF_OPEN)
      const result = await breaker.execute(async () => 'recovered');
      expect(result).toBe('recovered');
    });

    it('deve voltar para CLOSED após sucessos suficientes em HALF_OPEN', async () => {
      const failingFn = async () => {
        throw new Error('fail');
      };

      // Abre o circuito
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingFn)).rejects.toThrow();
      }

      // Espera o timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 2 sucessos = successThreshold
      await breaker.execute(async () => 'ok');
      await breaker.execute(async () => 'ok');

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('deve voltar para OPEN se falhar em HALF_OPEN', async () => {
      const failingFn = async () => {
        throw new Error('fail');
      };

      // Abre o circuito
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingFn)).rejects.toThrow();
      }

      // Espera o timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Falha em HALF_OPEN
      await expect(breaker.execute(failingFn)).rejects.toThrow();

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Reset Manual', () => {
    it('deve resetar para CLOSED', async () => {
      const failingFn = async () => {
        throw new Error('fail');
      };

      // Abre o circuito
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingFn)).rejects.toThrow();
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Reset manual
      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('getCircuitBreaker', () => {
    it('deve retornar o mesmo breaker para o mesmo nome', () => {
      const breaker1 = getCircuitBreaker({ name: 'shared-service' });
      const breaker2 = getCircuitBreaker({ name: 'shared-service' });

      expect(breaker1).toBe(breaker2);
    });

    it('deve retornar breakers diferentes para nomes diferentes', () => {
      const breaker1 = getCircuitBreaker({ name: 'service-a' });
      const breaker2 = getCircuitBreaker({ name: 'service-b' });

      expect(breaker1).not.toBe(breaker2);
    });
  });

  describe('isFailure customizado', () => {
    it('deve usar função isFailure customizada', async () => {
      const customBreaker = new CircuitBreaker({
        name: 'custom',
        failureThreshold: 1,
        isFailure: error => error.message !== 'expected',
      });

      // Erro esperado não deve contar como falha
      await expect(
        customBreaker.execute(async () => {
          throw new Error('expected');
        })
      ).rejects.toThrow();

      expect(customBreaker.getState()).toBe(CircuitState.CLOSED);

      // Erro inesperado deve contar
      await expect(
        customBreaker.execute(async () => {
          throw new Error('unexpected');
        })
      ).rejects.toThrow();

      expect(customBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });
});
