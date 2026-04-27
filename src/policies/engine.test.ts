import { describe, it, expect } from 'vitest';
import { PolicyEngine } from './engine.js';
import { ContradictionStrategy, MemoryImportance, MemoryLifecycle } from '@core/types.js';
import type { Memory } from '@core/types.js';

function createMemory(overrides: Partial<Memory> = {}): Memory {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    tenantId: 't1',
    ownerId: 'u1',
    content: 'test',
    type: 'fact' as import('@core/types.js').MemoryType,
    source: 'user_statement' as import('@core/types.js').MemorySource,
    importance: MemoryImportance.MEDIUM,
    confidence: 0.9,
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

describe('PolicyEngine', () => {
  const defaultConfigs = {
    decay: {
      halfLifeDays: {
        [MemoryImportance.CRITICAL]: 3650,
        [MemoryImportance.HIGH]: 365,
        [MemoryImportance.MEDIUM]: 90,
        [MemoryImportance.LOW]: 30,
        [MemoryImportance.TRANSIENT]: 7,
      },
      usageBoostFactor: 0.5,
      minimumThreshold: 0.05,
    },
    forgetting: {
      forgetThreshold: 0.1,
      capacityLimit: 1000,
      archiveBeforeDelete: true,
    },
    contradiction: {
      defaultStrategy: ContradictionStrategy.HIGHEST_CONFIDENCE,
      similarityThreshold: 0.8,
      autoResolve: true,
    },
  };

  it('evaluates decay for a memory', () => {
    const engine = new PolicyEngine(
      defaultConfigs.decay,
      defaultConfigs.forgetting,
      defaultConfigs.contradiction
    );
    const memory = createMemory({ importance: MemoryImportance.MEDIUM });

    const decision = engine.evaluateDecay(memory);
    expect(decision.score).toBeGreaterThan(0);
    expect(decision.score).toBeLessThanOrEqual(1);
  });

  it('freezes decay for critical memories', () => {
    const engine = new PolicyEngine(
      defaultConfigs.decay,
      defaultConfigs.forgetting,
      defaultConfigs.contradiction
    );
    const memory = createMemory({ importance: MemoryImportance.CRITICAL });

    const decision = engine.evaluateDecay(memory);
    expect(decision.frozen).toBe(true);
  });

  it('evaluates forgetting for expired memory', async () => {
    const engine = new PolicyEngine(
      defaultConfigs.decay,
      defaultConfigs.forgetting,
      defaultConfigs.contradiction
    );
    const memory = createMemory({ expiresAt: new Date(Date.now() - 1000) });

    const decision = await engine.evaluateForgetting(memory);
    expect(decision.action).toBe('archive');
    expect(decision.reason).toBe('expired');
  });

  it('evaluates forgetting batch with capacity limits', async () => {
    const engine = new PolicyEngine(
      defaultConfigs.decay,
      defaultConfigs.forgetting,
      defaultConfigs.contradiction
    );
    const memories = Array.from({ length: 5 }, (_, i) =>
      createMemory({
        importance: MemoryImportance.LOW,
        createdAt: new Date(Date.now() - i * 86400000),
      })
    );

    const decisions = await engine.evaluateForgettingBatch(memories, {
      tenantId: 't1',
      currentMemoryCount: 5,
    });
    expect(decisions).toHaveLength(5);
    expect(decisions.every((d) => d.action === 'retain' || d.action === 'archive')).toBe(true);
  });

  it('resolves contradictions with highest confidence', async () => {
    const engine = new PolicyEngine(
      defaultConfigs.decay,
      defaultConfigs.forgetting,
      defaultConfigs.contradiction
    );
    const newMem = createMemory({ confidence: 0.95 });
    const old = createMemory({ confidence: 0.8 });

    const decision = await engine.evaluateContradiction(
      newMem,
      [old],
      [{ newMemory: newMem, existingMemory: old, similarity: 0.95 }]
    );

    expect(decision.action).toBe('replace');
  });

  it('calculates decayed importance', () => {
    const engine = new PolicyEngine(
      defaultConfigs.decay,
      defaultConfigs.forgetting,
      defaultConfigs.contradiction
    );
    const memory = createMemory({ importance: MemoryImportance.HIGH });

    const score = engine.calculateDecayedImportance(memory);
    expect(score).toBeGreaterThan(0);
  });
});
