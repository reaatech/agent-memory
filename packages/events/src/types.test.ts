import { describe, expect, it } from 'vitest';
import type { MemoryEvent, MemoryEventBus } from './types.js';

describe('events types', () => {
  it('defines event types that can be constructed', () => {
    const event: MemoryEvent = {
      type: 'memory:stored',
      timestamp: new Date(),
      tenantId: 'tenant-1',
      payload: { memoryId: '123' },
    };

    expect(event.type).toBe('memory:stored');
    expect(event.tenantId).toBe('tenant-1');
  });

  it('allows event bus interface to be implemented', () => {
    const bus: MemoryEventBus = {
      on: () => {},
      off: () => {},
      once: () => {},
      emit: async () => {},
    };

    expect(bus).toBeDefined();
  });
});
