import { MemoryLifecycle } from '@reaatech/agent-memory-core';
import type { HealthStatus, Memory, MemoryId, MemoryVersion } from '@reaatech/agent-memory-core';
import { Pool, type PoolConfig, type QueryResultRow } from 'pg';
import type {
  BackupData,
  BatchUpdate,
  MemoryQuery,
  MemorySearchResult,
  MemoryStorage,
  MetadataFilter,
  SearchOptions,
} from './types.js';

export interface PostgresConfig extends PoolConfig {
  schema?: string;
}

interface MemoryRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  owner_id: string;
  content: string;
  type: string;
  category: string | null;
  source: string;
  importance: string;
  confidence: number;
  tags: string[];
  lifecycle: string;
  created_at: Date;
  updated_at: Date;
  last_accessed_at: Date;
  expires_at: Date | null;
  relates_to: string[] | null;
  contradicts: string[] | null;
  supersedes: string[] | null;
  embedding: string | number[];
  embedding_model: string;
  embedding_dimensions: number;
  version: number;
  history: MemoryVersion[];
}

const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateSchemaName(schema: string): void {
  if (!VALID_IDENTIFIER.test(schema)) {
    throw new Error(`Invalid schema name: "${schema}". Must match ${VALID_IDENTIFIER.source}.`);
  }
}

export class PostgresMemoryStorage implements MemoryStorage {
  private pool: Pool;
  private schema: string;

  constructor(config: PostgresConfig) {
    const { schema: tableSchema, ...poolConfig } = config;
    this.pool = new Pool(poolConfig);
    this.schema = tableSchema ?? 'public';
    validateSchemaName(this.schema);
  }

  private get table(): string {
    return `${this.schema}.memories`;
  }

  private get versionsTable(): string {
    return `${this.schema}.memory_versions`;
  }

  private get contradictionsTable(): string {
    return `${this.schema}.memory_contradictions`;
  }

  async create(memory: Memory): Promise<Memory> {
    const sql = `
      INSERT INTO ${this.table} (
        id, tenant_id, owner_id, content, type, category, source, importance,
        confidence, tags, lifecycle, created_at, updated_at, last_accessed_at,
        expires_at, relates_to, contradicts, supersedes, embedding,
        embedding_model, embedding_dimensions, version, history
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::vector, $20, $21, $22, $23)
    `;
    await this.pool.query(sql, [
      memory.id,
      memory.tenantId,
      memory.ownerId,
      memory.content,
      memory.type,
      memory.category ?? null,
      memory.source,
      memory.importance,
      memory.confidence,
      memory.tags,
      memory.lifecycle,
      memory.createdAt,
      memory.updatedAt,
      memory.lastAccessedAt,
      memory.expiresAt ?? null,
      memory.relatesTo ?? null,
      memory.contradicts ?? null,
      memory.supersedes ?? null,
      this.vectorToString(memory.embeddings.vector),
      memory.embeddings.model,
      memory.embeddings.dimensions,
      memory.version,
      JSON.stringify(memory.history),
    ]);
    return memory;
  }

  async read(id: MemoryId): Promise<Memory | null> {
    const result = await this.pool.query<MemoryRow>(`SELECT * FROM ${this.table} WHERE id = $1`, [
      id,
    ]);
    if (result.rows.length === 0) return null;
    return this.rowToMemory(result.rows[0]);
  }

