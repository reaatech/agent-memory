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
import { ImportanceRetrievalStrategy } from './importance.js';

class MockEmbeddingProvider implements EmbeddingProvider {
  async embed(_text: string): Promise<number[]> {
    return [1, 0, 0];
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
    embeddings: { vector: [1, 0, 0], model: 'mock', dimensions: 3 },
    version: 1,
    history: [],
    ...overrides,
  };
}

describe('ImportanceRetrievalStrategy', () => {
  let storage: InMemoryMemoryStorage;
  let strategy: ImportanceRetrievalStrategy;
  let embedder: MockEmbeddingProvider;

  beforeEach(() => {
    storage = new InMemoryMemoryStorage();
    strategy = new ImportanceRetrievalStrategy();
    embedder = new MockEmbeddingProvider();
  });

  it('orders results by importance descending', async () => {
    const low = createMemory('low importance', { importance: MemoryImportance.LOW });
    const critical = createMemory('critical importance', { importance: MemoryImportance.CRITICAL });
    const high = createMemory('high importance', { importance: MemoryImportance.HIGH });
    await storage.batchCreate([low, critical, high]);

    const results = await strategy.retrieve(
      'query',
      { limit: 3, tenantId: 'tenant-1' },
      storage,
      embedder,
    );
    expect(results[0]!.importance).toBe(MemoryImportance.CRITICAL);
    expect(results[1]!.importance).toBe(MemoryImportance.HIGH);
    expect(results[2]!.importance).toBe(MemoryImportance.LOW);
  });

  it('respects tenant isolation', async () => {
    const m1 = createMemory('tenant-a critical', {
      tenantId: 'tenant-a',
      importance: MemoryImportance.CRITICAL,
    });
    const m2 = createMemory('tenant-b critical', {
      tenantId: 'tenant-b',
      importance: MemoryImportance.CRITICAL,
    });
    await storage.batchCreate([m1, m2]);

    const results = await strategy.retrieve(
      'query',
      { limit: 2, tenantId: 'tenant-a' },
      storage,
      embedder,
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.tenantId).toBe('tenant-a');
  });
});
