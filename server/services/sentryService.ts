/**
 * Sentry Error Monitoring Service
 * Integração com Sentry para tracking de erros em produção
 */

import * as Sentry from '@sentry/node';
import { Express, Request, Response, NextFunction } from 'express';

const SENTRY_DSN = process.env.SENTRY_DSN || '';
const isProduction = process.env.NODE_ENV === 'production';
const isEnabled = !!SENTRY_DSN && isProduction;

/**
 * Inicializa o Sentry
 */
export function initSentry(app?: Express): void {
  if (!isEnabled) {
    console.log('[Sentry] Desabilitado - configure SENTRY_DSN em produção');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',
    
    // Performance Monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% em produção
    
    // Profiles
    profilesSampleRate: isProduction ? 0.1 : 1.0,

    // Filtrar dados sensíveis
    beforeSend(event) {
      // Remover dados sensíveis
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-user-id'];
        }
        if (event.request.data) {
          const data = event.request.data as Record<string, unknown>;
          if (typeof data === 'object') {
            delete data.password;
            delete data.token;
            delete data.refreshToken;
          }
        }
      }
      return event;
    },

    // Ignorar erros comuns/não críticos
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'cancelled',
    ],
  });

  console.log('[Sentry] Inicializado com sucesso');
}

/**
 * Middleware de request handler do Sentry
 */
export function sentryRequestHandler() {
  if (!isEnabled) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  // Sentry v8+ usa setupExpressErrorHandler ao invés de Handlers
  return (_req: Request, _res: Response, next: NextFunction) => next();
}

/**
 * Middleware de tracing do Sentry
 */
export function sentryTracingHandler() {
  if (!isEnabled) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  // Sentry v8+ integra tracing automaticamente
  return (_req: Request, _res: Response, next: NextFunction) => next();
}

/**
 * Middleware de error handler do Sentry
 */
export function sentryErrorHandler() {
  if (!isEnabled) {
    return (err: Error, _req: Request, _res: Response, next: NextFunction) => next(err);
  }
  // Sentry v8+ usa setupExpressErrorHandler
  return (err: Error, _req: Request, res: Response, next: NextFunction) => {
    Sentry.captureException(err);
    next(err);
  };
}

/**
 * Captura uma exceção manualmente
 */
export function captureException(error: Error, context?: Record<string, unknown>): string | undefined {
  if (!isEnabled) {
    console.error('[Error]', error.message, context);
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Captura uma mensagem manualmente
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, unknown>): string | undefined {
  if (!isEnabled) {
    console.log(`[${level}]`, message, context);
    return undefined;
  }

  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Define contexto do usuário para erros
 */
export function setUser(user: { id: number; email?: string; role?: string } | null): void {
  if (!isEnabled) return;

  if (user) {
    Sentry.setUser({
      id: String(user.id),
      email: user.email,
      // Não enviar dados sensíveis
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Adiciona breadcrumb para debug
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
): void {
  if (!isEnabled) return;

  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Inicia uma transação para performance monitoring
 */
export function startTransaction(name: string, op: string): Sentry.Span | undefined {
  if (!isEnabled) return undefined;
  
  return Sentry.startInactiveSpan({ name, op });
}

/**
 * Middleware para adicionar contexto do usuário automaticamente
 */
export function sentryUserContext(req: Request, _res: Response, next: NextFunction): void {
  const extReq = req as Request & { userId?: number; user?: { id?: number; email?: string; role?: string } };
  const userId = extReq.userId;
  const user = extReq.user;

  if (userId || user) {
    setUser({
      id: userId || user?.id,
      email: user?.email,
      role: user?.role,
    });
  }

  next();
}

/**
 * Flush de eventos pendentes (usar antes de encerrar o processo)
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  if (!isEnabled) return true;
  return Sentry.flush(timeout);
}

export default {
  init: initSentry,
  requestHandler: sentryRequestHandler,
  tracingHandler: sentryTracingHandler,
  errorHandler: sentryErrorHandler,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  startTransaction,
  userContext: sentryUserContext,
  flush: flushSentry,
  isEnabled,
};
