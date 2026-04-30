# @reaatech/agent-memory-extraction

[![npm version](https://img.shields.io/npm/v/@reaatech/agent-memory-extraction.svg)](https://www.npmjs.com/package/@reaatech/agent-memory-extraction)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/agent-memory/ci.yml?branch=main&label=CI)](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

LLM-based memory extraction from conversations. Analyzes conversation turns to identify memorable facts, preferences, decisions, and corrections — assigning importance scores, types, confidence levels, and generating embeddings for semantic search.

## Installation

```bash
npm install @reaatech/agent-memory-extraction
# or
pnpm add @reaatech/agent-memory-extraction
```

## Feature Overview

- **LLM-powered extraction** — uses structured output to extract memories from conversations
- **Type classification** — categorizes into facts, preferences, decisions, corrections, context, episodic
- **Importance scoring** — assigns critical/high/medium/low/transient based on content analysis
- **Confidence scoring** — each extraction includes a 0–1 confidence estimate
- **Batch processing** — configurable batch size for handling long conversations
- **Automatic embedding generation** — extracts and vectorizes in a single pass

## Quick Start

```typescript
import { MemoryExtractor } from '@reaatech/agent-memory-extraction';
import { MemoryType } from '@reaatech/agent-memory-core';
import { OpenAILLMProvider } from '@reaatech/agent-memory-llm';
import { OpenAIEmbeddingProvider } from '@reaatech/agent-memory-embedding';

const extractor = new MemoryExtractor(
  new OpenAILLMProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
  }),
  new OpenAIEmbeddingProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-3-small',
  }),
  {
    batchSize: 10,
    confidenceThreshold: 0.7,
    enabledTypes: [
      MemoryType.FACT,
      MemoryType.PREFERENCE,
      MemoryType.DECISION,
      MemoryType.CORRECTION,
    ],
    tenantId: 'default',
  },
);

const conversation = [
  { speaker: 'user', content: 'I prefer dark mode interfaces', timestamp: new Date() },
  { speaker: 'agent', content: 'Noted! I will use dark mode.', timestamp: new Date() },
  { speaker: 'user', content: 'I live in Seattle and work as a software engineer', timestamp: new Date() },
];

const result = await extractor.extractFromConversation(conversation);

console.log(`Extracted ${result.candidates.length} memories`);
console.log(`Confidence: ${result.confidence}`);
console.log(`Rejected: ${result.rejected.length}`);
console.log(`Latency: ${result.latencyMs}ms`);
```

## API Reference

### `MemoryExtractor` (class)

The primary extraction engine:

```typescript
const extractor = new MemoryExtractor(
  llmProvider,         // LLMProvider — for structured extraction
  embeddingProvider,   // EmbeddingProvider — for vector generation
  config,              // ExtractionConfig
);
```

| Method | Returns | Description |
|--------|---------|-------------|
| `extractFromConversation(conversation)` | `Promise<ExtractionResult>` | Analyze conversation and extract memories |

### `ExtractionConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `batchSize` | `number` | `10` | Turns to process per extraction call |
| `confidenceThreshold` | `number` | `0.7` | Minimum confidence to accept a candidate |
| `enabledTypes` | `MemoryType[]` | (required) | Which memory types to extract |
| `tenantId` | `string` | `'default'` | Tenant identifier for extracted memories |
| `ownerId` | `string` | `'default'` | Owner identifier for extracted memories |

### `ExtractionResult`

```typescript
interface ExtractionResult {
  candidates: Memory[];         // Memories that passed the confidence threshold
  rejected: MemoryCandidate[];  // Deduplicated or filtered candidates
  confidence: number;           // Overall extraction confidence (0–1)
  latencyMs: number;            // Extraction operation wall time
}
```

### `ConversationTurn` (re-exported from core)

```typescript
import type { ConversationTurn } from '@reaatech/agent-memory-extraction';

interface ConversationTurn {
  speaker: 'user' | 'agent';
  content: string;
  timestamp: Date;
}
```

## How Extraction Works

1. **Chunking** — splits long conversations into batches of `batchSize` turns
2. **LLM analysis** — each batch is sent to the LLM with a structured output schema requesting:
   - Memory content (fact, preference, decision, correction)
   - Type classification
   - Importance level
   - Confidence score
   - Tags and category
3. **Filtering** — candidates below `confidenceThreshold` are moved to `rejected`
4. **Embedding** — accepted candidates are vectorized via the embedding provider
5. **Assembly** — fully formed `Memory` objects with embeddings, timestamps, and metadata

## Usage Patterns

### Extracting Only High-Signal Memories

```typescript
const extractor = new MemoryExtractor(llm, embedder, {
  batchSize: 5,
  confidenceThreshold: 0.85,   // stricter threshold
  enabledTypes: [
    MemoryType.FACT,
    MemoryType.PREFERENCE,
    MemoryType.CORRECTION,      // explicitly capture corrections
  ],
});
```

### Multi-Tenant Extraction

```typescript
const tenantExtractor = new MemoryExtractor(llm, embedder, {
  batchSize: 10,
  confidenceThreshold: 0.7,
  enabledTypes: [MemoryType.FACT, MemoryType.PREFERENCE],
  tenantId: 'tenant-42',
  ownerId: 'user-7',
});
```

## Related Packages

- [`@reaatech/agent-memory-core`](https://www.npmjs.com/package/@reaatech/agent-memory-core) — `Memory`, `MemoryType`, `ConversationTurn`
- [`@reaatech/agent-memory-llm`](https://www.npmjs.com/package/@reaatech/agent-memory-llm) — `LLMProvider` interface
- [`@reaatech/agent-memory-embedding`](https://www.npmjs.com/package/@reaatech/agent-memory-embedding) — `EmbeddingProvider` interface
- [`@reaatech/agent-memory`](https://www.npmjs.com/package/@reaatech/agent-memory) — Main facade that uses extraction + contradiction resolution

## License

[MIT](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
