/**
 * Módulo de Logger
 * Centraliza logging estruturado da aplicação
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

// Nível mínimo de log (pode ser configurado via env)
const MIN_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

/**
 * Formata data para logs
 * @returns {string} Data formatada
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Formata objeto para log
 * @param {Object} obj - Objeto para formatar
 * @returns {string} Objeto formatado
 */
function formatObject(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

/**
 * Cria entrada de log estruturada
 * @param {string} level - Nível do log
 * @param {string} message - Mensagem
 * @param {Object} context - Contexto adicional
 * @returns {Object} Entrada de log
 */
function createLogEntry(level, message, context = {}) {
  return {
    timestamp: getTimestamp(),
    level,
    message,
    ...context,
    ...(process.env.NODE_ENV && { env: process.env.NODE_ENV })
  };
}

/**
 * Escreve log no console
 * @param {string} level - Nível do log
 * @param {Object} entry - Entrada de log
 */
function writeLog(level, entry) {
  const levelNum = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  if (levelNum < MIN_LOG_LEVEL) return;
  
  const logString = JSON.stringify(entry);
  
  switch (level) {
    case 'ERROR':
    case 'FATAL':
      console.error(logString);
      break;
    case 'WARN':
      console.warn(logString);
      break;
    case 'DEBUG':
      console.debug(logString);
      break;
    default:
      console.log(logString);
  }
}

/**
 * Log de debug
 * @param {string} message - Mensagem
 * @param {Object} context - Contexto adicional
 */
function debug(message, context = {}) {
  writeLog('DEBUG', createLogEntry('DEBUG', message, context));
}

/**
 * Log de informação
 * @param {string} message - Mensagem
 * @param {Object} context - Contexto adicional
 */
function info(message, context = {}) {
  writeLog('INFO', createLogEntry('INFO', message, context));
}

/**
 * Log de aviso
 * @param {string} message - Mensagem
 * @param {Object} context - Contexto adicional
 */
function warn(message, context = {}) {
  writeLog('WARN', createLogEntry('WARN', message, context));
}

/**
 * Log de erro
 * @param {string} message - Mensagem
 * @param {Error|Object} error - Erro ou contexto
 * @param {Object} context - Contexto adicional
 */
function error(message, error = {}, context = {}) {
  const errorContext = error instanceof Error ? {
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack
  } : error;
  
  writeLog('ERROR', createLogEntry('ERROR', message, { ...errorContext, ...context }));
}

/**
 * Log fatal
 * @param {string} message - Mensagem
 * @param {Error|Object} error - Erro ou contexto
 * @param {Object} context - Contexto adicional
 */
function fatal(message, error = {}, context = {}) {
  const errorContext = error instanceof Error ? {
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack
  } : error;
  
  writeLog('FATAL', createLogEntry('FATAL', message, { ...errorContext, ...context }));
}

/**
 * Log de requisição HTTP
 * @param {Object} req - Objeto da requisição
 * @param {Object} res - Objeto da resposta (opcional)
 * @param {number} duration - Duração em ms (opcional)
 */
function httpRequest(req, res = null, duration = null) {
  const context = {
    method: req.method || req.httpMethod,
    path: req.path || req.rawUrl?.split('?')[0],
    userAgent: req.headers?.['user-agent'],
    ip: req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown',
    userId: req.headers?.['x-user-id'] || 'anonymous'
  };
  
  if (res) {
    context.statusCode = res.statusCode;
  }
  
  if (duration !== null) {
    context.durationMs = duration;
  }
  
  info('HTTP Request', context);
}

/**
 * Log de operação de banco de dados
 * @param {string} operation - Tipo de operação (SELECT, INSERT, etc.)
 * @param {string} table - Nome da tabela
 * @param {Object} context - Contexto adicional
 */
function database(operation, table, context = {}) {
  debug('Database Operation', {
    operation,
    table,
    ...context
  });
}

/**
 * Log de autenticação
 * @param {string} event - Evento (login, logout, failed_login, etc.)
 * @param {string} userId - ID do usuário
 * @param {Object} context - Contexto adicional
 */
function auth(event, userId, context = {}) {
  info('Auth Event', {
    event,
    userId,
    ...context
  });
}

/**
 * Log de performance
 * @param {string} operation - Nome da operação
 * @param {number} durationMs - Duração em milissegundos
 * @param {Object} context - Contexto adicional
 */
function performance(operation, durationMs, context = {}) {
  const level = durationMs > 5000 ? 'WARN' : 'DEBUG';
  writeLog(level, createLogEntry(level, 'Performance', {
    operation,
    durationMs,
    ...context
  }));
}

/**
 * Cria timer para medir performance
 * @param {string} operation - Nome da operação
 * @returns {Function} Função para finalizar e logar
 */
function startTimer(operation) {
  const start = Date.now();
  return (context = {}) => {
    const duration = Date.now() - start;
    performance(operation, duration, context);
    return duration;
  };
}

/**
 * Log de evento de negócio
 * @param {string} event - Nome do evento
 * @param {Object} data - Dados do evento
 */
function businessEvent(event, data = {}) {
  info('Business Event', {
    event,
    ...data
  });
}

/**
 * Sanitiza dados sensíveis antes de logar
 * @param {Object} obj - Objeto para sanitizar
 * @returns {Object} Objeto sanitizado
 */
function sanitizeForLog(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveFields = ['password', 'senha', 'token', 'secret', 'api_key', 'apiKey', 'authorization'];
  const sanitized = { ...obj };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

module.exports = {
  debug,
  info,
  warn,
  error,
  fatal,
  httpRequest,
  database,
  auth,
  performance,
  startTimer,
  businessEvent,
  sanitizeForLog,
  LOG_LEVELS
};
