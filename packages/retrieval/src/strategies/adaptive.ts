import type { Memory } from '@reaatech/agent-memory-core';
import type { EmbeddingProvider } from '@reaatech/agent-memory-embedding';
import type { MemoryStorage } from '@reaatech/agent-memory-storage';
import type { RetrievalOptions } from '../types.js';
import type { RetrievalStrategyBase } from './base.js';

export interface StrategyWeight {
  strategy: RetrievalStrategyBase;
  weight: number;
}

/**
 * Combines multiple strategies with configurable weights.
 *
 * At least one strategy with a positive weight is required.
 */
export class AdaptiveRetrievalStrategy implements RetrievalStrategyBase {
  constructor(private weights: StrategyWeight[]) {
    if (weights.length === 0) {
      throw new Error('AdaptiveRetrievalStrategy requires at least one strategy weight');
    }
    for (const { weight } of weights) {
      if (weight < 0) {
        throw new Error(`Strategy weight must be non-negative, got ${weight}`);
      }
      if (!Number.isFinite(weight)) {
        throw new Error(`Strategy weight must be a finite number, got ${weight}`);
      }
    }
  }

  async retrieve(
    context: string,
    options: RetrievalOptions,
    storage: MemoryStorage,
    embeddingProvider: EmbeddingProvider,
  ): Promise<Memory[]> {
    const allResults = await Promise.all(
      this.weights.map(async ({ strategy, weight }) => {
        const memories = await strategy.retrieve(context, options, storage, embeddingProvider);
        return memories.map((memory) => ({ memory, score: weight }));
      }),
    );

    const memoryMap = new Map<string, { memory: Memory; score: number }>();
    for (const batch of allResults) {
      for (const { memory, score } of batch) {
        const existing = memoryMap.get(memory.id);
        if (existing) {
          existing.score += score;
        } else {
          memoryMap.set(memory.id, { memory, score });
        }
      }
    }

    const combined = Array.from(memoryMap.values());
    combined.sort((a, b) => b.score - a.score);
    return combined.map((c) => c.memory).slice(0, (options.limit ?? 10) * 2);
  }
}
