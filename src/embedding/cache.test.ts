import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEmbeddingCache } from './cache.js';

describe('InMemoryEmbeddingCache', () => {
  let cache: InMemoryEmbeddingCache;

  beforeEach(() => {
    cache = new InMemoryEmbeddingCache();
  });

  it('returns null for missing keys', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('stores and retrieves embeddings', async () => {
    const vector = [0.1, 0.2, 0.3];
    await cache.set('key1', vector);
    const result = await cache.get('key1');
    expect(result).toEqual(vector);
  });

  it('returns a copy-like equality (same array contents)', async () => {
    const vector = [0.1, 0.2, 0.3];
    await cache.set('key1', vector);
    const result = await cache.get('key1');
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it('tracks size correctly', async () => {
    expect(cache.size()).toBe(0);
    await cache.set('a', [1]);
    expect(cache.size()).toBe(1);
    await cache.set('b', [2]);
    expect(cache.size()).toBe(2);
  });

  it('clears all entries', async () => {
    await cache.set('a', [1]);
    await cache.set('b', [2]);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(await cache.get('a')).toBeNull();
  });

  it('generates consistent keys with keyFor', () => {
    const key1 = InMemoryEmbeddingCache.keyFor('hello world');
    const key2 = InMemoryEmbeddingCache.keyFor('hello world');
    const key3 = InMemoryEmbeddingCache.keyFor('goodbye');
    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1.startsWith('emb_')).toBe(true);
  });

  it('evicts least recently used entries when maxSize is reached', async () => {
    const lruCache = new InMemoryEmbeddingCache({ maxSize: 3 });
    await lruCache.set('a', [1]);
    await lruCache.set('b', [2]);
    await lruCache.set('c', [3]);
    // access 'a' so it becomes most recently used
    await lruCache.get('a');
    // add 'd' - should evict 'b' (least recently used)
    await lruCache.set('d', [4]);
    expect(await lruCache.get('a')).toEqual([1]);
    expect(await lruCache.get('b')).toBeNull();
    expect(await lruCache.get('c')).toEqual([3]);
    expect(await lruCache.get('d')).toEqual([4]);
  });

  it('updates LRU order on set of existing key', async () => {
    const lruCache = new InMemoryEmbeddingCache({ maxSize: 2 });
    await lruCache.set('a', [1]);
    await lruCache.set('b', [2]);
    // re-set 'a' so it becomes most recently used
    await lruCache.set('a', [10]);
    // add 'c' - should evict 'b'
    await lruCache.set('c', [3]);
    expect(await lruCache.get('a')).toEqual([10]);
    expect(await lruCache.get('b')).toBeNull();
    expect(await lruCache.get('c')).toEqual([3]);
  });

  it('expires entries after TTL', async () => {
    const ttlCache = new InMemoryEmbeddingCache({ ttlMs: 50 });
    await ttlCache.set('a', [1]);
    expect(await ttlCache.get('a')).toEqual([1]);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(await ttlCache.get('a')).toBeNull();
  });

  it('does not expire entries before TTL', async () => {
    const ttlCache = new InMemoryEmbeddingCache({ ttlMs: 500 });
    await ttlCache.set('a', [1]);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(await ttlCache.get('a')).toEqual([1]);
  });

  it('handles concurrent sets safely', async () => {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 100; i++) {
      promises.push(cache.set(`key-${i}`, [i]));
    }
    await Promise.all(promises);
    expect(cache.size()).toBe(100);
    for (let i = 0; i < 100; i++) {
      expect(await cache.get(`key-${i}`)).toEqual([i]);
    }
  });

  it('handles concurrent gets safely', async () => {
    await cache.set('shared', [1, 2, 3]);
    const promises = Array.from({ length: 50 }, () => cache.get('shared'));
    const results = await Promise.all(promises);
    expect(results.every((r) => r !== null && r[0] === 1)).toBe(true);
  });

  it('combines TTL and maxSize', async () => {
    const combinedCache = new InMemoryEmbeddingCache({ maxSize: 2, ttlMs: 50 });
    await combinedCache.set('a', [1]);
    await combinedCache.set('b', [2]);
    expect(combinedCache.size()).toBe(2);

    // Wait for TTL
    await new Promise((resolve) => setTimeout(resolve, 60));
    // expired entries are lazily removed on get, but still count in size
    expect(await combinedCache.get('a')).toBeNull();
    expect(await combinedCache.get('b')).toBeNull();
  });
});
