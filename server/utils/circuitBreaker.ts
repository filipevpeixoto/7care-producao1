/**
 * @fileoverview Circuit Breaker para resiliência
 * @module server/utils/circuitBreaker
 *
 * Implementa o padrão Circuit Breaker para proteger
 * o sistema contra falhas em cascata de serviços externos.
 *
 * Estados:
 * - CLOSED: Normal, requisições passam
 * - OPEN: Falhas demais, requisições são rejeitadas
 * - HALF_OPEN: Testando se serviço voltou
 */

import { logger } from './logger';
import { ServiceUnavailableError } from '../errors';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Nome do circuito (para logs) */
  name: string;
  /** Número de falhas para abrir o circuito */
  failureThreshold?: number;
  /** Número de sucessos para fechar o circuito */
  successThreshold?: number;
  /** Tempo em ms para tentar novamente (OPEN -> HALF_OPEN) */
  timeout?: number;
  /** Função para verificar se erro deve contar como falha */
  isFailure?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<CircuitBreakerOptions, 'name'>> = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 segundos
  isFailure: () => true,
};

/**
 * Implementação do Circuit Breaker
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options } as Required<CircuitBreakerOptions>;
  }

  /**
   * Executa uma função protegida pelo circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new ServiceUnavailableError(this.options.name);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      if (error instanceof Error && this.options.isFailure(error)) {
        this.onFailure();
      }
      throw error;
    }
  }

  /**
   * Verifica se o circuito está aberto
   */
  private isOpen(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return false;
    }

    if (this.state === CircuitState.OPEN) {
      // Verifica se timeout passou para tentar novamente
      if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.options.timeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
        return false;
      }
      return true;
    }

    // HALF_OPEN permite requisições
    return false;
  }

  /**
   * Registra sucesso
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Registra falha
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Uma falha em HALF_OPEN volta para OPEN
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.options.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Transição de estado
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    logger.info('Circuit breaker state change', {
      name: this.options.name,
      from: oldState,
      to: newState,
      failureCount: this.failureCount,
      successCount: this.successCount,
    });

    // Reset counters on state change
    if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
    }
  }

  /**
   * Obtém estado atual
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Obtém estatísticas
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset manual do circuit breaker
   */
  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
  }
}

// Mapa de circuit breakers por serviço
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Obtém ou cria um circuit breaker para um serviço
 */
export function getCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  const existing = circuitBreakers.get(options.name);
  if (existing) {
    return existing;
  }

  const breaker = new CircuitBreaker(options);
  circuitBreakers.set(options.name, breaker);
  return breaker;
}

/**
 * Decorator para proteger método com circuit breaker
 *
 * @example
 * ```typescript
 * class ExternalAPI {
 *   @withCircuitBreaker({ name: 'external-api' })
 *   async fetchData(): Promise<Data> {
 *     return await externalCall();
 *   }
 * }
 * ```
 */
export function withCircuitBreaker(options: CircuitBreakerOptions) {
  const breaker = getCircuitBreaker(options);

  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return breaker.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
