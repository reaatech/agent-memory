import { InMemoryEmbeddingCache } from './cache.js';
import type { EmbeddingCache, EmbeddingProvider, ModelInfo } from './types.js';

/**
 * Wraps an EmbeddingProvider with an LRU cache.
 *
 * Uses SHA-256 hashed cache keys (via {@link InMemoryEmbeddingCache.keyFor})
 * to avoid storing plaintext content in the cache.
 */
export class CachedEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private inner: EmbeddingProvider,
    private cache: EmbeddingCache = new InMemoryEmbeddingCache(),
  ) {}

  async embed(text: string): Promise<number[]> {
    const key = InMemoryEmbeddingCache.keyFor(text);
    const cached = await this.cache.get(key);
    if (cached) {
      return cached;
    }
    const vector = await this.inner.embed(text);
    await this.cache.set(key, vector);
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const keys = texts.map((t) => InMemoryEmbeddingCache.keyFor(t));
    const cachedResults: (number[] | null)[] = await Promise.all(
      keys.map((k) => this.cache.get(k)),
    );

    const uncachedEntries: { index: number; text: string }[] = [];
    for (let i = 0; i < cachedResults.length; i++) {
      if (cachedResults[i] === null) {
        uncachedEntries.push({ index: i, text: texts[i] ?? '' });
      }
    }

    if (uncachedEntries.length > 0) {
      const uncachedTexts = uncachedEntries.map((e) => e.text);
      const newVectors = await this.inner.embedBatch(uncachedTexts);
      const cachePromises: Promise<void>[] = [];
      uncachedEntries.forEach((entry, batchIdx) => {
        const vector = newVectors[batchIdx] ?? [];
        const key = keys[entry.index] ?? '';
        cachedResults[entry.index] = vector;
        cachePromises.push(this.cache.set(key, vector));
      });
      await Promise.all(cachePromises);
    }

    const result = cachedResults.filter((v): v is number[] => v !== null);
    if (result.length !== texts.length) {
      throw new Error(`embedBatch returned ${result.length} vectors, expected ${texts.length}`);
    }
    return result;
  }

  getModelInfo(): ModelInfo {
    return this.inner.getModelInfo();
  }
}
