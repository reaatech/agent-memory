import type { Memory } from '@reaatech/agent-memory-core';
import { getLogger } from '@reaatech/agent-memory-core';
import type { EmbeddingProvider } from '@reaatech/agent-memory-embedding';
import type { MemoryStorage } from '@reaatech/agent-memory-storage';
import type { RetrievalStrategyBase } from './strategies/base.js';
import { ImportanceRetrievalStrategy } from './strategies/importance.js';
import { RecencyRetrievalStrategy } from './strategies/recency.js';
import { SemanticRetrievalStrategy } from './strategies/semantic.js';
import { TopicBasedRetrievalStrategy } from './strategies/topic.js';
import { RetrievalStrategy } from './types.js';
import type { RetrievalConfig, RetrievalOptions } from './types.js';

/**
 * Retrieves relevant memories for a given query context.
 *
 * Supports pluggable retrieval strategies with optional
 * re-ranking and result diversification.
 */
export class MemoryRetriever {
  private strategies: Record<string, RetrievalStrategyBase>;

  constructor(
    private storage: MemoryStorage,
    private embeddingProvider: EmbeddingProvider,
    private config: RetrievalConfig,
    strategyOverrides?: Partial<Record<RetrievalStrategy, RetrievalStrategyBase>>,
  ) {
    this.strategies = {
      [RetrievalStrategy.SEMANTIC]: new SemanticRetrievalStrategy(),
      [RetrievalStrategy.RECENCY]: new RecencyRetrievalStrategy(),
      [RetrievalStrategy.IMPORTANCE]: new ImportanceRetrievalStrategy(),
      [RetrievalStrategy.TOPIC]: new TopicBasedRetrievalStrategy(),
      ...strategyOverrides,
    };
  }

  async retrieve(context: string, options?: RetrievalOptions): Promise<Memory[]> {
    const strategy = this.resolveStrategy(options);
    const mergedOptions: RetrievalOptions = {
      ...options,
      limit: options?.limit ?? this.config.defaultLimit,
      tenantId: options?.tenantId ?? 'default',
    };

    let results = await strategy.retrieve(
      context,
      mergedOptions,
      this.storage,
      this.embeddingProvider,
    );

    // Update access times for retrieved memories
    await this.updateAccessTimes(results);

    // Diversify if enabled
    if ((options?.diversityFactor ?? this.config.diversityFactor) > 0) {
      results = this.diversify(results, options?.diversityFactor ?? this.config.diversityFactor);
    }

    return results.slice(0, mergedOptions.limit);
  }

  private resolveStrategy(options?: RetrievalOptions): RetrievalStrategyBase {
    const strategyKey = options?.strategy ?? this.config.strategies[0];
    return this.strategies[strategyKey] ?? this.strategies[RetrievalStrategy.SEMANTIC];
  }

  private diversify(memories: Memory[], factor: number): Memory[] {
    if (factor === 0 || memories.length === 0) return memories;

    const diversified: Memory[] = [];
    const usedCategories = new Set<string>();
    const targetDiverse = Math.floor(memories.length * factor);

    for (const memory of memories) {
      if (diversified.length >= targetDiverse) {
        diversified.push(memory);
        continue;
      }

      if (!memory.category || !usedCategories.has(memory.category)) {
        diversified.push(memory);
        if (memory.category) {
          usedCategories.add(memory.category);
        }
      }
    }

    return diversified;
  }

  private async updateAccessTimes(memories: Memory[]): Promise<void> {
    const now = new Date();
    const updates = memories.map((m) => this.storage.update(m.id, { lastAccessedAt: now }));
    await Promise.all(updates).catch((err: unknown) => {
      getLogger().warn(
        `Failed to update access times for retrieved memories: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }
}
