import {
  MemoryImportance,
  MemoryLifecycle,
  MemorySource,
  MemoryType,
} from '@reaatech/agent-memory-core';
import type { EmbeddingProvider, ModelInfo } from '@reaatech/agent-memory-embedding';
import type { MemoryEvent, MemoryEventBus } from '@reaatech/agent-memory-events';
import type { ConversationTurn } from '@reaatech/agent-memory-extraction';
import type { LLMProvider } from '@reaatech/agent-memory-llm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentMemory } from './agent-memory.js';

class MockLLMProvider implements LLMProvider {
  private responses: Record<string, unknown[]> = {};

  setResponse(key: string, data: unknown[]): void {
    this.responses[key] = data;
  }

  async complete(_prompt: string): Promise<string> {
    return '';
  }

  async completeStructured<T>(_prompt: string, _schema: object): Promise<T> {
    return (this.responses[_prompt] ?? [
      {
        content: 'User prefers dark mode',
        type: 'preference',
        importance: 'high',
        confidence: 0.9,
        tags: ['ui', 'preference'],
      },
    ]) as unknown as T;
  }
}

class MockEmbeddingProvider implements EmbeddingProvider {
  async embed(_text: string): Promise<number[]> {
    return [1, 0, 0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(() => [1, 0, 0]);
  }

  getModelInfo(): ModelInfo {
    return { name: 'mock', dimensions: 3, maxInputLength: 100 };
  }
}

describe('AgentMemory', () => {
  let memory: AgentMemory;
  let mockLLM: MockLLMProvider;

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    memory = new AgentMemory({
      storage: { provider: 'memory' },
      embedding: new MockEmbeddingProvider(),
      extraction: {
        llmProvider: mockLLM,
        batchSize: 10,
        confidenceThreshold: 0.5,
        enabledTypes: Object.values(MemoryType),
      },
    });
  });

  it('extracts and stores memories', async () => {
    const conversation: ConversationTurn[] = [
      {
        speaker: 'user',
        content: 'I prefer dark mode',
        timestamp: new Date(),
      },
    ];

    const stored = await memory.extractAndStore(conversation);
    expect(stored).toHaveLength(1);
    expect(stored[0]!.content).toBe('User prefers dark mode');
    expect(stored[0]!.type).toBe(MemoryType.PREFERENCE);
  });

