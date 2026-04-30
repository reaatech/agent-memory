import type { Memory } from '@reaatech/agent-memory-core';
import { MemoryImportance } from '@reaatech/agent-memory-core';
import type { EmbeddingProvider } from '@reaatech/agent-memory-embedding';
import type { MemoryStorage, SearchOptions } from '@reaatech/agent-memory-storage';
import type { RetrievalOptions } from '../types.js';
import type { RetrievalStrategyBase } from './base.js';

const importanceScore: Record<MemoryImportance, number> = {
  [MemoryImportance.CRITICAL]: 5,
  [MemoryImportance.HIGH]: 4,
  [MemoryImportance.MEDIUM]: 3,
  [MemoryImportance.LOW]: 2,
  [MemoryImportance.TRANSIENT]: 1,
};

/**
 * Retrieves highest-importance memories matching the query.
 */
export class ImportanceRetrievalStrategy implements RetrievalStrategyBase {
  async retrieve(
    context: string,
    options: RetrievalOptions,
    storage: MemoryStorage,
    embeddingProvider: EmbeddingProvider,
  ): Promise<Memory[]> {
    const queryVector = await embeddingProvider.embed(context);

    const searchOptions: SearchOptions = {
      tenantId: options.tenantId ?? 'default',
      limit: (options.limit ?? 10) * 4,
      filters: options.filters,
    };

    const results = await storage.searchSimilar(queryVector, searchOptions);

    return results
      .sort((a, b) => importanceScore[b.importance] - importanceScore[a.importance])
      .slice(0, (options.limit ?? 10) * 2);
  }
}
