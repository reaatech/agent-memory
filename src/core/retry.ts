export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 10000;

/**
 * Retries a function with exponential backoff and jitter.
 *
 * Retries on transient errors (timeouts, rate limits, server errors,
 * connection errors) but not on programming errors.
 */
export async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig = {}): Promise<T> {
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelay = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelay = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !isRetryableError(err)) {
        throw err;
      }
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * delay * 0.1;
      await sleep(delay + jitter);
    }
  }

  throw lastError;
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err instanceof TypeError) {
      return false;
    }
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('rate') || msg.includes('limit')) {
      return true;
    }
    if (msg.includes('429') || msg.includes('503') || msg.includes('502')) {
      return true;
    }
    if (msg.includes('econnrefused') || msg.includes('enotfound')) {
      return true;
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
