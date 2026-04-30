# @reaatech/agent-memory-policies

[![npm version](https://img.shields.io/npm/v/@reaatech/agent-memory-policies.svg)](https://www.npmjs.com/package/@reaatech/agent-memory-policies)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/agent-memory/ci.yml?branch=main&label=CI)](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Policy engine for memory lifecycle management — decay, forgetting, and contradiction resolution. Treats memory as a managed asset with an explicit lifecycle governed by pluggable rules, not a fire-and-forget store.

## Installation

```bash
npm install @reaatech/agent-memory-policies
# or
pnpm add @reaatech/agent-memory-policies
```

## Feature Overview

- **Decay engine** — exponential decay with configurable half-lives per importance level, usage boosts, and recency bonuses
- **Forgetting policy** — automatic archival and deletion of decayed memories with capacity limits
- **Contradiction detection** — cosine similarity-based pairwise comparison with configurable threshold
- **Contradiction resolution** — 4 strategies: newest-wins, oldest-wins, highest-confidence, manual-review
- **Pluggable rules** — compose domain-specific policies (`"medical:*"` tags never decay, `"financial:*"` needs review, etc.)
- **Consolidated `PolicyEngine`** — single entry point for all lifecycle decisions

## Quick Start

```typescript
import {
  PolicyEngine,
  DecayEngine,
  ForgettingPolicy,
  ContradictionDetector,
  ContradictionResolver,
} from '@reaatech/agent-memory-policies';
import { ContradictionStrategy } from '@reaatech/agent-memory-core';

// Default configuration
const engine = new PolicyEngine(
  {
    halfLifeDays: {
      critical: 3650,
      high: 365,
      medium: 90,
      low: 30,
      transient: 7,
    },
    usageBoostFactor: 0.5,
    minimumThreshold: 0.05,
  },
  {
    forgetThreshold: 0.1,
    capacityLimit: 10000,
    archiveBeforeDelete: true,
  },
  {
    defaultStrategy: ContradictionStrategy.HIGHEST_CONFIDENCE,
    similarityThreshold: 0.8,
    autoResolve: true,
  },
);

// Evaluate a memory's decay
const decayDecision = engine.evaluateDecay(memory, { tenantId: 'default' });
// { score: 0.72, frozen: false, reason: 'normal' }

// Evaluate if a memory should be forgotten
const forgetDecision = await engine.evaluateForgetting(memory, {
  tenantId: 'default',
  currentMemoryCount: 9500,
});
// { action: 'retain', reason: 'no_forgetting_criteria_met' }

// Resolve a contradiction
const contradictionDecision = await engine.evaluateContradiction(
  newMemory,
  existingMemories,
  contradictions,
);
// { action: 'replace', archiveIds: ['old-mem-1'], reason: 'higher_confidence' }
```

## API Reference

### `PolicyEngine` (class)

The consolidated entry point that composes decay, forgetting, and contradiction subsystems.

```typescript
const engine = new PolicyEngine(
  decayConfig,
  forgettingConfig,
  contradictionConfig,
  customRules?,  // optional PolicyRule[]
);
```

| Method | Returns | Description |
|--------|---------|-------------|
| `evaluateDecay(memory, context?)` | `DecayDecision` | Calculate current decay score |
| `evaluateForgetting(memory, context?)` | `ForgettingDecision` | Decide whether to archive/forget |
| `evaluateForgettingBatch(memories, context?)` | `ForgettingDecision[]` | Batch forgetting evaluation |
| `evaluateContradiction(newMem, existing, contradictions, context?)` | `ContradictionDecision` | Resolve contradictions per strategy and rules |
| `calculateDecayedImportance(memory)` | `number` | Raw decay score (0–1) |

### `DecayEngine` (class)

Exponential decay with configurable half-lives and usage boosts:

```typescript
const decay = new DecayEngine({
  halfLifeDays: {
    critical: 3650,
    high: 365,
    medium: 90,
    low: 30,
    transient: 7,
  },
  usageBoostFactor: 0.5,
  minimumThreshold: 0.05,
});

const decision = decay.evaluate(memory);
// { score: 0.87, frozen: false, reason: 'normal' }
```

#### `DecayConfig`

| Property | Type | Description |
|----------|------|-------------|
| `halfLifeDays` | `Record<string, number>` | Half-lives per importance (critical, high, medium, low, transient) |
| `usageBoostFactor` | `number` | Multiplier for frequently-accessed memories |
| `minimumThreshold` | `number` | Floor value — decay never drops below this |

#### `DecayDecision`

```typescript
interface DecayDecision {
  score: number;       // 0–1, higher = more important
  frozen: boolean;     // true if a policy rule froze decay
  reason: string;      // 'normal', 'frozen_by_policy', 'critical'
}
```

### `ForgettingPolicy` (class)

Evaluates whether memories should be archived or forgotten:

```typescript
const forgetting = new ForgettingPolicy(
  { forgetThreshold: 0.1, capacityLimit: 10000, archiveBeforeDelete: true },
  decayEngine,
);

const decision = await forgetting.evaluate(memory);
// { action: 'retain' | 'archive' | 'forget', reason: string }
```

#### `ForgettingConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `forgetThreshold` | `number` | `0.1` | Decay score below which forget |
| `capacityLimit` | `number` | `10000` | Max memories per tenant before archiving |
| `archiveBeforeDelete` | `boolean` | `true` | Archive before hard-deleting |

### `ContradictionDetector` (class)

Detects semantic contradictions between a new memory and existing ones:

```typescript
const detector = new ContradictionDetector(0.8); // similarity threshold
const contradictions = detector.detect(newMemory, existingMemories);
// [{ newMemory, existingMemory, similarity: 0.92 }, ...]
```

#### `Contradiction`

```typescript
interface Contradiction {
  newMemory: Memory;
  existingMemory: Memory;
  similarity: number;  // cosine similarity score
}
```

### `ContradictionResolver` (class)

Resolves detected contradictions using configured strategies:

```typescript
const resolver = new ContradictionResolver(
  { defaultStrategy: ContradictionStrategy.HIGHEST_CONFIDENCE, ... },
);

const decision = await resolver.resolve(newMemory, existingMemories, contradictions);
// { action: 'accept' | 'reject' | 'replace' | 'review', ... }
```

#### `ContradictionConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `defaultStrategy` | `ContradictionStrategy` | `HIGHEST_CONFIDENCE` | Default resolution strategy |
| `similarityThreshold` | `number` | `0.8` | Cosine similarity threshold above which a contradiction is flagged |
| `autoResolve` | `boolean` | `true` | Auto-resolve or flag for manual review |

#### `ContradictionDecision`

```typescript
interface ContradictionDecision {
  action: 'accept' | 'reject' | 'replace' | 'review';
  memory?: Memory;
  archiveIds?: string[];
  reason: string;
}
```

### Custom Policy Rules

Define domain-specific policies via `PolicyRule`:

```typescript
import type { PolicyRule } from '@reaatech/agent-memory-policies';

const medicalPolicy: PolicyRule = {
  id: 'medical-preference-critical',
  priority: 100,
  condition: { type: 'tag_matches', pattern: 'medical:*' },
  action: { type: 'freeze_decay' },
  override: true,
};

const engine = new PolicyEngine(decayCfg, forgetCfg, contraCfg, [medicalPolicy]);
```

#### `PolicyCondition` (discriminated union)

| Condition Type | Description |
|----------------|-------------|
| `importance_equals` | Match a specific `MemoryImportance` |
| `memory_type_in` | Match any of the listed `MemoryType`s |
| `tag_matches` | Tag glob pattern (e.g. `"medical:*"`) |
| `confidence_above` | Confidence exceeds threshold |
| `source_is` | Match `MemorySource` |
| `age_exceeds` | Memory is older than N days |
| `custom` | Programmatic evaluation function |

#### `PolicyAction` (discriminated union)

| Action Type | Effect |
|-------------|--------|
| `freeze_decay` | Prevent decay for matching memories |
| `accelerate_decay` | Multiply decay rate by factor |
| `archive_after` | Archive after N days |
| `forget_after` | Forget after N days |
| `require_review` | Flag for manual review |
| `prefer_existing` | Keep existing memory in contradictions |
| `prefer_new` | Prefer new memory in contradictions |
| `custom` | Programmatic action function |

## Related Packages

- [`@reaatech/agent-memory-core`](https://www.npmjs.com/package/@reaatech/agent-memory-core) — Core types and enums used by policies
- [`@reaatech/agent-memory-storage`](https://www.npmjs.com/package/@reaatech/agent-memory-storage) — Storage interface used by forgetting policy
- [`@reaatech/agent-memory`](https://www.npmjs.com/package/@reaatech/agent-memory) — Main facade that integrates the policy engine

## License

[MIT](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
