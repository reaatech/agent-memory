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
import { TopicBasedRetrievalStrategy } from './topic.js';

class MockEmbeddingProvider implements EmbeddingProvider {
  async embed(_text: string): Promise<number[]> {
    return [0, 0, 1];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  getModelInfo(): ModelInfo {
    return { name: 'mock', dimensions: 3, maxInputLength: 100 };
  }
}

function createMemory(content: string, overrides: Partial<Memory> = {}): Memory {
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
    embeddings: { vector: [0, 0, 1], model: 'mock', dimensions: 3 },
    version: 1,
    history: [],
    ...overrides,
  };
}

describe('TopicBasedRetrievalStrategy', () => {
  let storage: InMemoryMemoryStorage;
  let strategy: TopicBasedRetrievalStrategy;
  let embedder: MockEmbeddingProvider;

  beforeEach(() => {
    storage = new InMemoryMemoryStorage();
    strategy = new TopicBasedRetrievalStrategy();
    embedder = new MockEmbeddingProvider();
  });

  it('ranks memories with matching category higher', async () => {
    const match = createMemory('recipe content', { category: 'cooking', tags: ['cuisine'] });
    const noMatch = createMemory('other content', { category: 'cooking' });
    await storage.batchCreate([noMatch, match]);

    const results = await strategy.retrieve(
      'cooking cuisine',
      { limit: 2, tenantId: 'tenant-1' },
      storage,
      embedder,
    );
    expect(results).toHaveLength(2);
    expect(results[0]!.content).toBe('recipe content');
    expect(results[1]!.content).toBe('other content');
  });

  it('ranks memories with matching tags higher', async () => {
    const match = createMemory('tech news', {
      tags: ['technology', 'intelligence'],
    });
    const noMatch = createMemory('sports news', { tags: ['technology'] });
    await storage.batchCreate([noMatch, match]);

    const results = await strategy.retrieve(
      'artificial intelligence technology',
      { limit: 2, tenantId: 'tenant-1' },
      storage,
      embedder,
    );
    expect(results).toHaveLength(2);
    expect(results[0]!.content).toBe('tech news');
    expect(results[1]!.content).toBe('sports news');
  });

  it('respects tenant isolation', async () => {
    const m1 = createMemory('tenant-a cooking', { tenantId: 'tenant-a', category: 'cooking' });
    const m2 = createMemory('tenant-b cooking', { tenantId: 'tenant-b', category: 'cooking' });
    await storage.batchCreate([m1, m2]);

    const results = await strategy.retrieve(
      'cooking',
      { limit: 2, tenantId: 'tenant-a' },
      storage,
      embedder,
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.tenantId).toBe('tenant-a');
  });
});
