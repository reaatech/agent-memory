import type { Memory } from '@reaatech/agent-memory-core';
import { describe, expect, it } from 'vitest';
import { MemoryQuery } from './types.js';
import type { MemoryStorage, SearchOptions } from './types.js';

describe('storage types', () => {
  it('allows search options construction', () => {
    const options: SearchOptions = {
      tenantId: 'tenant-1',
      limit: 10,
      filters: { tags: ['important'] },
    };

    expect(options.tenantId).toBe('tenant-1');
  });

  it('builds fluent memory queries', () => {
    const query = new MemoryQuery()
      .byType('fact' as import('@reaatech/agent-memory-core').MemoryType)
      .byTags(['user-preference'])
      .limit(5)
      .orderBy('createdAt', 'desc');

    expect(query.getConditions()).toHaveLength(2);
    expect(query.getPagination().limit).toBe(5);
    expect(query.getSort().direction).toBe('desc');
  });

  it('allows memory storage interface to be implemented', () => {
    const storage: MemoryStorage = {
      create: (memory: Memory) => Promise.resolve(memory),
      read: () => Promise.resolve(null),
      update: (_id, updates) => Promise.resolve({ ...updates } as Memory),
      delete: () => Promise.resolve(),
      batchCreate: (memories) => Promise.resolve(memories),
      batchUpdate: (updates) => Promise.resolve(updates.map((u) => ({ ...u.updates }) as Memory)),
      batchDelete: () => Promise.resolve(),
      search: () => Promise.resolve({ memories: [], total: 0, latencyMs: 0 }),
      searchSimilar: () => Promise.resolve([]),
      searchByMetadata: () => Promise.resolve([]),
      healthCheck: () => Promise.resolve({ status: 'healthy', timestamp: new Date() }),
      optimize: () => Promise.resolve(),
      backup: () => Promise.resolve({ version: 1, createdAt: new Date(), data: {} }),
      restore: () => Promise.resolve(),
      close: () => Promise.resolve(),
      recordContradiction: () => Promise.resolve(),
    };

    expect(storage).toBeDefined();
  });
});
