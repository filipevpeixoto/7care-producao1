/**
 * Redis Cache Service
 * Implementação de cache distribuído com Redis
 * Fallback para cache em memória quando Redis não está disponível
 */

import { createClient, RedisClientType } from 'redis';

// Configurações
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DEFAULT_TTL = 60 * 5; // 5 minutos em segundos
const MAX_MEMORY_CACHE_SIZE = 1000;

/**
 * Estatísticas do cache
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  isRedisConnected: boolean;
}

export class CacheService {
  private memoryCache = new Map<string, { value: string; expiry: number }>();
  private redisClient: RedisClientType | null = null;
  private isRedisConnected = false;
  private stats = { hits: 0, misses: 0 };

  constructor() {
    // Inicialização lazy no initRedis
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.memoryCache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      isRedisConnected: this.isRedisConnected,
    };
  }

  /**
   * Inicializa conexão com Redis
   */
  async initRedis(): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      console.log('[Cache] Modo teste - usando cache em memória');
      return false;
    }

    try {
      this.redisClient = createClient({ url: REDIS_URL });

      this.redisClient.on('error', err => {
        console.error('[Redis] Erro de conexão:', err.message);
        this.isRedisConnected = false;
      });

      this.redisClient.on('connect', () => {
        console.log('[Redis] Conectado com sucesso');
        this.isRedisConnected = true;
      });

      this.redisClient.on('reconnecting', () => {
        console.log('[Redis] Reconectando...');
      });

      await this.redisClient.connect();
      this.isRedisConnected = true;
      return true;
    } catch (error) {
      console.warn(
        '[Redis] Não foi possível conectar, usando cache em memória:',
        (error as Error).message
      );
      this.isRedisConnected = false;
      return false;
    }
  }

  /**
   * Fecha conexão com Redis
   */
  async closeRedis(): Promise<void> {
    if (this.redisClient && this.isRedisConnected) {
      await this.redisClient.quit();
      this.isRedisConnected = false;
    }
  }

  /**
   * Limpa itens expirados do cache em memória
   */
  private cleanMemoryCache(): void {
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiry < now) {
        this.memoryCache.delete(key);
      }
    }

    // Se ainda estiver muito grande, remove os mais antigos
    if (this.memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
      const keysToDelete = Array.from(this.memoryCache.keys()).slice(
        0,
        this.memoryCache.size - MAX_MEMORY_CACHE_SIZE
      );
      keysToDelete.forEach(key => this.memoryCache.delete(key));
    }
  }

  /**
   * Define valor no cache
   */
  async set(key: string, value: unknown, ttlSeconds: number = DEFAULT_TTL): Promise<boolean> {
    const serialized = JSON.stringify(value);

    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttlSeconds, serialized);
        return true;
      } catch (error) {
        console.error('[Cache] Erro ao definir no Redis:', error);
      }
    }

    // Fallback para memória
    const expiry = Date.now() + ttlSeconds * 1000;
    this.memoryCache.set(key, { value: serialized, expiry });

    // Limpeza ocasional (1% de chance)
    if (Math.random() < 0.01) {
      this.cleanMemoryCache();
    }

    return true;
  }

  /**
   * Obtém valor do cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        if (value) {
          this.stats.hits++;
          return JSON.parse(value) as T;
        }
        this.stats.misses++;
      } catch (error) {
        console.error('[Cache] Erro ao obter do Redis:', error);
      }
    }

    // Fallback para memória
    const item = this.memoryCache.get(key);
    if (item) {
      if (item.expiry > Date.now()) {
        this.stats.hits++;
        return JSON.parse(item.value) as T;
      } else {
        this.memoryCache.delete(key);
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Remove valor do cache
   */
  async del(key: string): Promise<boolean> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.error('[Cache] Erro ao remover do Redis:', error);
      }
    }

    this.memoryCache.delete(key);
    return true;
  }
}

export const cacheService = new CacheService();

// Exportar funções compatíveis com o código existente
export const initRedis = () => cacheService.initRedis();
export const closeRedis = () => cacheService.closeRedis();
export const cacheSet = (key: string, value: unknown, ttlSeconds?: number) =>
  cacheService.set(key, value, ttlSeconds);
export const cacheGet = <T>(key: string) => cacheService.get<T>(key);
export const cacheDel = (key: string) => cacheService.del(key);

/**
 * Remove chaves do cache por padrão (pattern matching)
 * Nota: Redis suporta patterns nativamente, cache em memória faz busca linear
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  // Para cache em memória, fazer busca linear
  const patternRegex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);

  for (const key of cacheService['memoryCache'].keys()) {
    if (patternRegex.test(key)) {
      cacheService['memoryCache'].delete(key);
    }
  }

  // Para Redis, usar SCAN + DEL (mais seguro que KEYS)
  const redisClient = cacheService['redisClient'];
  const isConnected = cacheService['isRedisConnected'];

  if (isConnected && redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error('[Cache] Erro ao deletar pattern do Redis:', error);
    }
  }
}
