import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { logger } from './utils/logger';

// Configuração do Neon Database - usa variável de ambiente ou fallback
const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_enihr4YBSDm8@ep-still-glade-ac5u1r48-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Configurações de connection pooling e retry
const POOL_CONFIG = {
  connectionTimeoutMillis: 10000, // 10 segundos para timeout de conexão
  idleTimeoutMillis: 30000, // 30 segundos para conexões idle
  max: 10, // Máximo de conexões no pool
};

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 2000,
};

/**
 * Implementa retry com exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = RETRY_CONFIG.maxRetries,
  delay = RETRY_CONFIG.initialDelayMs
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    if (retries === 0) {
      logger.error('❌ Falha após todas as tentativas:', err.message);
      throw error;
    }

    // Retry apenas para erros de rede/conexão
    const isRetriableError =
      err.message?.includes('fetch failed') ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('timeout') ||
      err.code === 'ECONNRESET';

    if (!isRetriableError) {
      throw error;
    }

    logger.warn(
      `⚠️ Erro de conexão, tentando novamente em ${delay}ms (${retries} tentativas restantes)...`
    );
    await new Promise(resolve => setTimeout(resolve, delay));

    // Exponential backoff com jitter
    const nextDelay = Math.min(delay * 2 + Math.random() * 100, RETRY_CONFIG.maxDelayMs);
    return withRetry(operation, retries - 1, nextDelay);
  }
}

// Configuração de pooling para o driver Neon Serverless
// O pooler endpoint (-pooler no connection string) já gerencia o pool no lado do servidor
// Estas opções controlam o comportamento do cliente
const NEON_OPTIONS = {
  fullResults: false, // Otimiza retorno de resultados
  fetchOptions: {
    // Timeout para requisições fetch - importante para evitar conexões pendentes
    signal: undefined as AbortSignal | undefined, // Será definido por requisição
  },
};

// Factory para criar AbortSignal com timeout
export function createQuerySignal(
  timeoutMs: number = POOL_CONFIG.connectionTimeoutMillis
): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

// Criar conexão com Neon com configuração de pooling
const sqlBase = neon(connectionString, NEON_OPTIONS);

export const db = drizzle(sqlBase);

// Exportar sql com tipagem corrigida para retornar Array por padrão
export const sql = sqlBase as unknown as <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T[]>;

// Wrapper para operações de banco com retry
export async function dbQuery<T>(operation: () => Promise<T>): Promise<T> {
  return withRetry(operation);
}

// Configuração para desenvolvimento local
export const isDevelopment = process.env.NODE_ENV === 'development';

// Configuração para produção (Netlify)
export const isProduction = process.env.NODE_ENV === 'production';

// Métricas de conexão para monitoramento
interface ConnectionMetrics {
  totalQueries: number;
  failedQueries: number;
  retryCount: number;
  lastQueryTime: number | null;
  averageQueryTime: number;
}

const metrics: ConnectionMetrics = {
  totalQueries: 0,
  failedQueries: 0,
  retryCount: 0,
  lastQueryTime: null,
  averageQueryTime: 0,
};

/**
 * Obtém métricas de conexão para monitoramento
 */
export function getConnectionMetrics(): ConnectionMetrics {
  return { ...metrics };
}

/**
 * Wrapper para operações de banco com métricas e retry
 */
export async function dbQueryWithMetrics<T>(operation: () => Promise<T>): Promise<T> {
  const startTime = Date.now();
  metrics.totalQueries++;

  try {
    const result = await withRetry(operation);
    const queryTime = Date.now() - startTime;
    metrics.lastQueryTime = queryTime;
    metrics.averageQueryTime =
      (metrics.averageQueryTime * (metrics.totalQueries - 1) + queryTime) / metrics.totalQueries;
    return result;
  } catch (error) {
    metrics.failedQueries++;
    throw error;
  }
}

/**
 * Health check para verificar conexão com o banco
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs: number | null;
  error: string | null;
}> {
  const startTime = Date.now();
  try {
    await sql`SELECT 1`;
    return {
      healthy: true,
      latencyMs: Date.now() - startTime,
      error: null,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      healthy: false,
      latencyMs: null,
      error: errorMessage,
    };
  }
}

/**
 * Exporta configurações para uso em outros módulos
 */
export const poolConfig = POOL_CONFIG;
export const retryConfig = RETRY_CONFIG;

console.log('🔗 Neon Database configurado com pooling e retry:', {
  environment: process.env.NODE_ENV,
  hasConnectionString: !!process.env.DATABASE_URL,
  isDevelopment,
  isProduction,
  poolConfig: POOL_CONFIG,
  retryConfig: RETRY_CONFIG,
  connectionStringLength: connectionString.length,
});
