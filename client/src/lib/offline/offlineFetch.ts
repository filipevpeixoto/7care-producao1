/**
 * Fetch wrapper com suporte offline automático
 * Intercepta requisições e usa cache do IndexedDB quando offline
 *
 * Melhorias:
 * - Suporte a PATCH
 * - Suporte a FormData
 * - Melhor tipagem
 * - Checksum para detecção de conflitos
 * - Timeout handling
 * - Cache inteligente com invalidação
 */

import {
  saveUsersOffline,
  getUsersOffline,
  saveEventsOffline,
  getEventsOffline,
  saveTasksOffline,
  getTasksOffline,
  saveCurrentUserOffline,
  getCurrentUserOffline,
  addToSyncQueue,
  canAccessFullOfflineData,
  hashData,
} from '@/lib/offline';

// ===== TIPOS =====

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface FetchOptions extends RequestInit {
  skipOfflineCache?: boolean;
  timeout?: number;
  retryOnFail?: boolean;
}

interface CacheHandler {
  save: (data: unknown[], role?: string) => Promise<void>;
  get: (params?: Record<string, string>) => Promise<unknown[]>;
  needsRole?: boolean;
  cacheDuration?: number; // em milissegundos
}

// ===== CONFIGURAÇÕES =====

const DEFAULT_TIMEOUT = 30000; // 30 segundos
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Cache de timestamps para invalidação
const cacheTimestamps: Map<string, number> = new Map();

// ===== HANDLERS DE CACHE =====

const offlineHandlers: Record<string, CacheHandler> = {
  '/api/users': {
    save: saveUsersOffline as (data: unknown[], role?: string) => Promise<void>,
    get: getUsersOffline,
    needsRole: true,
    cacheDuration: CACHE_DURATION,
  },
  '/api/events': {
    save: saveEventsOffline as (data: unknown[]) => Promise<void>,
    get: getEventsOffline,
    cacheDuration: CACHE_DURATION,
  },
  '/api/tasks': {
    save: saveTasksOffline as (data: unknown[]) => Promise<void>,
    get: getTasksOffline,
    cacheDuration: CACHE_DURATION,
  },
};

// ===== ESTADO =====

let currentUserRole: string | null = null;
let originalFetch: typeof fetch | null = null;
let isIntercepting = false;

// ===== FUNÇÕES PÚBLICAS =====

/**
 * Define o role do usuário atual (chamado após login)
 */
export function setOfflineUserRole(role: string | null): void {
  currentUserRole = role;
  console.log(`[OfflineFetch] Role definido: ${role || 'nenhum'}`);
}

/**
 * Obtém o role do usuário atual
 */
export function getOfflineUserRole(): string | null {
  return currentUserRole;
}

/**
 * Verifica se o usuário tem acesso offline
 */
export function hasOfflineAccess(): boolean {
  // Se já tem role definido, usar
  if (currentUserRole) {
    return canAccessFullOfflineData(currentUserRole);
  }

  // Tentar recuperar do localStorage como fallback
  try {
    const storedAuth = localStorage.getItem('7care_auth');
    if (storedAuth) {
      const user = JSON.parse(storedAuth);
      if (user?.role) {
        currentUserRole = user.role;
        console.log(
          `[OfflineFetch] Role recuperado do localStorage em hasOfflineAccess: ${user.role}`
        );
        return canAccessFullOfflineData(user.role);
      }
    }
  } catch (e) {
    console.warn('[OfflineFetch] Erro ao recuperar role:', e);
  }

  return false;
}

/**
 * Fetch wrapper que automaticamente usa cache offline
 */
export async function offlineFetch(
  input: RequestInfo | URL,
  init?: FetchOptions
): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString();
  const method = (init?.method?.toUpperCase() || 'GET') as HttpMethod;

  // Se requisitado para pular cache offline
  if (init?.skipOfflineCache) {
    return fetchWithTimeout(input, init);
  }

  // Verificar se tem permissão para dados offline
  const canUseOffline = hasOfflineAccess();

  // Para requisições GET
  if (method === 'GET') {
    return handleGetRequest(url, input, init, canUseOffline);
  }

  // Para requisições de escrita (POST, PUT, PATCH, DELETE)
  return handleWriteRequest(url, input, init, method, canUseOffline);
}

