import { describe, it, expect } from 'vitest';
import { ContradictionResolver } from './contradiction-resolver.js';
import { ContradictionStrategy, MemoryLifecycle, MemorySource } from '@core/types.js';
import type { Memory } from '@core/types.js';
import type { Contradiction } from './contradiction-detector.js';

function createMemory(
  content: string,
  confidence: number,
  overrides: Partial<Memory> = {}
): Memory {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    tenantId: 't1',
    ownerId: 'u1',
    content,
    type: 'fact' as import('@core/types.js').MemoryType,
    source: 'user_statement' as import('@core/types.js').MemorySource,
    importance: 'medium' as import('@core/types.js').MemoryImportance,
    confidence,
    tags: [],
    lifecycle: MemoryLifecycle.ACTIVE,
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    embeddings: { vector: [1], model: 'test', dimensions: 1 },
    version: 1,
    history: [],
    ...overrides,
  };
}

function createContradiction(newMem: Memory, existing: Memory): Contradiction {
  return {
    newMemory: newMem,
    existingMemory: existing,
    similarity: 0.95,
  };
}

describe('ContradictionResolver', () => {
  it('accepts when no contradictions', async () => {
    const resolver = new ContradictionResolver({
      defaultStrategy: ContradictionStrategy.NEWEST_WINS,
      similarityThreshold: 0.8,
      autoResolve: true,
    });
    const memory = createMemory('test', 0.9);

    const decision = await resolver.resolve(memory, [], []);
    expect(decision.action).toBe('accept');
  });

  it('newest_wins replaces old', async () => {
    const resolver = new ContradictionResolver({
      defaultStrategy: ContradictionStrategy.NEWEST_WINS,
      similarityThreshold: 0.8,
      autoResolve: true,
    });
    const newMem = createMemory('new', 0.9);
    const old = createMemory('old', 0.8);
    const contradictions = [createContradiction(newMem, old)];

    const decision = await resolver.resolve(newMem, [old], contradictions);
    expect(decision.action).toBe('replace');
    expect(decision.archiveIds).toContain(old.id);
  });

  it('oldest_wins rejects new', async () => {
    const resolver = new ContradictionResolver({
      defaultStrategy: ContradictionStrategy.OLDEST_WINS,
      similarityThreshold: 0.8,
      autoResolve: true,
    });
    const newMem = createMemory('new', 0.9);
    const old = createMemory('old', 0.8);
    const contradictions = [createContradiction(newMem, old)];

    const decision = await resolver.resolve(newMem, [old], contradictions);
    expect(decision.action).toBe('reject');
  });

  it('highest_confidence prefers higher confidence', async () => {
    const resolver = new ContradictionResolver({
      defaultStrategy: ContradictionStrategy.HIGHEST_CONFIDENCE,
      similarityThreshold: 0.8,
      autoResolve: true,
    });
    const newMem = createMemory('new', 0.95);
    const old = createMemory('old', 0.8);
    const contradictions = [createContradiction(newMem, old)];

    const decision = await resolver.resolve(newMem, [old], contradictions);
    expect(decision.action).toBe('replace');
  });

  it('highest_confidence rejects lower confidence', async () => {
    const resolver = new ContradictionResolver({
      defaultStrategy: ContradictionStrategy.HIGHEST_CONFIDENCE,
      similarityThreshold: 0.8,
      autoResolve: true,
    });
    const newMem = createMemory('new', 0.7);
    const old = createMemory('old', 0.9);
    const contradictions = [createContradiction(newMem, old)];

    const decision = await resolver.resolve(newMem, [old], contradictions);
    expect(decision.action).toBe('reject');
  });

  it('manual_review flags for review', async () => {
    const resolver = new ContradictionResolver({
      defaultStrategy: ContradictionStrategy.MANUAL_REVIEW,
      similarityThreshold: 0.8,
      autoResolve: true,
    });
    const newMem = createMemory('new', 0.9);
    const old = createMemory('old', 0.8);
    const contradictions = [createContradiction(newMem, old)];

    const decision = await resolver.resolve(newMem, [old], contradictions);
    expect(decision.action).toBe('review');
  });

  it('custom rules override default strategy', async () => {
    const resolver = new ContradictionResolver(
      {
        defaultStrategy: ContradictionStrategy.NEWEST_WINS,
        similarityThreshold: 0.8,
        autoResolve: true,
      },
      [
        {
          id: 'prefer-existing',
          priority: 100,
          condition: { type: 'tag_matches', pattern: '.*' },
          action: { type: 'prefer_existing' },
        },
      ]
    );
    const newMem = createMemory('new', 0.9, { tags: ['general'] });
    const old = createMemory('old', 0.8);
    const contradictions = [createContradiction(newMem, old)];

    const decision = await resolver.resolve(newMem, [old], contradictions);
    expect(decision.action).toBe('reject');
    expect(decision.reason).toBe('rule:prefer-existing');
  });

  it('handles unknown strategy with review fallback', async () => {
    const resolver = new ContradictionResolver({
      defaultStrategy: 'unknown_strategy' as ContradictionStrategy,
      similarityThreshold: 0.8,
      autoResolve: true,
    });
    const newMem = createMemory('new', 0.9);
    const old = createMemory('old', 0.8);
    const contradictions = [createContradiction(newMem, old)];

    const decision = await resolver.resolve(newMem, [old], contradictions);
    expect(decision.action).toBe('review');
  });

  it('handles unhandled rule action with review fallback', async () => {
    const resolver = new ContradictionResolver(
      {
        defaultStrategy: ContradictionStrategy.NEWEST_WINS,
        similarityThreshold: 0.8,
        autoResolve: true,
      },
      [
        {
          id: 'freeze-rule',
          priority: 100,
          condition: { type: 'tag_matches', pattern: '.*' },
          action: { type: 'freeze_decay' },
        },
      ]
    );
    const newMem = createMemory('new', 0.9, { tags: ['general'] });
    const old = createMemory('old', 0.8);
    const contradictions = [createContradiction(newMem, old)];

    const decision = await resolver.resolve(newMem, [old], contradictions);
    expect(decision.action).toBe('review');
    expect(decision.reason).toBe('unhandled_rule_action:freeze_decay');
  });

  it('rule with require_review action', async () => {
    const resolver = new ContradictionResolver(
      {
        defaultStrategy: ContradictionStrategy.NEWEST_WINS,
        similarityThreshold: 0.8,
        autoResolve: true,
      },
      [
        {
          id: 'review-rule',
          priority: 100,
          condition: { type: 'tag_matches', pattern: '.*' },
          action: { type: 'require_review' },
        },
      ]
    );
    const newMem = createMemory('new', 0.9, { tags: ['general'] });
    const old = createMemory('old', 0.8);
    const contradictions = [createContradiction(newMem, old)];

    const decision = await resolver.resolve(newMem, [old], contradictions);
    expect(decision.action).toBe('review');
    expect(decision.reason).toBe('rule:review-rule');
  });

  it('rule with prefer_new action', async () => {
    const resolver = new ContradictionResolver(
      {
        defaultStrategy: ContradictionStrategy.OLDEST_WINS,
        similarityThreshold: 0.8,
        autoResolve: true,
      },
      [
        {
          id: 'prefer-new-rule',
          priority: 100,
          condition: { type: 'tag_matches', pattern: '.*' },
          action: { type: 'prefer_new' },
        },
      ]
    );
    const newMem = createMemory('new', 0.9, { tags: ['general'] });
    const old = createMemory('old', 0.8);
    const contradictions = [createContradiction(newMem, old)];

    const decision = await resolver.resolve(newMem, [old], contradictions);
    expect(decision.action).toBe('replace');
    expect(decision.archiveIds).toContain(old.id);
  });

  it('evaluates custom condition types', async () => {
    const resolver = new ContradictionResolver(
      {
        defaultStrategy: ContradictionStrategy.NEWEST_WINS,
        similarityThreshold: 0.8,
        autoResolve: true,
      },
      [
        {
          id: 'confidence-rule',
          priority: 100,
          condition: { type: 'confidence_above', threshold: 0.8 },
          action: { type: 'prefer_new' },
        },
      ]
    );
    const highConf = createMemory('new', 0.9);
    const old = createMemory('old', 0.8);
    const contradictions = [createContradiction(highConf, old)];

    const decision = await resolver.resolve(highConf, [old], contradictions);
    expect(decision.action).toBe('replace');

    const lowConf = createMemory('new', 0.7);
    const contradictions2 = [createContradiction(lowConf, old)];
    const decision2 = await resolver.resolve(lowConf, [old], contradictions2);
    expect(decision2.action).toBe('replace'); // falls through to default strategy
  });

  it('evaluates age_exceeds condition', async () => {
    const resolver = new ContradictionResolver(
      {
        defaultStrategy: ContradictionStrategy.NEWEST_WINS,
        similarityThreshold: 0.8,
        autoResolve: true,
      },
      [
        {
          id: 'age-rule',
          priority: 100,
          condition: { type: 'age_exceeds', days: 1 },
          action: { type: 'prefer_existing' },
        },
      ]
    );
    const oldMem = createMemory('new', 0.9, { createdAt: new Date(Date.now() - 2 * 86400000) });
    const existing = createMemory('old', 0.8);
    const contradictions = [createContradiction(oldMem, existing)];

    const decision = await resolver.resolve(oldMem, [existing], contradictions);
    expect(decision.action).toBe('reject');
  });

  it('evaluates source_is condition', async () => {
    const resolver = new ContradictionResolver(
      {
        defaultStrategy: ContradictionStrategy.NEWEST_WINS,
        similarityThreshold: 0.8,
        autoResolve: true,
      },
      [
        {
          id: 'source-rule',
          priority: 100,
          condition: { type: 'source_is', value: MemorySource.AGENT_INFERENCE },
          action: { type: 'prefer_new' },
        },
      ]
    );
    const agentMem = createMemory('new', 0.9, { source: MemorySource.AGENT_INFERENCE });
    const existing = createMemory('old', 0.8);
    const contradictions = [createContradiction(agentMem, existing)];

    const decision = await resolver.resolve(agentMem, [existing], contradictions);
    expect(decision.action).toBe('replace');
  });

  it('evaluates importance_equals condition', async () => {
    const resolver = new ContradictionResolver(
      {
        defaultStrategy: ContradictionStrategy.NEWEST_WINS,
        similarityThreshold: 0.8,
        autoResolve: true,
      },
      [
        {
          id: 'importance-rule',
          priority: 100,
          condition: {
            type: 'importance_equals',
            value: 'critical' as import('@core/types.js').MemoryImportance,
          },
          action: { type: 'prefer_new' },
        },
      ]
    );
    const criticalMem = createMemory('new', 0.9, {
      importance: 'critical' as import('@core/types.js').MemoryImportance,
    });
    const existing = createMemory('old', 0.8);
    const contradictions = [createContradiction(criticalMem, existing)];

    const decision = await resolver.resolve(criticalMem, [existing], contradictions);
    expect(decision.action).toBe('replace');
  });

  it('evaluates memory_type_in condition', async () => {
    const resolver = new ContradictionResolver(
      {
        defaultStrategy: ContradictionStrategy.NEWEST_WINS,
        similarityThreshold: 0.8,
        autoResolve: true,
      },
      [
        {
          id: 'type-rule',
          priority: 100,
          condition: {
            type: 'memory_type_in',
            values: ['preference' as import('@core/types.js').MemoryType],
          },
          action: { type: 'prefer_new' },
        },
      ]
    );
    const prefMem = createMemory('new', 0.9, {
      type: 'preference' as import('@core/types.js').MemoryType,
    });
    const existing = createMemory('old', 0.8);
    const contradictions = [createContradiction(prefMem, existing)];

    const decision = await resolver.resolve(prefMem, [existing], contradictions);
    expect(decision.action).toBe('replace');
  });

  it('evaluates custom condition function', async () => {
    const resolver = new ContradictionResolver(
      {
        defaultStrategy: ContradictionStrategy.NEWEST_WINS,
        similarityThreshold: 0.8,
        autoResolve: true,
      },
      [
        {
          id: 'custom-rule',
          priority: 100,
          condition: { type: 'custom', evaluate: () => true },
          action: { type: 'prefer_new' },
        },
      ]
    );
    const newMem = createMemory('new', 0.9);
    const old = createMemory('old', 0.8);
    const contradictions = [createContradiction(newMem, old)];

    const decision = await resolver.resolve(newMem, [old], contradictions);
    expect(decision.action).toBe('replace');
  });
});
