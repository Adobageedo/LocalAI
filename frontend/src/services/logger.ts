/**
 * Logger Service
 * Centralized logging with different log levels and production-safe output
 * @module services/logger
 */

import env from '../config/env';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private constructor() {
    // Set log level based on environment
    if (env.isProduction) {
      this.logLevel = LogLevel.WARN; // Only warnings and errors in production
    } else if (env.features.enableDebug) {
      this.logLevel = LogLevel.DEBUG;
    } else {
      this.logLevel = LogLevel.INFO;
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Log debug message
   */
  public debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  /**
   * Log info message
   */
  public info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  /**
   * Log warning message
   */
  public warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  /**
   * Log error message
   */
  public error(message: string, context?: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data, error);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, context?: string, data?: any, error?: Error): void {
    if (level < this.logLevel) {
      return; // Don't log if below current log level
    }

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      data,
      error,
    };

    // Store log entry
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Output to console
    this.outputToConsole(logEntry);

    // In production, send errors to monitoring service (e.g., Sentry)
    if (env.isProduction && level === LogLevel.ERROR) {
      this.sendToMonitoring(logEntry);
    }
  }

  /**
   * Output log to console with proper formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = entry.context ? `[${entry.context}]` : '';
    const timestamp = entry.timestamp.toISOString();

    // eslint-disable-next-line no-console
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`🐛 ${timestamp} ${prefix} ${entry.message}`, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(`ℹ️  ${timestamp} ${prefix} ${entry.message}`, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(`⚠️  ${timestamp} ${prefix} ${entry.message}`, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${timestamp} ${prefix} ${entry.message}`, entry.error || entry.data || '');
        if (entry.error?.stack) {
          console.error('Stack trace:', entry.error.stack);
        }
        break;
    }
  }

  /**
   * Send error to monitoring service (Sentry, LogRocket, etc.)
   */
  private sendToMonitoring(entry: LogEntry): void {
    // TODO: Integrate with monitoring service
    // Example: Sentry.captureException(entry.error, { extra: entry.data });
  }

  /**
   * Get recent logs (for debugging)
   */
  public getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear logs
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenient functions as named export
const loggerHelpers = {
  debug: (message: string, context?: string, data?: any) => logger.debug(message, context, data),
  info: (message: string, context?: string, data?: any) => logger.info(message, context, data),
  warn: (message: string, context?: string, data?: any) => logger.warn(message, context, data),
  error: (message: string, context?: string, error?: Error, data?: any) => logger.error(message, context, error, data),
  setLogLevel: (level: LogLevel) => logger.setLogLevel(level),
  getRecentLogs: (count?: number) => logger.getRecentLogs(count),
  clearLogs: () => logger.clearLogs(),
  exportLogs: () => logger.exportLogs(),
};

export default loggerHelpers;
