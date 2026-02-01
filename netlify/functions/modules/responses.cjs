/**
 * Módulo de Respostas Padronizadas
 * Centraliza formatação de respostas da API
 */

/**
 * Cria resposta de sucesso padronizada
 * @param {any} data - Dados da resposta
 * @param {string} message - Mensagem opcional
 * @param {number} statusCode - Código HTTP (default 200)
 * @returns {Object} Resposta formatada
 */
function successResponse(data, message = null, statusCode = 200) {
  const response = {
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify({
      success: true,
      ...(message && { message }),
      data
    })
  };
  return response;
}

/**
 * Cria resposta de erro padronizada
 * @param {string} message - Mensagem de erro
 * @param {number} statusCode - Código HTTP (default 400)
 * @param {string} code - Código de erro opcional
 * @param {Object} details - Detalhes adicionais opcionais
 * @returns {Object} Resposta formatada
 */
function errorResponse(message, statusCode = 400, code = null, details = null) {
  const response = {
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify({
      success: false,
      error: message,
      ...(code && { code }),
      ...(details && { details })
    })
  };
  return response;
}

/**
 * Cria resposta de lista paginada
 * @param {Array} items - Items da página
 * @param {number} total - Total de items
 * @param {number} page - Página atual
 * @param {number} limit - Items por página
 * @returns {Object} Resposta formatada
 */
function paginatedResponse(items, total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return successResponse({
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages
    }
  });
}

/**
 * Cria resposta de validação com erros
 * @param {Array} errors - Lista de erros de validação
 * @returns {Object} Resposta formatada
 */
function validationErrorResponse(errors) {
  return errorResponse(
    'Erro de validação',
    400,
    'VALIDATION_ERROR',
    { errors }
  );
}

/**
 * Resposta para recurso não encontrado
 * @param {string} resource - Nome do recurso
 * @returns {Object} Resposta formatada
 */
function notFoundResponse(resource = 'Recurso') {
  return errorResponse(`${resource} não encontrado`, 404, 'NOT_FOUND');
}

/**
 * Resposta para não autorizado
 * @param {string} message - Mensagem opcional
 * @returns {Object} Resposta formatada
 */
function unauthorizedResponse(message = 'Não autorizado') {
  return errorResponse(message, 401, 'UNAUTHORIZED');
}

/**
 * Resposta para acesso proibido
 * @param {string} message - Mensagem opcional
 * @returns {Object} Resposta formatada
 */
function forbiddenResponse(message = 'Acesso negado') {
  return errorResponse(message, 403, 'FORBIDDEN');
}

/**
 * Resposta para erro interno do servidor
 * @param {Error} error - Erro capturado
 * @param {boolean} includeStack - Se deve incluir stack trace (apenas dev)
 * @returns {Object} Resposta formatada
 */
function serverErrorResponse(error, includeStack = false) {
  const response = errorResponse(
    'Erro interno do servidor',
    500,
    'INTERNAL_ERROR'
  );
  
  if (includeStack && process.env.NODE_ENV !== 'production') {
    const body = JSON.parse(response.body);
    body.stack = error.stack;
    body.originalMessage = error.message;
    response.body = JSON.stringify(body);
  }
  
  return response;
}

/**
 * Resposta para rate limit excedido
 * @param {number} retryAfter - Segundos até poder tentar novamente
 * @returns {Object} Resposta formatada
 */
function rateLimitResponse(retryAfter = 60) {
  const response = errorResponse(
    'Muitas requisições. Tente novamente mais tarde.',
    429,
    'RATE_LIMIT_EXCEEDED',
    { retryAfter }
  );
  response.headers['Retry-After'] = String(retryAfter);
  return response;
}

/**
 * Resposta para método não permitido
 * @param {Array} allowedMethods - Métodos permitidos
 * @returns {Object} Resposta formatada
 */
function methodNotAllowedResponse(allowedMethods = []) {
  const response = errorResponse(
    'Método não permitido',
    405,
    'METHOD_NOT_ALLOWED'
  );
  if (allowedMethods.length > 0) {
    response.headers['Allow'] = allowedMethods.join(', ');
  }
  return response;
}

/**
 * Resposta para conflito (ex: recurso já existe)
 * @param {string} message - Mensagem de conflito
 * @returns {Object} Resposta formatada
 */
function conflictResponse(message = 'Recurso já existe') {
  return errorResponse(message, 409, 'CONFLICT');
}

/**
 * Headers CORS padrão
 * @returns {Object} Headers CORS
 */
function getCorsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, x-user-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  };
}

/**
 * Resposta OPTIONS para preflight CORS
 * @returns {Object} Resposta formatada
 */
function corsPreflightResponse() {
  return {
    statusCode: 204,
    headers: getCorsHeaders(),
    body: ''
  };
}

/**
 * Converte snake_case para camelCase em objeto
 * @param {Object} obj - Objeto com keys em snake_case
 * @returns {Object} Objeto com keys em camelCase
 */
function toCamelCase(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = toCamelCase(value);
  }
  return result;
}

/**
 * Converte camelCase para snake_case em objeto
 * @param {Object} obj - Objeto com keys em camelCase
 * @returns {Object} Objeto com keys em snake_case
 */
function toSnakeCase(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = toSnakeCase(value);
  }
  return result;
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  rateLimitResponse,
  methodNotAllowedResponse,
  conflictResponse,
  getCorsHeaders,
  corsPreflightResponse,
  toCamelCase,
  toSnakeCase
};
