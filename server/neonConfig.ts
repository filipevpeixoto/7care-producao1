import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Configuração do Neon Database - usa variável de ambiente ou fallback
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_enihr4YBSDm8@ep-still-glade-ac5u1r48-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

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
  } catch (error: any) {
    if (retries === 0) {
      console.error('❌ Falha após todas as tentativas:', error.message);
      throw error;
    }

    // Retry apenas para erros de rede/conexão
    const isRetriableError = 
      error.message?.includes('fetch failed') ||
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('timeout') ||
      error.code === 'ECONNRESET';

    if (!isRetriableError) {
      throw error;
    }

    console.warn(`⚠️ Erro de conexão, tentando novamente em ${delay}ms (${retries} tentativas restantes)...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Exponential backoff com jitter
    const nextDelay = Math.min(delay * 2 + Math.random() * 100, RETRY_CONFIG.maxDelayMs);
    return withRetry(operation, retries - 1, nextDelay);
  }
}

// Criar conexão com Neon com configuração de pooling
export const sql = neon(connectionString, {
  fetchConnectionCache: true, // Habilita cache de conexões
  fullResults: false, // Otimiza retorno de resultados
});

export const db = drizzle(sql);

// Wrapper para operações de banco com retry
export async function dbQuery<T>(operation: () => Promise<T>): Promise<T> {
  return withRetry(operation);
}

// Configuração para desenvolvimento local
export const isDevelopment = process.env.NODE_ENV === 'development';

// Configuração para produção (Netlify)
export const isProduction = process.env.NODE_ENV === 'production';

console.log('🔗 Neon Database configurado com pooling e retry:', {
  environment: process.env.NODE_ENV,
  hasConnectionString: !!process.env.DATABASE_URL,
  isDevelopment,
  isProduction,
  poolConfig: POOL_CONFIG,
  retryConfig: RETRY_CONFIG,
  connectionStringLength: connectionString.length
});
