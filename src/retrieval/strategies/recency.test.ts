import { describe, it, expect, beforeEach } from 'vitest';
import { RecencyRetrievalStrategy } from './recency.js';
import { InMemoryMemoryStorage } from '@storage/in-memory.js';
import { MemoryType, MemoryImportance, MemorySource, MemoryLifecycle } from '@core/types.js';
import type { Memory } from '@core/types.js';
import type { EmbeddingProvider, ModelInfo } from '@embedding/types.js';

class MockEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    if (text.includes('apple')) return [1, 0, 0];
    if (text.includes('banana')) return [0, 1, 0];
    return [0, 0, 1];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  getModelInfo(): ModelInfo {
    return { name: 'mock', dimensions: 3, maxInputLength: 100 };
  }
}

function createMemory(content: string, vector: number[], overrides: Partial<Memory> = {}): Memory {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    tenantId: 'tenant-1',
    ownerId: 'user-1',
    content,
    type: MemoryType.FACT,
    source: MemorySource.USER_STATEMENT,
    importance: MemoryImportance.MEDIUM,
    confidence: 0.9,
    tags: [],
    lifecycle: MemoryLifecycle.ACTIVE,
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    embeddings: { vector, model: 'mock', dimensions: 3 },
    version: 1,
    history: [],
    ...overrides,
  };
}

describe('RecencyRetrievalStrategy', () => {
  let storage: InMemoryMemoryStorage;
  let strategy: RecencyRetrievalStrategy;
  let embedder: MockEmbeddingProvider;

  beforeEach(() => {
    storage = new InMemoryMemoryStorage();
    strategy = new RecencyRetrievalStrategy();
    embedder = new MockEmbeddingProvider();
  });

  it('retrieves memories ordered by recency', async () => {
    const now = Date.now();
    const old = createMemory('old memory', [0, 0, 1], { lastAccessedAt: new Date(now - 10000) });
    const recent = createMemory('recent memory', [0, 0, 1], { lastAccessedAt: new Date(now) });
    const mid = createMemory('mid memory', [0, 0, 1], { lastAccessedAt: new Date(now - 5000) });
    await storage.batchCreate([old, recent, mid]);

    const results = await strategy.retrieve(
      '',
      { limit: 3, tenantId: 'tenant-1' },
      storage,
      embedder
    );
    expect(results[0]!.content).toBe('recent memory');
    expect(results[1]!.content).toBe('mid memory');
    expect(results[2]!.content).toBe('old memory');
  });

  it('applies optional semantic filtering', async () => {
    const now = Date.now();
    const bananaRecent = createMemory('banana recent', [0, 1, 0], {
      lastAccessedAt: new Date(now),
    });
    const appleOld = createMemory('apple old', [1, 0, 0], {
      lastAccessedAt: new Date(now - 10000),
    });
    await storage.batchCreate([bananaRecent, appleOld]);

    const results = await strategy.retrieve(
      'apple',
      { limit: 2, tenantId: 'tenant-1' },
      storage,
      embedder
    );
    expect(results[0]!.content).toBe('apple old');
    expect(results[1]!.content).toBe('banana recent');
  });

  it('respects tenant isolation', async () => {
    const now = Date.now();
    const m1 = createMemory('tenant-a', [0, 0, 1], {
      tenantId: 'tenant-a',
      lastAccessedAt: new Date(now),
    });
    const m2 = createMemory('tenant-b', [0, 0, 1], {
      tenantId: 'tenant-b',
      lastAccessedAt: new Date(now),
    });
    await storage.batchCreate([m1, m2]);

    const results = await strategy.retrieve(
      '',
      { limit: 2, tenantId: 'tenant-a' },
      storage,
      embedder
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.tenantId).toBe('tenant-a');
  });
});
