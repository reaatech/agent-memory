import { getLogger } from '@reaatech/agent-memory-core';
import type { MemoryEvent, MemoryEventBus, MemoryEventHandler, MemoryEventType } from './types.js';

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).then === 'function'
  );
}

/**
 * In-memory event bus implementation.
 *
 * Useful for single-process deployments and testing.
 * For distributed systems, replace with a message queue adapter.
 */
export class InMemoryEventBus implements MemoryEventBus {
  private handlers: Map<MemoryEventType, Set<MemoryEventHandler>> = new Map();

  on(event: MemoryEventType, handler: MemoryEventHandler): void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler);
    this.handlers.set(event, set);
  }

  off(event: MemoryEventType, handler: MemoryEventHandler): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  once(event: MemoryEventType, handler: MemoryEventHandler): void {
    const onceHandler: MemoryEventHandler = (evt: MemoryEvent) => {
      this.off(event, onceHandler);
      const result = handler(evt);
      if (isThenable(result)) {
        result.catch((err: unknown) => {
          getLogger().error(`once handler failed for ${event}: ${String(err)}`, err);
        });
      }
    };
    this.on(event, onceHandler);
  }

  async emit(event: MemoryEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    const errors: unknown[] = [];
    const pending: PromiseLike<void>[] = [];

    for (const handler of handlers) {
      try {
        const result = handler(event);
        if (isThenable(result)) {
          pending.push(
            Promise.resolve(result).catch((err: unknown) => {
              errors.push(err);
            }),
          );
        }
      } catch (err) {
        errors.push(err);
      }
    }

    if (pending.length > 0) {
      await Promise.all(pending);
    }

    if (errors.length > 0) {
      getLogger().error(`${errors.length} event handler(s) failed for ${event.type}`, ...errors);
    }
  }

  /** Remove all handlers. Useful for testing. */
  clear(): void {
    this.handlers.clear();
  }

  /** Remove all handlers for a specific event type. */
  removeAllListeners(event: MemoryEventType): void {
    this.handlers.delete(event);
  }
}
