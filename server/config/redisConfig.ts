/**
 * Configuração do Redis para Rate Limiting Distribuído
 * Usa fallback em memória quando Redis não está disponível
 * Para produção com Redis, instale ioredis: npm install ioredis @types/ioredis
 */

// Interface para configuração Redis
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  connectionTimeout?: number;
  keyPrefix?: string;
}

// Configuração padrão
const defaultConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  tls: process.env.REDIS_TLS === 'true',
  maxRetries: 3,
  retryDelayMs: 1000,
  connectionTimeout: 5000,
  keyPrefix: '7care:',
};

// Store em memória para fallback
class InMemoryStore {
  private store: Map<string, { value: number; expireAt: number }> = new Map();

  async get(key: string): Promise<number | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expireAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: number, ttlMs: number): Promise<void> {
    this.store.set(key, { value, expireAt: Date.now() + ttlMs });
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = (current || 0) + 1;
    const existing = this.store.get(key);
    const expireAt = existing?.expireAt || Date.now() + 60000;
    this.store.set(key, { value: newValue, expireAt });
    return newValue;
  }

  async expire(key: string, ttlMs: number): Promise<void> {
    const item = this.store.get(key);
    if (item) {
      item.expireAt = Date.now() + ttlMs;
    }
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return -2;
    const remaining = item.expireAt - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : -1;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expireAt) {
        this.store.delete(key);
      }
    }
  }

  size(): number {
    return this.store.size;
  }
}

// Interface para cliente Redis (para futura implementação)
interface RedisClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  incr(key: string): Promise<number>;
  pexpire(key: string, milliseconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
}

// Wrapper que abstrai Redis vs InMemory
export class RateLimitStore {
  private inMemory: InMemoryStore;
  private isConnected = false;
  private keyPrefix: string;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private redisClient: RedisClient | null = null;

  constructor(config: Partial<RedisConfig> = {}) {
    const fullConfig = { ...defaultConfig, ...config };
    this.keyPrefix = fullConfig.keyPrefix || '7care:';
    this.inMemory = new InMemoryStore();

    // Em desenvolvimento, usar store em memória
    if (process.env.NODE_ENV !== 'production') {
      console.log('📦 Rate Limiting: Usando store em memória (desenvolvimento)');
      this.startCleanup();
    } else if (process.env.REDIS_HOST) {
      // Em produção com Redis configurado, tentar conectar
      this.initRedis(fullConfig);
    } else {
      console.log('📦 Rate Limiting: Usando store em memória (Redis não configurado)');
      this.startCleanup();
    }
  }

  private async initRedis(config: RedisConfig): Promise<void> {
    try {
      // Tentar importar ioredis dinamicamente

      const Redis = require('ioredis');

      if (!Redis) {
        console.warn('⚠️ Redis: ioredis não instalado, usando fallback em memória');
        this.startCleanup();
        return;
      }

      const redis = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db,
        retryStrategy: (times: number) => {
          if (times > (config.maxRetries || 3)) {
            console.warn('⚠️ Redis: Máximo de retentativas atingido');
            return null;
          }
          return config.retryDelayMs || 1000;
        },
        connectTimeout: config.connectionTimeout,
        lazyConnect: true,
        tls: config.tls ? {} : undefined,
      });

      redis.on('connect', () => {
        this.isConnected = true;
        console.log('✅ Redis: Conectado com sucesso');
      });

      redis.on('error', (err: Error) => {
        console.error('❌ Redis Error:', err.message);
        this.isConnected = false;
      });

      redis.on('close', () => {
        this.isConnected = false;
      });

      await redis.connect();