  async update(id: MemoryId, updates: Partial<Memory>): Promise<Memory> {
    const existing = await this.read(id);
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

    const oldVersion = existing.version;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO ${this.versionsTable} (memory_id, version, changes, changed_at) VALUES ($1, $2, $3, $4)`,
        [id, existing.version, JSON.stringify(updates), new Date()],
      );

      const sql = `
        UPDATE ${this.table} SET
          tenant_id = $1,
          owner_id = $2,
          content = $3,
          type = $4,
          category = $5,
          source = $6,
          importance = $7,
          confidence = $8,
          tags = $9,
          lifecycle = $10,
          updated_at = $11,
          last_accessed_at = $12,
          expires_at = $13,
          relates_to = $14,
          contradicts = $15,
          supersedes = $16,
          embedding = $17::vector,
          embedding_model = $18,
          embedding_dimensions = $19,
          version = $20,
          history = $21
        WHERE id = $22 AND version = $23
      `;
      const result = await client.query(sql, [
        updated.tenantId,
        updated.ownerId,
        updated.content,
        updated.type,
        updated.category ?? null,
        updated.source,
        updated.importance,
        updated.confidence,
        updated.tags,
        updated.lifecycle,
        updated.updatedAt,
        updated.lastAccessedAt,
        updated.expiresAt ?? null,
        updated.relatesTo ?? null,
        updated.contradicts ?? null,
        updated.supersedes ?? null,
        this.vectorToString(updated.embeddings.vector),
        updated.embeddings.model,
        updated.embeddings.dimensions,
        updated.version,
        JSON.stringify(updated.history),
        updated.id,
        oldVersion,
      ]);
      if (result.rowCount === 0) {
        throw new Error(`Concurrent update detected for memory: ${id}`);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return updated;
  }

  async delete(id: MemoryId): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.table} WHERE id = $1`, [id]);
  }

  async batchCreate(memories: Memory[]): Promise<Memory[]> {
    if (memories.length === 0) return memories;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const sql = `
        INSERT INTO ${this.table} (
          id, tenant_id, owner_id, content, type, category, source, importance,
          confidence, tags, lifecycle, created_at, updated_at, last_accessed_at,
          expires_at, relates_to, contradicts, supersedes, embedding,
          embedding_model, embedding_dimensions, version, history
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::vector, $20, $21, $22, $23)
      `;
      for (const memory of memories) {
        await client.query(sql, [
          memory.id,
          memory.tenantId,
          memory.ownerId,
          memory.content,
          memory.type,
          memory.category ?? null,
          memory.source,
          memory.importance,
          memory.confidence,
          memory.tags,
          memory.lifecycle,
          memory.createdAt,
          memory.updatedAt,
          memory.lastAccessedAt,
          memory.expiresAt ?? null,
          memory.relatesTo ?? null,
          memory.contradicts ?? null,
          memory.supersedes ?? null,
          this.vectorToString(memory.embeddings.vector),
          memory.embeddings.model,
          memory.embeddings.dimensions,
          memory.version,
          JSON.stringify(memory.history),
        ]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
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
    if (ids.length === 0) return;
    await this.pool.query(`DELETE FROM ${this.table} WHERE id = ANY($1)`, [ids]);
  }

  async search(query: MemoryQuery): Promise<MemorySearchResult> {
    const start = Date.now();
    const conditions: string[] = ['lifecycle = $1'];
    const values: unknown[] = [MemoryLifecycle.ACTIVE];
    let paramIndex = 2;

    const { whereClause, whereValues, nextIndex } = this.buildQueryConditions(
      query.getConditions(),
      paramIndex,
    );
    if (whereClause) {
      conditions.push(whereClause);
      values.push(...whereValues);
      paramIndex = nextIndex;
    }

    let sql = `SELECT * FROM ${this.table}`;
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const { field, direction } = query.getSort();
    if (field) {
      sql += ` ORDER BY ${this.escapeIdentifier(field)} ${direction === 'asc' ? 'ASC' : 'DESC'}`;
    }

    const { limit, offset } = query.getPagination();
    if (limit !== undefined) {
      sql += ` LIMIT $${paramIndex++}`;
      values.push(limit);
    }
    if (offset !== undefined) {
      sql += ` OFFSET $${paramIndex++}`;
      values.push(offset);
    }

    const result = await this.pool.query<MemoryRow>(sql, values);
    const memories = result.rows.map((r) => this.rowToMemory(r));

    let total = memories.length;
    if (limit !== undefined || offset !== undefined) {
      const countValues = [MemoryLifecycle.ACTIVE];
      const countIdx = 2;
      const { whereClause: countClause, whereValues: countWhereVals } = this.buildQueryConditions(
        query.getConditions(),
        countIdx,
      );
      let countSql = `SELECT COUNT(*)::int as count FROM ${this.table}`;
      const countConditions: string[] = ['lifecycle = $1'];
      const countAllValues: unknown[] = [...countValues];
      if (countClause) {
        countConditions.push(countClause);
        countAllValues.push(...countWhereVals);
      }
      if (countConditions.length > 0) {
        countSql += ` WHERE ${countConditions.join(' AND ')}`;
      }
      const countResult = await this.pool.query<{ count: number }>(countSql, countAllValues);
      total = countResult.rows[0]?.count ?? 0;
    }

    return {
      memories,
      total,
      latencyMs: Date.now() - start,
    };
  }

  async searchSimilar(vector: number[], options: SearchOptions): Promise<Memory[]> {
    const vectorStr = this.vectorToString(vector);
    const limit = options.limit ?? 10;
    const conditions: string[] = ['tenant_id = $2', 'lifecycle = $3'];
    const values: unknown[] = [vectorStr, options.tenantId, MemoryLifecycle.ACTIVE];
    let paramIndex = 4;

    const filterClause = this.buildMetadataFilterSql(options.filters, paramIndex);
    if (filterClause.clause) {
      conditions.push(filterClause.clause);
      values.push(...filterClause.values);
      paramIndex = filterClause.nextIndex;
    }

    let sql = `
      SELECT *, embedding <=> $1::vector as distance
      FROM ${this.table}
      WHERE ${conditions.join(' AND ')}
      ORDER BY embedding <=> $1::vector
      LIMIT $${paramIndex}
    `;
    values.push(limit);

    if (options.hnswEf !== undefined) {
      if (!Number.isInteger(options.hnswEf) || options.hnswEf < 1) {
        throw new Error('hnswEf must be a positive integer');
      }
      const efParamIdx = ++paramIndex;
      sql = `SET LOCAL hnsw.ef_search = $${efParamIdx}; ${sql}`;
      values.push(options.hnswEf);
    }

    const result = await this.pool.query<MemoryRow>(sql, values);
    return result.rows.map((r) => this.rowToMemory(r));
  }

  async searchByMetadata(filters: MetadataFilter, tenantId?: string): Promise<Memory[]> {
    const conditions: string[] = ['lifecycle = $1'];
    const values: unknown[] = [MemoryLifecycle.ACTIVE];
    let paramIndex = 2;

    if (tenantId !== undefined) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      values.push(tenantId);
    }

    const filterClause = this.buildMetadataFilterSql(filters, paramIndex);
    if (filterClause.clause) {
      conditions.push(filterClause.clause);
      values.push(...filterClause.values);
      paramIndex = filterClause.nextIndex;
    }

    let sql = `SELECT * FROM ${this.table}`;
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.pool.query<MemoryRow>(sql, values);
    return result.rows.map((r) => this.rowToMemory(r));
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      return {
        status: 'healthy',
        timestamp: new Date(),
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async optimize(): Promise<void> {
    await this.pool.query(`VACUUM ANALYZE ${this.table}`);
    await this.pool.query(`REINDEX INDEX CONCURRENTLY ${this.schema}.idx_memories_embedding`);
    await this.pool.query(`REINDEX INDEX CONCURRENTLY ${this.schema}.idx_memories_tags`);
  }

  async backup(): Promise<BackupData> {
    const memoriesResult = await this.pool.query<MemoryRow>(`SELECT * FROM ${this.table}`);
    const versionsResult = await this.pool.query(`SELECT * FROM ${this.versionsTable}`);
    const contradictionsResult = await this.pool.query(`SELECT * FROM ${this.contradictionsTable}`);

    return {
      version: 1,
      createdAt: new Date(),
      data: {
        memories: memoriesResult.rows.map((r) => this.rowToMemory(r)),
        versions: versionsResult.rows,
        contradictions: contradictionsResult.rows,
      },
    };
  }

  async restore(data: BackupData): Promise<void> {
    if (
      typeof data.data !== 'object' ||
      data.data === null ||
      !('memories' in data.data) ||
      !Array.isArray((data.data as Record<string, unknown>).memories)
    ) {
      throw new Error('Invalid backup data');
    }

    const payload = data.data as {
      memories: Memory[];
      versions: unknown[];
      contradictions: unknown[];
    };

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `TRUNCATE TABLE ${this.versionsTable}, ${this.contradictionsTable}, ${this.table} CASCADE`,
      );

      for (const memory of payload.memories) {
        await client.query(
          `
          INSERT INTO ${this.table} (
            id, tenant_id, owner_id, content, type, category, source, importance,
            confidence, tags, lifecycle, created_at, updated_at, last_accessed_at,
            expires_at, relates_to, contradicts, supersedes, embedding,
            embedding_model, embedding_dimensions, version, history
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::vector, $20, $21, $22, $23)
        `,
          [
            memory.id,
            memory.tenantId,
            memory.ownerId,
            memory.content,
            memory.type,
            memory.category ?? null,
            memory.source,
            memory.importance,
            memory.confidence,
            memory.tags,
            memory.lifecycle,
            memory.createdAt,
            memory.updatedAt,
            memory.lastAccessedAt,
            memory.expiresAt ?? null,
            memory.relatesTo ?? null,
            memory.contradicts ?? null,
            memory.supersedes ?? null,
            this.vectorToString(memory.embeddings.vector),
            memory.embeddings.model,
            memory.embeddings.dimensions,
            memory.version,
            JSON.stringify(memory.history),
          ],
        );
      }

      for (const version of payload.versions) {
        const v = version as Record<string, unknown>;
        await client.query(
          `INSERT INTO ${this.versionsTable} (id, memory_id, version, changes, changed_at, changed_by) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            v.id,
            v.memory_id,
            v.version,
            JSON.stringify(v.changes),
            v.changed_at,
            v.changed_by ?? null,
          ],
        );
      }

      for (const contradiction of payload.contradictions) {
        const c = contradiction as Record<string, unknown>;
        await client.query(
          `INSERT INTO ${this.contradictionsTable} (id, memory_id, contradicts_id, detected_at, resolution_strategy, resolved_at, resolved_by) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            c.id,
            c.memory_id,
            c.contradicts_id,
            c.detected_at,
            c.resolution_strategy ?? null,
            c.resolved_at ?? null,
            c.resolved_by ?? null,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async recordContradiction(
    memoryId: MemoryId,
    contradictsId: MemoryId,
    similarity: number,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO ${this.contradictionsTable} (memory_id, contradicts_id, detected_at, similarity) VALUES ($1, $2, $3, $4)`,
      [memoryId, contradictsId, new Date(), similarity],
    );
  }

  private rowToMemory(row: MemoryRow): Memory {
    const vector = this.parseVector(row.embedding, row.embedding_dimensions);

    return {
      id: row.id,
      tenantId: row.tenant_id,
      ownerId: row.owner_id,
      content: row.content,
      type: row.type as Memory['type'],
      category: row.category ?? undefined,
      source: row.source as Memory['source'],
      importance: row.importance as Memory['importance'],
      confidence: row.confidence,
      tags: row.tags,
      lifecycle: row.lifecycle as Memory['lifecycle'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastAccessedAt: row.last_accessed_at,
      expiresAt: row.expires_at ?? undefined,
      relatesTo: row.relates_to ?? undefined,
      contradicts: row.contradicts ?? undefined,
      supersedes: row.supersedes ?? undefined,
      embeddings: {
        vector,
        model: row.embedding_model,
        dimensions: row.embedding_dimensions,
      },
      version: row.version,
      history: Array.isArray(row.history) ? row.history : [],
    };
  }

  private parseVector(embedding: string | number[], expectedDims: number): number[] {
    if (Array.isArray(embedding)) {
      const result = embedding.map(Number);
      if (result.length !== expectedDims) {
        throw new Error(
          `Vector dimension mismatch: expected ${expectedDims}, got ${result.length}`,
        );
      }
      return result;
    }
    if (typeof embedding === 'string') {
      try {
        const parsed = JSON.parse(embedding) as unknown;
        if (!Array.isArray(parsed)) {
          throw new Error('Parsed vector is not an array');
        }
        const result = parsed.map(Number);
        if (result.length !== expectedDims) {
          throw new Error(
            `Vector dimension mismatch: expected ${expectedDims}, got ${result.length}`,
          );
        }
        return result;
      } catch {
        const matches = embedding.match(/-?\d+(?:\.\d+)?(?:e[+-]\d+)?/g);
        if (!matches) {
          throw new Error(`Failed to parse vector: ${embedding.slice(0, 100)}`);
        }
        const result = matches.map(Number);
        if (result.length !== expectedDims) {
          throw new Error(
            `Vector dimension mismatch: expected ${expectedDims}, got ${result.length}`,
          );
        }
        return result;
      }
    }
    return [];
  }

  private vectorToString(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }

  private escapeIdentifier(str: string): string {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str)) {
      throw new Error(`Invalid SQL identifier: ${str}`);
    }
    return `"${str}"`;
  }

  private buildMetadataFilterSql(
    filters: MetadataFilter | undefined,
    startIndex: number,
  ): { clause: string | null; values: unknown[]; nextIndex: number } {
    if (!filters) return { clause: null, values: [], nextIndex: startIndex };

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = startIndex;

    if (filters.types && filters.types.length > 0) {
      conditions.push(`type = ANY($${idx++}::text[])`);
      values.push(filters.types);
    }
    if (filters.importance) {
      conditions.push(`importance = $${idx++}`);
      values.push(filters.importance);
    }
    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`tags && $${idx++}::text[]`);
      values.push(filters.tags);
    }
    if (filters.category) {
      conditions.push(`category = $${idx++}`);
      values.push(filters.category);
    }
    if (filters.source) {
      conditions.push(`source = $${idx++}`);
      values.push(filters.source);
    }
    if (filters.createdAfter) {
      conditions.push(`created_at >= $${idx++}`);
      values.push(filters.createdAfter);
    }
    if (filters.createdBefore) {
      conditions.push(`created_at <= $${idx++}`);
      values.push(filters.createdBefore);
    }
    if (filters.embeddingModel) {
      conditions.push(`embedding_model = $${idx++}`);
      values.push(filters.embeddingModel);
    }

    return {
      clause: conditions.length > 0 ? conditions.join(' AND ') : null,
      values,
      nextIndex: idx,
    };
  }

  private buildQueryConditions(
    conditions: { type: string; value?: unknown; condition?: { type: string; value?: unknown } }[],
    startIndex: number,
  ): { whereClause: string | null; whereValues: unknown[]; nextIndex: number } {
    if (conditions.length === 0)
      return { whereClause: null, whereValues: [], nextIndex: startIndex };

    const must = conditions.filter((c) => c.type !== 'or');
    const should = conditions
      .filter((c) => c.type === 'or')
      .map((c) => c.condition)
      .filter((c): c is { type: string; value?: unknown } => c !== undefined);

    let idx = startIndex;

    const processCondition = (c: {
      type: string;
      value?: unknown;
      condition?: { type: string; value?: unknown };
    }): { clause: string; vals: unknown[] } | null => {
      switch (c.type) {
        case 'type':
          return { clause: `type = $${idx++}`, vals: [c.value] };
        case 'importance':
          return { clause: `importance = $${idx++}`, vals: [c.value] };
        case 'tags': {
          const tags = c.value as string[];
          return { clause: `tags && $${idx++}::text[]`, vals: [tags] };
        }
        case 'category':
          return { clause: `category = $${idx++}`, vals: [c.value] };
        case 'source':
          return { clause: `source = $${idx++}`, vals: [c.value] };
        case 'dateRange': {
          const range = c.value as { start: Date; end: Date };
          const startParam = idx++;
          const endParam = idx++;
          return {
            clause: `created_at >= $${startParam} AND created_at <= $${endParam}`,
            vals: [range.start, range.end],
          };
        }
        case 'tenant':
          return { clause: `tenant_id = $${idx++}`, vals: [c.value] };
        case 'embeddingModel':
          return { clause: `embedding_model = $${idx++}`, vals: [c.value] };
        case 'and':
          return c.condition ? processCondition(c.condition) : null;
        case 'or':
          return c.condition ? processCondition(c.condition) : null;
        default:
          return null;
      }
    };

    const mustParts: string[] = [];
    const mustVals: unknown[] = [];
    for (const c of must) {
      const res = processCondition(c);
      if (res) {
        mustParts.push(res.clause);
        mustVals.push(...res.vals);
      }
    }

    let shouldClause: string | null = null;
    const shouldVals: unknown[] = [];
    if (should.length > 0) {
      const orParts: string[] = [];
      for (const c of should) {
        const res = processCondition(c);
        if (res) {
          orParts.push(res.clause);
          shouldVals.push(...res.vals);
        }
      }
      if (orParts.length > 0) {
        shouldClause = `(${orParts.join(' OR ')})`;
      }
    }

    if (mustParts.length > 0 && shouldClause) {
      return {
        whereClause: `(${mustParts.join(' AND ')}) OR ${shouldClause}`,
        whereValues: [...mustVals, ...shouldVals],
        nextIndex: idx,
      };
    }
    if (mustParts.length > 0) {
      return {
        whereClause: mustParts.join(' AND '),
        whereValues: mustVals,
        nextIndex: idx,
      };
    }
    if (shouldClause) {
      return {
        whereClause: shouldClause,
        whereValues: shouldVals,
        nextIndex: idx,
      };
    }

    return { whereClause: null, whereValues: [], nextIndex: startIndex };
  }
}
