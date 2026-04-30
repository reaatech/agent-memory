import { describe, expect, it, vi } from 'vitest';
import { InMemoryEmbeddingCache } from './cache.js';
import { CachedEmbeddingProvider } from './cached-provider.js';
import type { EmbeddingProvider, ModelInfo } from './types.js';

function createMockProvider(): EmbeddingProvider & {
  embed: ReturnType<typeof vi.fn>;
  embedBatch: ReturnType<typeof vi.fn>;
} {
  return {
    embed: vi.fn().mockResolvedValue([1, 2, 3]),
    embedBatch: vi
      .fn()
      .mockImplementation((texts: string[]) => Promise.resolve(texts.map(() => [4, 5, 6]))),
    getModelInfo: (): ModelInfo => ({ name: 'mock', dimensions: 3, maxInputLength: 100 }),
  };
}

describe('CachedEmbeddingProvider', () => {
  it('caches single embeddings', async () => {
    const inner = createMockProvider();
    const cache = new InMemoryEmbeddingCache({ maxSize: 10 });
    const provider = new CachedEmbeddingProvider(inner, cache);

    const result1 = await provider.embed('hello');
    const result2 = await provider.embed('hello');

    expect(result1).toEqual([1, 2, 3]);
    expect(result2).toEqual([1, 2, 3]);
    expect(inner.embed).toHaveBeenCalledTimes(1);
  });

  it('caches batch embeddings', async () => {
    const inner = createMockProvider();
    const cache = new InMemoryEmbeddingCache({ maxSize: 10 });
    const provider = new CachedEmbeddingProvider(inner, cache);

    const result1 = await provider.embedBatch(['hello', 'world']);
    const result2 = await provider.embedBatch(['hello', 'world']);

    expect(result1).toEqual([
      [4, 5, 6],
      [4, 5, 6],
    ]);
    expect(result2).toEqual([
      [4, 5, 6],
      [4, 5, 6],
    ]);
    expect(inner.embedBatch).toHaveBeenCalledTimes(1);
  });

  it('partially fills cache for partial batch hits', async () => {
    const inner = createMockProvider();
    const cache = new InMemoryEmbeddingCache({ maxSize: 10 });
    const provider = new CachedEmbeddingProvider(inner, cache);

    await provider.embed('hello');
    inner.embed.mockClear();
    inner.embedBatch.mockClear();

    const result = await provider.embedBatch(['hello', 'new-word']);

    expect(result).toHaveLength(2);
    expect(inner.embedBatch).toHaveBeenCalledTimes(1);
    expect(inner.embedBatch).toHaveBeenCalledWith(['new-word']);
  });

  it('returns cached results when all batch hits', async () => {
    const inner = createMockProvider();
    const cache = new InMemoryEmbeddingCache({ maxSize: 10 });
    const provider = new CachedEmbeddingProvider(inner, cache);

    await provider.embedBatch(['a', 'b']);
    inner.embedBatch.mockClear();

    const result = await provider.embedBatch(['a', 'b']);

    expect(result).toEqual([
      [4, 5, 6],
      [4, 5, 6],
    ]);
    expect(inner.embedBatch).not.toHaveBeenCalled();
  });

  it('delegates getModelInfo to inner provider', () => {
    const inner = createMockProvider();
    const provider = new CachedEmbeddingProvider(inner);

    expect(provider.getModelInfo()).toEqual({ name: 'mock', dimensions: 3, maxInputLength: 100 });
  });

  it('uses default cache when none provided', async () => {
    const inner = createMockProvider();
    const provider = new CachedEmbeddingProvider(inner);

    await provider.embed('test');
    await provider.embed('test');

    expect(inner.embed).toHaveBeenCalledTimes(1);
  });
});
