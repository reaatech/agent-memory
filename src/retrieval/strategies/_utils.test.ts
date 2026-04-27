import { describe, it, expect } from 'vitest';
import { matchesMetadataFilter } from './_utils.js';
import { MemoryType, MemoryImportance, MemorySource, MemoryLifecycle } from '@core/types.js';
import type { Memory } from '@core/types.js';

function createMemory(overrides: Partial<Memory> = {}): Memory {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    tenantId: 't1',
    ownerId: 'u1',
    content: 'test',
    type: MemoryType.FACT,
    source: MemorySource.USER_STATEMENT,
    importance: MemoryImportance.MEDIUM,
    confidence: 0.9,
    tags: ['test'],
    lifecycle: MemoryLifecycle.ACTIVE,
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    embeddings: { vector: [1], model: 'test', dimensions: 1 },
    version: 1,
    history: [],
    ...overrides,
  };
}

describe('matchesMetadataFilter', () => {
  it('returns true when no filters are provided', () => {
    const memory = createMemory();
    expect(matchesMetadataFilter(memory, undefined)).toBe(true);
  });

  it('filters by type', () => {
    const fact = createMemory({ type: MemoryType.FACT });
    const preference = createMemory({ type: MemoryType.PREFERENCE });

    expect(matchesMetadataFilter(fact, { types: [MemoryType.FACT] })).toBe(true);
    expect(matchesMetadataFilter(preference, { types: [MemoryType.FACT] })).toBe(false);
  });

  it('filters by importance', () => {
    const high = createMemory({ importance: MemoryImportance.HIGH });
    const low = createMemory({ importance: MemoryImportance.LOW });

    expect(matchesMetadataFilter(high, { importance: MemoryImportance.HIGH })).toBe(true);
    expect(matchesMetadataFilter(low, { importance: MemoryImportance.HIGH })).toBe(false);
  });

  it('filters by tags (any match)', () => {
    const mem = createMemory({ tags: ['apple', 'banana'] });

    expect(matchesMetadataFilter(mem, { tags: ['apple'] })).toBe(true);
    expect(matchesMetadataFilter(mem, { tags: ['cherry'] })).toBe(false);
  });

  it('filters by category', () => {
    const mem = createMemory({ category: 'food' });

    expect(matchesMetadataFilter(mem, { category: 'food' })).toBe(true);
    expect(matchesMetadataFilter(mem, { category: 'tech' })).toBe(false);
  });

  it('filters by source', () => {
    const mem = createMemory({ source: MemorySource.AGENT_INFERENCE });

    expect(matchesMetadataFilter(mem, { source: MemorySource.AGENT_INFERENCE })).toBe(true);
    expect(matchesMetadataFilter(mem, { source: MemorySource.USER_STATEMENT })).toBe(false);
  });

  it('filters by createdAfter', () => {
    const now = Date.now();
    const old = createMemory({ createdAt: new Date(now - 10000) });
    const recent = createMemory({ createdAt: new Date(now) });

    expect(matchesMetadataFilter(recent, { createdAfter: new Date(now - 5000) })).toBe(true);
    expect(matchesMetadataFilter(old, { createdAfter: new Date(now - 5000) })).toBe(false);
  });

  it('filters by createdBefore', () => {
    const now = Date.now();
    const old = createMemory({ createdAt: new Date(now - 10000) });
    const recent = createMemory({ createdAt: new Date(now) });

    expect(matchesMetadataFilter(old, { createdBefore: new Date(now - 5000) })).toBe(true);
    expect(matchesMetadataFilter(recent, { createdBefore: new Date(now - 5000) })).toBe(false);
  });

  it('combines multiple filters', () => {
    const mem = createMemory({ type: MemoryType.FACT, importance: MemoryImportance.HIGH });

    expect(
      matchesMetadataFilter(mem, { types: [MemoryType.FACT], importance: MemoryImportance.HIGH })
    ).toBe(true);
    expect(
      matchesMetadataFilter(mem, { types: [MemoryType.FACT], importance: MemoryImportance.LOW })
    ).toBe(false);
  });

  it('filters by embedding model', () => {
    const mem = createMemory({ embeddings: { vector: [1], model: 'openai', dimensions: 1 } });

    expect(matchesMetadataFilter(mem, { embeddingModel: 'openai' })).toBe(true);
    expect(matchesMetadataFilter(mem, { embeddingModel: 'cohere' })).toBe(false);
  });
});
