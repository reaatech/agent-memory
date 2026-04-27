const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Wraps fetch with an AbortController timeout.
 * If the caller's init includes a signal, the timeout signal races against it.
 */
export function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Request timed out'));
  }, timeoutMs);

  const originalSignal = init?.signal;

  if (originalSignal?.aborted) {
    clearTimeout(timeoutId);
    return fetch(url, { ...init, signal: originalSignal });
  }

  if (originalSignal) {
    originalSignal.addEventListener(
      'abort',
      () => {
        controller.abort(originalSignal.reason);
      },
      { once: true }
    );
  }

  return fetch(url, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}
