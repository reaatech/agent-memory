import type { MetadataFilter } from '@storage/types.js';

/**
 * Options for retrieving relevant memories.
 */
export interface RetrievalOptions {
  /** Maximum memories to return */
  limit?: number;
  /** Metadata filters */
  filters?: MetadataFilter;
  /** Tenant isolation filter */
  tenantId?: string;
  /** Whether to use cross-encoder re-ranking */
  useCrossEncoder?: boolean;
  /** Diversity factor (0 = no diversification, 1 = maximum) */
  diversityFactor?: number;
  /** Active retrieval strategy for this query */
  strategy?: RetrievalStrategy;
}

/**
 * Configuration for the memory retriever.
 */
export interface RetrievalConfig {
  /** Default number of memories to retrieve */
  defaultLimit: number;
  /** Whether to enable cross-encoder re-ranking */
  useCrossEncoder: boolean;
  /** Diversity factor for result set */
  diversityFactor: number;
  /** Active retrieval strategies */
  strategies: RetrievalStrategy[];
}

/**
 * Available retrieval strategies.
 */
export enum RetrievalStrategy {
  /** Semantic similarity search */
  SEMANTIC = 'semantic',
  /** Recency-biased search */
  RECENCY = 'recency',
  /** Importance-biased search */
  IMPORTANCE = 'importance',
  /** Topic-based clustering */
  TOPIC = 'topic',
  /** Adaptive combination of strategies */
  ADAPTIVE = 'adaptive',
}
