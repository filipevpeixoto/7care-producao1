/**
 * @fileoverview Classes de erro customizadas
 * @module server/errors
 *
 * Hierarquia de erros para tratamento consistente:
 * - ApplicationError (base)
 *   - ValidationError (400)
 *   - AuthenticationError (401)
 *   - AuthorizationError (403)
 *   - NotFoundError (404)
 *   - ConflictError (409)
 *   - RateLimitError (429)
 *   - InternalError (500)
 *   - ServiceUnavailableError (503)
 */

/**
 * Erro base da aplicação
 * Todos os erros customizados devem estender esta classe
 */
export class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // Captura stack trace corretamente
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converte erro para JSON (para resposta HTTP)
   */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Erro de validação (400 Bad Request)
 * Usar quando dados de entrada são inválidos
 */
export class ValidationError extends ApplicationError {
  public readonly fields?: Record<string, string[]>;

  constructor(message: string = 'Dados de entrada inválidos', fields?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR', true, fields ? { fields } : undefined);
    this.fields = fields;
  }

  static fromZodError(zodError: {
    issues: Array<{ path: (string | number)[]; message: string }>;
  }): ValidationError {
    const fields: Record<string, string[]> = {};

    for (const issue of zodError.issues) {
      const path = issue.path.join('.');
      if (!fields[path]) {
        fields[path] = [];
      }
      fields[path].push(issue.message);
    }

    return new ValidationError('Erro de validação', fields);
  }
}

/**
 * Erro de autenticação (401 Unauthorized)
 * Usar quando credenciais são inválidas ou ausentes
 */
export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Autenticação necessária') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

/**
 * Erro de autorização (403 Forbidden)
 * Usar quando usuário não tem permissão para a ação
 */
export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

/**
 * Erro de recurso não encontrado (404 Not Found)
 * Usar quando recurso solicitado não existe
 */
export class NotFoundError extends ApplicationError {
  constructor(resource: string = 'Recurso', id?: string | number) {
    const message = id ? `${resource} com ID ${id} não encontrado` : `${resource} não encontrado`;
    super(message, 404, 'NOT_FOUND', true, { resource, id });
  }
}

/**
 * Erro de conflito (409 Conflict)
 * Usar quando há conflito com estado atual (ex: duplicata)
 */
export class ConflictError extends ApplicationError {
  constructor(message: string = 'Conflito com recurso existente') {
    super(message, 409, 'CONFLICT', true);
  }
}

/**
 * Erro de rate limit (429 Too Many Requests)
 * Usar quando limite de requisições foi excedido
 */
export class RateLimitError extends ApplicationError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Limite de requisições excedido', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, retryAfter ? { retryAfter } : undefined);
    this.retryAfter = retryAfter;
  }
}

/**
 * Erro interno do servidor (500 Internal Server Error)
 * Usar para erros inesperados
 */
export class InternalError extends ApplicationError {
  constructor(message: string = 'Erro interno do servidor') {
    super(message, 500, 'INTERNAL_ERROR', false);
  }
}

/**
 * Erro de serviço indisponível (503 Service Unavailable)
 * Usar quando dependência externa está indisponível
 */
export class ServiceUnavailableError extends ApplicationError {
  constructor(service: string = 'Serviço') {
    super(`${service} temporariamente indisponível`, 503, 'SERVICE_UNAVAILABLE', true, { service });
  }
}

/**
 * Erro de timeout (504 Gateway Timeout)
 * Usar quando operação excede tempo limite
 */
export class TimeoutError extends ApplicationError {
  constructor(operation: string = 'Operação', timeoutMs?: number) {
    super(
      `${operation} excedeu o tempo limite`,
      504,
      'TIMEOUT',
      true,
      timeoutMs ? { timeoutMs } : undefined
    );
  }
}

/**
 * Erro de banco de dados
 * Usar para erros específicos de banco
 */
export class DatabaseError extends ApplicationError {
  constructor(message: string = 'Erro de banco de dados', details?: Record<string, unknown>) {
    super(message, 500, 'DATABASE_ERROR', false, details);
  }
}

/**
 * Erro de external service (ex: API externa)
 */
export class ExternalServiceError extends ApplicationError {
  constructor(service: string, message: string = 'Erro ao comunicar com serviço externo') {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', true, { service });
  }
}

/**
 * Verifica se erro é operacional (esperado) ou programático (bug)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof ApplicationError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Converte erro genérico para ApplicationError
 */
export function toApplicationError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message);
  }

  return new InternalError('Erro desconhecido');
}
