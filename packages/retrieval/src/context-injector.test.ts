import {
  MemoryImportance,
  MemoryLifecycle,
  MemorySource,
  MemoryType,
} from '@reaatech/agent-memory-core';
import type { Memory } from '@reaatech/agent-memory-core';
import { describe, expect, it } from 'vitest';
import { ContextInjector } from './context-injector.js';

function createMemory(content: string, type: MemoryType, confidence: number): Memory {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    tenantId: 't1',
    ownerId: 'u1',
    content,
    type,
    source: MemorySource.USER_STATEMENT,
    importance: MemoryImportance.MEDIUM,
    confidence,
    tags: [],
    lifecycle: MemoryLifecycle.ACTIVE,
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    embeddings: { vector: [1], model: 'test', dimensions: 1 },
    version: 1,
    history: [],
  };
}

describe('ContextInjector', () => {
  it('formats memories by type', async () => {
    const injector = new ContextInjector();
    const memories = [
      createMemory('User likes dark mode', MemoryType.PREFERENCE, 0.9),
      createMemory('User lives in Seattle', MemoryType.FACT, 0.85),
    ];

    const context = await injector.injectMemoriesIntoContext([], memories, 1000);

    expect(context).toContain('PREFERENCES');
    expect(context).toContain('FACTS');
    expect(context).toContain('User likes dark mode');
    expect(context).toContain('User lives in Seattle');
  });

  it('truncates to token budget', async () => {
    const injector = new ContextInjector();
    const longMemory = createMemory('a'.repeat(1000), MemoryType.FACT, 0.9);

    const context = await injector.injectMemoriesIntoContext(
      [],
      [longMemory],
      10, // Very small budget
    );

    expect(context).toContain('(truncated)');
  });

  it('includes confidence and date', async () => {
    const injector = new ContextInjector();
    const memory = createMemory('Test', MemoryType.FACT, 0.95);

    const context = await injector.injectMemoriesIntoContext([], [memory], 1000);

    expect(context).toContain('confidence: 95%');
  });
});
