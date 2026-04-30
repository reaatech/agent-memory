# @reaatech/agent-memory-retrieval

[![npm version](https://img.shields.io/npm/v/@reaatech/agent-memory-retrieval.svg)](https://www.npmjs.com/package/@reaatech/agent-memory-retrieval)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/agent-memory/ci.yml?branch=main&label=CI)](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Semantic memory retrieval with pluggable ranking strategies and context injection for LLM prompts. The retriever combines embedding-based similarity with recency, importance, and topic diversification to surface the most relevant memories.

## Installation

```bash
npm install @reaatech/agent-memory-retrieval
# or
pnpm add @reaatech/agent-memory-retrieval
```

## Feature Overview

- **5 retrieval strategies** — Semantic, Recency, Importance, Topic-based, Adaptive (weighted ensemble)
- **Pluggable strategy system** — implement `RetrievalStrategyBase` for custom ranking
- **Adaptive ensemble** — weighted combination of multiple strategies
- **Context injection** — format retrieved memories for insertion into LLM prompts with token budgeting
- **Metadata filtering** — all strategies support type, importance, tag, and date filters
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import {
  MemoryRetriever,
  ContextInjector,
  RetrievalStrategy,
} from '@reaatech/agent-memory-retrieval';
import { InMemoryMemoryStorage } from '@reaatech/agent-memory-storage';
import { OpenAIEmbeddingProvider } from '@reaatech/agent-memory-embedding';

const storage = new InMemoryMemoryStorage();
const embedder = new OpenAIEmbeddingProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small',
});

const retriever = new MemoryRetriever(storage, embedder, {
  defaultLimit: 5,
  useCrossEncoder: false,
  diversityFactor: 0.3,
  strategies: [RetrievalStrategy.SEMANTIC, RetrievalStrategy.RECENCY],
});

// Retrieve relevant memories
const memories = await retriever.retrieve('What does the user like?', {
  limit: 5,
  tenantId: 'default',
  filters: { types: ['preference'] },
});

// Inject into LLM context
const injector = new ContextInjector();
const prompt = await injector.injectMemoriesIntoContext(
  conversationTurns,
  memories,
  4000,  // token budget
);
```

## API Reference

### `MemoryRetriever` (class)

Central retrieval orchestrator:

```typescript
const retriever = new MemoryRetriever(
  storage,
  embeddingProvider,
  config,
  strategyOverrides?,  // optional custom strategy instances
);
```

| Method | Returns | Description |
|--------|---------|-------------|
| `retrieve(context, options?)` | `Promise<Memory[]>` | Query for relevant memories |

### `RetrievalConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `defaultLimit` | `number` | `5` | Default result count |
| `useCrossEncoder` | `boolean` | `false` | Enable cross-encoder re-ranking |
| `diversityFactor` | `number` | `0.3` | 0–1, how much to penalize duplicates |
| `strategies` | `RetrievalStrategy[]` | `[SEMANTIC]` | Active strategies in execution order |

### `RetrievalOptions`

| Property | Type | Description |
|----------|------|-------------|
| `limit` | `number` | Max results |
| `filters` | `MetadataFilter` | Type, importance, tag, date constraints |
| `tenantId` | `string` | Tenant isolation |
| `useCrossEncoder` | `boolean` | Per-query override |
| `diversityFactor` | `number` | Per-query override |
| `strategy` | `RetrievalStrategy` | Force a single strategy |

### `RetrievalStrategy` (enum)

```typescript
enum RetrievalStrategy {
  SEMANTIC = 'semantic',
  RECENCY = 'recency',
  IMPORTANCE = 'importance',
  TOPIC = 'topic',
  ADAPTIVE = 'adaptive',
}
```

### Strategy Implementations

#### `SemanticRetrievalStrategy`

Embeds the query, searches by cosine similarity, returns top matches.

#### `RecencyRetrievalStrategy`

Ranks by `createdAt` (newest first), optionally combined with semantic scoring.

#### `ImportanceRetrievalStrategy`

Ranks by importance level (`CRITICAL` > `HIGH` > `MEDIUM` > `LOW` > `TRANSIENT`).

#### `TopicBasedRetrievalStrategy`

Groups results by category/tags to ensure diverse topic coverage.

#### `AdaptiveRetrievalStrategy`

Weighted ensemble of multiple strategies:

```typescript
const adaptive = new AdaptiveRetrievalStrategy([
  { strategy: new SemanticRetrievalStrategy(), weight: 0.5 },
  { strategy: new RecencyRetrievalStrategy(), weight: 0.3 },
  { strategy: new ImportanceRetrievalStrategy(), weight: 0.2 },
]);

const retriever = new MemoryRetriever(storage, embedder, config, {
  [RetrievalStrategy.ADAPTIVE]: adaptive,
});
```

### `ContextInjector` (class)

Formats retrieved memories for insertion into LLM prompts:

```typescript
const injector = new ContextInjector(
  100000,  // max tokens (default: 100000)
  4,       // chars per token estimate (default: 4)
);

const prompt = await injector.injectMemoriesIntoContext(
  conversationTurns,
  memories,
  4000,  // optional: per-call token budget
);
```

Output format:

```
<relevant_memories>
The following information has been retrieved from long-term memory:

[FACT] User lives in Seattle (Confidence: 95%, Date: 12/15/2024)
[PREFERENCE] User prefers dark mode (Confidence: 90%, Date: 12/15/2024)
[FACT] User is a software engineer (Confidence: 85%, Date: 12/14/2024)

Note: Memories are labeled with their type and confidence level.
</relevant_memories>
```

### Custom Strategies

Implement `RetrievalStrategyBase`:

```typescript
import type {
  RetrievalStrategyBase,
  RetrievalOptions,
} from '@reaatech/agent-memory-retrieval';
import type { Memory } from '@reaatech/agent-memory-core';
import type { MemoryStorage } from '@reaatech/agent-memory-storage';
import type { EmbeddingProvider } from '@reaatech/agent-memory-embedding';

class MyStrategy implements RetrievalStrategyBase {
  async retrieve(
    context: string,
    options: RetrievalOptions,
    storage: MemoryStorage,
    embeddingProvider: EmbeddingProvider,
  ): Promise<Memory[]> {
    // Custom ranking logic
    const candidates = await storage.searchSimilar(
      await embeddingProvider.embed(context),
      { tenantId: options.tenantId ?? 'default', limit: 100 },
    );
    return candidates.filter((m) => m.confidence > 0.8);
  }
}
```

## Related Packages

- [`@reaatech/agent-memory-core`](https://www.npmjs.com/package/@reaatech/agent-memory-core) — `Memory`, `ConversationTurn` types
- [`@reaatech/agent-memory-storage`](https://www.npmjs.com/package/@reaatech/agent-memory-storage) — `MemoryStorage`, `MetadataFilter`
- [`@reaatech/agent-memory-embedding`](https://www.npmjs.com/package/@reaatech/agent-memory-embedding) — `EmbeddingProvider`
- [`@reaatech/agent-memory`](https://www.npmjs.com/package/@reaatech/agent-memory) — Main facade

## License

[MIT](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
