/**
 * @fileoverview Módulo de API para requisições HTTP autenticadas
 * @module lib/api
 *
 * Fornece funções utilitárias para fazer requisições autenticadas
 * com JWT tokens armazenados no localStorage.
 *
 * @example
 * ```typescript
 * import { fetchWithAuth, getAuthHeaders } from '@/lib/api';
 *
 * // Fazer requisição GET autenticada
 * const response = await fetchWithAuth('/api/users');
 * const users = await response.json();
 *
 * // Usar headers em outra biblioteca
 * const headers = getAuthHeaders();
 * ```
 */

/**
 * Extrai o ID do usuário atual do localStorage
 *
 * @private
 * @returns {string} ID do usuário ou string vazia se não autenticado
 */
function getUserId(): string {
  try {
    const auth = localStorage.getItem('7care_auth');
    if (auth) {
      const user = JSON.parse(auth);
      return user?.id?.toString() || '';
    }
  } catch {
    // Ignora erros de parse
  }
  return '';
}

/**
 * Retorna headers de autenticação para requisições HTTP
 *
 * Inclui automaticamente:
 * - Content-Type: application/json
 * - Authorization: Bearer {token} (se disponível)
 * - x-user-id: {userId} (se disponível)
 *
 * @returns {HeadersInit} Objeto de headers para fetch
 *
 * @example
 * ```typescript
 * const headers = getAuthHeaders();
 * // { 'Content-Type': 'application/json', 'Authorization': 'Bearer xxx', 'x-user-id': '123' }
 * ```
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('7care_token');
  const userId = getUserId();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { 'x-user-id': userId } : {}),
  };
}

/**
 * Realiza uma requisição HTTP com autenticação automática
 *
 * Wrapper do fetch nativo que adiciona automaticamente
 * headers de autenticação (JWT token e user ID).
 *
 * @param {string} url - URL da requisição
 * @param {RequestInit} [options={}] - Opções do fetch (method, body, etc.)
 * @returns {Promise<Response>} Promise com a resposta HTTP
 *
 * @example
 * ```typescript
 * // GET request
 * const response = await fetchWithAuth('/api/users');
 *
 * // POST request
 * const response = await fetchWithAuth('/api/users', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'John' })
 * });
 * ```
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('7care_token');
  const userId = getUserId();

  // Debug log para verificar se token existe
  if (!token) {
    console.warn('[fetchWithAuth] Token JWT não encontrado no localStorage. URL:', url);
  } else {
    console.log('[fetchWithAuth] Token JWT encontrado. URL:', url);
  }

  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { 'x-user-id': userId } : {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Configuração de retry
 */
interface RetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: number[];
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  retryOn: [500, 502, 503, 504, 429],
};

/**
 * Calcula o delay com backoff exponencial e jitter
 *
 * @param attempt - Número da tentativa (começando em 0)
 * @param initialDelayMs - Delay inicial em ms
 * @param maxDelayMs - Delay máximo em ms
 * @returns Delay em ms com jitter
 */
function calculateBackoff(attempt: number, initialDelayMs: number, maxDelayMs: number): number {
  const exponentialDelay = initialDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  // Adiciona jitter de ±25% para evitar thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() - 0.5);
  return Math.round(cappedDelay + jitter);
}

/**
 * Aguarda por um tempo determinado
 *
 * @param ms - Tempo em milissegundos
 * @returns Promise que resolve após o tempo
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Realiza uma requisição HTTP com retry automático e backoff exponencial
 *
 * Faz retry automático em erros de rede ou status codes específicos
 * (500, 502, 503, 504, 429 por padrão).
 *
 * @param url - URL da requisição
 * @param options - Opções do fetch (method, body, etc.)
 * @param retryConfig - Configuração de retry
 * @returns Promise com a resposta HTTP
 *
 * @example
 * ```typescript
 * // Com configuração padrão (3 tentativas)
 * const response = await fetchWithRetry('/api/data');
 *
 * // Com configuração customizada
 * const response = await fetchWithRetry('/api/data', {}, {
 *   maxAttempts: 5,
 *   initialDelayMs: 200,
 * });
 * ```
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = {}
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      const response = await fetchWithAuth(url, options);

      // Se não deve fazer retry neste status, retorna
      if (!config.retryOn.includes(response.status)) {
        return response;
      }

      // Se é última tentativa, retorna mesmo com erro
      if (attempt === config.maxAttempts - 1) {
        return response;
      }

      // Aguarda com backoff antes de tentar novamente
      const delay = calculateBackoff(attempt, config.initialDelayMs, config.maxDelayMs);
      console.warn(
        `[API] Retry ${attempt + 1}/${config.maxAttempts} para ${url} após ${delay}ms (status: ${response.status})`
      );
      await sleep(delay);
    } catch (error) {
      lastError = error as Error;

      // Se é última tentativa, lança o erro
      if (attempt === config.maxAttempts - 1) {
        throw lastError;
      }

      // Aguarda com backoff antes de tentar novamente
      const delay = calculateBackoff(attempt, config.initialDelayMs, config.maxDelayMs);
      console.warn(
        `[API] Retry ${attempt + 1}/${config.maxAttempts} para ${url} após ${delay}ms (erro: ${lastError.message})`
      );
      await sleep(delay);
    }
  }

  // Nunca deve chegar aqui, mas TypeScript precisa
  throw lastError || new Error('Retry failed');
}