  it('retrieves stored memories', async () => {
    const conversation: ConversationTurn[] = [
      {
        speaker: 'user',
        content: 'I prefer dark mode',
        timestamp: new Date(),
      },
    ];

    await memory.extractAndStore(conversation);
    const results = await memory.retrieve('dark mode', { limit: 5, tenantId: 'default' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('emits events on extraction', async () => {
    const events: string[] = [];
    memory.events.on('memory:stored', () => {
      events.push('stored');
    });

    const conversation: ConversationTurn[] = [
      {
        speaker: 'user',
        content: 'I prefer dark mode',
        timestamp: new Date(),
      },
    ];

    await memory.extractAndStore(conversation);
    expect(events).toContain('stored');
  });

  it('returns storage adapter via getStorage', () => {
    const storage = memory.getStorage();
    expect(storage).toBeDefined();
    expect(typeof storage.create).toBe('function');
  });

  it('accepts pre-constructed storage and embedding providers', () => {
    const customMemory = new AgentMemory({
      storage: memory.getStorage(),
      embedding: new MockEmbeddingProvider(),
      extraction: {
        llmProvider: mockLLM,
        batchSize: 10,
        confidenceThreshold: 0.5,
        enabledTypes: Object.values(MemoryType),
      },
    });
    expect(customMemory).toBeDefined();
  });

  it('runMaintenance archives old low-importance memories', async () => {
    const storage = memory.getStorage();
    const oldLow = {
      id: crypto.randomUUID(),
      tenantId: 'default',
      ownerId: 'default',
      content: 'Old transient memory',
      type: MemoryType.FACT,
      source: MemorySource.USER_STATEMENT,
      importance: MemoryImportance.TRANSIENT,
      confidence: 0.5,
      tags: [],
      lifecycle: MemoryLifecycle.ACTIVE,
      createdAt: new Date(Date.now() - 30 * 86400000),
      updatedAt: new Date(),
      lastAccessedAt: new Date(Date.now() - 30 * 86400000),
      embeddings: { vector: [1, 0, 0], model: 'mock', dimensions: 3 },
      version: 1,
      history: [],
    };
    await storage.create(oldLow);

    await memory.runMaintenance('default');

    const found = await storage.read(oldLow.id);
    expect(found).not.toBeNull();
    expect(found!.lifecycle).toBe(MemoryLifecycle.ARCHIVED);
  });

  it('runMaintenance archives expired memories by default', async () => {
    const storage = memory.getStorage();
    const expired = {
      id: crypto.randomUUID(),
      tenantId: 'default',
      ownerId: 'default',
      content: 'Expired memory',
      type: MemoryType.FACT,
      source: MemorySource.USER_STATEMENT,
      importance: MemoryImportance.LOW,
      confidence: 0.5,
      tags: [],
      lifecycle: MemoryLifecycle.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt: new Date(Date.now() - 1000),
      embeddings: { vector: [1, 0, 0], model: 'mock', dimensions: 3 },
      version: 1,
      history: [],
    };
    await storage.create(expired);

    await memory.runMaintenance('default');

    const found = await storage.read(expired.id);
    expect(found).not.toBeNull();
    expect(found!.lifecycle).toBe(MemoryLifecycle.ARCHIVED);
  });

  it('runMaintenance forgets expired memories when archiveBeforeDelete is false', async () => {
    const forgetMemory = new AgentMemory({
      storage: { provider: 'memory' },
      embedding: new MockEmbeddingProvider(),
      extraction: {
        llmProvider: mockLLM,
        batchSize: 10,
        confidenceThreshold: 0.5,
        enabledTypes: Object.values(MemoryType),
      },
      policies: {
        forgetting: {
          forgetThreshold: 0.1,
          capacityLimit: 10000,
          archiveBeforeDelete: false,
        },
      },
    });
    const storage = forgetMemory.getStorage();
    const expired = {
      id: crypto.randomUUID(),
      tenantId: 'default',
      ownerId: 'default',
      content: 'Expired memory',
      type: MemoryType.FACT,
      source: MemorySource.USER_STATEMENT,
      importance: MemoryImportance.LOW,
      confidence: 0.5,
      tags: [],
      lifecycle: MemoryLifecycle.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt: new Date(Date.now() - 1000),
      embeddings: { vector: [1, 0, 0], model: 'mock', dimensions: 3 },
      version: 1,
      history: [],
    };
    await storage.create(expired);

    await forgetMemory.runMaintenance('default');

    const found = await storage.read(expired.id);
    expect(found).toBeNull();
  });

  it('runMaintenance keeps recent critical memories', async () => {
    const storage = memory.getStorage();
    const critical = {
      id: crypto.randomUUID(),
      tenantId: 'default',
      ownerId: 'default',
      content: 'Critical memory',
      type: MemoryType.FACT,
      source: MemorySource.USER_STATEMENT,
      importance: MemoryImportance.CRITICAL,
      confidence: 0.95,
      tags: [],
      lifecycle: MemoryLifecycle.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      embeddings: { vector: [1, 0, 0], model: 'mock', dimensions: 3 },
      version: 1,
      history: [],
    };
    await storage.create(critical);

    await memory.runMaintenance('default');

    const found = await storage.read(critical.id);
    expect(found).not.toBeNull();
    expect(found!.lifecycle).toBe(MemoryLifecycle.ACTIVE);
  });

  it('emits retrieval events', async () => {
    const events: MemoryEvent[] = [];
    memory.events.on('memory:retrieved', (event: MemoryEvent) => {
      events.push(event);
    });

    await memory.retrieve('test', { limit: 1, tenantId: 'default' });
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('memory:retrieved');
  });

  it('uses custom event bus when provided', () => {
    const customBus: MemoryEventBus = {
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
    };

    const customMemory = new AgentMemory({
      storage: { provider: 'memory' },
      embedding: new MockEmbeddingProvider(),
      extraction: {
        llmProvider: mockLLM,
        batchSize: 10,
        confidenceThreshold: 0.5,
        enabledTypes: Object.values(MemoryType),
      },
      events: customBus,
    });

    expect(customMemory.events).toBe(customBus);
  });

  it('handles storage factory configs', () => {
    const mem = new AgentMemory({
      storage: { provider: 'memory' },
      embedding: { provider: 'openai', model: 'text-embedding-3-small', apiKey: 'test-key' },
      extraction: {
        llmProvider: mockLLM,
        batchSize: 10,
        confidenceThreshold: 0.5,
        enabledTypes: Object.values(MemoryType),
      },
    });
    expect(mem).toBeDefined();
  });

  it('archives contradictory memories on extraction', async () => {
    const storage = memory.getStorage();

    // First memory
    const first = {
      id: crypto.randomUUID(),
      tenantId: 'default',
      ownerId: 'default',
      content: 'User likes apples',
      type: MemoryType.PREFERENCE,
      source: MemorySource.USER_STATEMENT,
      importance: MemoryImportance.MEDIUM,
      confidence: 0.8,
      tags: [],
      lifecycle: MemoryLifecycle.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      embeddings: { vector: [0.99, 0.01, 0], model: 'mock', dimensions: 3 },
      version: 1,
      history: [],
    };
    await storage.create(first);

    // Mock LLM to return a contradictory memory with higher confidence
    mockLLM.setResponse('Analyze the following conversation and extract memorable facts.', [
      {
        content: 'User hates apples',
        type: 'preference',
        importance: 'high',
        confidence: 0.95,
        tags: ['food'],
      },
    ]);

    const conversation: ConversationTurn[] = [
      {
        speaker: 'user',
        content: 'Actually I hate apples',
        timestamp: new Date(),
      },
    ];

    const stored = await memory.extractAndStore(conversation);
    expect(stored).toHaveLength(1);

    // The old memory should be archived due to contradiction resolution
    const old = await storage.read(first.id);
    expect(old).not.toBeNull();
    expect(old!.lifecycle).toBe(MemoryLifecycle.ARCHIVED);
  });

  it('rejects new memory when existing has higher confidence', async () => {
    const storage = memory.getStorage();

    // Existing memory with very high confidence
    const existing = {
      id: crypto.randomUUID(),
      tenantId: 'default',
      ownerId: 'default',
      content: 'User loves apples',
      type: MemoryType.PREFERENCE,
      source: MemorySource.USER_STATEMENT,
      importance: MemoryImportance.MEDIUM,
      confidence: 0.99,
      tags: [],
      lifecycle: MemoryLifecycle.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      embeddings: { vector: [0.99, 0.01, 0], model: 'mock', dimensions: 3 },
      version: 1,
      history: [],
    };
    await storage.create(existing);

    // Mock LLM to return a lower-confidence contradictory memory
    mockLLM.setResponse('Analyze the following conversation and extract memorable facts.', [
      {
        content: 'User dislikes apples',
        type: 'preference',
        importance: 'medium',
        confidence: 0.6,
        tags: ['food'],
      },
    ]);

    const conversation: ConversationTurn[] = [
      {
        speaker: 'user',
        content: 'Apples are okay I guess',
        timestamp: new Date(),
      },
    ];

    const stored = await memory.extractAndStore(conversation);
    // The new memory should be rejected because existing has higher confidence
    expect(stored).toHaveLength(0);
  });

  it('closes the storage adapter', async () => {
    await memory.close();
    const storage = memory.getStorage();
    expect(storage).toBeDefined();
  });
});
