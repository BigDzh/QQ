type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabled: import.meta.env?.DEV !== false,
      level: (import.meta.env?.VITE_LOG_LEVEL as LogLevel) || 'INFO',
      prefix: '[QQ-Export]',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return this.config.enabled && LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatMessage(level: LogLevel, ...args: unknown[]): string[] {
    const timestamp = new Date().toISOString();
    return [`${this.config.prefix} [${timestamp}] [${level}]`, ...args];
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('DEBUG')) {
      console.debug(...this.formatMessage('DEBUG', ...args));
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('INFO')) {
      console.info(...this.formatMessage('INFO', ...args));
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('WARN')) {
      console.warn(...this.formatMessage('WARN', ...args));
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog('ERROR')) {
      console.error(...this.formatMessage('ERROR', ...args));
    }
  }
}

export const logger = new Logger();

export { type LogLevel, type LoggerConfig };
export default logger;
