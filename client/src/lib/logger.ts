/**
 * Centralized logger utility for the application
 * Only logs in development mode, silent in production
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

class Logger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled ?? isDev;
  }

  private formatMessage(level: LogLevel, message: string): string {
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
  }

  error(...args: unknown[]): void {
    // Errors are always logged
    console.error(this.formatMessage('error', String(args[0])), ...args.slice(1));
  }
}

// Pre-configured loggers for different modules
export const authLogger = new Logger({ prefix: 'Auth' });
export const apiLogger = new Logger({ prefix: 'API' });
export const uiLogger = new Logger({ prefix: 'UI' });
export const electionLogger = new Logger({ prefix: 'Election' });

// Factory function to create custom loggers
export const createLogger = (prefix: string, enabled = isDev): Logger => {
  return new Logger({ prefix, enabled });
};

// Default logger
export default new Logger();
