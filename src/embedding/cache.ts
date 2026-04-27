import type { EmbeddingCache } from './types.js';
import crypto from 'node:crypto';

interface CacheEntry {
  value: number[];
  createdAt: number;
  lastAccessedAt: number;
}

export interface InMemoryEmbeddingCacheOptions {
  /** Maximum number of entries to keep in cache. */
  maxSize?: number;
  /** Time-to-live in milliseconds. */
  ttlMs?: number;
}

/**
 * In-memory embedding cache with TTL and LRU eviction.
 *
 * Keys are SHA-256 hashes of the input text to avoid storing
 * potentially sensitive content in cache keys.
 *
 * LRU eviction is implemented by re-inserting accessed entries
 * so they move to the end of the Map iteration order.
 */
export class InMemoryEmbeddingCache implements EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttlMs: number | undefined;

  constructor(options: InMemoryEmbeddingCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.ttlMs = options.ttlMs;
    if (!Number.isInteger(this.maxSize) || this.maxSize <= 0) {
      throw new RangeError(`maxSize must be a positive integer, got ${this.maxSize}`);
    }
    if (this.ttlMs !== undefined && this.ttlMs <= 0) {
      throw new RangeError(`ttlMs must be a positive integer, got ${this.ttlMs}`);
    }
  }

  async get(key: string): Promise<number[] | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (this.ttlMs !== undefined && Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update LRU order: delete and re-insert
    entry.lastAccessedAt = Date.now();
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  async set(key: string, vector: number[]): Promise<void> {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    // Remove existing entry so re-insertion updates LRU order
    this.cache.delete(key);

    const now = Date.now();
    this.cache.set(key, {
      value: vector,
      createdAt: now,
      lastAccessedAt: now,
    });
  }

  /** Generate a cache key from text content using SHA-256. */
  static keyFor(text: string): string {
    const hash = crypto.createHash('sha256').update(text, 'utf-8').digest('hex');
    return `emb_${hash}`;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
    }
  }
}
