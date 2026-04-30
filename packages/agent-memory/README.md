# @reaatech/agent-memory

[![npm version](https://img.shields.io/npm/v/@reaatech/agent-memory.svg)](https://www.npmjs.com/package/@reaatech/agent-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/agent-memory/ci.yml?branch=main&label=CI)](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Long-term memory layer for AI agents. The `@reaatech/agent-memory` package is the main facade that wires together all component packages — extraction, storage, retrieval, policies, events, embedding, and LLM — into a single, batteries-included entry point.

## Installation

```bash
npm install @reaatech/agent-memory
# or
pnpm add @reaatech/agent-memory
```

## Feature Overview

- **LLM-powered extraction** — automatically identify facts, preferences, and decisions from conversations
- **Semantic search** — find relevant memories using embedding-based similarity
- **Configurable storage** — swap between in-memory (dev/test) and PostgreSQL pgvector (production)
- **Lifecycle management** — automatic decay, forgetting, and contradiction resolution
- **Event hooks** — subscribe to memory lifecycle events for audit logging and metrics
- **Multi-provider embedding** — OpenAI, Cohere, HuggingFace with transparent caching
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import {
  AgentMemory,
  OpenAILLMProvider,
  MemoryType,
} from '@reaatech/agent-memory';

const memory = new AgentMemory({
  // Storage: 'memory' (ephemeral) or 'postgres' (persistent)
  storage: { provider: 'memory' },

  // Embedding provider for semantic search
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY,
  },

  // LLM for memory extraction
  extraction: {
    llmProvider: new OpenAILLMProvider({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
    }),
    enabledTypes: [
      MemoryType.FACT,
      MemoryType.PREFERENCE,
      MemoryType.CORRECTION,
    ],
    batchSize: 10,
    confidenceThreshold: 0.7,
  },
});

// Extract and store memories from a conversation
const conversation = [
  { speaker: 'user', content: 'I prefer dark mode', timestamp: new Date() },
  { speaker: 'agent', content: 'Got it!', timestamp: new Date() },
  { speaker: 'user', content: 'I live in Seattle', timestamp: new Date() },
];

const stored = await memory.extractAndStore(conversation);
console.log(`Stored ${stored.length} memories`);

// Retrieve relevant memories
const relevant = await memory.retrieve('Where does the user live?', {
  limit: 5,
});
console.log(relevant.map((m) => m.content));

// Run maintenance (decay + forgetting policies)
await memory.runMaintenance();

// Subscribe to events
memory.events.on('memory:stored', (event) => {
  console.log('Memory stored:', event.payload);
});

// Cleanup
await memory.close();
```

## API Reference

### `AgentMemory` (class)

The main facade class:

```typescript
class AgentMemory {
  constructor(config: AgentMemoryConfig);

  // Core operations
  extractAndStore(conversation: ConversationTurn[]): Promise<Memory[]>;
  retrieve(context: string, options?: Partial<RetrievalOptions>): Promise<Memory[]>;
  runMaintenance(tenantId?: string): Promise<void>;

  // Accessors
  getStorage(): MemoryStorage;
  readonly events: MemoryEventBus;

  // Lifecycle
  close(): Promise<void>;
}
```

### `AgentMemoryConfig`

| Property | Type | Description |
|----------|------|-------------|
| `storage` | `MemoryStorage \| StorageConfig` | Storage backend instance or config |
| `embedding` | `EmbeddingProvider \| EmbeddingConfig` | Embedding provider instance or config |
| `extraction` | `ExtractionConfig & { llmProvider, enabledTypes }` | Extraction configuration |
| `tenantId` | `string` | Tenant identifier (default: `'default'`) |
| `ownerId` | `string` | Owner identifier (default: `'default'`) |
| `retrieval` | `Partial<RetrievalConfig>` | Retrieval tuning (optional) |
| `policies` | `{ decay?, forgetting?, contradiction?, rules? }` | Policy configuration (optional) |
| `events` | `MemoryEventBus` | Custom event bus (default: `InMemoryEventBus`) |
| `embeddingCache` | `EmbeddingCache` | Custom embedding cache (default: `InMemoryEmbeddingCache`) |

### `StorageConfig`

```typescript
type StorageConfig =
  | { provider: 'memory' }
  | { provider: 'postgres'; connection: PostgresConfig };
```

### `EmbeddingConfig`

```typescript
type EmbeddingConfig =
  | { provider: 'openai'; model: string; apiKey: string; dimensions?: number; baseUrl?: string }
  | { provider: 'cohere'; model: string; apiKey: string; dimensions?: number }
  | { provider: 'huggingface'; model: string; apiKey: string };
```

## Package Architecture

`@reaatech/agent-memory` is the facade for 8 specialized packages:

| Package | Description |
|---------|-------------|
| [`@reaatech/agent-memory-core`](https://www.npmjs.com/package/@reaatech/agent-memory-core) | Core types, enums, and utilities |
| [`@reaatech/agent-memory-storage`](https://www.npmjs.com/package/@reaatech/agent-memory-storage) | Storage abstraction (In-Memory, PostgreSQL pgvector) |
| [`@reaatech/agent-memory-embedding`](https://www.npmjs.com/package/@reaatech/agent-memory-embedding) | Embedding providers (OpenAI, Cohere, HuggingFace) |
| [`@reaatech/agent-memory-llm`](https://www.npmjs.com/package/@reaatech/agent-memory-llm) | LLM provider abstraction |
| [`@reaatech/agent-memory-retrieval`](https://www.npmjs.com/package/@reaatech/agent-memory-retrieval) | Semantic retrieval with ranking strategies |
| [`@reaatech/agent-memory-policies`](https://www.npmjs.com/package/@reaatech/agent-memory-policies) | Decay, forgetting, and contradiction resolution |
| [`@reaatech/agent-memory-extraction`](https://www.npmjs.com/package/@reaatech/agent-memory-extraction) | LLM-based memory extraction |
| [`@reaatech/agent-memory-events`](https://www.npmjs.com/package/@reaatech/agent-memory-events) | Event bus for lifecycle hooks |

## Advanced Usage

### PostgreSQL Storage

```typescript
const memory = new AgentMemory({
  storage: {
    provider: 'postgres',
    connection: {
      host: 'localhost',
      database: 'agent_memory',
      user: 'postgres',
      password: process.env.DB_PASSWORD,
    },
  },
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY,
  },
  extraction: {
    llmProvider: new OpenAILLMProvider({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
    }),
    enabledTypes: [MemoryType.FACT, MemoryType.PREFERENCE],
    batchSize: 10,
    confidenceThreshold: 0.7,
  },
});
```

### Custom Policy Rules

```typescript
const memory = new AgentMemory({
  // ... base config
  policies: {
    rules: [
      {
        id: 'never-forget-medical',
        priority: 100,
        condition: { type: 'tag_matches', pattern: 'medical:*' },
        action: { type: 'freeze_decay' },
        override: true,
      },
      {
        id: 'archive-old-transient',
        priority: 50,
        condition: { type: 'importance_equals', value: 'transient' },
        action: { type: 'forget_after', days: 7 },
      },
    ],
  },
});
```

### Event Hooks for Observability

```typescript
import { AgentMemory } from '@reaatech/agent-memory';
import { Counter, Histogram } from 'prom-client';

const materializedCount = new Counter({
  name: 'agent_memory_stored_total',
  help: 'Total stored memories',
  labelNames: ['tenant', 'type'],
});

const retrieveLatency = new Histogram({
  name: 'agent_memory_retrieve_duration_ms',
  help: 'Retrieval latency',
});

const memory = new AgentMemory({
  // ... config
  events: bus,
});

memory.events.on('memory:stored', (event) => {
  materializedCount.inc({
    tenant: event.tenantId,
    type: event.payload.memory.type,
  });
});

memory.events.on('memory:retrieved', (event) => {
  retrieveLatency.observe(Date.now() - event.timestamp.getTime());
});
```

## License

[MIT](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
