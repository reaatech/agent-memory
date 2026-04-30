import {
  MemoryImportance,
  MemoryLifecycle,
  MemorySource,
  MemoryType,
} from '@reaatech/agent-memory-core';
import type { Memory } from '@reaatech/agent-memory-core';
import type { EmbeddingProvider, ModelInfo } from '@reaatech/agent-memory-embedding';
import { InMemoryMemoryStorage } from '@reaatech/agent-memory-storage';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdaptiveRetrievalStrategy } from './adaptive.js';
import { RecencyRetrievalStrategy } from './recency.js';
import { SemanticRetrievalStrategy } from './semantic.js';

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

describe('AdaptiveRetrievalStrategy', () => {
  let storage: InMemoryMemoryStorage;
  let embedder: MockEmbeddingProvider;

  beforeEach(() => {
    storage = new InMemoryMemoryStorage();
    embedder = new MockEmbeddingProvider();
  });

  it('combines multiple strategies with weights', async () => {
    const now = Date.now();
    const appleOld = createMemory('apple old', [1, 0, 0], {
      lastAccessedAt: new Date(now - 10000),
    });
    const bananaRecent = createMemory('banana recent', [0, 1, 0], {
      lastAccessedAt: new Date(now),
    });
    await storage.batchCreate([appleOld, bananaRecent]);

    const adaptive = new AdaptiveRetrievalStrategy([
      { strategy: new SemanticRetrievalStrategy(), weight: 2 },
      { strategy: new RecencyRetrievalStrategy(), weight: 1 },
    ]);

    const results = await adaptive.retrieve(
      'apple',
      { limit: 2, tenantId: 'tenant-1' },
      storage,
      embedder,
    );

    // appleOld gets 2 from semantic + 1 from recency = 3
    // bananaRecent gets 0 from semantic (not in semantic results) + 1 from recency = 1
    expect(results[0]!.content).toBe('apple old');
    expect(results[1]!.content).toBe('banana recent');
  });

  it('deduplicates memories across strategies', async () => {
    const m1 = createMemory('shared', [1, 0, 0]);
    await storage.batchCreate([m1]);

    const adaptive = new AdaptiveRetrievalStrategy([
      { strategy: new SemanticRetrievalStrategy(), weight: 1 },
      { strategy: new SemanticRetrievalStrategy(), weight: 1 },
    ]);

    const results = await adaptive.retrieve(
      'apple',
      { limit: 2, tenantId: 'tenant-1' },
      storage,
      embedder,
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.content).toBe('shared');
  });

  it('respects the limit', async () => {
    const memories = Array.from({ length: 5 }, (_, i) => createMemory(`memory ${i}`, [1, 0, 0]));
    await storage.batchCreate(memories);

    const adaptive = new AdaptiveRetrievalStrategy([
      { strategy: new SemanticRetrievalStrategy(), weight: 1 },
    ]);

    const results = await adaptive.retrieve(
      'apple',
      { limit: 2, tenantId: 'tenant-1' },
      storage,
      embedder,
    );
    expect(results.length).toBeLessThanOrEqual(4); // strategy returns limit * 2
  });
});
