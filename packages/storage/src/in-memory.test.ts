import {
  MemoryImportance,
  MemoryLifecycle,
  MemorySource,
  MemoryType,
} from '@reaatech/agent-memory-core';
import type { Memory } from '@reaatech/agent-memory-core';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryMemoryStorage } from './in-memory.js';

function createMemory(overrides: Partial<Memory> = {}): Memory {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    tenantId: 'tenant-1',
    ownerId: 'user-1',
    content: 'Test memory',
    type: MemoryType.FACT,
    source: MemorySource.USER_STATEMENT,
    importance: MemoryImportance.MEDIUM,
    confidence: 0.9,
    tags: ['test'],
    lifecycle: MemoryLifecycle.ACTIVE,
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    embeddings: {
      vector: [1, 0, 0],
      model: 'test',
      dimensions: 3,
    },
    version: 1,
    history: [],
    ...overrides,
  };
}

describe('InMemoryMemoryStorage', () => {
  let storage: InMemoryMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryMemoryStorage();
  });

  it('creates and reads a memory', async () => {
    const memory = createMemory();
    await storage.create(memory);
    const found = await storage.read(memory.id);
    expect(found).toEqual(memory);
  });

  it('returns null for missing memory', async () => {
    const found = await storage.read('missing');
    expect(found).toBeNull();
  });

  it('updates a memory', async () => {
    const memory = createMemory();
    await storage.create(memory);
    const updated = await storage.update(memory.id, {
      content: 'Updated',
    });
    expect(updated.content).toBe('Updated');
    expect(updated.version).toBe(2);
  });

  it('throws on update for missing memory', async () => {
    await expect(storage.update('missing', {})).rejects.toThrow('not found');
  });

  it('deletes a memory', async () => {
    const memory = createMemory();
    await storage.create(memory);
    await storage.delete(memory.id);
    const found = await storage.read(memory.id);
    expect(found).toBeNull();
  });

  it('performs semantic search', async () => {
    const m1 = createMemory({
      content: 'Apple',
      embeddings: { vector: [1, 0, 0], model: 'test', dimensions: 3 },
    });
    const m2 = createMemory({
      content: 'Banana',
      embeddings: { vector: [0, 1, 0], model: 'test', dimensions: 3 },
    });
    await storage.batchCreate([m1, m2]);

    const results = await storage.searchSimilar([1, 0, 0], {
      tenantId: 'tenant-1',
      limit: 2,
    });

    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe(m1.id);
  });

  it('filters by metadata', async () => {
    const m1 = createMemory({
      type: MemoryType.FACT,
      tags: ['fruit'],
    });
    const m2 = createMemory({
      type: MemoryType.PREFERENCE,
      tags: ['color'],
    });
    await storage.batchCreate([m1, m2]);

    const results = await storage.searchByMetadata({
      types: [MemoryType.FACT],
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(m1.id);
  });

  it('reports healthy status', async () => {
    const health = await storage.healthCheck();
    expect(health.status).toBe('healthy');
  });

  it('clears all data', () => {
    storage.clear();
    expect(storage.size()).toBe(0);
  });

  it('backs up and restores data', async () => {
    const m1 = createMemory({ content: 'Backup test' });
    await storage.create(m1);

    const backup = await storage.backup();
    expect(backup.version).toBe(1);
    expect(backup.data).toBeDefined();

    storage.clear();
    expect(storage.size()).toBe(0);

    await storage.restore(backup);
    expect(storage.size()).toBe(1);

    const restored = await storage.read(m1.id);
    expect(restored).toEqual(m1);
  });

  it('supports and/or query conditions', async () => {
    const m1 = createMemory({ type: MemoryType.FACT, importance: MemoryImportance.HIGH });
    const m2 = createMemory({ type: MemoryType.PREFERENCE, importance: MemoryImportance.LOW });
    await storage.batchCreate([m1, m2]);

    const { MemoryQuery } = await import('./types.js');

    const andQuery = new MemoryQuery()
      .where({ type: 'type', value: MemoryType.FACT })
      .and({ type: 'importance', value: MemoryImportance.HIGH });
    const andResults = await storage.search(andQuery);
    expect(andResults.memories).toHaveLength(1);
    expect(andResults.memories[0]!.id).toBe(m1.id);

    const orQuery = new MemoryQuery()
      .where({ type: 'type', value: MemoryType.FACT })
      .or({ type: 'type', value: MemoryType.PREFERENCE });
    const orResults = await storage.search(orQuery);
    expect(orResults.memories).toHaveLength(2);
  });

  it('handles empty query conditions', async () => {
    const m1 = createMemory();
    await storage.create(m1);

    const { MemoryQuery } = await import('./types.js');
    const query = new MemoryQuery();
    const results = await storage.search(query);
    expect(results.memories).toHaveLength(1);
  });

  it('throws on unknown query condition type', async () => {
    const m1 = createMemory();
    await storage.create(m1);

    const { MemoryQuery } = await import('./types.js');
    const query = new MemoryQuery().where({ type: 'unknown', value: 'anything' } as unknown as {
      type: 'type';
      value: MemoryType;
    });
    await expect(storage.search(query)).rejects.toThrow('Unknown query condition type');
  });

  it('handles nested and/or conditions', async () => {
    const m1 = createMemory({ type: MemoryType.FACT, importance: MemoryImportance.HIGH });
    const m2 = createMemory({ type: MemoryType.PREFERENCE, importance: MemoryImportance.LOW });
    await storage.batchCreate([m1, m2]);

    const { MemoryQuery } = await import('./types.js');

    // nested: (type=fact AND importance=high) OR (type=preference)
    const query = new MemoryQuery()
      .where({ type: 'type', value: MemoryType.FACT })
      .and({ type: 'importance', value: MemoryImportance.HIGH })
      .or({ type: 'type', value: MemoryType.PREFERENCE });
    const results = await storage.search(query);
    expect(results.memories).toHaveLength(2);
  });

  it('re-indexes tags on update', async () => {
    const memory = createMemory({ tags: ['old-tag'] });
    await storage.create(memory);

    await storage.update(memory.id, { tags: ['new-tag'] });

    const byOldTag = await storage.searchByMetadata({ tags: ['old-tag'] });
    expect(byOldTag).toHaveLength(0);

    const byNewTag = await storage.searchByMetadata({ tags: ['new-tag'] });
    expect(byNewTag).toHaveLength(1);
  });

  it('batch operations work', async () => {
    const m1 = createMemory({ content: 'Batch 1' });
    const m2 = createMemory({ content: 'Batch 2' });

    await storage.batchCreate([m1, m2]);
    expect(storage.size()).toBe(2);

    await storage.batchUpdate([
      { id: m1.id, updates: { content: 'Updated 1' } },
      { id: m2.id, updates: { content: 'Updated 2' } },
    ]);

    const updated1 = await storage.read(m1.id);
    expect(updated1!.content).toBe('Updated 1');

    await storage.batchDelete([m1.id, m2.id]);
    expect(storage.size()).toBe(0);
  });

  it('restore throws on invalid backup data', async () => {
    await expect(
      storage.restore({ version: 1, createdAt: new Date(), data: 'invalid' }),
    ).rejects.toThrow('Invalid backup data');
  });

  it('restore throws on null backup data', async () => {
    await expect(
      storage.restore({ version: 1, createdAt: new Date(), data: null }),
    ).rejects.toThrow('Invalid backup data');
  });

  it('optimize is a no-op', async () => {
    await expect(storage.optimize()).resolves.toBeUndefined();
  });

  it('semantic search respects tenant isolation', async () => {
    const m1 = createMemory({
      tenantId: 'tenant-a',
      embeddings: { vector: [1, 0, 0], model: 'test', dimensions: 3 },
    });
    const m2 = createMemory({
      tenantId: 'tenant-b',
      embeddings: { vector: [1, 0, 0], model: 'test', dimensions: 3 },
    });
    await storage.batchCreate([m1, m2]);

    const results = await storage.searchSimilar([1, 0, 0], {
      tenantId: 'tenant-a',
      limit: 10,
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.tenantId).toBe('tenant-a');
  });

  it('semantic search filters by metadata', async () => {
    const m1 = createMemory({
      type: MemoryType.FACT,
      embeddings: { vector: [1, 0, 0], model: 'test', dimensions: 3 },
    });
    const m2 = createMemory({
      type: MemoryType.PREFERENCE,
      embeddings: { vector: [1, 0, 0], model: 'test', dimensions: 3 },
    });
    await storage.batchCreate([m1, m2]);

    const results = await storage.searchSimilar([1, 0, 0], {
      tenantId: 'tenant-1',
      limit: 10,
      filters: { types: [MemoryType.FACT] },
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.type).toBe(MemoryType.FACT);
  });

  it('query with pagination', async () => {
    const m1 = createMemory({ content: 'A' });
    const m2 = createMemory({ content: 'B' });
    const m3 = createMemory({ content: 'C' });
    await storage.batchCreate([m1, m2, m3]);

    const { MemoryQuery } = await import('./types.js');
    const query = new MemoryQuery().limit(2).offset(1);
    const results = await storage.search(query);
    expect(results.memories).toHaveLength(2);
    expect(results.total).toBe(3);
  });

  it('query with sorting', async () => {
    const m1 = createMemory({ content: 'A', confidence: 0.3 });
    const m2 = createMemory({ content: 'B', confidence: 0.9 });
    await storage.batchCreate([m1, m2]);

    const { MemoryQuery } = await import('./types.js');
    const query = new MemoryQuery().orderBy('confidence', 'desc');
    const results = await storage.search(query);
    expect(results.memories[0]!.confidence).toBe(0.9);
  });

  it('close does not clear data', async () => {
    const m1 = createMemory();
    await storage.create(m1);
    expect(storage.size()).toBe(1);
    await storage.close();
    expect(storage.size()).toBe(1);
  });

  it('recordContradiction is a no-op', async () => {
    await storage.recordContradiction('mem-1', 'mem-2', 0.9);
    expect(storage.size()).toBe(0);
  });
});
