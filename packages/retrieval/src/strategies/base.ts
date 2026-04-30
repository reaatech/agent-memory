import type { Memory } from '@reaatech/agent-memory-core';
import type { EmbeddingProvider } from '@reaatech/agent-memory-embedding';
import type { MemoryStorage } from '@reaatech/agent-memory-storage';
import type { RetrievalOptions } from '../types.js';

/**
 * Base interface for all retrieval strategies.
 */
export interface RetrievalStrategyBase {
  retrieve(
    context: string,
    options: RetrievalOptions,
    storage: MemoryStorage,
    embeddingProvider: EmbeddingProvider,
  ): Promise<Memory[]>;
}
