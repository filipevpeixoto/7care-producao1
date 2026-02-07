/**
 * Input Sanitization Middleware
 * Sanitiza inputs de request para prevenir XSS e injection attacks
 * Funciona no body, params e query de toda requisição POST/PUT/PATCH
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Padrões perigosos de HTML/Script injection
 */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // <script>...</script>
  /javascript\s*:/gi, // javascript: protocol
  /on\w+\s*=/gi, // event handlers (onclick=, onerror=, etc.)
  /data\s*:\s*text\/html/gi, // data:text/html
  /vbscript\s*:/gi, // vbscript: protocol
];

/**
 * Escapa caracteres HTML perigosos sem alterar o conteúdo funcional
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Verifica se uma string contém padrões perigosos
 */
function containsDangerousContent(value: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Sanitiza um valor recursivamente
 * - Strings: escapa HTML se contém padrões perigosos
 * - Arrays: sanitiza cada elemento
 * - Objetos: sanitiza cada valor
 * - Outros tipos: retorna sem alteração
 */
function sanitizeValue(value: unknown, depth = 0): unknown {
  // Prevenir recursão infinita
  if (depth > 10) return value;

  if (typeof value === 'string') {
    // Apenas sanitiza se contém padrões perigosos (preserva dados normais)
    if (containsDangerousContent(value)) {
      return escapeHtml(value);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, depth + 1));
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val, depth + 1);
    }
    return sanitized;
  }

  return value;
}

/**
 * Middleware de sanitização de input
 * Sanitiza req.body, req.query e req.params para prevenir XSS
 *
 * @example
 * ```typescript
 * app.use(inputSanitizationMiddleware);
 * // ou para rotas específicas:
 * router.post('/api/users', inputSanitizationMiddleware, handler);
 * ```
 */
export function inputSanitizationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Sanitiza body (POST, PUT, PATCH)
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body) as typeof req.body;
  }

  // Sanitiza query params
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query) as typeof req.query;
  }

  // Sanitiza path params
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params) as typeof req.params;
  }

  next();
}

export default inputSanitizationMiddleware;
