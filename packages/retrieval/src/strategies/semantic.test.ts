import type { Memory } from '@reaatech/agent-memory-core';
import {
  MemoryImportance,
  MemoryLifecycle,
  MemorySource,
  MemoryType,
} from '@reaatech/agent-memory-core';
import type { EmbeddingProvider, ModelInfo } from '@reaatech/agent-memory-embedding';
import { InMemoryMemoryStorage } from '@reaatech/agent-memory-storage';
import { beforeEach, describe, expect, it } from 'vitest';
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

describe('SemanticRetrievalStrategy', () => {
  let storage: InMemoryMemoryStorage;
  let strategy: SemanticRetrievalStrategy;
  let embedder: MockEmbeddingProvider;

  beforeEach(() => {
    storage = new InMemoryMemoryStorage();
    strategy = new SemanticRetrievalStrategy();
    embedder = new MockEmbeddingProvider();
  });

  it('retrieves semantically similar memories', async () => {
    const apple = createMemory('I like apples', [1, 0, 0]);
    const banana = createMemory('I like bananas', [0, 1, 0]);
    await storage.batchCreate([apple, banana]);

    const results = await strategy.retrieve(
      'apple',
      { limit: 2, tenantId: 'tenant-1' },
      storage,
      embedder,
    );
    expect(results).toHaveLength(2);
    expect(results[0]!.content).toBe('I like apples');
  });

  it('respects tenant isolation', async () => {
    const m1 = createMemory('apple pie', [1, 0, 0], { tenantId: 'tenant-a' });
    const m2 = createMemory('apple juice', [1, 0, 0], { tenantId: 'tenant-b' });
    await storage.batchCreate([m1, m2]);

    const results = await strategy.retrieve(
      'apple',
      { limit: 2, tenantId: 'tenant-a' },
      storage,
      embedder,
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.tenantId).toBe('tenant-a');
  });

  it('applies metadata filters', async () => {
    const m1 = createMemory('apple fact', [1, 0, 0], { importance: MemoryImportance.HIGH });
    const m2 = createMemory('apple trivia', [1, 0, 0], { importance: MemoryImportance.LOW });
    await storage.batchCreate([m1, m2]);

    const results = await strategy.retrieve(
      'apple',
      { limit: 2, tenantId: 'tenant-1', filters: { importance: MemoryImportance.HIGH } },
      storage,
      embedder,
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.content).toBe('apple fact');
  });
});
