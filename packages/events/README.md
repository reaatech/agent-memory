# @reaatech/agent-memory-events

[![npm version](https://img.shields.io/npm/v/@reaatech/agent-memory-events.svg)](https://www.npmjs.com/package/@reaatech/agent-memory-events)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/agent-memory/ci.yml?branch=main&label=CI)](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Event bus and event types for agent-memory lifecycle hooks. Publish and subscribe to memory creation, retrieval, contradiction, decay, and forgetting events — enabling audit logging, metrics collection, and custom side-effects without modifying core code.

## Installation

```bash
npm install @reaatech/agent-memory-events
# or
pnpm add @reaatech/agent-memory-events
```

## Feature Overview

- **9 lifecycle event types** — extracted, stored, retrieved, contradiction detected/resolved/pending, decayed, forgotten, consolidated
- **In-memory event bus** — zero-dependency implementation suitable for single-process use
- **Typed payloads** — each event carries its `tenantId`, `timestamp`, and structured payload
- **Pluggable interface** — swap in Redis, Kafka, or any pub/sub by implementing `MemoryEventBus`

## Quick Start

```typescript
import { InMemoryEventBus } from '@reaatech/agent-memory-events';

const events = new InMemoryEventBus();

// Subscribe to memory storage events
events.on('memory:stored', (event) => {
  console.log(`Memory ${event.payload.memory.id} stored`);
  // Forward to audit log, increment Prometheus counter, etc.
});

// Subscribe to contradiction resolutions
events.on('memory:contradiction:resolved', async (event) => {
  await auditLog.record({
    tenantId: event.tenantId,
    decision: event.payload.decision.action,
    reason: event.payload.decision.reason,
  });
});

// Emit an event
await events.emit({
  type: 'memory:stored',
  timestamp: new Date(),
  tenantId: 'default',
  payload: { memory: { id: 'abc-123', content: 'User prefers dark mode' } },
});
```

## API Reference

### Event Types

| Event Type | Emitted When |
|------------|--------------|
| `memory:extracted` | Memories are extracted from a conversation |
| `memory:stored` | A single memory is persisted to storage |
| `memory:retrieved` | Memories are retrieved for a query |
| `memory:contradiction:detected` | A contradiction is identified |
| `memory:contradiction:resolved` | A contradiction is resolved per policy |
| `memory:contradiction:pending_review` | A contradiction is flagged for manual review |
| `memory:decayed` | Decay scores are recalculated |
| `memory:forgotten` | A memory is archived or deleted |
| `memory:consolidated` | Multiple memories are merged |

### `MemoryEvent`

```typescript
interface MemoryEvent {
  type: MemoryEventType;
  timestamp: Date;
  tenantId: string;
  payload: unknown;
}
```

### `MemoryEventBus` Interface

The contract all implementations must satisfy:

```typescript
interface MemoryEventBus {
  on(event: MemoryEventType, handler: MemoryEventHandler): void;
  off(event: MemoryEventType, handler: MemoryEventHandler): void;
  once(event: MemoryEventType, handler: MemoryEventHandler): void;
  emit(event: MemoryEvent): Promise<void>;
}
```

### `InMemoryEventBus` (class)

A synchronous, in-process event bus backed by a `Map<string, Set<MemoryEventHandler>>`.

| Method | Description |
|--------|-------------|
| `on(event, handler)` | Register a handler for an event type |
| `off(event, handler)` | Remove a specific handler |
| `once(event, handler)` | Register a handler that fires at most once |
| `emit(event)` | Synchronously invoke all handlers for the event type |
| `clear()` | Remove all handlers for all event types |
| `removeAllListeners(event)` | Remove all handlers for a specific event type |

### `MemoryEventHandler`

```typescript
type MemoryEventHandler = (event: MemoryEvent) => Promise<void> | void;
```

## Usage Patterns

### Audit Logging

```typescript
events.on('memory:forgotten', async (event) => {
  await db.insert('audit_log', {
    action: 'forgotten',
    memoryId: event.payload.memoryId,
    tenantId: event.tenantId,
    reason: event.payload.reason,
    timestamp: event.timestamp,
  });
});
```

### Metrics Collection

```typescript
import { Counter } from 'prom-client';

const storedCounter = new Counter({
  name: 'agent_memory_stored_total',
  help: 'Total number of memories stored',
  labelNames: ['tenant', 'type'],
});

events.on('memory:stored', (event) => {
  storedCounter.inc({
    tenant: event.tenantId,
    type: event.payload.memory.type,
  });
});
```

## Related Packages

- [`@reaatech/agent-memory-core`](https://www.npmjs.com/package/@reaatech/agent-memory-core) — Core types used by event payloads
- [`@reaatech/agent-memory`](https://www.npmjs.com/package/@reaatech/agent-memory) — Main facade that wires the event bus into the system

## License

[MIT](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
