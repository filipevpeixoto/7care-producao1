/**
 * CSRF Protection Middleware
 * Proteção contra Cross-Site Request Forgery usando padrão double submit cookie
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { CsrfRequest } from '../types/express';

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_TOKEN_LENGTH = 32;

// Métodos que requerem verificação CSRF
const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Rotas isentas de CSRF (ex: login, webhook)
const EXEMPT_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/health',
  '/api/push/webhook',
];

/**
 * Gera um token CSRF seguro
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Middleware para definir o cookie CSRF
 */
export function csrfCookie(req: Request, res: Response, next: NextFunction): void {
  const csrfReq = req as CsrfRequest;
  
  // Se não existe cookie CSRF, criar um
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = generateCsrfToken();
    
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Precisa ser lido pelo JS para enviar no header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      path: '/',
    });
    
    // Adicionar ao request para uso posterior
    csrfReq.csrfToken = token;
  } else {
    csrfReq.csrfToken = req.cookies[CSRF_COOKIE_NAME];
  }
  
  next();
}

/**
 * Middleware para verificar o token CSRF
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Ignorar métodos seguros
  if (!UNSAFE_METHODS.includes(req.method)) {
    return next();
  }
  
  // Verificar se a rota está isenta
  const isExempt = EXEMPT_ROUTES.some(route => 
    req.path === route || req.path.startsWith(route)
  );
  
  if (isExempt) {
    return next();
  }
  
  // Obter tokens
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_TOKEN_HEADER] as string;
  
  // Verificar se ambos os tokens existem e são iguais
  if (!cookieToken || !headerToken) {
    logger.warn('CSRF token ausente', { 
      path: req.path, 
      method: req.method,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken
    });
    
    res.status(403).json({
      error: 'CSRF token ausente',
      code: 'CSRF_TOKEN_MISSING'
    });
    return;
  }
  
  // Comparação segura contra timing attacks
  if (!crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  )) {
    logger.warn('CSRF token inválido', { 
      path: req.path, 
      method: req.method 
    });
    
    res.status(403).json({
      error: 'CSRF token inválido',
      code: 'CSRF_TOKEN_INVALID'
    });
    return;
  }
  
  next();
}

/**
 * Endpoint para obter novo token CSRF
 */
export function csrfTokenEndpoint(req: Request, res: Response): void {
  const csrfReq = req as CsrfRequest;
  const token = csrfReq.csrfToken || generateCsrfToken();
  
  // Atualizar cookie
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
  
  res.json({ csrfToken: token });
}

/**
 * Hook React para usar CSRF
 * Retorna função para adicionar header CSRF às requests
 */
export const CSRF_CLIENT_CODE = `
// Hook para adicionar CSRF token às requests
export function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? match[1] : null;
}

export function addCsrfHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCsrfToken();
  if (token) {
    return {
      ...headers,
      'x-csrf-token': token,
    };
  }
  return headers;
}

// Uso: 
// fetch('/api/endpoint', {
//   method: 'POST',
//   headers: addCsrfHeader({ 'Content-Type': 'application/json' }),
//   body: JSON.stringify(data)
// });
`;
