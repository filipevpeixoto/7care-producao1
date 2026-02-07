/**
 * Logger Centralizado e Seguro
 * Sanitiza dados sensíveis e padroniza formato de logs
 * Em produção: JSON structured logging para integração com serviços de observability
 * Em desenvolvimento: formato humano legível
 */

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

// Campos que devem ser sanitizados (nunca logados)
const SENSITIVE_FIELDS = [
  'password',
  'senha',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cpf',
  'rg',
  'creditCard',
  'cardNumber',
  'cvv',
  'secret',
  'apiKey',
  'api_key',
  'privateKey',
  'private_key',
];

// Campos que devem ser parcialmente mascarados
const PARTIAL_MASK_FIELDS = ['email', 'phone', 'telefone', 'celular'];

/**
 * Mascara um email parcialmente (ex: j***@example.com)
 */
const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain) return '[MASKED_EMAIL]';
  if (local.length <= 2) return `**@${domain}`;
  return `${local[0]}***@${domain}`;
};

/**
 * Mascara um telefone parcialmente (ex: ***-***-1234)
 */
const maskPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '[MASKED_PHONE]';
  return `***-***-${digits.slice(-4)}`;
};

/**
 * Sanitiza um valor baseado no nome do campo
 */
const sanitizeValue = (key: string, value: unknown): unknown => {
  const lowerKey = key.toLowerCase();

  // Campos totalmente sensíveis
  if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
    return '[REDACTED]';
  }

  // Campos parcialmente mascarados
  if (typeof value === 'string') {
    if (PARTIAL_MASK_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      if (lowerKey.includes('email')) {
        return maskEmail(value);
      }
      if (
        lowerKey.includes('phone') ||
        lowerKey.includes('telefone') ||
        lowerKey.includes('celular')
      ) {
        return maskPhone(value);
      }
    }
  }

  return value;
};

/**
 * Sanitiza um objeto recursivamente
 */
const sanitizeObject = (obj: unknown, depth = 0): unknown => {
  // Prevenir recursão infinita
  if (depth > 10) return '[MAX_DEPTH]';

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, depth + 1);
      } else {
        sanitized[key] = sanitizeValue(key, value);
      }
    }

    return sanitized;
  }

  return obj;
};

/**
 * Formata timestamp para log
 */
const getTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Emite log estruturado em JSON (produção) ou texto formatado (desenvolvimento)
 */
const emit = (level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown): void => {
  if (isTest) return;

  const timestamp = getTimestamp();

  if (isProd) {
    // JSON structured logging para produção (Sentry, Datadog, CloudWatch, etc.)
    const logEntry: Record<string, unknown> = {
      timestamp,
      level,
      message,
      service: 'church-plus-manager',
      environment: 'production',
    };

    if (data !== undefined && data !== null) {
      logEntry.data = sanitizeObject(data);
    }

    const jsonLine = JSON.stringify(logEntry);
    switch (level) {
      case 'ERROR':
        console.error(jsonLine);
        break;
      case 'WARN':
        console.warn(jsonLine);
        break;
      default:
        console.log(jsonLine);
    }
    return;
  }

  // Formato humano legível para desenvolvimento
  const prefix = `[${timestamp}] [${level}]`;
  switch (level) {
    case 'ERROR':
      console.error(`${prefix} ${message}`, ...(data !== undefined ? [sanitizeObject(data)] : []));
      break;
    case 'WARN':
      console.warn(`${prefix} ${message}`, ...(data !== undefined ? [sanitizeObject(data)] : []));
      break;
    default:
      console.log(`${prefix} ${message}`, ...(data !== undefined ? [sanitizeObject(data)] : []));
  }
};

/**
 * Logger principal
 */
export const logger = {
  /**
   * Log de informação (geral)
   */
  info: (message: string, ...args: unknown[]): void => {
    if (!isTest) {
      emit('INFO', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    }
  },

  /**
   * Log de erro (sempre, em produção e desenvolvimento)
   */
  error: (message: string, ...args: unknown[]): void => {
    if (!isTest) {
      emit('ERROR', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    }
  },

  /**
   * Log de warning (geral)
   */
  warn: (message: string, ...args: unknown[]): void => {
    if (!isTest) {
      emit('WARN', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    }
  },

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (isDev && !isTest) {
      emit('DEBUG', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    }
  },

  /**
   * Log de request HTTP (apenas em desenvolvimento)
   */
  request: (method: string, path: string, statusCode: number, duration: number): void => {
    if (isDev && !isTest) {
      console.log(`[${getTimestamp()}] [HTTP] ${method} ${path} ${statusCode} ${duration}ms`);
    }
  },

  /**
   * Log com sanitização explícita de dados
   * Use quando precisar logar objetos que podem conter dados sensíveis
   */
  sanitized: (message: string, data: unknown): void => {
    if (isDev && !isTest) {
      const sanitized = sanitizeObject(data);
      console.log(`[${getTimestamp()}] [INFO] ${message}`, JSON.stringify(sanitized, null, 2));
    }
  },

  /**
   * Log de banco de dados (apenas em desenvolvimento)
   */
  db: (operation: string, table: string, duration?: number): void => {
    if (isDev && !isTest) {
      const durationStr = duration !== undefined ? ` (${duration}ms)` : '';
      console.log(`[${getTimestamp()}] [DB] ${operation} ${table}${durationStr}`);
    }
  },

  /**
   * Log de sucesso de autenticação (sanitizado)
   */
  authSuccess: (userId: number, email?: string): void => {
    if (isDev && !isTest) {
      const maskedEmail = email ? maskEmail(email) : 'unknown';
      console.log(
        `[${getTimestamp()}] [AUTH] Login successful - User ID: ${userId}, Email: ${maskedEmail}`
      );
    }
  },

  /**
   * Log de falha de autenticação (sanitizado)
   */
  authFailure: (reason: string, email?: string): void => {
    if (!isTest) {
      const maskedEmail = email ? maskEmail(email) : 'unknown';
      console.log(
        `[${getTimestamp()}] [AUTH] Login failed - Reason: ${reason}, Email: ${maskedEmail}`
      );
    }
  },
};

export default logger;
