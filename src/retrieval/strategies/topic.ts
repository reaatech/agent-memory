import type { Memory } from '@core/types.js';
import { MemoryQuery } from '@storage/types.js';
import type { EmbeddingProvider } from '@embedding/types.js';
import type { MemoryStorage } from '@storage/types.js';
import type { RetrievalOptions } from '../types.js';
import type { RetrievalStrategyBase } from './base.js';
import { matchesMetadataFilter } from './_utils.js';

const CATEGORY_MATCH_WEIGHT = 3;
const TAG_MATCH_WEIGHT = 2;

function isWordMatch(text: string, word: string): boolean {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
}

function splitWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 0);
}

/**
 * Retrieves memories by category/tag matching against the query context.
 *
 * Words from the context are matched against memory categories and tags
 * using word-boundary regex to avoid false positives from substring matches.
 * Only memories with a non-zero topic score are returned.
 */
export class TopicBasedRetrievalStrategy implements RetrievalStrategyBase {
  async retrieve(
    context: string,
    options: RetrievalOptions,
    storage: MemoryStorage,
    _embeddingProvider: EmbeddingProvider
  ): Promise<Memory[]> {
    const fetchLimit = (options.limit ?? 10) * 4;

    const query = new MemoryQuery().limit(fetchLimit);
    if (options.tenantId) {
      query.byTenant(options.tenantId);
    }
    let results = await query.execute(storage);

    if (options.filters) {
      results = results.filter((m) => matchesMetadataFilter(m, options.filters));
    }

    const contextWords = splitWords(context);

    if (contextWords.length === 0) {
      return results.slice(0, options.limit ?? 10);
    }

    const scored = results
      .map((memory) => {
        let score = 0;
        if (memory.category) {
          for (const word of contextWords) {
            if (isWordMatch(memory.category, word)) {
              score += CATEGORY_MATCH_WEIGHT;
            }
          }
        }
        for (const tag of memory.tags) {
          for (const word of contextWords) {
            if (isWordMatch(tag, word)) {
              score += TAG_MATCH_WEIGHT;
            }
          }
        }
        return { memory, score };
      })
      .filter((s) => s.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.memory).slice(0, options.limit ?? 10);
  }
}
