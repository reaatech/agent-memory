import type { Logger } from '@reaatech/agent-memory-core';
import { getLogger, setLogger } from '@reaatech/agent-memory-core';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryEventBus } from './bus.js';
import type { MemoryEvent } from './types.js';

const originalLogger: Logger = getLogger();

describe('InMemoryEventBus', () => {
  let bus: InMemoryEventBus;

  beforeEach(() => {
    bus = new InMemoryEventBus();
    setLogger(originalLogger);
  });

  it('emits events to registered handlers', async () => {
    const events: MemoryEvent[] = [];
    bus.on('memory:stored', (event) => {
      events.push(event);
    });

    const event: MemoryEvent = {
      type: 'memory:stored',
      timestamp: new Date(),
      tenantId: 't1',
      payload: { id: '123' },
    };

    await bus.emit(event);
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('memory:stored');
  });

  it('does not emit to removed handlers', async () => {
    const events: MemoryEvent[] = [];
    const handler = (event: MemoryEvent): void => {
      events.push(event);
    };

    bus.on('memory:stored', handler);
    bus.off('memory:stored', handler);

    await bus.emit({
      type: 'memory:stored',
      timestamp: new Date(),
      tenantId: 't1',
      payload: {},
    });

    expect(events).toHaveLength(0);
  });

  it('handles async handlers', async () => {
    let resolved = false;
    bus.on('memory:stored', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      resolved = true;
    });

    await bus.emit({
      type: 'memory:stored',
      timestamp: new Date(),
      tenantId: 't1',
      payload: {},
    });

    expect(resolved).toBe(true);
  });

  it('survives handler errors', async () => {
    const errorLogs: unknown[][] = [];
    setLogger({
      warn: () => {},
      error: (_msg: string, ...args: unknown[]) => {
        errorLogs.push(args);
      },
      info: () => {},
      debug: () => {},
    });

    const errorBus = new InMemoryEventBus();
    let secondCalled = false;
    errorBus.on('memory:stored', () => {
      throw new Error('boom');
    });
    errorBus.on('memory:stored', () => {
      secondCalled = true;
    });

    await errorBus.emit({
      type: 'memory:stored',
      timestamp: new Date(),
      tenantId: 't1',
      payload: {},
    });

    expect(secondCalled).toBe(true);
    expect(errorLogs.length).toBe(1);
  });
});