// ===== HANDLERS DE REQUISIÇÃO =====

/**
 * Trata requisições GET com cache offline
 */
async function handleGetRequest(
  url: string,
  input: RequestInfo | URL,
  init: FetchOptions | undefined,
  canUseOffline: boolean
): Promise<Response> {
  const baseUrl = getBaseUrl(url);

  console.log(`[OfflineFetch] GET ${url}`, {
    baseUrl,
    canUseOffline,
    isOnline: navigator.onLine,
    currentRole: currentUserRole,
  });

  try {
    // Tentar buscar da rede
    const response = await fetchWithTimeout(input, init);

    if (response.ok && canUseOffline) {
      // Clonar resposta antes de consumir
      const clonedResponse = response.clone();

      // Processar em background para não bloquear
      processAndCacheResponse(baseUrl, clonedResponse).catch(err =>
        console.warn('[OfflineFetch] Erro ao cachear resposta:', err)
      );
    }

    return response;
  } catch (error) {
    console.log(`[OfflineFetch] Erro de rede para ${url}:`, {
      error: error instanceof Error ? error.message : String(error),
      isOfflineError: isOfflineError(error),
      navigatorOnline: navigator.onLine,
      canUseOffline,
    });

    // Se offline ou erro de rede, tentar buscar do cache
    if (canUseOffline && (isOfflineError(error) || !navigator.onLine)) {
      console.log(`[OfflineFetch] Tentando buscar do cache: ${url}`);

      const cachedResponse = await getCachedResponse(baseUrl, url);
      if (cachedResponse) {
        console.log(`[OfflineFetch] ✓ Dados retornados do cache para ${url}`);
        return cachedResponse;
      } else {
        console.warn(`[OfflineFetch] ✗ Nenhum dado no cache para ${url}`);
      }
    }

    throw error;
  }
}

/**
 * Trata requisições de escrita com fila offline
 */
async function handleWriteRequest(
  url: string,
  input: RequestInfo | URL,
  init: FetchOptions | undefined,
  method: HttpMethod,
  canUseOffline: boolean
): Promise<Response> {
  try {
    // Tentar executar online
    const response = await fetchWithTimeout(input, init);

    // Se sucesso, invalidar cache relacionado
    if (response.ok) {
      invalidateCache(url);
    }

    return response;
  } catch (error) {
    // Se offline e tem permissão, adicionar à fila de sync
    if (canUseOffline && (isOfflineError(error) || !navigator.onLine)) {
      return queueForSync(url, init, method);
    }

    throw error;
  }
}

// ===== FUNÇÕES DE CACHE =====

/**
 * Processa e cacheia a resposta
 */
async function processAndCacheResponse(baseUrl: string, response: Response): Promise<void> {
  const handler = offlineHandlers[baseUrl];
  if (!handler) return;

  try {
    const data = await response.json();

    if (Array.isArray(data)) {
      if (handler.needsRole) {
        await handler.save(data, currentUserRole || undefined);
      } else {
        await handler.save(data);
      }

      // Atualizar timestamp do cache
      cacheTimestamps.set(baseUrl, Date.now());
      console.log(`[OfflineFetch] Cache atualizado: ${baseUrl} (${data.length} itens)`);
    }
  } catch (err) {
    console.warn('[OfflineFetch] Erro ao processar resposta para cache:', err);
  }
}

/**
 * Obtém resposta do cache
 */
