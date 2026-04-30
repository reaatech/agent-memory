# agent-memory

[![CI](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)

> Long-term memory layer for AI agents. Sessions give you multi-turn. This gives you multi-session.

Most agent memory libraries are vector search with no curation — they store everything, forget nothing, and silently contradict themselves. **agent-memory** treats memory as a managed asset with an explicit lifecycle: extraction, decay, forgetting, and contradiction resolution.

## Installation

Packages are published under the `@reaatech` scope and can be installed individually:

```bash
# Main facade — batteries-included entry point
pnpm add @reaatech/agent-memory

# Individual packages for tree-shaking and direct use
pnpm add @reaatech/agent-memory-core
pnpm add @reaatech/agent-memory-storage
pnpm add @reaatech/agent-memory-embedding
pnpm add @reaatech/agent-memory-llm
pnpm add @reaatech/agent-memory-retrieval
pnpm add @reaatech/agent-memory-policies
pnpm add @reaatech/agent-memory-extraction
pnpm add @reaatech/agent-memory-events
```

## Quick Start

```typescript
import { AgentMemory, OpenAILLMProvider, MemoryType } from '@reaatech/agent-memory';

const memory = new AgentMemory({
  storage: { provider: 'memory' },
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
    enabledTypes: [MemoryType.FACT, MemoryType.PREFERENCE, MemoryType.CORRECTION],
    batchSize: 10,
    confidenceThreshold: 0.7,
  },
});

// Extract and store memories from a conversation
const stored = await memory.extractAndStore(conversationTurns);

// Retrieve relevant memories for a query
const relevant = await memory.retrieve('Where does the user live?', { limit: 5 });

// Run maintenance — applies decay and forgetting policies
await memory.runMaintenance();
```

See the [`examples/`](./examples/) directory for working samples.

## Packages

| Package | Description |
| ------- | ----------- |
| [`@reaatech/agent-memory`](./packages/agent-memory) | Main facade wiring all packages together |
| [`@reaatech/agent-memory-core`](./packages/core) | Core types, enums, and utilities |
| [`@reaatech/agent-memory-storage`](./packages/storage) | Storage abstraction (In-Memory, PostgreSQL pgvector) |
| [`@reaatech/agent-memory-embedding`](./packages/embedding) | Embedding providers (OpenAI, Cohere, HuggingFace) |
| [`@reaatech/agent-memory-llm`](./packages/llm) | LLM provider abstraction |
| [`@reaatech/agent-memory-retrieval`](./packages/retrieval) | Semantic retrieval with ranking strategies |
| [`@reaatech/agent-memory-policies`](./packages/policies) | Decay, forgetting, and contradiction resolution |
| [`@reaatech/agent-memory-extraction`](./packages/extraction) | LLM-based memory extraction from conversations |
| [`@reaatech/agent-memory-events`](./packages/events) | Event bus for memory lifecycle hooks |

## Features

- **LLM-powered extraction** — Identifies facts, preferences, decisions, and corrections from conversations with confidence scoring
- **Semantic retrieval** — Vector search with hybrid metadata filtering and five retrieval strategies (semantic, recency, importance, topic, adaptive)
- **Lifecycle management** — Exponential decay with configurable half-lives, automatic forgetting with capacity limits, and four contradiction resolution strategies
- **Pluggable storage** — In-memory adapter (dev/test) and PostgreSQL pgvector adapter (production)
- **Multi-provider embedding** — OpenAI, Cohere, and HuggingFace with transparent LRU caching
- **Event hooks** — Subscribe to memory lifecycle events for audit logging and metrics
- **Multi-tenancy** — Tenant-isolated memory spaces with per-tenant lifecycle management
- **Custom policy rules** — Define domain-specific retention rules (e.g., "medical preferences never decay")

## Contributing

```bash
# Clone the repository
git clone https://github.com/reaatech/agent-memory.git
cd agent-memory

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the test suite
pnpm test

# Lint and typecheck
pnpm lint
pnpm typecheck
```

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System design, data models, and component interactions
- [`AGENTS.md`](./AGENTS.md) — AI agent development guidelines and skills system
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Contribution workflow and release process
- [`SECURITY.md`](./SECURITY.md) — Security policy

## License

[MIT](LICENSE)
