import { MemoryLifecycle, ContradictionStrategy } from '@core/types.js';
import type { Memory, MemoryType } from '@core/types.js';
import type { MemoryEventBus } from '@events/types.js';
import { InMemoryMemoryStorage } from '@storage/in-memory.js';
import type { MemoryStorage, PostgresConfig } from '@storage/index.js';
import { PostgresMemoryStorage } from '@storage/postgres.js';
import { MemoryRetriever } from '@retrieval/retriever.js';
import { RetrievalStrategy } from '@retrieval/types.js';
import type { RetrievalConfig, RetrievalOptions } from '@retrieval/types.js';
import { PolicyEngine } from '@policies/engine.js';
import type {
  DecayConfig,
  ForgettingConfig,
  ContradictionConfig,
  PolicyRule,
} from '@policies/types.js';
import { MemoryExtractor } from '@extraction/extractor.js';
import type { ExtractionConfig, ConversationTurn } from '@extraction/types.js';
import { InMemoryEventBus } from '@events/bus.js';
import type { EmbeddingProvider } from '@embedding/types.js';
import type { LLMProvider } from '@llm/types.js';
import { OpenAIEmbeddingProvider } from '@embedding/openai-provider.js';
import { CohereEmbeddingProvider } from '@embedding/cohere-provider.js';
import { HuggingFaceEmbeddingProvider } from '@embedding/huggingface-provider.js';
import { InMemoryEmbeddingCache } from '@embedding/cache.js';
import { CachedEmbeddingProvider } from '@embedding/cached-provider.js';
import type { EmbeddingCache } from '@embedding/types.js';
import { ContradictionDetector } from '@policies/contradiction-detector.js';
import { getLogger } from './utils/logger.js';

/**
 * Configuration for the AgentMemory facade.
 */
export interface AgentMemoryConfig {
  /** Storage backend configuration */
  storage: MemoryStorage | StorageConfig;
  /** Embedding provider configuration */
  embedding: EmbeddingProvider | EmbeddingConfig;
  /** Memory extraction configuration */
  extraction: ExtractionConfig & { llmProvider: LLMProvider; enabledTypes: MemoryType[] };
  /** Tenant isolation identifier (defaults to 'default') */
  tenantId?: string;
  /** Owner identifier (defaults to 'default') */
  ownerId?: string;
  /** Retrieval configuration (optional) */
  retrieval?: Partial<RetrievalConfig>;
  /** Policy engine configuration (optional) */
  policies?: {
    decay?: Partial<DecayConfig>;
    forgetting?: Partial<ForgettingConfig>;
    contradiction?: Partial<ContradictionConfig>;
    rules?: PolicyRule[];
  };
  /** Event bus instance (optional, defaults to InMemoryEventBus) */
  events?: MemoryEventBus;
  /** Embedding cache (optional, defaults to InMemoryEmbeddingCache with 1000 entries) */
  embeddingCache?: EmbeddingCache;
}

/** Storage backend configuration. */
export interface StorageConfig {
  provider: 'memory' | 'postgres';
  connection?: PostgresConfig;
}

/** Embedding provider configuration. */
export interface EmbeddingConfig {
  provider: 'openai' | 'cohere' | 'huggingface';
  model: string;
  apiKey: string;
  dimensions?: number;
  baseUrl?: string;
}

function isMemoryStorage(value: MemoryStorage | StorageConfig): value is MemoryStorage {
  return 'create' in value && typeof value.create === 'function';
}

function createStorage(config: MemoryStorage | StorageConfig): MemoryStorage {
  if (isMemoryStorage(config)) {
    return config;
  }
  switch (config.provider) {
    case 'memory':
      return new InMemoryMemoryStorage();
    case 'postgres': {
      if (!config.connection) {
        throw new Error('Postgres storage requires a connection config');
      }
      return new PostgresMemoryStorage(config.connection);
    }
    default:
      throw new Error(`Unknown storage provider: ${String(config.provider)}`);
  }
}

function isEmbeddingProvider(
  value: EmbeddingProvider | EmbeddingConfig
): value is EmbeddingProvider {
  return 'embed' in value && typeof value.embed === 'function';
}

