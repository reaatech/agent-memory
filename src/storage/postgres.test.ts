import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Pool } from 'pg';
import { PostgresMemoryStorage } from './postgres.js';
import { MemoryType, MemoryImportance, MemorySource, MemoryLifecycle } from '@core/types.js';
import type { Memory } from '@core/types.js';

vi.mock('pg', () => ({
  Pool: vi.fn(),
}));

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

function createMockRow(memory: Memory): Record<string, unknown> {
  return {
    id: memory.id,
    tenant_id: memory.tenantId,
    owner_id: memory.ownerId,
    content: memory.content,
    type: memory.type,
    category: memory.category ?? null,
    source: memory.source,
    importance: memory.importance,
    confidence: memory.confidence,
    tags: memory.tags,
    lifecycle: memory.lifecycle,
    created_at: memory.createdAt,
    updated_at: memory.updatedAt,
    last_accessed_at: memory.lastAccessedAt,
    expires_at: memory.expiresAt ?? null,
    relates_to: memory.relatesTo ?? null,
    contradicts: memory.contradicts ?? null,
    supersedes: memory.supersedes ?? null,
    embedding: `[${memory.embeddings.vector.join(',')}]`,
    embedding_model: memory.embeddings.model,
    embedding_dimensions: memory.embeddings.dimensions,
    version: memory.version,
    history: memory.history,
  };
}

