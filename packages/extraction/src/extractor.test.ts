import { MemoryImportance, MemoryType } from '@reaatech/agent-memory-core';
import type { EmbeddingProvider, ModelInfo } from '@reaatech/agent-memory-embedding';
import type { LLMProvider } from '@reaatech/agent-memory-llm';
import { describe, expect, it } from 'vitest';
import { MemoryExtractor } from './extractor.js';
import type { ConversationTurn } from './types.js';

class MockLLMProvider implements LLMProvider {
  async complete(_prompt: string): Promise<string> {
    return '';
  }

  async completeStructured<T>(_prompt: string, _schema: object): Promise<T> {
    return [
      {
        content: 'User prefers dark mode',
        type: 'preference',
        importance: 'high',
        confidence: 0.9,
        tags: ['ui', 'preference'],
      },
      {
        content: 'User lives in Seattle',
        type: 'fact',
        importance: 'medium',
        confidence: 0.85,
        tags: ['location'],
      },
    ] as unknown as T;
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

describe('MemoryExtractor', () => {
  it('extracts memories from conversation', async () => {
    const extractor = new MemoryExtractor(new MockLLMProvider(), new MockEmbeddingProvider(), {
      batchSize: 10,
      confidenceThreshold: 0.5,
      enabledTypes: Object.values(MemoryType),
      tenantId: 'test-tenant',
      ownerId: 'test-owner',
    });

    const conversation: ConversationTurn[] = [
      {
        speaker: 'user',
        content: 'I prefer dark mode and I live in Seattle',
        timestamp: new Date(),
      },
    ];

    const result = await extractor.extractFromConversation(conversation);

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]!.content).toBe('User prefers dark mode');
    expect(result.candidates[0]!.importance).toBe(MemoryImportance.HIGH);
    expect(result.candidates[1]!.type).toBe(MemoryType.FACT);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('filters by enabled types', async () => {
    const extractor = new MemoryExtractor(new MockLLMProvider(), new MockEmbeddingProvider(), {
      batchSize: 10,
      confidenceThreshold: 0.5,
      enabledTypes: [MemoryType.FACT],
      tenantId: 'test-tenant',
      ownerId: 'test-owner',
    });

    const conversation: ConversationTurn[] = [
      {
        speaker: 'user',
        content: 'test',
        timestamp: new Date(),
      },
    ];

    const result = await extractor.extractFromConversation(conversation);
    expect(result.candidates.every((c) => c.type === MemoryType.FACT)).toBe(true);
  });

  it('filters by confidence threshold', async () => {
    const extractor = new MemoryExtractor(new MockLLMProvider(), new MockEmbeddingProvider(), {
      batchSize: 10,
      confidenceThreshold: 0.95,
      enabledTypes: Object.values(MemoryType),
      tenantId: 'test-tenant',
      ownerId: 'test-owner',
    });

    const conversation: ConversationTurn[] = [
      {
        speaker: 'user',
        content: 'test',
        timestamp: new Date(),
      },
    ];

    const result = await extractor.extractFromConversation(conversation);
    expect(result.candidates).toHaveLength(0);
  });
});
