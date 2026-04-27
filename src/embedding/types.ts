/**
 * Embedding provider abstraction.
 *
 * The system is not tied to a single embedding provider.
 * Users can swap models, but changing models requires re-embedding.
 */
export interface EmbeddingProvider {
  /** Embed a single text into a vector */
  embed(text: string): Promise<number[]>;
  /** Embed multiple texts in a single batch */
  embedBatch(texts: string[]): Promise<number[][]>;
  /** Return model metadata */
  getModelInfo(): ModelInfo;
}

export interface ModelInfo {
  name: string;
  dimensions: number;
  maxInputLength: number;
}

/**
 * Cache for embedding vectors.
 *
 * Keys may be plain text or hashed identifiers.
 * The default implementation ({@link InMemoryEmbeddingCache}) uses
 * SHA-256 hashes via the {@link InMemoryEmbeddingCache.keyFor} static method
 * to avoid storing potentially sensitive content in memory.
 */
export interface EmbeddingCache {
  /** Retrieve a cached embedding by key. */
  get(key: string): Promise<number[] | null>;
  /** Store an embedding vector with the given key. */
  set(key: string, vector: number[]): Promise<void>;
}
