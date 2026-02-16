/**
 * @fileoverview Centralized logger utility for the application
 * @module lib/logger
 *
 * Provides structured logging with:
 * - Module-prefixed messages
 * - Timestamps
 * - Dev-only debug/info (warn/error always logged)
 * - Sentry integration for errors and breadcrumbs (when available)
 */

const isDev =
  typeof import.meta !== 'undefined' &&
  (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

// Lazy Sentry access to avoid circular imports
// Sentry is attached to window after initialization
function getSentry(): {
  captureException?: (error: unknown, context?: Record<string, unknown>) => void;
  addBreadcrumb?: (breadcrumb: Record<string, unknown>) => void;
} | null {
  try {
    return (window as unknown as Record<string, unknown>).__SENTRY__ as ReturnType<typeof getSentry> || null;
  } catch {
    return null;
  }
}

class Logger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled ?? isDev;
  }

  private formatMessage(_level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    return `${timestamp} ${prefix} ${message}`;
  }

  debug(...args: unknown[]): void {
    if (this.enabled && isDev) {
      console.log(this.formatMessage('debug', String(args[0])), ...args.slice(1));
    }
  }

  info(...args: unknown[]): void {
    if (this.enabled && isDev) {
      console.info(this.formatMessage('info', String(args[0])), ...args.slice(1));
    }
  }

  warn(...args: unknown[]): void {
    if (this.enabled) {
      console.warn(this.formatMessage('warn', String(args[0])), ...args.slice(1));
    }
    // Send breadcrumb to Sentry in production
    const sentry = getSentry();
    if (sentry?.addBreadcrumb) {
      sentry.addBreadcrumb({
        category: this.prefix || 'app',
        message: String(args[0]),
        level: 'warning',
      });
    }
  }

  error(...args: unknown[]): void {
    // Errors are always logged
    console.error(this.formatMessage('error', String(args[0])), ...args.slice(1));

    // Report to Sentry if available
    const sentry = getSentry();
    if (sentry?.captureException) {
      const error = args[0] instanceof Error ? args[0] : new Error(String(args[0]));
      sentry.captureException(error, {
        tags: { module: this.prefix || 'app' },
        extra: { args: args.slice(1) },
      });
    }
  }
}

// Pre-configured loggers for different modules
export const authLogger = new Logger({ prefix: 'Auth' });
export const apiLogger = new Logger({ prefix: 'API' });
export const uiLogger = new Logger({ prefix: 'UI' });
export const electionLogger = new Logger({ prefix: 'Election' });
export const calendarLogger = new Logger({ prefix: 'Calendar' });
export const chatLogger = new Logger({ prefix: 'Chat' });
export const settingsLogger = new Logger({ prefix: 'Settings' });
export const dashboardLogger = new Logger({ prefix: 'Dashboard' });
export const performanceLogger = new Logger({ prefix: 'Performance' });

// Factory function to create custom loggers
export const createLogger = (prefix: string, enabled = isDev): Logger => {
  return new Logger({ prefix, enabled });
};

// Default logger
export default new Logger();
