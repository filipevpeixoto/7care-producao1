/**
 * Módulo de Rate Limiting
 * Protege a API contra abuso e ataques de força bruta
 */

// Cache em memória para rate limiting (resetado a cada cold start)
// Em produção, considere usar Redis ou similar
const rateLimitCache = new Map();

// Configurações de rate limiting por tipo de rota
const RATE_LIMIT_CONFIG = {
  // Rotas de autenticação - mais restritivas
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 10, // 10 tentativas
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  // Rotas de API geral
  api: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 100, // 100 requisições por minuto
    message: 'Limite de requisições excedido. Tente novamente em 1 minuto.'
  },
  // Rotas de escrita (POST, PUT, DELETE)
  write: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 30, // 30 escritas por minuto
    message: 'Limite de operações de escrita excedido.'
  },
  // Rotas de importação/exportação
  bulk: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxRequests: 5, // 5 operações bulk
    message: 'Limite de operações em massa excedido. Aguarde 5 minutos.'
  }
};

/**
 * Limpa entradas expiradas do cache
 */
function cleanExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitCache.entries()) {
    if (now > data.windowStart + data.windowMs) {
      rateLimitCache.delete(key);
    }
  }
}

/**
 * Obtém o tipo de rate limit baseado na rota e método
 * @param {string} path - Caminho da rota
 * @param {string} method - Método HTTP
 * @returns {string} Tipo de rate limit
 */
function getRateLimitType(path, method) {
  // Rotas de autenticação
  if (path.includes('/auth/login') || path.includes('/auth/register')) {
    return 'auth';
  }
  
  // Rotas de importação/exportação
  if (path.includes('/import') || path.includes('/export') || path.includes('/bulk')) {
    return 'bulk';
  }
  
  // Métodos de escrita
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return 'write';
  }
  
  // Padrão
  return 'api';
}

/**
 * Verifica se a requisição está dentro do limite
 * @param {Object} event - Evento da função Netlify
 * @returns {Object} Resultado da verificação
 */
function checkRateLimit(event) {
  // Limpar entradas expiradas periodicamente
  if (Math.random() < 0.1) { // 10% das requisições
    cleanExpiredEntries();
  }
  
  const path = event.path || event.rawUrl || '';
  const method = event.httpMethod || 'GET';
  const ip = event.headers['x-forwarded-for'] || 
             event.headers['x-real-ip'] || 
             event.headers['client-ip'] ||
             'unknown';
  
  const limitType = getRateLimitType(path, method);
  const config = RATE_LIMIT_CONFIG[limitType];
  
  const key = `${ip}:${limitType}`;
  const now = Date.now();
  
  let data = rateLimitCache.get(key);
  
  // Criar nova entrada ou resetar se expirou
  if (!data || now > data.windowStart + config.windowMs) {
    data = {
      count: 1,
      windowStart: now,
      windowMs: config.windowMs
    };
    rateLimitCache.set(key, data);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowMs).toISOString()
    };
  }
  
  // Incrementar contador
  data.count++;
  rateLimitCache.set(key, data);
  
  // Verificar se excedeu limite
  if (data.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(data.windowStart + config.windowMs).toISOString(),
      message: config.message,
      retryAfter: Math.ceil((data.windowStart + config.windowMs - now) / 1000)
    };
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - data.count,
    resetAt: new Date(data.windowStart + config.windowMs).toISOString()
  };
}

/**
 * Gera headers de rate limit para a resposta
 * @param {Object} result - Resultado da verificação de rate limit
 * @returns {Object} Headers
 */
function getRateLimitHeaders(result) {
  const headers = {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': result.resetAt
  };
  
  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfter);
  }
  
  return headers;
}

/**
 * Middleware de rate limiting
 * @param {Object} event - Evento da função Netlify
 * @param {Object} headers - Headers base da resposta
 * @returns {Object|null} Resposta de erro ou null se permitido
 */
function rateLimitMiddleware(event, headers = {}) {
  const result = checkRateLimit(event);
  
  // Adicionar headers de rate limit
  const rateLimitHeaders = getRateLimitHeaders(result);
  Object.assign(headers, rateLimitHeaders);
  
  if (!result.allowed) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        error: result.message,
        retryAfter: result.retryAfter
      })
    };
  }
  
  return null; // Permitido continuar
}

/**
 * Verifica rate limit por identificador e tipo (versão simplificada para API direta)
 * @param {string} identifier - IP ou ID do usuário
 * @param {string} type - Tipo de rate limit (auth, api, write, bulk)
 * @returns {Object|null} null se permitido, objeto com retryAfter se bloqueado
 */
function checkRateLimitSimple(identifier, type = 'api') {
  const config = RATE_LIMIT_CONFIG[type] || RATE_LIMIT_CONFIG.api;
  const key = `${identifier}:${type}`;
  const now = Date.now();
  
  let data = rateLimitCache.get(key);
  
  // Criar nova entrada ou resetar se expirou
  if (!data || now > data.windowStart + config.windowMs) {
    data = {
      count: 1,
      windowStart: now,
      windowMs: config.windowMs
    };
    rateLimitCache.set(key, data);
    return null;
  }
  
  // Incrementar contador
  data.count++;
  rateLimitCache.set(key, data);
  
  // Verificar se excedeu limite
  if (data.count > config.maxRequests) {
    return {
      retryAfter: Math.ceil((data.windowStart + config.windowMs - now) / 1000),
      message: config.message
    };
  }
  
  return null;
}

/**
 * Reseta rate limit para um identificador
 * @param {string} identifier - IP ou ID do usuário
 */
function resetRateLimit(identifier) {
  // Remove todas as entradas que começam com o identificador
  for (const key of rateLimitCache.keys()) {
    if (key.startsWith(`${identifier}:`)) {
      rateLimitCache.delete(key);
    }
  }
}

/**
 * Obtém status atual do rate limit
 * @param {string} identifier - IP ou ID do usuário
 * @param {string} type - Tipo de rate limit
 * @returns {Object} Status do rate limit
 */
function getRateLimitStatus(identifier, type = 'api') {
  const config = RATE_LIMIT_CONFIG[type] || RATE_LIMIT_CONFIG.api;
  const key = `${identifier}:${type}`;
  const data = rateLimitCache.get(key);
  
  if (!data) {
    return {
      count: 0,
      remaining: config.maxRequests,
      limit: config.maxRequests
    };
  }
  
  return {
    count: data.count,
    remaining: Math.max(0, config.maxRequests - data.count),
    limit: config.maxRequests,
    windowStart: data.windowStart,
    windowMs: data.windowMs
  };
}

/**
 * Gera resposta de rate limit excedido
 * @param {Object} headers - Headers base
 * @param {Object} rateLimitResult - Resultado do checkRateLimitSimple
 * @returns {Object} Resposta HTTP
 */
function rateLimitResponse(headers, rateLimitResult) {
  const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
  return {
    statusCode: 429,
    headers: {
      ...headers,
      'Retry-After': String(Math.max(retryAfter, 1)),
      'X-RateLimit-Limit': String(rateLimitResult.limit || 100),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(rateLimitResult.resetTime || Date.now() + 60000)
    },
    body: JSON.stringify({
      error: rateLimitResult.message || 'Limite de requisições excedido. Tente novamente em alguns minutos.',
      retryAfter: Math.max(retryAfter, 1)
    })
  };
}

module.exports = {
  checkRateLimit,
  checkRateLimitSimple,
  getRateLimitHeaders,
  rateLimitMiddleware,
  rateLimitResponse,
  resetRateLimit,
  getRateLimitStatus,
  RATE_LIMIT_CONFIG
};
