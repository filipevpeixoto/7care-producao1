/**
 * Content Security Policy (CSP) Middleware
 * Implementa headers de segurança rigorosos
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Configuração de CSP para produção
 */
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Necessário para React em dev
      "'unsafe-eval'", // Remover em produção se possível
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Necessário para styled-components/tailwind
      "https://fonts.googleapis.com",
    ],
    imgSrc: [
      "'self'",
      "data:",
      "blob:",
      "https:",
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
    ],
    connectSrc: [
      "'self'",
      "https://api.sentry.io",
      "https://*.sentry.io",
      "https://www.google-analytics.com",
      "wss:",
      "ws:",
    ],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    workerSrc: ["'self'", "blob:"],
    childSrc: ["'self'", "blob:"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
  },
  reportOnly: false,
};

/**
 * CSP mais permissivo para desenvolvimento
 */
const devCspConfig = {
  ...cspConfig,
  directives: {
    ...cspConfig.directives,
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    connectSrc: ["'self'", "ws:", "wss:", "http://localhost:*"],
  },
};

/**
 * Middleware de CSP
 */
export function cspMiddleware() {
  const config = process.env.NODE_ENV === 'production' ? cspConfig : devCspConfig;
  
  return helmet.contentSecurityPolicy({
    directives: config.directives,
    reportOnly: config.reportOnly,
  });
}

/**
 * Headers de segurança adicionais
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Habilitar XSS filter do navegador
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy (antigo Feature-Policy)
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(self), payment=()'
  );
  
  // HSTS (apenas em produção com HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Prevenir caching de dados sensíveis
  if (_req.path.startsWith('/api/auth')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}

/**
 * Middleware combinado de segurança
 */
export function fullSecurityMiddleware() {
  return [
    cspMiddleware(),
    securityHeadersMiddleware,
  ];
}

export default {
  csp: cspMiddleware,
  headers: securityHeadersMiddleware,
  full: fullSecurityMiddleware,
};
