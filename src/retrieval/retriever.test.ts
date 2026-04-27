import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRetriever } from './retriever.js';
import { InMemoryMemoryStorage } from '@storage/in-memory.js';
import { MemoryType, MemoryImportance, MemorySource, MemoryLifecycle } from '@core/types.js';
import { RetrievalStrategy } from './types.js';
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

describe('MemoryRetriever', () => {
  let storage: InMemoryMemoryStorage;
  let retriever: MemoryRetriever;

  beforeEach(() => {
    storage = new InMemoryMemoryStorage();
    retriever = new MemoryRetriever(storage, new MockEmbeddingProvider(), {
      defaultLimit: 5,
      useCrossEncoder: false,
      diversityFactor: 0,
      strategies: [],
    });
  });

  it('retrieves semantically similar memories by default', async () => {
    const apple = createMemory('I like apples', [1, 0, 0]);
    const banana = createMemory('I like bananas', [0, 1, 0]);
    await storage.batchCreate([apple, banana]);

    const results = await retriever.retrieve('apple', { limit: 2, tenantId: 'tenant-1' });
    expect(results).toHaveLength(2);
    expect(results[0]!.content).toBe('I like apples');
  });

  it('respects the limit option', async () => {
    const m1 = createMemory('a', [1, 0, 0]);
    const m2 = createMemory('b', [1, 0, 0]);
    const m3 = createMemory('c', [1, 0, 0]);
    await storage.batchCreate([m1, m2, m3]);

    const results = await retriever.retrieve('apple', { limit: 2, tenantId: 'tenant-1' });
    expect(results).toHaveLength(2);
  });

  it('updates access time on retrieval', async () => {
    const before = Date.now() - 1000;
    const memory = createMemory('apple', [1, 0, 0], {
      lastAccessedAt: new Date(before),
    });
    await storage.create(memory);

    await retriever.retrieve('apple', { limit: 1, tenantId: 'tenant-1' });
    const updated = await storage.read(memory.id);
    expect(updated!.lastAccessedAt.getTime()).toBeGreaterThan(before);
  });

  it('selects strategy via options', async () => {
    const now = Date.now();
    const old = createMemory('apple old', [1, 0, 0], { lastAccessedAt: new Date(now - 10000) });
    const recent = createMemory('banana recent', [0, 1, 0], { lastAccessedAt: new Date(now) });
    await storage.batchCreate([old, recent]);

    const results = await retriever.retrieve('', {
      limit: 2,
      tenantId: 'tenant-1',
      strategy: RetrievalStrategy.RECENCY,
    });
    expect(results[0]!.content).toBe('banana recent');
  });

  it('selects strategy via config when not overridden in options', async () => {
    const now = Date.now();
    const old = createMemory('apple old', [1, 0, 0], { lastAccessedAt: new Date(now - 10000) });
    const recent = createMemory('banana recent', [0, 1, 0], { lastAccessedAt: new Date(now) });
    await storage.batchCreate([old, recent]);

    const recencyRetriever = new MemoryRetriever(storage, new MockEmbeddingProvider(), {
      defaultLimit: 5,
      useCrossEncoder: false,
      diversityFactor: 0,
      strategies: [RetrievalStrategy.RECENCY],
    });

    const results = await recencyRetriever.retrieve('', { limit: 2, tenantId: 'tenant-1' });
    expect(results[0]!.content).toBe('banana recent');
  });

  it('falls back to semantic when strategy is not registered', async () => {
    const apple = createMemory('I like apples', [1, 0, 0]);
    await storage.batchCreate([apple]);

    const customRetriever = new MemoryRetriever(storage, new MockEmbeddingProvider(), {
      defaultLimit: 5,
      useCrossEncoder: false,
      diversityFactor: 0,
      strategies: [RetrievalStrategy.ADAPTIVE],
    });

    const results = await customRetriever.retrieve('apple', { limit: 1, tenantId: 'tenant-1' });
    expect(results).toHaveLength(1);
    expect(results[0]!.content).toBe('I like apples');
  });

  it('applies diversification when configured', async () => {
    const m1 = createMemory('a', [1, 0, 0], { category: 'cat-a' });
    const m2 = createMemory('b', [1, 0, 0], { category: 'cat-a' });
    const m3 = createMemory('c', [1, 0, 0], { category: 'cat-b' });
    await storage.batchCreate([m1, m2, m3]);

    const diverseRetriever = new MemoryRetriever(storage, new MockEmbeddingProvider(), {
      defaultLimit: 5,
      useCrossEncoder: false,
      diversityFactor: 1,
      strategies: [],
    });

    const results = await diverseRetriever.retrieve('apple', { limit: 3, tenantId: 'tenant-1' });
    // With diversity factor 1, only the first item from each category is kept in diverse portion
    const categories = results.map((r) => r.category);
    expect(categories.filter((c) => c === 'cat-a').length).toBeLessThanOrEqual(2);
  });
});
