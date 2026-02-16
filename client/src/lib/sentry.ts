/**
 * @fileoverview Sentry client-side error tracking (lazy‑loaded)
 * @module lib/sentry
 *
 * Initializes Sentry for the browser using a lightweight approach.
 * Only loads when VITE_SENTRY_DSN is set — zero overhead otherwise.
 *
 * The Logger module reads `window.__SENTRY__` to forward errors/breadcrumbs
 * automatically once Sentry is initialized here.
 */

import { createLogger } from '@/lib/logger';

const sentryLogger = createLogger('Sentry');

interface SentryLike {
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
  addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
  captureMessage: (message: string, level?: string) => void;
}

declare global {
  interface Window {
    __SENTRY__?: SentryLike;
  }
}

/**
 * Inicializa o Sentry client-side.
 *
 * Carrega `@sentry/react` dinamicamente apenas quando um DSN é configurado,
 * evitando peso no bundle quando Sentry não está habilitado.
 */
export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  try {
    const sentryModule = '@sentry/react';
    const Sentry = await import(sentryModule);

    Sentry.init({
      dsn,
      environment: import.meta.env.MODE || 'production',
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',

      // Performance — amostragem reduzida para não impactar
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: import.meta.env.PROD ? 0.5 : 1.0,

      // Filtrar erros de extensões Chrome e service workers
      ignoreErrors: [
        'message channel closed',
        'asynchronous response',
        'listener indicated',
        'SKIP_WAITING',
        'ResizeObserver loop',
        'Non-Error promise rejection',
      ],
      denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
    });

    // Expor na window para o Logger usar
    window.__SENTRY__ = {
      captureException: (error, context) => Sentry.captureException(error, { extra: context }),
      addBreadcrumb: (breadcrumb) => Sentry.addBreadcrumb(breadcrumb),
      captureMessage: (message, level) =>
        Sentry.captureMessage(message, level as string),
    };

    sentryLogger.info('Initialized for', import.meta.env.MODE);
  } catch (error) {
    // Sentry não disponível — app funciona normalmente sem ele
    sentryLogger.warn('Failed to initialize:', error);
  }
}