async function getCachedResponse(baseUrl: string, originalUrl: string): Promise<Response | null> {
  const handler = offlineHandlers[baseUrl];
  if (!handler) return null;

  try {
    // Extrair parâmetros da URL
    const params = extractUrlParams(originalUrl);
    const cachedData = await handler.get(params);

    console.log(`[OfflineFetch] Buscando do cache ${baseUrl}:`, {
      found: !!cachedData,
      length: cachedData?.length || 0,
      params,
    });

    if (cachedData && cachedData.length > 0) {
      const cachedAt = cacheTimestamps.get(baseUrl);

      console.log(`[OfflineFetch] ✓ Retornando ${cachedData.length} itens do cache offline`);

      return new Response(JSON.stringify(cachedData), {
        status: 200,
        statusText: 'OK (Offline Cache)',
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Cache': 'true',
          'X-Cache-Timestamp': cachedAt?.toString() || '',
        },
      });
    } else {
      console.warn(`[OfflineFetch] ⚠️ Cache vazio para ${baseUrl}`);
    }
  } catch (cacheError) {
    console.error('[OfflineFetch] ❌ Erro ao buscar do cache:', cacheError);
  }

  return null;
}

/**
 * Invalida o cache relacionado a uma URL
 */
function invalidateCache(url: string): void {
  const baseUrl = getBaseUrl(url);
  cacheTimestamps.delete(baseUrl);

  // Se for uma URL de entidade específica, invalidar a lista também
  const entityMatch = url.match(/\/api\/(\w+)/);
  if (entityMatch) {
    cacheTimestamps.delete(`/api/${entityMatch[1]}`);
  }
}

// ===== QUEUE PARA SYNC =====

/**
 * Adiciona requisição à fila de sincronização
 */
async function queueForSync(
  url: string,
  init: FetchOptions | undefined,
  method: HttpMethod
): Promise<Response> {
  console.log(`[OfflineFetch] Offline - adicionando à fila de sync: ${method} ${url}`);

  const baseUrl = getBaseUrl(url);
  const entity = getEntityFromUrl(baseUrl);

  if (!entity) {
    throw new Error(`Entidade não suportada para sync offline: ${url}`);
  }

  // Extrair body da requisição
  const body = await extractRequestBody(init);

  // Calcular checksum para detecção de conflitos
  const checksum = body ? await hashData(body) : undefined;

  // Extrair ID da entidade se for update/delete
  const entityId = extractEntityId(url);

  const action = getActionFromMethod(method);

  await addToSyncQueue({
    type: action,
    entity,
    entityId,
    data: body,
    originalChecksum: checksum,
    endpoint: url,
    method: method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  });

  // Retornar resposta de sucesso simulada
  return new Response(
    JSON.stringify({
      success: true,
      offline: true,
      queued: true,
      message: 'Dados salvos localmente. Serão sincronizados quando você voltar online.',
      queuedAt: new Date().toISOString(),
    }),
    {
      status: 202, // Accepted
      statusText: 'Accepted (Queued for Sync)',
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Queued': 'true',
      },
    }
  );
}

// ===== UTILITÁRIOS =====

/**
 * Fetch com timeout
 */
