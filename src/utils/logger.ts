/**
 * Minimal logger interface for use across agent-memory modules.
 * Consumers can inject a custom logger conforming to this interface,
 * or the default console-based logger is used.
 */
export interface Logger {
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

const noop = (): void => {};

const defaultLogger: Logger = {
  warn: (...args: unknown[]) => {
    console.warn('[agent-memory]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[agent-memory]', ...args);
  },
  info: (...args: unknown[]) => {
    console.warn('[agent-memory:info]', ...args);
  },
  debug: noop,
};

let globalLogger: Logger = defaultLogger;

export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

export function getLogger(): Logger {
  return globalLogger;
}
