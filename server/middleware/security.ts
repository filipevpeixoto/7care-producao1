/**
 * Security Middleware
 * Configurações avançadas de segurança para o servidor Express
 */

import helmet from 'helmet';
import { Express, Request, Response, NextFunction } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { logger } from '../utils/logger';

const storage = new NeonAdapter();

// Tipos para audit log
interface AuditLogEntry {
  timestamp: string;
  userId: number | null;
  userEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | number | null;
  details: Record<string, unknown>;
  ip: string;
  userAgent: string;
  success: boolean;
}

// Buffer de audit logs (em produção, usar Redis ou banco de dados)
const auditLogBuffer: AuditLogEntry[] = [];
const MAX_AUDIT_BUFFER = 1000;

/**
 * Configura Helmet para headers de segurança
 */
export function configureHelmet(app: Express): void {
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://api.neon.tech", "wss:", "https:"],
          frameSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          workerSrc: ["'self'", "blob:"],
        },
      },
      // Previne clickjacking
      frameguard: { action: 'deny' },
      // Remove header X-Powered-By
      hidePoweredBy: true,
      // Força HTTPS
      hsts: {
        maxAge: 31536000, // 1 ano
        includeSubDomains: true,
        preload: true,
      },
      // Previne MIME sniffing
      noSniff: true,
      // XSS Filter
      xssFilter: true,
      // Referrer Policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );
}

/**
 * Middleware para extrair informações do request para audit
 */
function getRequestInfo(req: Request): { ip: string; userAgent: string } {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
    || req.socket.remoteAddress 
    || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return { ip, userAgent };
}

/**
 * Registra uma entrada no audit log
 */
export function auditLog(
  req: Request,
  action: string,
  resource: string,
  resourceId: string | number | null,
  details: Record<string, unknown> = {},
  success: boolean = true
): void {
  const { ip, userAgent } = getRequestInfo(req);
  const userId = (req as any).userId || null;
  const userEmail = (req as any).user?.email || null;

  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    userId,
    userEmail,
    action,
    resource,
    resourceId,
    details: sanitizeAuditDetails(details),
    ip,
    userAgent,
    success,
  };

  // Adicionar ao buffer
  auditLogBuffer.push(entry);

  // Manter buffer limitado
  if (auditLogBuffer.length > MAX_AUDIT_BUFFER) {
    auditLogBuffer.shift();
  }

  // Log para console em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[AUDIT] ${action} ${resource}/${resourceId} by ${userEmail || 'anonymous'} - ${success ? 'SUCCESS' : 'FAILED'}`);
  }
}

/**
 * Remove dados sensíveis do audit log
 */
function sanitizeAuditDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'cvv'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAuditDetails(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Middleware para audit automático de operações sensíveis
 */
export function auditMiddleware(action: string, resource: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const resourceId = req.params.id || req.body?.id || null;

    res.send = function (body: any): Response {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      auditLog(req, action, resource, resourceId, { 
        method: req.method,
        path: req.path,
        statusCode: res.statusCode 
      }, success);
      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Retorna os audit logs (para admin)
 */
export function getAuditLogs(
  filters?: {
    userId?: number;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): AuditLogEntry[] {
  let logs = [...auditLogBuffer];

  if (filters) {
    if (filters.userId) {
      logs = logs.filter(l => l.userId === filters.userId);
    }
    if (filters.action) {
      logs = logs.filter(l => l.action === filters.action);
    }
    if (filters.resource) {
      logs = logs.filter(l => l.resource === filters.resource);
    }
    if (filters.startDate) {
      logs = logs.filter(l => l.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      logs = logs.filter(l => l.timestamp <= filters.endDate!);
    }
  }

  // Ordenar por mais recente
  logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Limitar resultados
  const limit = filters?.limit || 100;
  return logs.slice(0, limit);
}

/**
 * Middleware de rate limiting por IP para ações sensíveis
 */
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

export function strictRateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { ip } = getRequestInfo(req);
    const now = Date.now();
    
    const record = ipRequestCounts.get(ip);
    
    if (!record || now > record.resetTime) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      auditLog(req, 'RATE_LIMIT_EXCEEDED', 'security', null, { ip, maxRequests });
      res.status(429).json({
        success: false,
        error: 'Muitas requisições. Tente novamente mais tarde.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }

    record.count++;
    next();
  };
}

/**
 * Middleware para detectar e bloquear requisições suspeitas
 */
export function suspiciousRequestDetector(req: Request, res: Response, next: NextFunction): void {
  const { userAgent, ip } = getRequestInfo(req);
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
  ];

  // Verificar URL e body
  const checkString = `${req.url} ${JSON.stringify(req.body || {})} ${userAgent}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      auditLog(req, 'SUSPICIOUS_REQUEST_BLOCKED', 'security', null, {
        pattern: pattern.toString(),
        url: req.url,
        ip,
      }, false);
      
      res.status(403).json({
        success: false,
        error: 'Requisição bloqueada por motivos de segurança.',
      });
      return;
    }
  }

  next();
}

/**
 * Configura todas as camadas de segurança
 */
export function configureSecurityMiddleware(app: Express): void {
  // Helmet para headers de segurança
  configureHelmet(app);

  // Detector de requisições suspeitas
  app.use(suspiciousRequestDetector);

  // Log de requests (opcional em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      logger.debug(`${req.method} ${req.path}`);
      next();
    });
  }
}

// Ações para audit automático
export const AuditActions = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_IMPORT: 'DATA_IMPORT',
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_REQUEST: 'SUSPICIOUS_REQUEST',
};

export default {
  configureHelmet,
  configureSecurityMiddleware,
  auditLog,
  auditMiddleware,
  getAuditLogs,
  strictRateLimit,
  suspiciousRequestDetector,
  AuditActions,
};
