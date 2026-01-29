/**
 * Security Headers Middleware
 * Headers de segurança HTTP avançados para proteção completa
 * @module middleware/securityHeaders
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Content Security Policy (CSP) Header Configuration
 * Previne XSS, clickjacking, e outros ataques de injeção
 */
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'", // Necessário para React
    "'unsafe-eval'", // Necessário para dev tools
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'", // Necessário para CSS-in-JS e Tailwind
    'https://fonts.googleapis.com',
  ],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http://localhost:*'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  connectSrc: [
    "'self'",
    'https://api.sentry.io',
    'https://*.sentry.io',
    'wss:',
    'ws:',
    process.env.NODE_ENV === 'development' ? 'http://localhost:*' : '',
  ].filter(Boolean),
  frameSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
  upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
};

/**
 * Gera string do CSP a partir das diretivas
 */
const buildCspString = (): string => {
  return Object.entries(cspDirectives)
    .filter(([, values]) => values !== undefined)
    .map(([directive, values]) => {
      const kebabDirective = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
      if (Array.isArray(values) && values.length === 0) {
        return kebabDirective;
      }
      return `${kebabDirective} ${(values as string[]).join(' ')}`;
    })
    .join('; ');
};

/**
 * Middleware de headers de segurança avançados
 */
export const securityHeadersMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', buildCspString());
  } else {
    // Em desenvolvimento, usar report-only para não bloquear
    res.setHeader('Content-Security-Policy-Report-Only', buildCspString());
  }

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection (legacy, mas ainda útil)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy - controla informações enviadas no header Referer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy - restringe recursos do browser
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // HSTS - força HTTPS (apenas em produção)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Cross-Origin Policies
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Cache control para dados sensíveis
  if (_req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

/**
 * Middleware específico para rotas de API com headers mais restritivos
 */
export const apiSecurityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // Não cachear respostas de API
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  // Prevenir embedding em outros sites
  res.setHeader('X-Frame-Options', 'DENY');

  next();
};

export default securityHeadersMiddleware;
