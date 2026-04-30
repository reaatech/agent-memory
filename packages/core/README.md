# @reaatech/agent-memory-core

[![npm version](https://img.shields.io/npm/v/@reaatech/agent-memory-core.svg)](https://www.npmjs.com/package/@reaatech/agent-memory-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/agent-memory/ci.yml?branch=main&label=CI)](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Canonical TypeScript types, enums, and utilities for the agent-memory system. This package is the single source of truth for the `Memory` data structure, lifecycle states, importance levels, contradiction strategies, and shared helpers used throughout the `@reaatech/agent-memory-*` ecosystem.

## Installation

```bash
npm install @reaatech/agent-memory-core
# or
pnpm add @reaatech/agent-memory-core
```

## Feature Overview

- **5 enums, 6 interfaces** — every domain concept has a first-class type
- **Retry with backoff** — exponential backoff with jitter for transient failures
- **Cosine similarity** — vector comparison for semantic search
- **Fetch with timeout** — `AbortController`-based HTTP helper
- **Pluggable logging** — `Logger` interface with default console implementation
- **Zero runtime dependencies** — lightweight and tree-shakeable
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import {
  Memory,
  MemoryType,
  MemoryImportance,
  MemorySource,
  MemoryLifecycle,
  cosineSimilarity,
  withRetry,
} from '@reaatech/agent-memory-core';

const memory: Memory = {
  id: 'abc-123',
  tenantId: 'default',
  ownerId: 'user-1',
  content: 'User prefers dark mode',
  type: MemoryType.PREFERENCE,
  category: 'ui',
  source: MemorySource.USER_STATEMENT,
  importance: MemoryImportance.HIGH,
  confidence: 0.95,
  tags: ['ui', 'preference'],
  lifecycle: MemoryLifecycle.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastAccessedAt: new Date(),
  embeddings: {
    vector: [0.1, 0.2, 0.3],
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
  version: 1,
  history: [],
};

const similarity = cosineSimilarity([0.1, 0.2], [0.3, 0.4]);

const result = await withRetry(async () => {
  const response = await fetch('https://api.example.com/data');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
});
```

## API Reference

### Domain Enums

| Enum | Values |
|------|--------|
| `MemoryType` | `FACT`, `PREFERENCE`, `DECISION`, `CORRECTION`, `CONTEXT`, `EPISODIC` |
| `MemoryImportance` | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `TRANSIENT` |
| `MemorySource` | `USER_STATEMENT`, `AGENT_INFERENCE`, `SYSTEM_EVENT` |
| `MemoryLifecycle` | `ACTIVE`, `ARCHIVED`, `PENDING_REVIEW`, `FORGOTTEN` |
| `ContradictionStrategy` | `NEWEST_WINS`, `OLDEST_WINS`, `HIGHEST_CONFIDENCE`, `MANUAL_REVIEW` |

### Core Interfaces

| Interface | Description |
|-----------|-------------|
| `Memory` | The central data structure — 21 fields covering identity, content, metadata, lifecycle, embeddings, and relationships |
| `MemoryCandidate` | A proposed memory before full processing and storage |
| `MemoryVersion` | A single entry in the memory audit trail |
| `EmbeddingMetadata` | Vector metadata: `model`, `dimensions`, `vector` |
| `ConversationTurn` | A single message in a conversation: `speaker`, `content`, `timestamp` |
| `HealthStatus` | Reported by adapters: `status`, `timestamp`, `latencyMs?`, `error?` |

### Type Aliases

| Type | Definition |
|------|------------|
| `MemoryId` | `string` (UUID v4) |
| `TenantId` | `string` |
| `OwnerId` | `string` |

### Functions

#### `cosineSimilarity(a: number[], b: number[]): number`

Computes the cosine similarity between two dense vectors. Returns a value between -1 and 1.

```typescript
const score = cosineSimilarity(queryVector, memoryVector);
// 0.87 — highly similar; -0.1 — unrelated
```

#### `withRetry<T>(fn: () => Promise<T>, config?: RetryConfig): Promise<T>`

Retries a function with exponential backoff and jitter on failure.

```typescript
const data = await withRetry(
  () => fetchData(),
  { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 5000 },
);
```

#### `RetryConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxAttempts` | `number` | `3` | Maximum retry attempts |
| `baseDelayMs` | `number` | `1000` | Initial delay in milliseconds |
| `maxDelayMs` | `number` | `30000` | Maximum delay cap |
| `shouldRetry` | `(error: Error) => boolean` | `() => true` | Condition for retrying |

#### `fetchWithTimeout(url: string, init?: RequestInit, timeoutMs?: number): Promise<Response>`

Wraps `fetch` with an `AbortController` timeout. Handles racing signals if the caller supplies its own.

```typescript
const res = await fetchWithTimeout('https://api.example.com', {}, 5000);
```

#### `setLogger(logger: Logger): void` / `getLogger(): Logger`

Pluggable logging. Set a custom logger (Pino, Winston, etc.) via `setLogger`. Defaults to `console`.

```typescript
import { setLogger, getLogger, type Logger } from '@reaatech/agent-memory-core';
import pino from 'pino';

const logger: Logger = pino({ name: 'agent-memory' });
setLogger(logger);

const log = getLogger();
log.info('Memory system initialized');
```

## Related Packages

- [`@reaatech/agent-memory-storage`](https://www.npmjs.com/package/@reaatech/agent-memory-storage) — Storage abstraction with In-Memory and PostgreSQL adapters
- [`@reaatech/agent-memory`](https://www.npmjs.com/package/@reaatech/agent-memory) — Main facade wiring all packages together

## License

[MIT](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
