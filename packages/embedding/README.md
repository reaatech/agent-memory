# @reaatech/agent-memory-embedding

[![npm version](https://img.shields.io/npm/v/@reaatech/agent-memory-embedding.svg)](https://www.npmjs.com/package/@reaatech/agent-memory-embedding)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/agent-memory/ci.yml?branch=main&label=CI)](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Embedding provider abstraction for semantic memory search. Ships with OpenAI, Cohere, and HuggingFace adapters, plus an in-memory caching layer with TTL support.

## Installation

```bash
npm install @reaatech/agent-memory-embedding
# or
pnpm add @reaatech/agent-memory-embedding
```

## Feature Overview

- **3 embedding providers** — OpenAI (`text-embedding-3-small`, `text-embedding-3-large`), Cohere, HuggingFace Inference API
- **Pluggable caching** — `InMemoryEmbeddingCache` with configurable max size and TTL
- **Cached provider wrapper** — `CachedEmbeddingProvider` decorates any provider with transparent caching
- **Batch embedding** — `embedBatch()` for efficiently vectorizing multiple texts
- **Implements shared interface** — all providers conform to `EmbeddingProvider`
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import {
  OpenAIEmbeddingProvider,
  CachedEmbeddingProvider,
  InMemoryEmbeddingCache,
} from '@reaatech/agent-memory-embedding';

// Base provider
const base = new OpenAIEmbeddingProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small',
  dimensions: 1536,
});

// Wrap with caching (recommended)
const embedder = new CachedEmbeddingProvider(
  base,
  new InMemoryEmbeddingCache({ maxSize: 1000, ttlMs: 60000 }),
);

// Single text embedding
const vector = await embedder.embed('What does the user like?');

// Batch embedding
const vectors = await embedder.embedBatch([
  'User prefers dark mode',
  'User lives in Seattle',
  'User is a software engineer',
]);
```

## API Reference

### `EmbeddingProvider` Interface

The contract all providers implement:

```typescript
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getModelInfo(): ModelInfo;
}
```

### `ModelInfo`

```typescript
interface ModelInfo {
  name: string;
  dimensions: number;
  maxInputLength: number;
}
```

### `OpenAIEmbeddingProvider` (class)

```typescript
const provider = new OpenAIEmbeddingProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small',
  dimensions: 1536,            // optional — max 3072 for large model
  baseUrl: 'https://api.openai.com/v1',  // optional
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | (required) | OpenAI API key |
| `model` | `string` | (required) | Model name |
| `dimensions` | `number` | (model default) | Output vector dimensions |
| `baseUrl` | `string` | `https://api.openai.com/v1` | Custom API endpoint |

### `CohereEmbeddingProvider` (class)

```typescript
const provider = new CohereEmbeddingProvider({
  apiKey: process.env.COHERE_API_KEY,
  model: 'embed-english-v3.0',
  dimensions: 1024,
});
```

### `HuggingFaceEmbeddingProvider` (class)

```typescript
const provider = new HuggingFaceEmbeddingProvider({
  apiKey: process.env.HF_API_KEY,
  model: 'sentence-transformers/all-MiniLM-L6-v2',
});
```

### `EmbeddingCache` Interface

```typescript
interface EmbeddingCache {
  get(key: string): Promise<number[] | null>;
  set(key: string, vector: number[]): Promise<void>;
}
```

### `InMemoryEmbeddingCache` (class)

LRU cache with TTL eviction:

```typescript
const cache = new InMemoryEmbeddingCache({
  maxSize: 1000,   // max entries (default: 1000)
  ttlMs: 60000,    // entry TTL in ms (default: 5 min)
});

cache.set('text-to-cache', [0.1, 0.2, 0.3]);
const vector = await cache.get('text-to-cache');

cache.clear();     // remove all entries
cache.size();      // current entry count
```

### `CachedEmbeddingProvider` (class)

Decorates any `EmbeddingProvider` with caching:

```typescript
const cached = new CachedEmbeddingProvider(
  baseProvider,
  new InMemoryEmbeddingCache(),
);

// First call hits the API; subsequent calls return cached
const v1 = await cached.embed('User prefers dark mode');
const v2 = await cached.embed('User prefers dark mode'); // cached
```

## Usage Patterns

### Cohere Provider

```typescript
import { CohereEmbeddingProvider } from '@reaatech/agent-memory-embedding';

const cohere = new CohereEmbeddingProvider({
  apiKey: process.env.COHERE_API_KEY,
  model: 'embed-english-v3.0',
});

const vector = await cohere.embed('User prefers dark mode');
```

### HuggingFace Inference API

```typescript
import { HuggingFaceEmbeddingProvider } from '@reaatech/agent-memory-embedding';

const hf = new HuggingFaceEmbeddingProvider({
  apiKey: process.env.HF_API_KEY,
  model: 'BAAI/bge-small-en-v1.5',
});

const vectors = await hf.embedBatch([
  'User prefers dark mode',
  'User lives in Seattle',
]);
```

## Related Packages

- [`@reaatech/agent-memory-core`](https://www.npmjs.com/package/@reaatech/agent-memory-core) — Core types including `EmbeddingMetadata`
- [`@reaatech/agent-memory-retrieval`](https://www.npmjs.com/package/@reaatech/agent-memory-retrieval) — Uses embedding providers for semantic search
- [`@reaatech/agent-memory`](https://www.npmjs.com/package/@reaatech/agent-memory) — Main facade

## License

[MIT](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
