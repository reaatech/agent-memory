# agent-memory

Long-term memory layer for AI agents. Sessions give you multi-turn. This gives you multi-session.

[![CI](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@reaatech/agent-memory?color=cb3837&logo=npm)](https://www.npmjs.com/package/@reaatech/agent-memory)

## Why agent-memory?

Most agent memory libraries are vector search with no curation — they store everything, forget nothing, and silently contradict themselves. **agent-memory** answers the hard questions:

- **What to remember?** — An LLM-powered extraction engine identifies facts, preferences, decisions, and corrections from conversation, scoring each on importance and confidence.
- **What to forget?** — A pluggable decay engine and forgetting policy ensure memory stays relevant and bounded. Non-critical memories decay over time; frequently accessed memories are boosted.
- **How to handle contradictions?** — When a new fact conflicts with stored memory, a resolution engine decides which wins (newest, highest confidence, manual review, or custom rules), producing auditable decisions.

## Project Status

**v0.1.0** — Early release focused on the PostgreSQL + OpenAI stack. Core extraction, storage, retrieval, policies, and events are implemented and tested.

See [CHANGELOG.md](./CHANGELOG.md) for release details and the project roadmap.

## Features

| Module | Capabilities |
|--------|-------------|
| **Memory Extraction** | LLM-based extraction of facts, preferences, decisions, corrections, context, and episodic memories with confidence scoring |
| **Storage Adapters** | In-memory (tests/dev), PostgreSQL + pgvector (production). Qdrant and Pinecone planned |
| **Embedding Providers** | OpenAI, Cohere, HuggingFace Inference API. LRU caching layer included |
| **Semantic Retrieval** | Vector search with hybrid metadata filtering, five retrieval strategies (semantic, recency, importance, topic, adaptive) |
| **Context Injection** | Formats retrieved memories for LLM prompts with token budget management |
| **Policy Engine** | Pluggable rules for decay, forgetting, and contradiction resolution |
| **Event System** | Subscribe to memory lifecycle events (extracted, stored, retrieved, forgotten, contradiction resolved) |
| **Multi-tenancy** | Tenant-isolated memory spaces with per-tenant lifecycle management |
| **Type Safety** | Strict TypeScript — no `any` types in the public API |

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 8
- For PostgreSQL adapter: **pgvector** (see [docker-compose.yml](./docker-compose.yml))

## Installation

```bash
pnpm add @reaatech/agent-memory
```

## Quick Start

### In-memory adapter (for testing and demos)

```typescript
import { AgentMemory, OpenAILLMProvider, MemoryType } from '@reaatech/agent-memory';

const openai = new OpenAILLMProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
});

const memory = new AgentMemory({
  storage: { provider: 'memory' },
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY!,
  },
  extraction: {
    llmProvider: openai,
    enabledTypes: [MemoryType.FACT, MemoryType.PREFERENCE, MemoryType.CORRECTION],
    batchSize: 10,
    confidenceThreshold: 0.7,
  },
});

// After a conversation turn, extract and store memories
const stored = await memory.extractAndStore(conversationTurns);

// Before generating a response, retrieve relevant context
const relevant = await memory.retrieve('Where does the user live?', { limit: 5 });
```

### PostgreSQL adapter (for production)

Start pgvector:

```bash
docker compose up -d
```

```typescript
import { AgentMemory, OpenAILLMProvider } from '@reaatech/agent-memory';

const openai = new OpenAILLMProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
});

const memory = new AgentMemory({
  storage: {
    provider: 'postgres',
    connection: {
      host: 'localhost',
      database: 'agent_memory',
      user: 'postgres',
      password: process.env.DB_PASSWORD!,
    },
  },
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY!,
  },
  extraction: {
    llmProvider: openai,
    enabledTypes: ['fact', 'preference', 'correction'],
    batchSize: 10,
    confidenceThreshold: 0.7,
  },
});
```

## Configuration

### Storage backends

| Provider | Use case |
|----------|----------|
| `memory` | Testing, demos, lightweight deployments (no persistence) |
| `postgres` | Production (requires pgvector extension) |

```typescript
// Shorthand
storage: { provider: 'memory' }

// PostgreSQL with full config
storage: {
  provider: 'postgres',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'agent_memory',
    user: 'postgres',
    password: process.env.DB_PASSWORD!,
    schema: 'public',
  },
}

// Or pass a pre-configured adapter instance
storage: new PostgresMemoryStorage({ host: 'localhost', database: 'agent_memory', user: 'postgres', password: process.env.DB_PASSWORD! })
```

### Embedding providers

| Provider | Models |
|----------|--------|
| `openai` | `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002` |
| `cohere` | Cohere embed models via API |
| `huggingface` | HuggingFace Inference API (self-hosted or cloud) |

Embedding results are cached by default using an in-memory LRU cache.

### Policy Engine

```typescript
const memory = new AgentMemory({
  // ... storage, embedding, extraction
  policies: {
    decay: {
      halfLifeDays: { critical: 3650, high: 365, medium: 90, low: 30, transient: 7 },
    },
    forgetting: {
      forgetThreshold: 0.1,    // Decay score below which memories are forgotten
      capacityLimit: 10000,    // Max active memories per tenant
      archiveBeforeDelete: true,
    },
    contradiction: {
      defaultStrategy: 'highest_confidence',
      similarityThreshold: 0.8,
      autoResolve: true,
    },
    rules: [
      // Custom domain-specific policies
      { id: 'medical-critical', priority: 100, condition: { type: 'tag_matches', pattern: 'medical:*' }, action: { type: 'freeze_decay' } },
    ],
  },
});
```

### Retention Strategies

```typescript
const memory = new AgentMemory({
  // ...
  retrieval: {
    defaultLimit: 5,
    useCrossEncoder: false,     // Cross-encoder re-ranking (planned)
    diversityFactor: 0.3,       // 0 = no diversity, 1 = max diversity
    strategies: ['semantic'],   // semantic | recency | importance | topic | adaptive
  },
});
```

### Maintenance

Run periodic maintenance to apply decay and forgetting policies:

```typescript
// Typically invoked by a cron job or scheduler (e.g., daily)
await memory.runMaintenance();
```

### Events

```typescript
memory.events.on('memory:contradiction:resolved', async (event) => {
  await auditLog.record({
    tenantId: event.tenantId,
    decision: event.payload.decision,
    reason: event.payload.reason,
  });
});
```

## Architecture

```
 ┌──────────────────────────────────────────────────────┐
 │                 Application / Agent                   │
 └──────────────────────────────────────────────────────┘
                           │
                           ▼
 ┌──────────────────────────────────────────────────────┐
 │               AgentMemory (Facade)                     │
 │  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
 │  │  Extractor │  │  Retriever │  │ Policy Engine  │  │
 │  │ (LLM-based)│  │  (Hybrid)  │  │ (Decay/Forget/  │  │
 │  │            │  │            │  │  Contradict)    │  │
 │  └────────────┘  └────────────┘  └────────────────┘  │
 └──────────────────────────────────────────────────────┘
                           │
                           ▼
 ┌──────────────────────────────────────────────────────┐
 │               Storage Abstraction                     │
 │    ┌────────────────────────────────────────────┐     │
 │    │            MemoryStorage Interface           │     │
 │    │    create / read / update / delete / search  │     │
 │    └────────────────────────────────────────────┘     │
 │         │                           │                │
 │         ▼                           ▼                │
 │  ┌──────────────┐          ┌──────────────────┐      │
 │  │  In-Memory   │          │  PostgreSQL       │      │
 │  │  (tests/dev) │          │  + pgvector       │      │
 │  └──────────────┘          └──────────────────┘      │
 └──────────────────────────────────────────────────────┘
```

## Development

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Build
pnpm run build

# Run tests
pnpm run test

# Run tests with coverage
pnpm run test:coverage

# Lint and format
pnpm run lint
pnpm run format
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design, data models, and component interactions
- [AGENTS.md](./AGENTS.md) — AI agent development guidelines
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution guidelines
- [CHANGELOG.md](./CHANGELOG.md) — Release history
- [SECURITY.md](./SECURITY.md) — Security policy

## Roadmap

- Qdrant and Pinecone storage adapters
- Cross-encoder re-ranking for retrieval
- Encryption at rest for sensitive memories
- Memory consolidation and summarization
- Metrics and health check endpoints
- Graph-based memory relationships

## License

MIT © [reaatech](https://github.com/reaatech)
