# @reaatech/agent-memory-storage

[![npm version](https://img.shields.io/npm/v/@reaatech/agent-memory-storage.svg)](https://www.npmjs.com/package/@reaatech/agent-memory-storage)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/agent-memory/ci.yml?branch=main&label=CI)](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Storage abstraction layer for persisting and querying memories. Provides a unified `MemoryStorage` interface with two implementations: an in-memory adapter for development and testing, and a PostgreSQL pgvector adapter for production.

## Installation

```bash
npm install @reaatech/agent-memory-storage
# or
pnpm add @reaatech/agent-memory-storage
```

PostgreSQL users also need `pg`:

```bash
npm install pg
```

## Feature Overview

- **14-method `MemoryStorage` interface** — CRUD, batch operations, similarity search, metadata search, health checks, backup/restore
- **Fluent query builder** — `MemoryQuery` with chainable `.where()`, `.and()`, `.or()`, `.orderBy()`, `.limit()` methods
- **In-memory adapter** — zero-dependency, ideal for tests and prototyping
- **PostgreSQL pgvector adapter** — production-grade with HNSW indexing, connection pooling, schema migrations
- **Metadata filtering** — filter by type, importance, tags, category, source, date range, embedding model
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import {
  InMemoryMemoryStorage,
  PostgresMemoryStorage,
  MemoryQuery,
} from '@reaatech/agent-memory-storage';
import { MemoryType, MemoryImportance } from '@reaatech/agent-memory-core';

// In-memory (tests, demos)
const storage = new InMemoryMemoryStorage();

// PostgreSQL with pgvector
const pg = new PostgresMemoryStorage({
  host: 'localhost',
  database: 'agent_memory',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  schema: 'public',
});

// Store a memory
await storage.create({
  id: 'abc-123',
  tenantId: 'default',
  content: 'User prefers dark mode',
  type: MemoryType.PREFERENCE,
  importance: MemoryImportance.HIGH,
  // ... other fields
});

// Semantic search
const results = await storage.searchSimilar(queryVector, {
  tenantId: 'default',
  limit: 10,
  filters: { types: [MemoryType.PREFERENCE] },
});

// Fluent query
const memories = await storage.search(
  new MemoryQuery()
    .byType(MemoryType.FACT)
    .byImportance(MemoryImportance.HIGH)
    .limit(20)
    .orderBy('createdAt', 'desc'),
);
```

## API Reference

### `MemoryStorage` Interface

The contract all implementations satisfy:

| Method | Description |
|--------|-------------|
| `create(memory)` | Persist a new memory |
| `read(id)` | Retrieve a memory by ID |
| `update(id, updates)` | Partial update of a memory |
| `delete(id)` | Remove a memory |
| `batchCreate(memories)` | Persist multiple memories at once |
| `batchUpdate(updates)` | Apply multiple partial updates |
| `batchDelete(ids)` | Remove multiple memories |
| `search(query)` | Execute a fluent `MemoryQuery` |
| `searchSimilar(vector, options)` | Semantic similarity search |
| `searchByMetadata(filters, tenantId?)` | Filter by type, importance, tags, etc. |
| `healthCheck()` | Returns `HealthStatus` |
| `optimize()` | Trigger database maintenance |
| `backup()` | Export all data |
| `restore(data)` | Import from backup |
| `close()` | Close connections and release resources |
| `recordContradiction(id1, id2, similarity)` | Persist a contradiction record |

### `MemoryQuery` (class)

A fluent query builder with chainable methods:

```typescript
const query = new MemoryQuery()
  .byType(MemoryType.FACT)
  .byImportance(MemoryImportance.HIGH)
  .byTags(['important'])
  .byDateRange(new Date('2024-01-01'), new Date('2024-12-31'))
  .byTenant('tenant-1')
  .byEmbeddingModel('text-embedding-3-small')
  .orderBy('createdAt', 'desc')
  .limit(50)
  .offset(0);

const results = await storage.search(query);
```

**Query methods (all return `this` for chaining):**

| Method | Description |
|--------|-------------|
| `where(condition)` | Add a raw `QueryCondition` |
| `and(condition)` | Add an AND condition |
| `or(condition)` | Add an OR condition group |
| `byType(type)` | Filter by `MemoryType` |
| `byImportance(importance)` | Filter by `MemoryImportance` |
| `byTags(tags)` | Filter by tags (any match) |
| `byDateRange(start, end)` | Filter by creation date range |
| `byTenant(tenantId)` | Filter by tenant |
| `byEmbeddingModel(model)` | Filter by embedding model name |
| `orderBy(field, direction?)` | Sort by field |
| `limit(count)` | Maximum results |
| `offset(count)` | Pagination offset |
| `execute(storage)` | Execute the query against a storage instance |

### `InMemoryMemoryStorage` (class)

Ephemeral `Map`-backed store. Ideal for development and testing.

```typescript
const store = new InMemoryMemoryStorage();
await store.create(memory);
await store.searchSimilar(vector, { tenantId: 'default', limit: 10 });

store.clear();  // remove all data
store.size();   // current memory count
```

### `PostgresMemoryStorage` (class)

PostgreSQL pgvector adapter for production use.

```typescript
import { PostgresMemoryStorage } from '@reaatech/agent-memory-storage';

const store = new PostgresMemoryStorage({
  host: 'localhost',
  port: 5432,
  database: 'agent_memory',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  schema: 'public',
});

await store.healthCheck();
// { status: 'healthy', timestamp: 2025-01-01T00:00:00.000Z, latencyMs: 2 }
```

#### `PostgresConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `host` | `string` | `'localhost'` | Database host |
| `port` | `number` | `5432` | Database port |
| `database` | `string` | (required) | Database name |
| `user` | `string` | (required) | Database user |
| `password` | `string` | (required) | Database password |
| `schema` | `string` | `'public'` | PostgreSQL schema |

### `matchesMetadataFilter(memory: Memory, filters?: MetadataFilter): boolean`

Utility for checking whether a memory satisfies a set of metadata filters. Used internally by adapters and strategies.

### `SearchOptions`

| Property | Type | Description |
|----------|------|-------------|
| `limit` | `number` | Maximum results to return |
| `tenantId` | `string` | Tenant isolation filter |
| `filters` | `MetadataFilter` | Optional metadata constraints |
| `exact` | `boolean` | Exact vs approximate search |

## Choosing a Store

| Store | Use Case |
|-------|----------|
| `InMemoryMemoryStorage` | Development, testing, single-process prototypes |
| `PostgresMemoryStorage` | Production, persistence, multi-process deployments |

## Related Packages

- [`@reaatech/agent-memory-core`](https://www.npmjs.com/package/@reaatech/agent-memory-core) — Core types (`Memory`, `MemoryType`, `MemoryImportance` etc.)
- [`@reaatech/agent-memory-retrieval`](https://www.npmjs.com/package/@reaatech/agent-memory-retrieval) — Retrieval strategies using `MemoryStorage`
- [`@reaatech/agent-memory`](https://www.npmjs.com/package/@reaatech/agent-memory) — Main facade

## License

[MIT](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