describe('PostgresMemoryStorage', () => {
  let storage: PostgresMemoryStorage;
  let mockQuery: ReturnType<typeof vi.fn>;
  let mockClientQuery: ReturnType<typeof vi.fn>;
  let mockRelease: ReturnType<typeof vi.fn>;
  let mockConnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockQuery = vi.fn();
    mockClientQuery = vi.fn();
    mockRelease = vi.fn();
    mockConnect = vi.fn().mockResolvedValue({
      query: mockClientQuery,
      release: mockRelease,
    });

    (Pool as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      query: mockQuery,
      connect: mockConnect,
    }));

    storage = new PostgresMemoryStorage({ host: 'localhost', database: 'test' });
  });

  it('constructs with default schema', () => {
    expect(Pool).toHaveBeenCalledWith({ host: 'localhost', database: 'test' });
  });

  it('constructs with custom schema', () => {
    const customStorage = new PostgresMemoryStorage({
      host: 'localhost',
      database: 'test',
      schema: 'custom',
    });
    expect(customStorage).toBeDefined();
  });

  it('creates a memory', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const memory = createMemory();
    const result = await storage.create(memory);
    expect(result).toEqual(memory);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]![0]).toContain('INSERT INTO public.memories');
  });

  it('reads an existing memory', async () => {
    const memory = createMemory();
    mockQuery.mockResolvedValue({ rows: [createMockRow(memory)] });
    const result = await storage.read(memory.id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(memory.id);
    expect(result!.content).toBe(memory.content);
  });

  it('reads a memory with array embedding', async () => {
    const memory = createMemory();
    const row = createMockRow(memory);
    row.embedding = memory.embeddings.vector;
    mockQuery.mockResolvedValue({ rows: [row] });
    const result = await storage.read(memory.id);
    expect(result).not.toBeNull();
    expect(result!.embeddings.vector).toEqual(memory.embeddings.vector);
  });

  it('returns null for missing memory', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await storage.read('missing-id');
    expect(result).toBeNull();
  });

  it('updates a memory and tracks version', async () => {
    const memory = createMemory();
    mockQuery.mockResolvedValueOnce({ rows: [createMockRow(memory)] });
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] });

    const updated = await storage.update(memory.id, { content: 'Updated' });
    expect(updated.content).toBe('Updated');
    expect(updated.version).toBe(2);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockClientQuery).toHaveBeenCalledTimes(4);
    expect(mockClientQuery.mock.calls[0]![0]).toBe('BEGIN');
    expect(mockClientQuery.mock.calls[1]![0]).toContain('INSERT INTO public.memory_versions');
    expect(mockClientQuery.mock.calls[2]![0]).toContain('UPDATE public.memories');
    expect(mockClientQuery.mock.calls[3]![0]).toBe('COMMIT');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('throws on update for missing memory', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await expect(storage.update('missing-id', {})).rejects.toThrow('Memory not found: missing-id');
  });

  it('deletes a memory', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await storage.delete('id-1');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]![0]).toContain('DELETE FROM public.memories');
  });

  it('batch creates memories in a transaction', async () => {
    mockClientQuery.mockResolvedValue({ rows: [] });
    const m1 = createMemory();
    const m2 = createMemory();
    const result = await storage.batchCreate([m1, m2]);
    expect(result).toHaveLength(2);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('batch create rolls back on error', async () => {
    mockClientQuery.mockImplementation((sql: string) => {
      if (sql === 'BEGIN') return Promise.resolve({ rows: [] });
      return Promise.reject(new Error('db error'));
    });
    const m1 = createMemory();
    await expect(storage.batchCreate([m1])).rejects.toThrow('db error');
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('batch create returns early for empty array', async () => {
    const result = await storage.batchCreate([]);
    expect(result).toEqual([]);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('batch updates memories', async () => {
    const m1 = createMemory();
    mockQuery
      .mockResolvedValueOnce({ rows: [createMockRow(m1)] })
      .mockResolvedValueOnce({ rows: [createMockRow(m1)] });
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] });

    const results = await storage.batchUpdate([
      { id: m1.id, updates: { content: 'A' } },
      { id: m1.id, updates: { content: 'B' } },
    ]);
    expect(results).toHaveLength(2);
    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(mockRelease).toHaveBeenCalledTimes(2);
  });

  it('batch deletes memories', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await storage.batchDelete(['id-1', 'id-2']);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]![0]).toContain('DELETE FROM public.memories');
    expect(mockQuery.mock.calls[0]![1]).toEqual([['id-1', 'id-2']]);
  });

  it('batch delete returns early for empty array', async () => {
    await storage.batchDelete([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('searches with query conditions', async () => {
    const m1 = createMemory();
    mockQuery
      .mockResolvedValueOnce({ rows: [createMockRow(m1)] })
      .mockResolvedValueOnce({ rows: [{ count: 1 }] });

    const { MemoryQuery } = await import('./types.js');
    const q = new MemoryQuery().byType(MemoryType.FACT).limit(5);
    const result = await storage.search(q);

    expect(result.memories).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('searches with and/or conditions', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const { MemoryQuery } = await import('./types.js');

    const andQuery = new MemoryQuery()
      .where({ type: 'type', value: MemoryType.FACT })
      .and({ type: 'importance', value: MemoryImportance.HIGH })
      .limit(10);
    await storage.search(andQuery);

    const orQuery = new MemoryQuery()
      .where({ type: 'type', value: MemoryType.FACT })
      .or({ type: 'type', value: MemoryType.PREFERENCE })
      .limit(10);
    await storage.search(orQuery);

    expect(mockQuery).toHaveBeenCalledTimes(4);
  });

  it('searches with date range', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const { MemoryQuery } = await import('./types.js');
    const q = new MemoryQuery().byDateRange(new Date('2024-01-01'), new Date('2024-12-31'));
    await storage.search(q);

    expect(mockQuery.mock.calls[0]![0]).toContain('created_at >= $');
  });

  it('searches with order by', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const { MemoryQuery } = await import('./types.js');
    const q = new MemoryQuery().orderBy('created_at', 'asc');
    await storage.search(q);

    expect(mockQuery.mock.calls[0]![0]).toContain('ORDER BY "created_at" ASC');
  });

  it('rejects invalid sort field identifiers', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const { MemoryQuery } = await import('./types.js');
    const q = new MemoryQuery().orderBy('created_at; DROP TABLE memories', 'asc');
    await expect(storage.search(q)).rejects.toThrow('Invalid SQL identifier');
  });

  it('performs semantic search with cosine similarity', async () => {
    const m1 = createMemory();
    mockQuery.mockResolvedValueOnce({ rows: [createMockRow(m1)] });

    const results = await storage.searchSimilar([1, 0, 0], {
      tenantId: 'tenant-1',
      limit: 5,
    });

    expect(results).toHaveLength(1);
    expect(mockQuery.mock.calls[0]![0]).toContain('embedding <=> $1::vector');
  });

  it('performs semantic search with metadata filters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await storage.searchSimilar([1, 0, 0], {
      tenantId: 'tenant-1',
      limit: 5,
      filters: {
        types: [MemoryType.FACT],
        importance: MemoryImportance.HIGH,
        tags: ['fruit'],
        category: 'food',
        source: MemorySource.USER_STATEMENT,
        createdAfter: new Date('2024-01-01'),
        createdBefore: new Date('2024-12-31'),
      },
    });

    const sql = mockQuery.mock.calls[0]![0] as string;
    expect(sql).toContain('type = ANY(');
    expect(sql).toContain('importance = ');
    expect(sql).toContain('tags && ');
    expect(sql).toContain('category = ');
    expect(sql).toContain('source = ');
    expect(sql).toContain('created_at >= ');
    expect(sql).toContain('created_at <= ');
  });

  it('performs semantic search with hnswEf', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await storage.searchSimilar([1, 0, 0], {
      tenantId: 'tenant-1',
      limit: 5,
      hnswEf: 128,
    });
    expect(mockQuery.mock.calls[0]![0]).toContain('SET LOCAL hnsw.ef_search = $5');
    expect(mockQuery.mock.calls[0]![1]).toContain(128);
  });

  it('searches by metadata', async () => {
    const m1 = createMemory();
    mockQuery.mockResolvedValueOnce({ rows: [createMockRow(m1)] });

    const results = await storage.searchByMetadata({
      types: [MemoryType.FACT],
    });

    expect(results).toHaveLength(1);
    expect(mockQuery.mock.calls[0]![0]).toContain('type = ANY(');
  });

  it('healthCheck returns healthy when query succeeds', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const health = await storage.healthCheck();
    expect(health.status).toBe('healthy');
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('healthCheck returns unhealthy when query fails', async () => {
    mockQuery.mockRejectedValue(new Error('connection refused'));
    const health = await storage.healthCheck();
    expect(health.status).toBe('unhealthy');
    expect(health.error).toBe('connection refused');
  });

  it('optimizes storage', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await storage.optimize();
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[0]![0]).toContain('VACUUM ANALYZE');
    expect(mockQuery.mock.calls[1]![0]).toContain('REINDEX INDEX CONCURRENTLY');
  });

  it('backs up all data', async () => {
    const memory = createMemory();
    mockQuery
      .mockResolvedValueOnce({ rows: [createMockRow(memory)] })
      .mockResolvedValueOnce({ rows: [{ id: 'v1', memory_id: memory.id, version: 1 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 'c1', memory_id: memory.id, contradicts_id: 'other' }],
      });

    const backup = await storage.backup();
    expect(backup.version).toBe(1);
    expect(backup.data).toBeDefined();
    expect((backup.data as Record<string, unknown>).memories).toBeInstanceOf(Array);
    expect((backup.data as Record<string, unknown>).versions).toBeInstanceOf(Array);
    expect((backup.data as Record<string, unknown>).contradictions).toBeInstanceOf(Array);
  });

  it('restores data from backup', async () => {
    mockClientQuery.mockResolvedValue({ rows: [] });
    const memory = createMemory();

    await storage.restore({
      version: 1,
      createdAt: new Date(),
      data: {
        memories: [memory],
        versions: [
          { id: 'v1', memory_id: memory.id, version: 1, changes: {}, changed_at: new Date() },
        ],
        contradictions: [
          { id: 'c1', memory_id: memory.id, contradicts_id: 'other', detected_at: new Date() },
        ],
      },
    });

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockClientQuery).toHaveBeenCalledWith(expect.stringContaining('TRUNCATE TABLE'));
    expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('restore rolls back on error', async () => {
    mockClientQuery.mockRejectedValue(new Error('restore failed'));
    const memory = createMemory();

    await expect(
      storage.restore({
        version: 1,
        createdAt: new Date(),
        data: {
          memories: [memory],
          versions: [],
          contradictions: [],
        },
      })
    ).rejects.toThrow('restore failed');

    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('throws on invalid backup data', async () => {
    await expect(
      storage.restore({
        version: 1,
        createdAt: new Date(),
        data: { notMemories: [] },
      })
    ).rejects.toThrow('Invalid backup data');
  });

  it('maps tags condition in search query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const { MemoryQuery } = await import('./types.js');
    const q = new MemoryQuery().byTags(['fruit', 'color']);
    await storage.search(q);

    expect(mockQuery.mock.calls[0]![0]).toContain('tags && ');
  });

  it('maps category and source conditions in search query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const { MemoryQuery } = await import('./types.js');
    const q = new MemoryQuery()
      .where({ type: 'category', value: 'food' })
      .and({ type: 'source', value: MemorySource.USER_STATEMENT });
    await storage.search(q);

    expect(mockQuery.mock.calls[0]![0]).toContain('category = ');
    expect(mockQuery.mock.calls[0]![0]).toContain('source = ');
  });

  it('handles empty search query conditions', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const { MemoryQuery } = await import('./types.js');
    const q = new MemoryQuery();
    const result = await storage.search(q);
    expect(result.memories).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('searchByMetadata with no filters returns active memories', async () => {
    const m1 = createMemory();
    mockQuery.mockResolvedValueOnce({ rows: [createMockRow(m1)] });

    const results = await storage.searchByMetadata({});
    expect(results).toHaveLength(1);
    expect(mockQuery.mock.calls[0]![0]).toContain('lifecycle = $1');
  });

  it('searchSimilar with no filters uses basic query', async () => {
    const m1 = createMemory();
    mockQuery.mockResolvedValueOnce({ rows: [createMockRow(m1)] });

    await storage.searchSimilar([1, 0, 0], { tenantId: 'tenant-1' });
    expect(mockQuery.mock.calls[0]![0]).toContain('tenant_id = $2');
    expect(mockQuery.mock.calls[0]![0]).toContain('lifecycle = $3');
  });

  it('batch update with empty updates array', async () => {
    const results = await storage.batchUpdate([]);
    expect(results).toEqual([]);
  });

  it('update preserves unchanged fields', async () => {
    const memory = createMemory({ content: 'Original', confidence: 0.8 });
    mockQuery.mockResolvedValueOnce({ rows: [createMockRow(memory)] });
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] });

    const updated = await storage.update(memory.id, { content: 'Updated' });
    expect(updated.confidence).toBe(0.8);
    expect(updated.content).toBe('Updated');
  });

  it('handles unknown embedding format in row mapping', async () => {
    const memory = createMemory();
    const row = createMockRow(memory);
    row.embedding = 12345 as unknown as string;
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await storage.read(memory.id);
    expect(result).not.toBeNull();
    expect(result!.embeddings.vector).toEqual([]);
  });

  it('restore rolls back when truncate fails', async () => {
    mockClientQuery.mockImplementation((sql: string) => {
      if (sql === 'BEGIN') return Promise.resolve({ rows: [] });
      return Promise.reject(new Error('truncate failed'));
    });
    const memory = createMemory();

    await expect(
      storage.restore({
        version: 1,
        createdAt: new Date(),
        data: {
          memories: [memory],
          versions: [],
          contradictions: [],
        },
      })
    ).rejects.toThrow('truncate failed');

    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('closes the database pool', async () => {
    const mockEnd = vi.fn().mockResolvedValue(undefined);
    (Pool as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      query: mockQuery,
      connect: mockConnect,
      end: mockEnd,
    }));

    const s = new PostgresMemoryStorage({ host: 'localhost', database: 'test' });
    await s.close();
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  it('records a contradiction', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await storage.recordContradiction('mem-1', 'mem-2', 0.92);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]![0]).toContain('INSERT INTO public.memory_contradictions');
    expect(mockQuery.mock.calls[0]![0]).toContain('similarity');
    expect(mockQuery.mock.calls[0]![1]).toEqual(['mem-1', 'mem-2', expect.any(Date), 0.92]);
  });
});