function createEmbeddingProvider(config: EmbeddingProvider | EmbeddingConfig): EmbeddingProvider {
  if (isEmbeddingProvider(config)) {
    return config;
  }
  switch (config.provider) {
    case 'openai':
      return new OpenAIEmbeddingProvider({
        apiKey: config.apiKey,
        model: config.model,
        dimensions: config.dimensions,
        baseUrl: config.baseUrl,
      });
    case 'cohere':
      return new CohereEmbeddingProvider({
        apiKey: config.apiKey,
        model: config.model,
        dimensions: config.dimensions,
      });
    case 'huggingface':
      return new HuggingFaceEmbeddingProvider({
        apiKey: config.apiKey,
        model: config.model,
      });
    default:
      throw new Error(`Unknown embedding provider: ${String(config.provider)}`);
  }
}

const DEFAULT_DECAY_CONFIG: DecayConfig = {
  halfLifeDays: {
    critical: 3650,
    high: 365,
    medium: 90,
    low: 30,
    transient: 7,
  },
  usageBoostFactor: 0.5,
  minimumThreshold: 0.05,
};

const DEFAULT_FORGETTING_CONFIG: ForgettingConfig = {
  forgetThreshold: 0.1,
  capacityLimit: 10000,
  archiveBeforeDelete: true,
};

const DEFAULT_CONTRADICTION_CONFIG: ContradictionConfig = {
  defaultStrategy: ContradictionStrategy.HIGHEST_CONFIDENCE,
  similarityThreshold: 0.8,
  autoResolve: true,
};

const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  defaultLimit: 5,
  useCrossEncoder: false,
  diversityFactor: 0.3,
  strategies: [RetrievalStrategy.SEMANTIC],
};

/**
 * High-level facade for the agent-memory system.
 *
 * Provides a single entry point for memory extraction, storage,
 * retrieval, and lifecycle management.
 *
 * @example
 * ```typescript
 * const memory = new AgentMemory({
 *   storage: { provider: 'postgres', connection: { host: 'localhost', database: 'agent_memory', user: 'postgres', password: process.env.DB_PASSWORD, schema: 'public' } },
 *   embedding: { provider: 'openai', model: 'text-embedding-3-small', apiKey: process.env.OPENAI_API_KEY },
 *   extraction: { llmProvider: openai, enabledTypes: ['fact', 'preference', 'correction'], batchSize: 10, confidenceThreshold: 0.7 },
 * });
 *
 * await memory.extractAndStore(conversationTurns);
 * const relevant = await memory.retrieve('What does the user like?', { limit: 5 });
 * ```
 */
export class AgentMemory {
  private storage: MemoryStorage;
  private embeddingProvider: EmbeddingProvider;
  private extractor: MemoryExtractor;
  private retriever: MemoryRetriever;
  private policyEngine: PolicyEngine;
  private contradictionDetector: ContradictionDetector;
  private contradictionConfig: { autoResolve: boolean };
  readonly events: MemoryEventBus;

  constructor(config: AgentMemoryConfig) {
    this.storage = createStorage(config.storage);
    const rawEmbeddingProvider = createEmbeddingProvider(config.embedding);
    const cache = config.embeddingCache ?? new InMemoryEmbeddingCache();
    this.embeddingProvider = new CachedEmbeddingProvider(rawEmbeddingProvider, cache);
    this.extractor = new MemoryExtractor(config.extraction.llmProvider, this.embeddingProvider, {
      batchSize: config.extraction.batchSize,
      confidenceThreshold: config.extraction.confidenceThreshold,
      enabledTypes: config.extraction.enabledTypes,
      tenantId: config.tenantId ?? 'default',
      ownerId: config.ownerId ?? 'default',
    });
    this.events = config.events ?? new InMemoryEventBus();

    const retrievalConfig: RetrievalConfig = {
      ...DEFAULT_RETRIEVAL_CONFIG,
      ...config.retrieval,
    };
    this.retriever = new MemoryRetriever(this.storage, this.embeddingProvider, retrievalConfig);

    const decayConfig: DecayConfig = {
      ...DEFAULT_DECAY_CONFIG,
      ...config.policies?.decay,
      halfLifeDays: {
        ...DEFAULT_DECAY_CONFIG.halfLifeDays,
        ...config.policies?.decay?.halfLifeDays,
      },
    };
    const forgettingConfig: ForgettingConfig = {
      ...DEFAULT_FORGETTING_CONFIG,
      ...config.policies?.forgetting,
    };
    const contradictionConfig = {
      ...DEFAULT_CONTRADICTION_CONFIG,
      ...config.policies?.contradiction,
    };

    this.policyEngine = new PolicyEngine(
      decayConfig,
      forgettingConfig,
      contradictionConfig,
      config.policies?.rules ?? []
    );
    this.contradictionDetector = new ContradictionDetector(contradictionConfig.similarityThreshold);
    this.contradictionConfig = contradictionConfig;
  }