async function fetchWithTimeout(input: RequestInfo | URL, init?: FetchOptions): Promise<Response> {
  const timeout = init?.timeout || DEFAULT_TIMEOUT;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Usar originalFetch ao invés de fetch para evitar recursão infinita
    const response = await (originalFetch || fetch)(input, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extrai o body da requisição (suporta FormData e JSON)
 */
async function extractRequestBody(init?: FetchOptions): Promise<string> {
  if (!init?.body) return '';

  const body = init.body;

  // String
  if (typeof body === 'string') {
    return body;
  }

  // FormData
  if (body instanceof FormData) {
    const obj: Record<string, unknown> = {};
    body.forEach((value, key) => {
      // Não incluir arquivos no JSON (precisaria de tratamento especial)
      if (!(value instanceof File)) {
        obj[key] = value;
      } else {
        obj[key] = `[File: ${value.name}]`;
      }
    });
    return JSON.stringify(obj);
  }

  // URLSearchParams
  if (body instanceof URLSearchParams) {
    const obj: Record<string, string> = {};
    body.forEach((value, key) => {
      obj[key] = value;
    });
    return JSON.stringify(obj);
  }

  // ArrayBuffer, Blob, etc.
  if (body instanceof Blob) {
    const text = await body.text();
    return text;
  }

  // Outros (tentar stringify)
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

/**
 * Extrai parâmetros da URL
 */
function extractUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URL(url, window.location.origin).searchParams;
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * Obtém a URL base (sem query params)
 */
function getBaseUrl(url: string): string {
  return url.split('?')[0];
}

/**
 * Extrai a entidade da URL
 */
function getEntityFromUrl(url: string): 'users' | 'events' | 'tasks' | 'messages' | null {
  if (url.includes('/users')) return 'users';
  if (url.includes('/events')) return 'events';
  if (url.includes('/tasks')) return 'tasks';
  if (url.includes('/messages')) return 'messages';
  return null;
}

/**
 * Extrai o ID da entidade da URL
 */
function extractEntityId(url: string): number | undefined {
  const match = url.match(/\/api\/\w+\/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Converte método HTTP em ação de sync
 */
function getActionFromMethod(method: HttpMethod): 'create' | 'update' | 'delete' {
  switch (method) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'update';
  }
}

/**
 * Verifica se é um erro de offline/rede
 */
function isOfflineError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // "Failed to fetch" é erro típico de rede
    return error.message.includes('fetch') || error.message.includes('network');
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    // Timeout
    return true;
  }
  return false;
}

// ===== INTERCEPTAÇÃO GLOBAL =====

/**
 * Substitui o fetch global para interceptar todas as requisições
 */
export function enableGlobalOfflineFetch(): void {
  if (isIntercepting) {
    console.log('[OfflineFetch] Interceptação já está ativa');
    return;
  }

  // Tentar recuperar o role do usuário do localStorage
  try {
    const storedAuth = localStorage.getItem('7care_auth');
    if (storedAuth) {
      const user = JSON.parse(storedAuth);
      if (user?.role) {
        currentUserRole = user.role;
        console.log(`[OfflineFetch] Role recuperado do localStorage: ${user.role}`);
      }
    }
  } catch (e) {
    console.warn('[OfflineFetch] Erro ao recuperar role do localStorage:', e);
  }

  originalFetch = window.fetch.bind(window);
  isIntercepting = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();

    // Só interceptar requisições para a API local
    if (url.startsWith('/api/') || url.includes('/api/')) {
      return offlineFetch(input, init as FetchOptions);
    }

    // Para outras requisições, usar fetch original
    return originalFetch!(input, init);
  };

  console.log('[OfflineFetch] Interceptação global ativada');
}

/**
 * Desativa a interceptação global
 */
export function disableGlobalOfflineFetch(): void {
  if (!isIntercepting || !originalFetch) {
    console.log('[OfflineFetch] Interceptação não está ativa');
    return;
  }

  window.fetch = originalFetch;
  originalFetch = null;
  isIntercepting = false;

  console.log('[OfflineFetch] Interceptação global desativada');
}

/**
 * Verifica se a interceptação está ativa
 */
export function isOfflineFetchEnabled(): boolean {
  return isIntercepting;
}

// ===== CACHE DO USUÁRIO =====

/**
 * Cache do usuário logado
 */
export async function cacheCurrentUser(user: unknown): Promise<void> {
  try {
    const userData = user as {
      id?: number;
      name?: string;
      email?: string;
      role?: string;
    };

    if (userData?.id && userData?.name && userData?.email && userData?.role) {
      await saveCurrentUserOffline(user as Parameters<typeof saveCurrentUserOffline>[0]);
      console.log('[OfflineFetch] Usuário atual cacheado');
    }
  } catch (error) {
    console.warn('[OfflineFetch] Erro ao cachear usuário:', error);
  }
}

/**
 * Recupera o usuário logado do cache
 */
export async function getCachedCurrentUser(): Promise<unknown | null> {
  try {
    return await getCurrentUserOffline();
  } catch (error) {
    console.warn('[OfflineFetch] Erro ao recuperar usuário do cache:', error);
    return null;
  }
}

/**
 * Limpa todos os caches de timestamp
 */
export function clearCacheTimestamps(): void {
  cacheTimestamps.clear();
  console.log('[OfflineFetch] Cache timestamps limpos');
}
