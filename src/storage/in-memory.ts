import { MemoryLifecycle } from '@core/types.js';
import type { Memory, MemoryId, HealthStatus } from '@core/types.js';
import { cosineSimilarity } from '@core/math.js';
import { matchesMetadataFilter } from '@retrieval/strategies/_utils.js';
import type {
  MemoryStorage,
  SearchOptions,
  MetadataFilter,
  MemorySearchResult,
  BatchUpdate,
  MemoryQuery,
  BackupData,
} from './types.js';

/**
 * In-memory storage adapter for testing, local development,
 * and lightweight deployments.
 *
 * Uses brute-force cosine similarity search.
 * Suitable for <10k memories.
 */
export class InMemoryMemoryStorage implements MemoryStorage {
  private memories: Map<MemoryId, Memory> = new Map();
  private tagIndex: Map<string, Set<MemoryId>> = new Map();

  async create(memory: Memory): Promise<Memory> {
    this.memories.set(memory.id, memory);
    this.indexMemory(memory);
    return memory;
  }

  async read(id: MemoryId): Promise<Memory | null> {
    return this.memories.get(id) ?? null;
  }

  async update(id: MemoryId, updates: Partial<Memory>): Promise<Memory> {
    const existing = this.memories.get(id);
    if (!existing) {
      throw new Error(`Memory not found: ${id}`);
    }

    const updated: Memory = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date(),
      version: existing.version + 1,
    };

    // Re-index if tags changed
    if (updates.tags) {
      this.unindexMemory(existing);
      this.indexMemory(updated);
    }

