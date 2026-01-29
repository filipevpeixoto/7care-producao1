/**
 * DataLoader Pattern Implementation
 * Implementação do padrão DataLoader para resolver problema N+1
 * Agrupa requisições de dados em lotes para otimizar performance
 */

import { logger } from './logger';

export interface DataLoaderOptions<K, V> {
  batchLoadFn: (keys: K[]) => Promise<(V | Error | null)[]>;
  maxBatchSize?: number;
  batchScheduleFn?: (callback: () => void) => void;
  cacheKeyFn?: (key: K) => string;
  cacheMap?: Map<string, Promise<V | null>>;
}

/**
 * DataLoader genérico para batching de queries
 */
export class DataLoader<K, V> {
  private batchLoadFn: (keys: K[]) => Promise<(V | Error | null)[]>;
  private maxBatchSize: number;
  private batchScheduleFn: (callback: () => void) => void;
  private cacheKeyFn: (key: K) => string;
  private cache: Map<string, Promise<V | null>>;
  private batch: { key: K; resolve: (value: V | null) => void; reject: (error: Error) => void }[] =
    [];
  private batchScheduled = false;

  constructor(options: DataLoaderOptions<K, V>) {
    this.batchLoadFn = options.batchLoadFn;
    this.maxBatchSize = options.maxBatchSize || 100;
    this.batchScheduleFn = options.batchScheduleFn || (cb => process.nextTick(cb));
    this.cacheKeyFn = options.cacheKeyFn || (key => String(key));
    this.cache = options.cacheMap || new Map();
  }

  /**
   * Carrega um único valor por chave
   */
  async load(key: K): Promise<V | null> {
    const cacheKey = this.cacheKeyFn(key);

    // Verifica cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Cria promise e adiciona ao batch
    const promise = new Promise<V | null>((resolve, reject) => {
      this.batch.push({ key, resolve, reject });
    });

    // Armazena no cache
    this.cache.set(cacheKey, promise);

    // Agenda execução do batch
    if (!this.batchScheduled) {
      this.batchScheduled = true;
      this.batchScheduleFn(() => this.dispatchBatch());
    }

    // Se batch atingiu tamanho máximo, executa imediatamente
    if (this.batch.length >= this.maxBatchSize) {
      this.dispatchBatch();
    }

    return promise;
  }

  /**
   * Carrega múltiplos valores
   */
  async loadMany(keys: K[]): Promise<(V | null)[]> {
    return Promise.all(keys.map(key => this.load(key)));
  }

  /**
   * Limpa uma chave do cache
   */
  clear(key: K): this {
    const cacheKey = this.cacheKeyFn(key);
    this.cache.delete(cacheKey);
    return this;
  }

  /**
   * Limpa todo o cache
   */
  clearAll(): this {
    this.cache.clear();
    return this;
  }

  /**
   * Prime o cache com um valor
   */
  prime(key: K, value: V | null): this {
    const cacheKey = this.cacheKeyFn(key);
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, Promise.resolve(value));
    }
    return this;
  }

  /**
   * Executa o batch de requisições
   */
  private async dispatchBatch(): Promise<void> {
    this.batchScheduled = false;

    // Captura batch atual e reseta
    const batch = this.batch;
    this.batch = [];

    if (batch.length === 0) return;

    const keys = batch.map(item => item.key);

    try {
      const values = await this.batchLoadFn(keys);

      // Valida resposta
      if (values.length !== keys.length) {
        const error = new Error(
          `DataLoader batch function returned ${values.length} results for ${keys.length} keys`
        );
        batch.forEach(item => item.reject(error));
        return;
      }

      // Resolve cada promise
      batch.forEach((item, index) => {
        const value = values[index];
        if (value instanceof Error) {
          item.reject(value);
          this.cache.delete(this.cacheKeyFn(item.key));
        } else {
          item.resolve(value);
        }
      });
    } catch (error) {
      logger.error('DataLoader batch error', error);
      batch.forEach(item => {
        item.reject(error instanceof Error ? error : new Error(String(error)));
        this.cache.delete(this.cacheKeyFn(item.key));
      });
    }
  }
}

/**
 * Factory para criar DataLoaders pré-configurados
 */
export const createDataLoader = <K, V>(
  batchLoadFn: (keys: K[]) => Promise<(V | Error | null)[]>,
  options?: Partial<DataLoaderOptions<K, V>>
): DataLoader<K, V> => {
  return new DataLoader({
    batchLoadFn,
    ...options,
  });
};

/**
 * DataLoaders prontos para uso
 */
import { userRepository } from '../repositories/userRepository';
import { churchRepository } from '../repositories/churchRepository';

// Cache por request (deve ser criado a cada request)
export const createRequestDataLoaders = () => ({
  userById: createDataLoader<number, unknown>(async ids => {
    const users = await Promise.all(ids.map(id => userRepository.getUserById(id)));
    return users;
  }),

  userByEmail: createDataLoader<string, unknown>(async emails => {
    const users = await Promise.all(emails.map(email => userRepository.getUserByEmail(email)));
    return users;
  }),

  churchById: createDataLoader<number, unknown>(async ids => {
    const churches = await Promise.all(ids.map(id => churchRepository.getChurchById(id)));
    return churches;
  }),

  churchByCode: createDataLoader<string, unknown>(async codes => {
    const churches = await Promise.all(codes.map(code => churchRepository.getChurchByCode(code)));
    return churches;
  }),
});

export type RequestDataLoaders = ReturnType<typeof createRequestDataLoaders>;

/**
 * Middleware Express para adicionar DataLoaders ao request
 */
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      loaders?: RequestDataLoaders;
    }
  }
}

export const dataLoaderMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  req.loaders = createRequestDataLoaders();
  next();
};

export default DataLoader;
