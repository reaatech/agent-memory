import { MemoryImportance, MemoryLifecycle } from '@reaatech/agent-memory-core';
import type { Memory } from '@reaatech/agent-memory-core';
import { describe, expect, it } from 'vitest';
import { DecayEngine } from './decay-engine.js';
import { ForgettingPolicy } from './forgetting-policy.js';

function createMemory(importance: MemoryImportance, ageDays: number): Memory {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    tenantId: 't1',
    ownerId: 'u1',
    content: 'test',
    type: 'fact' as import('@reaatech/agent-memory-core').MemoryType,
    source: 'user_statement' as import('@reaatech/agent-memory-core').MemorySource,
    importance,
    confidence: 0.8,
    tags: [],
    lifecycle: MemoryLifecycle.ACTIVE,
    createdAt: new Date(now - ageDays * 24 * 60 * 60 * 1000),
    updatedAt: new Date(now - ageDays * 24 * 60 * 60 * 1000),
    lastAccessedAt: new Date(now - ageDays * 24 * 60 * 60 * 1000),
    embeddings: { vector: [1], model: 'test', dimensions: 1 },
    version: 1,
    history: [],
  };
}

const decayConfig = {
  halfLifeDays: {
    [MemoryImportance.CRITICAL]: 3650,
    [MemoryImportance.HIGH]: 365,
    [MemoryImportance.MEDIUM]: 90,
    [MemoryImportance.LOW]: 30,
    [MemoryImportance.TRANSIENT]: 7,
  },
  usageBoostFactor: 0.5,
  minimumThreshold: 0.05,
};

describe('ForgettingPolicy', () => {
  it('forgets expired memories', async () => {
    const engine = new DecayEngine(decayConfig);
    const policy = new ForgettingPolicy(
      { forgetThreshold: 0.1, capacityLimit: 100, archiveBeforeDelete: false },
      engine,
    );
    const memory = createMemory(MemoryImportance.MEDIUM, 0);
    memory.expiresAt = new Date(Date.now() - 1000);

    const decision = await policy.evaluate(memory);
    expect(decision.action).toBe('forget');
    expect(decision.reason).toBe('expired');
  });

  it('retains healthy memories', async () => {
    const engine = new DecayEngine(decayConfig);
    const policy = new ForgettingPolicy(
      { forgetThreshold: 0.1, capacityLimit: 100, archiveBeforeDelete: false },
      engine,
    );
    const memory = createMemory(MemoryImportance.HIGH, 1);

    const decision = await policy.evaluate(memory);
    expect(decision.action).toBe('retain');
  });

  it('archives when archiveBeforeDelete is true', async () => {
    const engine = new DecayEngine(decayConfig);
    const policy = new ForgettingPolicy(
      { forgetThreshold: 0.1, capacityLimit: 100, archiveBeforeDelete: true },
      engine,
    );
    const memory = createMemory(MemoryImportance.MEDIUM, 0);
    memory.expiresAt = new Date(Date.now() - 1000);

    const decision = await policy.evaluate(memory);
    expect(decision.action).toBe('archive');
  });

  it('enforces capacity limits in batch', async () => {
    const engine = new DecayEngine(decayConfig);
    const policy = new ForgettingPolicy(
      { forgetThreshold: 0.01, capacityLimit: 2, archiveBeforeDelete: true },
      engine,
    );
    const memories = [
      createMemory(MemoryImportance.HIGH, 1),
      createMemory(MemoryImportance.MEDIUM, 10),
      createMemory(MemoryImportance.LOW, 30),
    ];

    const decisions = await policy.evaluateBatch(memories, 3);
    const archiveCount = decisions.filter((d) => d.action === 'archive').length;
    expect(archiveCount).toBeGreaterThanOrEqual(1);
  });
});
