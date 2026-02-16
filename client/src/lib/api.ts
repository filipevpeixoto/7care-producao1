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

import { apiLogger } from '@/lib/logger';

/**
 * Base URL para chamadas de API.
 * - No browser (web): string vazia (URLs relativas funcionam via proxy)
 * - No Tauri (desktop/mobile): URL completa do servidor de produção
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Resolve um path relativo de API para URL completa quando necessário.
 * No browser, '/api/users' continua '/api/users'.
 * No Tauri, '/api/users' vira 'https://7care-app.vercel.app/api/users'.
 */
export function resolveApiUrl(url: string): string {
  if (!API_BASE_URL) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url}`;
}

/**
 * Lê o token CSRF do cookie (padrão double-submit cookie)
 *
 * O server define um cookie `csrf-token` com httpOnly=false para
 * que o client possa lê-lo e reenviá-lo como header `x-csrf-token`.
 *
 * @private
 * @returns {string | null} Token CSRF ou null se não disponível
 */
function getCsrfToken(): string | null {
  try {
    const match = document.cookie.match(/csrf-token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getHeaderValue(headers: HeadersInit | undefined, key: string): string | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    return headers.get(key) || undefined;
  }
  if (Array.isArray(headers)) {
    const match = headers.find(([headerKey]) => headerKey.toLowerCase() === key.toLowerCase());
    return match ? match[1] : undefined;
  }
  const record = headers as Record<string, string>;
  return record[key] || record[key.toLowerCase()];
}

/**
 * Retorna headers de autenticação para requisições HTTP
 *
 * Inclui automaticamente:
 * - Content-Type: application/json
 * - Authorization: Bearer {token} (se disponível)
 * - x-csrf-token: {csrfToken} (se disponível, para proteção CSRF)
 *
 * @returns {HeadersInit} Objeto de headers para fetch
 *
 * @example
 * ```typescript
 * const headers = getAuthHeaders();
 * // { 'Content-Type': 'application/json', 'Authorization': 'Bearer xxx', 'x-csrf-token': 'abc...' }
 * ```
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('7care_token');
  const csrfToken = getCsrfToken();
  const correlationId = createCorrelationId();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    'x-correlation-id': correlationId,
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
  const csrfToken = getCsrfToken();
  const existingCorrelationId = getHeaderValue(options.headers, 'x-correlation-id');
  const correlationId = existingCorrelationId || createCorrelationId();

  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    'x-correlation-id': correlationId,
  };

  const resolvedUrl = resolveApiUrl(url);
  return fetch(resolvedUrl, {
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
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      apiLogger.warn(
        `Retry ${attempt + 1}/${config.maxAttempts} para ${url} após ${delay}ms (status: ${response.status})`
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
      apiLogger.warn(
        `Retry ${attempt + 1}/${config.maxAttempts} para ${url} após ${delay}ms (erro: ${lastError.message})`
      );
      await sleep(delay);
    }
  }

  // Nunca deve chegar aqui, mas TypeScript precisa
  throw lastError || new Error('Retry failed');
}