      // Adapter para interface comum
      this.redisClient = {
        connect: () => redis.connect(),
        disconnect: () => redis.quit().then(() => undefined),
        incr: (key: string) => redis.incr(key),
        pexpire: (key: string, ms: number) => redis.pexpire(key, ms).then(() => undefined),
        ttl: (key: string) => redis.ttl(key),
        get: (key: string) => redis.get(key),
        del: (key: string) => redis.del(key).then(() => undefined),
      };
    } catch (error) {
      const err = error as Error;
      console.warn('⚠️ Redis: Falha na conexão, usando fallback:', err.message);
      this.startCleanup();
    }
  }

  private startCleanup(): void {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.inMemory.cleanup();
      }, 60000);
    }
  }

  private prefixKey(key: string): string {
    return `${this.keyPrefix}ratelimit:${key}`;
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; ttl: number }> {
    const prefixedKey = this.prefixKey(key);

    if (this.isConnected && this.redisClient) {
      try {
        const count = await this.redisClient.incr(prefixedKey);
        let ttl = await this.redisClient.ttl(prefixedKey);

        if (ttl === -1) {
          await this.redisClient.pexpire(prefixedKey, windowMs);
          ttl = Math.ceil(windowMs / 1000);
        }

        return { count, ttl };
      } catch (err) {
        console.warn('⚠️ Redis increment error, usando fallback:', (err as Error).message);
      }
    }

    // Fallback para memória
    const count = await this.inMemory.incr(prefixedKey);
    const ttl = await this.inMemory.ttl(prefixedKey);

    if (count === 1) {
      await this.inMemory.expire(prefixedKey, windowMs);
    }

    return { count, ttl: ttl > 0 ? ttl : Math.ceil(windowMs / 1000) };
  }

  async get(key: string): Promise<number | null> {
    const prefixedKey = this.prefixKey(key);

    if (this.isConnected && this.redisClient) {
      try {
        const result = await this.redisClient.get(prefixedKey);
        return result ? parseInt(result, 10) : null;
      } catch {
        // Fallback silencioso
      }
    }

    return this.inMemory.get(prefixedKey);
  }

  async reset(key: string): Promise<void> {
    const prefixedKey = this.prefixKey(key);

    if (this.isConnected && this.redisClient) {
      try {
        await this.redisClient.del(prefixedKey);
        return;
      } catch {
        // Fallback silencioso
      }
    }

    await this.inMemory.del(prefixedKey);
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.redisClient) {
      await this.redisClient.disconnect();
      this.redisClient = null;
    }
  }

  isUsingRedis(): boolean {
    return this.isConnected;
  }

  getStoreSize(): number {
    return this.inMemory.size();
  }
}

// Singleton para uso global
let globalStore: RateLimitStore | null = null;

export function getRateLimitStore(): RateLimitStore {
  if (!globalStore) {
    globalStore = new RateLimitStore();
  }
  return globalStore;
}

export function closeRateLimitStore(): Promise<void> {
  if (globalStore) {
    return globalStore.close().then(() => {
      globalStore = null;
    });
  }
  return Promise.resolve();
}

// Rate limiter middleware factory
export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
  }) => string;
  message?: string;
  statusCode?: number;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface RateLimitResponse {
  status: (code: number) => { json: (data: unknown) => void };
  setHeader: (name: string, value: string | number) => void;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyGenerator = req => req.ip || 'unknown',
    message = 'Too many requests, please try again later.',
    statusCode = 429,
  } = options;

  const store = getRateLimitStore();

  return async (req: RateLimitRequest, res: RateLimitResponse, next: () => void): Promise<void> => {
    const key = keyGenerator(req);

    try {
      const { count, ttl } = await store.increment(key, windowMs);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', ttl);

      if (count > max) {
        res.setHeader('Retry-After', ttl);
        res.status(statusCode).json({
          error: 'Too Many Requests',
          message,
          retryAfter: ttl,
        });
        return;
      }

      next();
    } catch (error) {
      // Em caso de erro, permitir a requisição (fail-open)
      console.error('Rate limiter error:', error);
      next();
    }
  };
}

export default {
  RateLimitStore,
  getRateLimitStore,
  closeRateLimitStore,
  createRateLimiter,
};
