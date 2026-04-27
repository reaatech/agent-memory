import type { Memory } from '@core/types.js';
import { MemoryQuery } from '@storage/types.js';
import type { EmbeddingProvider } from '@embedding/types.js';
import type { MemoryStorage } from '@storage/types.js';
import type { RetrievalOptions } from '../types.js';
import type { RetrievalStrategyBase } from './base.js';
import { cosineSimilarity } from '@core/math.js';
import { matchesMetadataFilter } from './_utils.js';

/**
 * Retrieves the most recently accessed memories,
 * with optional semantic filtering when context is provided.
 */
export class RecencyRetrievalStrategy implements RetrievalStrategyBase {
  async retrieve(
    context: string,
    options: RetrievalOptions,
    storage: MemoryStorage,
    embeddingProvider: EmbeddingProvider
  ): Promise<Memory[]> {
    const requestLimit = options.limit ?? 10;
    const fetchLimit = requestLimit * 4;

    const query = new MemoryQuery().orderBy('lastAccessedAt', 'desc').limit(fetchLimit);
    if (options.tenantId) {
      query.byTenant(options.tenantId);
    }
    let results = await query.execute(storage);

    if (options.filters) {
      results = results.filter((m) => matchesMetadataFilter(m, options.filters));
    }

    if (context.trim().length > 0) {
      const queryVector = await embeddingProvider.embed(context);
      const scored = results.map((memory) => ({
        memory,
        score: cosineSimilarity(queryVector, memory.embeddings.vector),
      }));
      scored.sort((a, b) => b.score - a.score);
      results = scored.map((s) => s.memory);
    }

    return results.slice(0, requestLimit * 2);
  }
}
