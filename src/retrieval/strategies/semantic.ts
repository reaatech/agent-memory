import type { Memory } from '@core/types.js';
import type { EmbeddingProvider } from '@embedding/types.js';
import type { MemoryStorage, SearchOptions } from '@storage/types.js';
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
    embeddingProvider: EmbeddingProvider
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
