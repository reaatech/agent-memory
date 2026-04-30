import type { Memory } from '@reaatech/agent-memory-core';
import type { EmbeddingProvider } from '@reaatech/agent-memory-embedding';
import type { MemoryStorage, SearchOptions } from '@reaatech/agent-memory-storage';
import type { RetrievalOptions } from '../types.js';
import type { RetrievalStrategyBase } from './base.js';

/**
 * Retrieves memories using semantic similarity search.
 */
export class SemanticRetrievalStrategy implements RetrievalStrategyBase {
  async retrieve(
    context: string,
    options: RetrievalOptions,
    storage: MemoryStorage,
    embeddingProvider: EmbeddingProvider,
  ): Promise<Memory[]> {
    const queryVector = await embeddingProvider.embed(context);

    const searchOptions: SearchOptions = {
      tenantId: options.tenantId ?? 'default',
      limit: (options.limit ?? 10) * 2,
      filters: options.filters,
    };

    return storage.searchSimilar(queryVector, searchOptions);
  }
}
