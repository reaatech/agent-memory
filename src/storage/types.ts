import type {
  Memory,
  MemoryId,
  MemoryType,
  MemoryImportance,
  MemorySource,
  HealthStatus,
  TenantId,
} from '@core/types.js';

/**
 * Search options for similarity and metadata queries.
 */
export interface SearchOptions {
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Tenant isolation filter */
  tenantId: TenantId;
  /** Metadata filters */
  filters?: MetadataFilter;
  /** HNSW search parameter (vector DBs) */
  hnswEf?: number;
  /** Exact search vs approximate */
  exact?: boolean;
}

/**
 * Filters for narrowing search results by metadata.
 */
export interface MetadataFilter {
  /** Filter by memory types */
  types?: MemoryType[];
  /** Filter by importance level */
  importance?: MemoryImportance;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Filter by category */
  category?: string;
  /** Filter by source */
  source?: MemorySource;
  /** Date range filter */
  createdAfter?: Date;
  createdBefore?: Date;
  /** Filter by embedding model name */
  embeddingModel?: string;
}

/**
 * Result of a memory search operation.
 */
export interface MemorySearchResult {
  memories: Memory[];
  total: number;
  latencyMs: number;
}

/**
 * Unified interface for all storage backends.
 *
 * Implementations: InMemoryMemoryStorage, PostgresMemoryStorage,
 * QdrantMemoryStorage, PineconeMemoryStorage.
 */
export interface MemoryStorage {
  // CRUD Operations
  create(memory: Memory): Promise<Memory>;
  read(id: MemoryId): Promise<Memory | null>;
  update(id: MemoryId, updates: Partial<Memory>): Promise<Memory>;
  delete(id: MemoryId): Promise<void>;

  // Batch Operations
  batchCreate(memories: Memory[]): Promise<Memory[]>;
  batchUpdate(updates: BatchUpdate[]): Promise<Memory[]>;
  batchDelete(ids: MemoryId[]): Promise<void>;

  // Search Operations
  search(query: MemoryQuery): Promise<MemorySearchResult>;
  searchSimilar(vector: number[], options: SearchOptions): Promise<Memory[]>;
  searchByMetadata(filters: MetadataFilter, tenantId?: string): Promise<Memory[]>;

  // Administrative
  healthCheck(): Promise<HealthStatus>;
  optimize(): Promise<void>;
  backup(): Promise<BackupData>;
  restore(data: BackupData): Promise<void>;

  // Lifecycle
  close(): Promise<void>;

  // Contradiction tracking
  recordContradiction(
    memoryId: MemoryId,
    contradictsId: MemoryId,
    similarity: number
  ): Promise<void>;
}

/**
 * Opaque backup data returned by {@link MemoryStorage.backup}.
 * Format is adapter-specific; must be passed to the same adapter's {@link MemoryStorage.restore}.
 */
export interface BackupData {
  version: number;
  createdAt: Date;
  data: unknown;
}

/**
 * A single batch update entry.
 */
export interface BatchUpdate {
  id: MemoryId;
  updates: Partial<Memory>;
}

/**
 * Fluent query builder for complex memory queries.
 *
 * Conditions added via {@link where} are AND-ed together.
 * Conditions added via {@link and} are AND-ed with the existing conditions.
 * Conditions added via {@link or} form an OR group that is OR-ed with the
 * AND group (i.e., the query becomes: `(A AND B) OR (C OR D)`).
 *
 * Nesting of and/or within each other is supported at a single level;
 * deeply nested conditions are flattened.
 */
export class MemoryQuery {
  private conditions: QueryCondition[] = [];
  private sortField?: string;
  private sortDirection: 'asc' | 'desc' = 'desc';
  private limitValue?: number;
  private offsetValue?: number;

  where(condition: QueryCondition): this {
    this.conditions.push(condition);
    return this;
  }

  and(condition: QueryCondition): this {
    this.conditions.push({ type: 'and', condition });
    return this;
  }

  or(condition: QueryCondition): this {
    this.conditions.push({ type: 'or', condition });
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'desc'): this {
    this.sortField = field;
    this.sortDirection = direction;
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  byType(type: MemoryType): this {
    return this.where({ type: 'type', value: type });
  }

  byImportance(importance: MemoryImportance): this {
    return this.where({ type: 'importance', value: importance });
  }

  byTags(tags: string[]): this {
    return this.where({ type: 'tags', value: tags });
  }

  byDateRange(start: Date, end: Date): this {
    return this.where({ type: 'dateRange', value: { start, end } });
  }

  byTenant(tenantId: string): this {
    return this.where({ type: 'tenant', value: tenantId });
  }

  byEmbeddingModel(model: string): this {
    return this.where({ type: 'embeddingModel', value: model });
  }

  async execute(storage: MemoryStorage): Promise<Memory[]> {
    const result = await storage.search(this);
    return result.memories;
  }

  toJSON(): Record<string, unknown> {
    return {
      conditions: this.conditions,
      sort: { field: this.sortField, direction: this.sortDirection },
      pagination: { limit: this.limitValue, offset: this.offsetValue },
    };
  }

  getConditions(): QueryCondition[] {
    return this.conditions;
  }

  getSort(): { field?: string; direction: 'asc' | 'desc' } {
    return { field: this.sortField, direction: this.sortDirection };
  }

  getPagination(): { limit?: number; offset?: number } {
    return { limit: this.limitValue, offset: this.offsetValue };
  }
}

/**
 * A single query condition.
 */
export type QueryCondition =
  | { type: 'type'; value: MemoryType }
  | { type: 'importance'; value: MemoryImportance }
  | { type: 'tags'; value: string[] }
  | { type: 'category'; value: string }
  | { type: 'source'; value: string }
  | { type: 'dateRange'; value: { start: Date; end: Date } }
  | { type: 'tenant'; value: string }
  | { type: 'embeddingModel'; value: string }
  | { type: 'and'; condition: QueryCondition }
  | { type: 'or'; condition: QueryCondition };
