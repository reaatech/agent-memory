import { describe, it, expect } from 'vitest';
import { DecayEngine } from './decay-engine.js';
import { MemoryImportance, MemoryLifecycle } from '@core/types.js';
import type { Memory } from '@core/types.js';

function createMemory(
  importance: MemoryImportance,
  ageDays: number,
  lastAccessedDays: number
): Memory {
  const now = Date.now();
  return {
    id: '1',
    tenantId: 't1',
    ownerId: 'u1',
    content: 'test',
    type: 'fact' as import('@core/types.js').MemoryType,
    source: 'user_statement' as import('@core/types.js').MemorySource,
    importance,
    confidence: 0.8,
    tags: [],
    lifecycle: MemoryLifecycle.ACTIVE,
    createdAt: new Date(now - ageDays * 24 * 60 * 60 * 1000),
    updatedAt: new Date(now - ageDays * 24 * 60 * 60 * 1000),
    lastAccessedAt: new Date(now - lastAccessedDays * 24 * 60 * 60 * 1000),
    embeddings: { vector: [1], model: 'test', dimensions: 1 },
    version: 1,
    history: [],
  };
}

const defaultConfig = {
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

describe('DecayEngine', () => {
  it('freezes decay for critical memories', () => {
    const engine = new DecayEngine(defaultConfig);
    const memory = createMemory(MemoryImportance.CRITICAL, 1000, 100);
    const decision = engine.evaluate(memory);
    expect(decision.frozen).toBe(true);
  });

  it('decays transient memories faster than high', () => {
    const engine = new DecayEngine(defaultConfig);
    const transient = createMemory(MemoryImportance.TRANSIENT, 7, 0);
    const high = createMemory(MemoryImportance.HIGH, 7, 0);

    const tScore = engine.calculateDecayedImportance(transient);
    const hScore = engine.calculateDecayedImportance(high);

    expect(tScore).toBeLessThan(hScore);
  });

  it('boosts recently accessed memories', () => {
    const engine = new DecayEngine(defaultConfig);
    const old = createMemory(MemoryImportance.MEDIUM, 10, 100);
    const recent = createMemory(MemoryImportance.MEDIUM, 10, 1);

    const oldScore = engine.calculateDecayedImportance(old);
    const recentScore = engine.calculateDecayedImportance(recent);

    expect(recentScore).toBeGreaterThan(oldScore);
  });

  it('reports below threshold for very old memories', () => {
    const engine = new DecayEngine(defaultConfig);
    const memory = createMemory(MemoryImportance.LOW, 365, 365);
    const decision = engine.evaluate(memory);
    expect(decision.reason).toBe('below_minimum_threshold');
  });
});