    this.memories.set(id, updated);
    return updated;
  }

  async delete(id: MemoryId): Promise<void> {
    const memory = this.memories.get(id);
    if (memory) {
      this.unindexMemory(memory);
    }
    this.memories.delete(id);
  }

  async batchCreate(memories: Memory[]): Promise<Memory[]> {
    for (const memory of memories) {
      this.memories.set(memory.id, memory);
      this.indexMemory(memory);
    }
    return memories;
  }

  async batchUpdate(updates: BatchUpdate[]): Promise<Memory[]> {
    const results: Memory[] = [];
    for (const { id, updates: patch } of updates) {
      results.push(await this.update(id, patch));
    }
    return results;
  }

  async batchDelete(ids: MemoryId[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }

  async search(query: MemoryQuery): Promise<MemorySearchResult> {
    const start = Date.now();
    let candidates = Array.from(this.memories.values()).filter(
      (m) => m.lifecycle === MemoryLifecycle.ACTIVE
    );

    candidates = candidates.filter((m) => this.matchesQuery(m, query.getConditions()));

    const { field, direction } = query.getSort();
    if (field) {
      candidates.sort((a, b) => {
        const aVal = this.getFieldValue(a, field);
        const bVal = this.getFieldValue(b, field);
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const { limit, offset } = query.getPagination();
    const paginated = candidates.slice(offset ?? 0, limit ? (offset ?? 0) + limit : undefined);

    return {
      memories: paginated,
      total: candidates.length,
      latencyMs: Date.now() - start,
    };
  }

  async searchSimilar(vector: number[], options: SearchOptions): Promise<Memory[]> {
    const candidates = Array.from(this.memories.values()).filter(
      (m) =>
        m.tenantId === options.tenantId &&
        m.lifecycle === MemoryLifecycle.ACTIVE &&
        matchesMetadataFilter(m, options.filters)
    );

    const scored = candidates.map((memory) => ({
      memory,
      score: cosineSimilarity(vector, memory.embeddings.vector),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, options.limit ?? 10).map((s) => s.memory);
  }

  async searchByMetadata(filters: MetadataFilter, tenantId?: string): Promise<Memory[]> {
    return Array.from(this.memories.values()).filter(
      (m) =>
        m.lifecycle === MemoryLifecycle.ACTIVE &&
        matchesMetadataFilter(m, filters) &&
        (tenantId === undefined || m.tenantId === tenantId)
    );
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      timestamp: new Date(),
      latencyMs: 0,
    };
  }

  async optimize(): Promise<void> {
    // No-op for in-memory storage
  }

  async backup(): Promise<BackupData> {
    return {
      version: 1,
      createdAt: new Date(),
      data: {
        memories: Array.from(this.memories.values()),
        tagIndex: Array.from(this.tagIndex.entries()).map(([tag, ids]) => [tag, Array.from(ids)]),
      },
    };
  }

  async restore(data: BackupData): Promise<void> {
    if (typeof data.data !== 'object' || data.data === null) {
      throw new Error('Invalid backup data');
    }
    const payload = data.data as {
      memories: Memory[];
      tagIndex: [string, string[]][];
    };
    this.memories.clear();
    this.tagIndex.clear();
    for (const memory of payload.memories) {
      this.memories.set(memory.id, memory);
    }
    for (const [tag, ids] of payload.tagIndex) {
      this.tagIndex.set(tag, new Set(ids));
    }
  }

  async close(): Promise<void> {
    // No-op: in-memory storage does not acquire external resources
  }

  async recordContradiction(
    _memoryId: MemoryId,
    _contradictsId: MemoryId,
    _similarity: number
  ): Promise<void> {
    // No-op for in-memory storage
  }

  /** Clear all data. Useful for testing. */
  clear(): void {
    this.memories.clear();
    this.tagIndex.clear();
  }

  /** Get total memory count. */
  size(): number {
    return this.memories.size;
  }

  private indexMemory(memory: Memory): void {
    for (const tag of memory.tags) {
      const set = this.tagIndex.get(tag) ?? new Set();
      set.add(memory.id);
      this.tagIndex.set(tag, set);
    }
  }

  private unindexMemory(memory: Memory): void {
    for (const tag of memory.tags) {
      const set = this.tagIndex.get(tag);
      if (set) {
        set.delete(memory.id);
        if (set.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  private matchesQuery(
    memory: Memory,
    conditions: { type: string; value?: unknown; condition?: { type: string; value?: unknown } }[]
  ): boolean {
    if (conditions.length === 0) return true;

    const must = conditions.filter((c) => c.type !== 'or');
    const should = conditions
      .filter((c) => c.type === 'or')
      .map((c) => c.condition)
      .filter((c): c is { type: string; value?: unknown } => c !== undefined);

    const mustMatch = must.every((c) => this.matchesCondition(memory, c));
    const shouldMatch = should.some((c) => this.matchesCondition(memory, c));

    if (must.length > 0 && should.length > 0) {
      return mustMatch || shouldMatch;
    }
    if (must.length > 0) {
      return mustMatch;
    }
    return shouldMatch;
  }

  private matchesCondition(
    memory: Memory,
    condition: { type: string; value?: unknown; condition?: { type: string; value?: unknown } }
  ): boolean {
    switch (condition.type) {
      case 'type':
        return memory.type === condition.value;
      case 'importance':
        return memory.importance === condition.value;
      case 'tags':
        return (condition.value as string[]).some((tag) => memory.tags.includes(tag));
      case 'category':
        return memory.category === condition.value;
      case 'source':
        return memory.source === condition.value;
      case 'dateRange': {
        const range = condition.value as { start: Date; end: Date };
        return memory.createdAt >= range.start && memory.createdAt <= range.end;
      }
      case 'tenant':
        return memory.tenantId === condition.value;
      case 'embeddingModel':
        return memory.embeddings.model === condition.value;
      case 'and':
        return condition.condition ? this.matchesCondition(memory, condition.condition) : true;
      case 'or':
        return condition.condition ? this.matchesCondition(memory, condition.condition) : true;
      default:
        throw new Error(`Unknown query condition type: ${condition.type}`);
    }
  }

  private getFieldValue(memory: Memory, field: string): string | number | Date {
    const fieldMap: Record<string, keyof Memory | undefined> = {
      created_at: 'createdAt',
      createdAt: 'createdAt',
      updated_at: 'updatedAt',
      updatedAt: 'updatedAt',
      last_accessed_at: 'lastAccessedAt',
      lastAccessedAt: 'lastAccessedAt',
      confidence: 'confidence',
      importance: 'importance',
      type: 'type',
      category: 'category',
      source: 'source',
      version: 'version',
      embedding_model: 'embeddings',
    };

    const key = fieldMap[field];
    if (key === undefined || !(key in memory)) {
      return '';
    }

    const value = memory[key] as unknown;
    if (value === undefined || value === null) {
      return '';
    }
    return value as string | number | Date;
  }
}