  /**
   * Extract memorable facts from a conversation and store them.
   *
   * Automatically detects contradictions with existing memories and
   * resolves them according to the configured policy.
   */
  async extractAndStore(conversation: ConversationTurn[]): Promise<Memory[]> {
    const extractionResult = await this.extractor.extractFromConversation(conversation);

    const decisions = await Promise.all(
      extractionResult.candidates.map(async (memory) => {
        const existing = await this.storage.searchSimilar(memory.embeddings.vector, {
          tenantId: memory.tenantId,
          limit: 20,
        });
        const contradictions = this.contradictionDetector.detect(memory, existing);
        const decision = await this.policyEngine.evaluateContradiction(
          memory,
          existing,
          contradictions
        );
        return { memory, existing, contradictions, decision };
      })
    );

    const stored: Memory[] = [];
    for (const { memory, contradictions, decision } of decisions) {
      const hasContradictions = contradictions.length > 0;

      if (hasContradictions) {
        await this.events.emit({
          type: 'memory:contradiction:resolved',
          timestamp: new Date(),
          tenantId: memory.tenantId,
          payload: { decision, contradictions },
        });

        for (const c of contradictions) {
          await this.storage
            .recordContradiction(memory.id, c.existingMemory.id, c.similarity)
            .catch((err: unknown) => {
              getLogger().warn(
                `Failed to persist contradiction record for memory ${memory.id}: ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
            });
        }
      }

      if (decision.action === 'reject') {
        continue;
      }

      if (decision.action === 'review' && !this.contradictionConfig.autoResolve) {
        await this.events.emit({
          type: 'memory:contradiction:pending_review',
          timestamp: new Date(),
          tenantId: memory.tenantId,
          payload: { memory, contradictions, reason: 'auto_resolve_disabled' },
        });
        continue;
      }

      if (decision.action === 'replace' && decision.archiveIds) {
        for (const id of decision.archiveIds) {
          await this.storage.update(id, { lifecycle: MemoryLifecycle.ARCHIVED });
        }
      }

      const created = await this.storage.create(memory);
      stored.push(created);

      await this.events.emit({
        type: 'memory:stored',
        timestamp: new Date(),
        tenantId: memory.tenantId,
        payload: { memory: created },
      });
    }

    await this.events.emit({
      type: 'memory:extracted',
      timestamp: new Date(),
      tenantId: extractionResult.candidates[0]?.tenantId ?? 'default',
      payload: { count: stored.length, candidates: extractionResult.candidates },
    });

    return stored;
  }

  /**
   * Retrieve memories relevant to a query context.
   */
  async retrieve(context: string, options?: Partial<RetrievalOptions>): Promise<Memory[]> {
    const results = await this.retriever.retrieve(context, options);

    await this.events.emit({
      type: 'memory:retrieved',
      timestamp: new Date(),
      tenantId: options?.tenantId ?? 'default',
      payload: { context, count: results.length, memories: results },
    });

    return results;
  }

  /**
   * Run the decay and forgetting policies over all active memories.
   *
   * This is typically invoked by a scheduled job (e.g., daily).
   */
  async runMaintenance(tenantId?: string): Promise<void> {
    const tenantMemories = await this.storage.searchByMetadata({}, tenantId);

    const decisions = await this.policyEngine.evaluateForgettingBatch(tenantMemories, {
      tenantId: tenantId ?? 'default',
      currentMemoryCount: tenantMemories.length,
    });

    for (let i = 0; i < tenantMemories.length; i++) {
      const memory = tenantMemories[i];
      const decision = decisions[i];
      if (decision.action === 'forget') {
        await this.storage.delete(memory.id);
        await this.events.emit({
          type: 'memory:forgotten',
          timestamp: new Date(),
          tenantId: memory.tenantId,
          payload: { memoryId: memory.id, reason: decision.reason },
        });
      } else if (decision.action === 'archive') {
        await this.storage.update(memory.id, { lifecycle: MemoryLifecycle.ARCHIVED });
        await this.events.emit({
          type: 'memory:forgotten',
          timestamp: new Date(),
          tenantId: memory.tenantId,
          payload: { memoryId: memory.id, reason: decision.reason },
        });
      }
    }
  }

  /**
   * Direct access to the underlying storage adapter.
   */
  getStorage(): MemoryStorage {
    return this.storage;
  }

  /**
   * Close the storage adapter and release resources.
   */
  async close(): Promise<void> {
    await this.storage.close();
  }
}
