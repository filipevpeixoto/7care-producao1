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

// Cache em memória como fallback
const memoryCache = new Map<string, { value: string; expiry: number }>();

// Cliente Redis
let redisClient: RedisClientType | null = null;
let isRedisConnected = false;

/**
 * Inicializa conexão com Redis
 */
export async function initRedis(): Promise<boolean> {
  if (process.env.NODE_ENV === 'test') {
    console.log('[Cache] Modo teste - usando cache em memória');
    return false;
  }

  try {
    redisClient = createClient({ url: REDIS_URL });
    
    redisClient.on('error', (err) => {
      console.error('[Redis] Erro de conexão:', err.message);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Conectado com sucesso');
      isRedisConnected = true;
    });

    redisClient.on('reconnecting', () => {
      console.log('[Redis] Reconectando...');
    });

    await redisClient.connect();
    isRedisConnected = true;
    return true;
  } catch (error) {
    console.warn('[Redis] Não foi possível conectar, usando cache em memória:', (error as Error).message);
    isRedisConnected = false;
    return false;
  }
}

/**
 * Fecha conexão com Redis
 */
export async function closeRedis(): Promise<void> {
  if (redisClient && isRedisConnected) {
    await redisClient.quit();
    isRedisConnected = false;
  }
}

/**
 * Limpa itens expirados do cache em memória
 */
function cleanMemoryCache(): void {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (item.expiry < now) {
      memoryCache.delete(key);
    }
  }
  
  // Se ainda estiver muito grande, remove os mais antigos
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const keysToDelete = Array.from(memoryCache.keys()).slice(0, memoryCache.size - MAX_MEMORY_CACHE_SIZE);
    keysToDelete.forEach(key => memoryCache.delete(key));
  }
}

/**
 * Define valor no cache
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number = DEFAULT_TTL): Promise<boolean> {
  const serialized = JSON.stringify(value);
  
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.setEx(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      console.error('[Cache] Erro ao definir no Redis:', error);
    }
  }
  
  // Fallback para memória
  cleanMemoryCache();
  memoryCache.set(key, {
    value: serialized,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
  return true;
}

/**
 * Obtém valor do cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (isRedisConnected && redisClient) {
    try {
      const value = await redisClient.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      console.error('[Cache] Erro ao obter do Redis:', error);
    }
  }
  
  // Fallback para memória
  const item = memoryCache.get(key);
  if (item && item.expiry > Date.now()) {
    return JSON.parse(item.value) as T;
  }
  
  if (item) {
    memoryCache.delete(key);
  }
  
  return null;
}

/**
 * Remove valor do cache
 */
export async function cacheDel(key: string): Promise<boolean> {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('[Cache] Erro ao remover do Redis:', error);
    }
  }
  
  memoryCache.delete(key);
  return true;
}

/**
 * Remove valores por padrão (prefixo)
 */
export async function cacheDelPattern(pattern: string): Promise<number> {
  let deleted = 0;
  
  if (isRedisConnected && redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        deleted = await redisClient.del(keys);
      }
      return deleted;
    } catch (error) {
      console.error('[Cache] Erro ao remover padrão do Redis:', error);
    }
  }
  
  // Fallback para memória
  const regex = new RegExp(pattern.replace('*', '.*'));
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
      deleted++;
    }
  }
  
  return deleted;
}

/**
 * Verifica se chave existe
 */
export async function cacheExists(key: string): Promise<boolean> {
  if (isRedisConnected && redisClient) {
    try {
      return (await redisClient.exists(key)) === 1;
    } catch (error) {
      console.error('[Cache] Erro ao verificar existência no Redis:', error);
    }
  }
  
  const item = memoryCache.get(key);
  return item !== undefined && item.expiry > Date.now();
}

/**
 * Obtém ou define valor no cache (pattern cache-aside)
 */
export async function cacheGetOrSet<T>(
  key: string, 
  fetchFn: () => Promise<T>, 
  ttlSeconds: number = DEFAULT_TTL
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  const value = await fetchFn();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

/**
 * Limpa todo o cache
 */
export async function cacheClear(): Promise<void> {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.flushDb();
    } catch (error) {
      console.error('[Cache] Erro ao limpar Redis:', error);
    }
  }
  
  memoryCache.clear();
}

/**
 * Obtém estatísticas do cache
 */
export async function cacheStats(): Promise<{
  type: 'redis' | 'memory';
  connected: boolean;
  size: number;
}> {
  if (isRedisConnected && redisClient) {
    try {
      const info = await redisClient.dbSize();
      return {
        type: 'redis',
        connected: true,
        size: info
      };
    } catch (error) {
      console.error('[Cache] Erro ao obter stats do Redis:', error);
    }
  }
  
  cleanMemoryCache();
  return {
    type: 'memory',
    connected: false,
    size: memoryCache.size
  };
}

// Prefixos de cache para diferentes tipos de dados
export const CacheKeys = {
  users: (id?: number) => id ? `users:${id}` : 'users:all',
  churches: (id?: number) => id ? `churches:${id}` : 'churches:all',
  events: (id?: number) => id ? `events:${id}` : 'events:all',
  districts: (id?: number) => id ? `districts:${id}` : 'districts:all',
  prayers: (id?: number) => id ? `prayers:${id}` : 'prayers:all',
  meetings: (id?: number) => id ? `meetings:${id}` : 'meetings:all',
  pointsConfig: () => 'config:points',
  systemLogo: () => 'config:logo',
  usersByChurch: (church: string) => `users:church:${church}`,
  usersByDistrict: (districtId: number) => `users:district:${districtId}`,
};

// TTLs específicos por tipo de dado (em segundos)
export const CacheTTL = {
  users: 60 * 2,        // 2 minutos
  churches: 60 * 10,    // 10 minutos
  events: 60 * 5,       // 5 minutos
  districts: 60 * 30,   // 30 minutos
  prayers: 60 * 2,      // 2 minutos
  meetings: 60 * 5,     // 5 minutos
  config: 60 * 60,      // 1 hora
  stats: 60 * 1,        // 1 minuto
};

export default {
  init: initRedis,
  close: closeRedis,
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  delPattern: cacheDelPattern,
  exists: cacheExists,
  getOrSet: cacheGetOrSet,
  clear: cacheClear,
  stats: cacheStats,
  keys: CacheKeys,
  ttl: CacheTTL,
};
