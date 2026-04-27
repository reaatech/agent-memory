import type { Memory } from '@core/types.js';
import type { EmbeddingProvider } from '@embedding/types.js';
import type { MemoryStorage } from '@storage/types.js';
import type { RetrievalOptions } from '../types.js';

/**
 * Base interface for all retrieval strategies.
 */
export interface RetrievalStrategyBase {
  retrieve(
    context: string,
    options: RetrievalOptions,
    storage: MemoryStorage,
    embeddingProvider: EmbeddingProvider
  ): Promise<Memory[]>;
}
