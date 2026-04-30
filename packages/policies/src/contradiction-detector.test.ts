import { MemoryLifecycle } from '@reaatech/agent-memory-core';
import type { Memory } from '@reaatech/agent-memory-core';
import { describe, expect, it } from 'vitest';
import { ContradictionDetector } from './contradiction-detector.js';

function createMemory(content: string, vector: number[], overrides: Partial<Memory> = {}): Memory {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    tenantId: 't1',
    ownerId: 'u1',
    content,
    type: 'fact' as import('@reaatech/agent-memory-core').MemoryType,
    source: 'user_statement' as import('@reaatech/agent-memory-core').MemorySource,
    importance: 'medium' as import('@reaatech/agent-memory-core').MemoryImportance,
    confidence: 0.8,
    tags: [],
    lifecycle: MemoryLifecycle.ACTIVE,
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    embeddings: { vector, model: 'test', dimensions: vector.length },
    version: 1,
    history: [],
    ...overrides,
  };
}

describe('ContradictionDetector', () => {
  it('detects similar vectors as contradictions', async () => {
    const detector = new ContradictionDetector(0.9);
    const existing = createMemory('I like apples', [1, 0, 0]);
    const newMem = createMemory('I love apples', [0.99, 0.01, 0]);

    const results = detector.detect(newMem, [existing]);
    expect(results).toHaveLength(1);
    expect(results[0]!.similarity).toBeGreaterThan(0.9);
  });

  it('ignores dissimilar vectors', async () => {
    const detector = new ContradictionDetector(0.9);
    const existing = createMemory('I like apples', [1, 0, 0]);
    const newMem = createMemory('The sky is blue', [0, 1, 0]);

    const results = detector.detect(newMem, [existing]);
    expect(results).toHaveLength(0);
  });

  it('ignores non-active memories', async () => {
    const detector = new ContradictionDetector(0.5);
    const existing = createMemory('I like apples', [1, 0, 0], {
      lifecycle: MemoryLifecycle.ARCHIVED,
    });
    const newMem = createMemory('I love apples', [0.99, 0.01, 0]);

    const results = detector.detect(newMem, [existing]);
    expect(results).toHaveLength(0);
  });

  it('skips self-comparison', async () => {
    const detector = new ContradictionDetector(0.5);
    const mem = createMemory('I like apples', [1, 0, 0]);

    const results = detector.detect(mem, [mem]);
    expect(results).toHaveLength(0);
  });
});
