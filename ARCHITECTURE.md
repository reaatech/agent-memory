# Architecture: agent-memory

## System Overview

agent-memory is a sophisticated long-term memory system for AI agents, designed to provide persistent memory across sessions. The architecture follows a layered approach with clear separation of concerns, enabling flexibility, scalability, and maintainability.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Chat UI   │  │  Agent SDK  │  │  Custom Integrations    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Memory Management Layer                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    Extractor    │  │    Retriever    │  │  Policy Engine  │  │
│  │   (LLM-based)   │  │  (Semantic +    │  │ (Decay, Forget, │  │
│  │                 │  │   Metadata)     │  │  Contradict)    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Storage Abstraction                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   MemoryStorage Interface                    ││
│  │  create() read() update() delete() search() batch()         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Qdrant        │  │   Pinecone      │  │  PostgreSQL     │
│   Adapter       │  │   Adapter       │  │  pgvector       │
│                 │  │                 │  │  Adapter        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Design Philosophy

agent-memory is built around a single hard problem: **curation**. Most vector-memory systems store everything and retrieve by similarity. That is necessary but not sufficient. An agent that remembers everything indiscriminately will drown in noise, contradict itself, and hallucinate confidently based on stale facts.

This system treats memory as a managed asset with an explicit lifecycle:

1. **Extraction is selective** — Not every turn produces a memory. The extractor scores candidates on importance, confidence, and novelty.
2. **Storage is typed** — Facts, preferences, decisions, corrections, and episodic memories each have different retention rules and contradiction behaviors.
3. **Retrieval is ranked** — Relevance is a function of semantic similarity, recency, importance, and access frequency.
4. **Decay is mandatory** — All non-critical memories lose salience over time. Decay can be paused by access, accelerated by contradiction, or frozen by explicit retention rules.
5. **Contradictions are resolved, not ignored** — When a new memory conflicts with stored memory, the Policy Engine evaluates rules (confidence, source credibility, recency, user override) and produces an auditable decision.
6. **Forgetting is a feature** — Memories can be archived, forgotten, or merged. The system prefers a smaller, accurate memory store over a large, contradictory one.

The Policy Engine is not an afterthought. It is a first-class architectural layer that exposes pluggable rules for decay, forgetting, and contradiction resolution. Users can define domain-specific policies (e.g., "user medical preferences are critical and never decay") without changing core code.

---

## Core Components

### 1. Memory Model

The fundamental data structure representing a single memory unit:

```typescript
interface Memory {
  // Identity
  id: string;                    // UUID v4
  tenantId: string;              // Multi-tenancy support
  ownerId: string;               // Owner/user this memory belongs to
  
  // Content
  content: string;               // The actual memory text
  type: MemoryType;              // fact, preference, decision, correction, context, episodic
  category?: string;             // Optional categorization
  
  // Metadata
  source: MemorySource;          // user_statement, agent_inference, system_event
  importance: MemoryImportance;  // critical, high, medium, low, transient
  confidence: number;            // 0.0 - 1.0 confidence score
  tags: string[];                // Searchable tags
  
  // Lifecycle
  lifecycle: MemoryLifecycle;    // active, archived, pending_review, forgotten
  
  // Temporal
  createdAt: Date;               // When memory was created
  updatedAt: Date;               // Last modification
  lastAccessedAt: Date;          // For decay calculation
  expiresAt?: Date;              // Optional expiration
  
  // Relationships
  relatesTo?: string[];          // IDs of related memories
  contradicts?: string[];        // IDs of contradictory memories
  supersedes?: string[];         // IDs of memories this replaces
  
  // Embeddings
  embeddings: {
    vector: number[];            // Dense vector for semantic search
    model: string;               // Embedding model used
    dimensions: number;          // Vector dimensions
  };
  
  // Versioning
  version: number;               // For optimistic locking
  history: MemoryVersion[];      // Audit trail
}

enum MemoryLifecycle {
  ACTIVE = 'active',             // Available for retrieval
  ARCHIVED = 'archived',         // Retained but not retrieved unless explicitly requested
  PENDING_REVIEW = 'pending_review', // Flagged for manual review (e.g., contradiction)
  FORGOTTEN = 'forgotten',       // Soft-deleted, retained for audit only
}

enum MemoryType {
  FACT = 'fact',                 // Objective information
  PREFERENCE = 'preference',     // User preferences
  DECISION = 'decision',         // Decisions made
  CORRECTION = 'correction',     // Corrections to previous info
  CONTEXT = 'context',           // Situational context
  EPISODIC = 'episodic'          // Specific events/experiences
}

enum MemoryImportance {
  CRITICAL = 'critical',         // Never forget (decay is frozen)
  HIGH = 'high',                 // Long retention
  MEDIUM = 'medium',             // Standard retention
  LOW = 'low',                   // Short retention
  TRANSIENT = 'transient'        // Temporary, quick decay
}
```

### 2. Memory Extraction Module

Responsible for identifying and extracting memorable information from conversations:

```typescript
class MemoryExtractor {
  constructor(
    private llm: LLMProvider,
    private config: ExtractionConfig
  ) {}
  
  async extractFromConversation(
    conversation: ConversationTurn[]
  ): Promise<ExtractionResult> {
    // 1. Analyze conversation for memorable content
    // 2. Classify memory types
    // 3. Assign importance scores
    // 4. Generate embeddings
    // 5. Detect potential contradictions
    // 6. Return structured extraction results
  }
  
  private async identifyMemorableFacts(turn: ConversationTurn): Promise<MemoryCandidate[]> {
    // Use LLM with structured output to identify:
    // - User preferences and preferences
    // - Important facts about user/context
    // - Decisions and their rationales
    // - Corrections to previous information
    // - Actionable insights
  }
  
  private async scoreImportance(candidate: MemoryCandidate): Promise<number> {
    // Factors:
    // - Explicit user importance indicators
    // - Frequency of mention
    // - Recency
    // - Actionability
    // - Emotional weight
    // - Uniqueness
  }
}
```

**Extraction Prompts Strategy:**
- Use few-shot prompting with examples
- Structured output with JSON schema
- Chain-of-thought for complex reasoning
- Confidence scoring for each extraction

### 3. Storage Abstraction Layer

Unified interface for all storage backends:

```typescript
interface MemoryStorage {
  // CRUD Operations
  create(memory: Memory): Promise<Memory>;
  read(id: string): Promise<Memory | null>;
  update(id: string, updates: Partial<Memory>): Promise<Memory>;
  delete(id: string): Promise<void>;
  
  // Batch Operations
  batchCreate(memories: Memory[]): Promise<Memory[]>;
  batchUpdate(updates: BatchUpdate[]): Promise<Memory[]>;
  batchDelete(ids: string[]): Promise<void>;
  
  // Search Operations
  search(query: MemoryQuery): Promise<MemorySearchResult>;
  searchSimilar(vector: number[], options: SearchOptions): Promise<Memory[]>;
  searchByMetadata(filters: MetadataFilter): Promise<Memory[]>;
  
  // Administrative
  healthCheck(): Promise<HealthStatus>;
  optimize(): Promise<void>;
  backup(): Promise<BackupData>;
  restore(data: BackupData): Promise<void>;
}

class MemoryQuery {
  // Fluent API for complex queries
  where(condition: QueryCondition): MemoryQuery;
  and(condition: QueryCondition): MemoryQuery;
  or(condition: QueryCondition): MemoryQuery;
  
  orderBy(field: string, direction: 'asc' | 'desc'): MemoryQuery;
  limit(count: number): MemoryQuery;
  offset(count: number): MemoryQuery;
  
  // Specialized methods
  byType(type: MemoryType): MemoryQuery;
  byImportance(importance: MemoryImportance): MemoryQuery;
  byTags(tags: string[]): MemoryQuery;
  byDateRange(start: Date, end: Date): MemoryQuery;
  
  async execute(): Promise<Memory[]>;
}
```

### 4. Vector Database Adapters

#### 4.1 Qdrant Adapter *(planned)*

```typescript
class QdrantMemoryStorage implements MemoryStorage {
  private client: QdrantClient;
  private collectionName: string;
  
  constructor(config: QdrantConfig) {
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
    });
    this.collectionName = config.collectionName || 'memories';
  }
  
  async searchSimilar(vector: number[], options: SearchOptions): Promise<Memory[]> {
    const results = await this.client.search({
      collection_name: this.collectionName,
      vector,
      filter: this.buildFilter(options.filters),
      limit: options.limit || 10,
      params: {
        hnsw_ef: options.hnswEf || 128,
        exact: options.exact || false,
      },
    });
    
    return results.map(this.mapToMemory);
  }
  
  private buildFilter(filters?: MetadataFilter): Filter | undefined {
    if (!filters) return undefined;
    
    const conditions: Condition[] = [];
    
    if (filters.types) {
      conditions.push({
        key: 'type',
        match: { any: filters.types },
      });
    }
    
    if (filters.importance) {
      conditions.push({
        key: 'importance',
        match: { value: filters.importance },
      });
    }
    
    if (filters.tags) {
      conditions.push({
        key: 'tags',
        match: { any: filters.tags },
      });
    }
    
    return { must: conditions };
  }
}
```

#### 4.2 Pinecone Adapter *(planned)*

```typescript
class PineconeMemoryStorage implements MemoryStorage {
  private index: Index;
  private namespace: string;
  
  constructor(config: PineconeConfig) {
    const pinecone = new Pinecone({ apiKey: config.apiKey });
    this.index = pinecone.index(config.indexName);
    this.namespace = config.namespace || 'default';
  }
  
  async searchSimilar(vector: number[], options: SearchOptions): Promise<Memory[]> {
    const queryResponse = await this.index.namespace(this.namespace).query({
      vector,
      topK: options.limit || 10,
      filter: this.buildMetadataFilter(options.filters),
      includeMetadata: true,
    });
    
    return queryResponse.matches.map(match => this.mapToMemory(match));
  }
}
```

#### 4.3 In-Memory Adapter

For testing, local development, and lightweight deployments:

```typescript
class InMemoryMemoryStorage implements MemoryStorage {
  private memories: Map<string, Memory> = new Map();
  private index: Map<string, Set<string>> = new Map(); // tag -> memoryIds
  
  async create(memory: Memory): Promise<Memory> {
    this.memories.set(memory.id, memory);
    this.indexMemory(memory);
    return memory;
  }
  
  async searchSimilar(vector: number[], options: SearchOptions): Promise<Memory[]> {
    // Brute-force cosine similarity for small datasets
    const candidates = Array.from(this.memories.values())
      .filter(m => m.tenantId === options.tenantId && m.lifecycle === MemoryLifecycle.ACTIVE);
    
    const scored = candidates.map(memory => ({
      memory,
      score: cosineSimilarity(vector, memory.embeddings.vector),
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, options.limit || 10).map(s => s.memory);
  }
  
  async healthCheck(): Promise<HealthStatus> {
    return { status: 'healthy', timestamp: new Date() };
  }
  
  private indexMemory(memory: Memory): void {
    for (const tag of memory.tags) {
      if (!this.index.has(tag)) {
        this.index.set(tag, new Set());
      }
      this.index.get(tag)!.add(memory.id);
    }
  }
}
```

**When to use:**
- Unit tests (fast, no external dependencies)
- Local development and demos
- Small-scale single-tenant deployments

**Limitations:**
- No persistence across restarts
- O(n) similarity search (suitable for <10k memories)
- No distributed caching

#### 4.4 PostgreSQL pgvector Adapter

```typescript
class PostgresMemoryStorage implements MemoryStorage {
  private pool: Pool;
  private schema: string;
  
  constructor(config: PostgresConfig) {
    this.pool = new Pool(config.connection);
    this.schema = config.schema || 'public';
  }
  
  async searchSimilar(vector: number[], options: SearchOptions): Promise<Memory[]> {
    const vectorStr = `[${vector.join(',')}]`;
    const limit = options.limit || 10;
    
    const query = `
      SELECT *, 
             embedding <-> $1::vector as distance
      FROM ${this.schema}.memories
      WHERE tenant_id = $2
        ${this.buildWhereClause(options.filters)}
      ORDER BY embedding <-> $1::vector
      LIMIT $3
    `;
    
    const result = await this.pool.query(query, [
      vectorStr,
      options.tenantId,
      limit,
    ]);
    
    return result.rows.map(row => this.mapToMemory(row));
  }
  
  private buildWhereClause(filters?: MetadataFilter): string {
    if (!filters) return '';
    
    const conditions: string[] = [];
    
    if (filters.types) {
      conditions.push(`type = ANY(${$4}::text[])`);
    }
    
    if (filters.importance) {
      conditions.push(`importance = $${conditions.length + 4}`);
    }
    
    return conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  }
}
```

**Database Schema for PostgreSQL:**

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Tenants table for multi-tenancy
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  config JSONB DEFAULT '{}'
);

-- Main memories table
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  source VARCHAR(50) NOT NULL,
  importance VARCHAR(20) NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.0,
  tags TEXT[] DEFAULT '{}',
  
  -- Temporal fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Relationships
  relates_to UUID[],
  contradicts UUID[],
  supersedes UUID[],
  
  -- Embeddings
  embedding vector(1536),  -- Adjust dimensions as needed
  embedding_model VARCHAR(100),
  embedding_dimensions INTEGER,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  
  -- Indexes
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Indexes for performance
CREATE INDEX idx_memories_tenant ON memories(tenant_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_importance ON memories(importance);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX idx_memories_created ON memories(created_at);
CREATE INDEX idx_memories_embedding ON memories USING hnsw(embedding vector_cosine_ops);

-- Memory version history
CREATE TABLE memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id),
  version INTEGER NOT NULL,
  changes JSONB NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by VARCHAR(100),
  
  UNIQUE(memory_id, version)
);

-- Contradiction tracking
CREATE TABLE memory_contradictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id),
  contradicts_id UUID NOT NULL REFERENCES memories(id),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolution_strategy VARCHAR(50),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(100),
  
  UNIQUE(memory_id, contradicts_id)
);
```

### 5. Memory Retrieval System

```typescript
class MemoryRetriever {
  constructor(
    private storage: MemoryStorage,
    private embeddingService: EmbeddingService,
    private config: RetrievalConfig
  ) {}
  
  async retrieveRelevantMemories(
    context: string,
    options: RetrievalOptions
  ): Promise<Memory[]> {
    // 1. Generate embedding for query
    const queryVector = await this.embeddingService.embed(context);
    
    // 2. Perform hybrid search
    const semanticResults = await this.storage.searchSimilar(queryVector, {
      limit: options.limit * 2, // Get more for re-ranking
      filters: options.filters,
    });
    
    // 3. Apply re-ranking
    const reranked = await this.rerank(semanticResults, context);
    
    // 4. Apply diversification
    const diversified = this.diversify(reranked, options.diversityFactor);
    
    // 5. Update access times for decay
    await this.updateAccessTimes(diversified);
    
    return diversified.slice(0, options.limit);
  }
  
  private async rerank(memories: Memory[], query: string): Promise<Memory[]> {
    if (!this.config.useCrossEncoder) {
      return memories; // Skip re-ranking if disabled
    }
    
    const scores = await this.crossEncoder.score(query, memories.map(m => m.content));
    
    return memories
      .map((memory, index) => ({
        memory,
        score: scores[index],
      }))
      .sort((a, b) => b.score - a.score)
      .map(({ memory }) => memory);
  }
  
  private diversify(memories: Memory[], factor: number): Memory[] {
    if (factor === 0) return memories; // No diversification
    
    const diversified: Memory[] = [];
    const usedCategories = new Set<string>();
    
    for (const memory of memories) {
      if (diversified.length >= memories.length * (1 - factor)) {
        diversified.push(memory);
        continue;
      }
      
      if (!memory.category || !usedCategories.has(memory.category)) {
        diversified.push(memory);
        if (memory.category) {
          usedCategories.add(memory.category);
        }
      }
    }
    
    return diversified;
  }
}
```

### 6. Memory Management Policy Engine

#### 6.1 Decay Engine

```typescript
class DecayEngine {
  constructor(private config: DecayConfig) {}
  
  calculateDecayedImportance(memory: Memory): number {
    const baseImportance = this.importanceToNumber(memory.importance);
    const timeDecay = this.calculateTimeDecay(memory);
    const usageBoost = this.calculateUsageBoost(memory);
    const recencyBoost = this.calculateRecencyBoost(memory);
    
    return baseImportance * timeDecay * usageBoost * recencyBoost;
  }
  
  private calculateTimeDecay(memory: Memory): number {
    const ageInDays = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const halfLife = this.getHalfLife(memory.importance);
    
    // Exponential decay: importance * (0.5)^(age/halfLife)
    return Math.pow(0.5, ageInDays / halfLife);
  }
  
  private calculateUsageBoost(memory: Memory): number {
    const daysSinceAccess = (Date.now() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);
    const accessFrequency = this.calculateAccessFrequency(memory);
    
    // Frequently accessed memories decay slower (boost > 1)
    // Unused memories decay faster (boost < 1)
    const usageFactor = 1 + Math.log1p(accessFrequency);
    const recencyFactor = Math.exp(-daysSinceAccess / 30); // 30-day window
    
    return usageFactor * recencyFactor;
  }
  
  private getHalfLife(importance: MemoryImportance): number {
    const halfLives = {
      [MemoryImportance.CRITICAL]: 3650,   // 10 years
      [MemoryImportance.HIGH]: 365,        // 1 year
      [MemoryImportance.MEDIUM]: 90,       // 3 months
      [MemoryImportance.LOW]: 30,          // 1 month
      [MemoryImportance.TRANSIENT]: 7,     // 1 week
    };
    
    return halfLives[importance];
  }
}
```

#### 6.2 Forgetting Policy

```typescript
class ForgettingPolicy {
  constructor(private config: ForgettingConfig) {}
  
  async evaluateForgetting(memories: Memory[]): Promise<ForgettingDecision[]> {
    const decisions: ForgettingDecision[] = [];
    
    for (const memory of memories) {
      const decision = await this.evaluateMemory(memory);
      decisions.push(decision);
    }
    
    return decisions;
  }
  
  private async evaluateMemory(memory: Memory): Promise<ForgettingDecision> {
    // Check explicit retention rules
    if (this.hasExplicitRetention(memory)) {
      return { action: 'retain', reason: 'explicit_retention' };
    }
    
    // Check importance threshold
    if (memory.importance === MemoryImportance.CRITICAL) {
      return { action: 'retain', reason: 'critical_importance' };
    }
    
    // Check decay score
    const decayScore = this.decayEngine.calculateDecayedImportance(memory);
    if (decayScore < this.config.forgetThreshold) {
      return { action: 'forget', reason: 'low_decay_score', score: decayScore };
    }
    
    // Check capacity limits
    if (await this.exceedsCapacity(memory.tenantId)) {
      return { action: 'archive', reason: 'capacity_limit' };
    }
    
    // Check expiration
    if (memory.expiresAt && memory.expiresAt < new Date()) {
      return { action: 'forget', reason: 'expired' };
    }
    
    return { action: 'retain', reason: 'no_forgetting_criteria_met' };
  }
}
```

#### 6.3 Contradiction Resolution

```typescript
class ContradictionResolver {
  constructor(
    private detector: ContradictionDetector,
    private config: ContradictionConfig
  ) {}
  
  async resolveContradiction(
    newMemory: Memory,
    existingMemories: Memory[]
  ): Promise<ResolutionResult> {
    const contradictions = await this.detector.detect(newMemory, existingMemories);
    
    if (contradictions.length === 0) {
      return { action: 'accept', memory: newMemory };
    }
    
    const strategy = this.selectStrategy(newMemory, contradictions);
    
    switch (strategy) {
      case ContradictionStrategy.NEWEST_WINS:
        return this.resolveNewestWins(newMemory, contradictions);
      
      case ContradictionStrategy.OLDEST_WINS:
        return this.resolveOldestWins(newMemory, contradictions);
      
      case ContradictionStrategy.HIGHEST_CONFIDENCE:
        return this.resolveHighestConfidence(newMemory, contradictions);
      
      case ContradictionStrategy.MANUAL_REVIEW:
        return this.flagForManualReview(newMemory, contradictions);
      
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }
  
  private async resolveNewestWins(
    newMemory: Memory,
    contradictions: Contradiction[]
  ): Promise<ResolutionResult> {
    // New memory replaces old contradictory memories
    const memoriesToArchive = contradictions.map(c => c.existingMemory);
    
    return {
      action: 'replace',
      memory: newMemory,
      archiveIds: memoriesToArchive.map(m => m.id),
      reason: 'newest_wins_strategy',
    };
  }
  
  private async resolveHighestConfidence(
    newMemory: Memory,
    contradictions: Contradiction[]
  ): Promise<ResolutionResult> {
    const maxConfidence = Math.max(
      newMemory.confidence,
      ...contradictions.map(c => c.existingMemory.confidence)
    );
    
    if (newMemory.confidence === maxConfidence) {
      return {
        action: 'replace',
        memory: newMemory,
        archiveIds: contradictions.map(c => c.existingMemory.id),
        reason: 'highest_confidence_strategy',
      };
    } else {
      return {
        action: 'reject',
        memory: newMemory,
        reason: 'existing_memory_has_higher_confidence',
      };
    }
  }
}
```

### 7. Context Injection System

```typescript
class ContextInjector {
  constructor(private config: InjectionConfig) {}
  
  async injectMemoriesIntoContext(
    conversation: ConversationTurn[],
    memories: Memory[],
    tokenBudget: number
  ): Promise<string> {
    // 1. Format memories for injection
    const formattedMemories = await this.formatMemories(memories);
    
    // 2. Truncate to fit token budget
    const truncated = await this.truncateToBudget(formattedMemories, tokenBudget);
    
    // 3. Create injection prompt
    const injectionPrompt = this.createInjectionPrompt(truncated);
    
    // 4. Insert into conversation at appropriate point
    return this.insertIntoConversation(conversation, injectionPrompt);
  }
  
  private async formatMemories(memories: Memory[]): Promise<string> {
    const sections = {
      facts: [] as string[],
      preferences: [] as string[],
      decisions: [] as string[],
      corrections: [] as string[],
      context: [] as string[],
    };
    
    for (const memory of memories) {
      const formatted = this.formatMemory(memory);
      sections[memory.type + 's']?.push(formatted);
    }
    
    return this.buildMemorySection(sections);
  }
  
  private formatMemory(memory: Memory): string {
    const timestamp = memory.createdAt.toLocaleDateString();
    const confidence = Math.round(memory.confidence * 100);
    
    return `[${memory.type.toUpperCase()}] ${memory.content} (Confidence: ${confidence}%, Date: ${timestamp})`;
  }
  
  private createInjectionPrompt(formattedMemories: string): string {
    return `
<relevant_memories>
The following information has been retrieved from long-term memory and should be considered in your response:

${formattedMemories}

Note: Memories are labeled with their type and confidence level. Use this information to provide more personalized and contextually relevant responses.
</relevant_memories>
    `.trim();
  }
}
```

---

### 8. Embedding Provider Abstraction

The embedding service is abstracted so the system is not tied to a single provider:

```typescript
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getModelInfo(): ModelInfo;
}

interface ModelInfo {
  name: string;
  dimensions: number;
  maxInputLength: number;
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  constructor(private config: OpenAIEmbeddingConfig) {}
  
  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.config.model,
      input: text,
      dimensions: this.config.dimensions,
    });
    return response.data[0].embedding;
  }
  
  getModelInfo(): ModelInfo {
    return {
      name: this.config.model,
      dimensions: this.config.dimensions || 1536,
      maxInputLength: 8191,
    };
  }
}
```

**Provider implementations:**
- `OpenAIEmbeddingProvider` — OpenAI text-embedding-3-small/large
- `CohereEmbeddingProvider` — Cohere embed models
- `HuggingFaceEmbeddingProvider` — Local/on-premise models via transformers.js
- `CustomEmbeddingProvider` — User-defined embedding logic

**Important:** Changing embedding models on an existing memory store requires re-embedding all memories. The system tracks the model used per memory and can trigger a migration job when the provider changes.

---

### 9. Event System & Hooks

The memory system emits events at key lifecycle points so users can extend behavior without forking core code:

```typescript
interface MemoryEventBus {
  on(event: MemoryEventType, handler: MemoryEventHandler): void;
  emit(event: MemoryEvent): Promise<void>;
}

type MemoryEventType =
  | 'memory:extracted'
  | 'memory:stored'
  | 'memory:retrieved'
  | 'memory:contradiction:detected'
  | 'memory:contradiction:resolved'
  | 'memory:decayed'
  | 'memory:forgotten'
  | 'memory:consolidated';

interface MemoryEvent {
  type: MemoryEventType;
  timestamp: Date;
  tenantId: string;
  payload: unknown;
}
```

**Example: Logging all contradictions to an external audit system**
```typescript
memory.events.on('memory:contradiction:resolved', async (event) => {
  await auditLog.record({
    tenantId: event.tenantId,
    decision: event.payload.resolution,
    reason: event.payload.reason,
  });
});
```

---

### 10. Policy Engine Architecture

The Policy Engine is the heart of agent-memory's curation strategy. It evaluates pluggable rules to make decisions about decay, forgetting, and contradiction resolution.

```typescript
interface PolicyEngine {
  evaluateDecay(memory: Memory, context: DecayContext): DecayDecision;
  evaluateForgetting(memory: Memory, context: ForgettingContext): ForgettingDecision;
  evaluateContradiction(newMemory: Memory, existing: Memory[], context: ContradictionContext): ContradictionDecision;
}

interface PolicyRule {
  id: string;
  priority: number;           // Higher = evaluated first
  condition: PolicyCondition; // When this rule applies
  action: PolicyAction;       // What to do when condition matches
}

type PolicyCondition = 
  | { type: 'importance_equals'; value: MemoryImportance }
  | { type: 'memory_type_in'; values: MemoryType[] }
  | { type: 'tag_matches'; pattern: string }
  | { type: 'confidence_above'; threshold: number }
  | { type: 'source_is'; value: MemorySource }
  | { type: 'age_exceeds'; days: number }
  | { type: 'custom'; evaluate: (memory: Memory, context: unknown) => boolean };

type PolicyAction =
  | { type: 'freeze_decay' }                    // Prevent decay
  | { type: 'accelerate_decay'; factor: number }
  | { type: 'archive_after'; days: number }
  | { type: 'forget_after'; days: number }
  | { type: 'require_review' }
  | { type: 'prefer_existing' }
  | { type: 'prefer_new' }
  | { type: 'custom'; execute: (memory: Memory, context: unknown) => Promise<void> };
```

**Example: Domain-specific policy for medical preferences**
```typescript
const medicalPolicy: PolicyRule = {
  id: 'medical-preference-critical',
  priority: 100,
  condition: { type: 'tag_matches', pattern: 'medical:*' },
  action: { type: 'freeze_decay' },
};
```

Rules are evaluated in priority order. The first matching rule's action is applied unless a later rule has `override: true`. This allows users to compose complex policies from simple, testable rules.

---

## Data Flow

### Memory Creation Flow

```
User Conversation
       │
       ▼
┌──────────────────┐
│ Memory Extractor │ ──► LLM Analysis
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Contradiction    │ ──► Check for conflicts
│ Detector         │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Contradiction    │ ──► Resolve conflicts
│ Resolver         │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Embedding        │ ──► Generate vectors
│ Service          │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Storage Adapter  │ ──► Persist to database
└──────────────────┘
```

### Memory Retrieval Flow

```
User Query / Conversation Context
       │
       ▼
┌──────────────────┐
│ Embedding        │ ──► Generate query vector
│ Service          │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Storage Adapter  │ ──► Semantic search
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Re-ranker        │ ──► Cross-encoder scoring
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Diversifier      │ ──► Ensure variety
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Context Injector │ ──► Format for LLM
└──────────────────┘
       │
       ▼
LLM Prompt with Injected Memories
```

### Memory Decay Flow

```
Scheduled Decay Job (e.g., daily)
       │
       ▼
┌──────────────────┐
│ Decay Engine     │ ──► Calculate decay scores
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Forgetting       │ ──► Evaluate forgetting criteria
│ Policy           │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Storage Adapter  │ ──► Archive or delete memories
└──────────────────┘
```

---

## Configuration

### Main Configuration Interface

```typescript
interface AgentMemoryConfig {
  // Storage configuration
  storage: {
    provider: 'qdrant' | 'pinecone' | 'postgres';
    connection: QdrantConfig | PineconeConfig | PostgresConfig;
  };
  
  // Embedding configuration
  embedding: {
    provider: 'openai' | 'cohere' | 'huggingface';
    model: string;
    dimensions: number;
  };
  
  // Extraction configuration
  extraction: {
    llmProvider: LLMProvider;
    batchSize: number;
    confidenceThreshold: number;
    enabledTypes: MemoryType[];
  };
  
  // Retrieval configuration
  retrieval: {
    defaultLimit: number;
    useCrossEncoder: boolean;
    diversityFactor: number;
    strategies: RetrievalStrategy[];
  };
  
  // Policy configuration
  policies: {
    decay: DecayConfig;
    forgetting: ForgettingConfig;
    contradiction: ContradictionConfig;
  };
  
  // Multi-tenancy
  multiTenancy: {
    enabled: boolean;
    defaultTenantId: string;
  };
  
  // Observability
  observability: {
    logging: LoggingConfig;
    metrics: MetricsConfig;
    tracing: TracingConfig;
  };
}
```

### Example Configuration

```typescript
const config: AgentMemoryConfig = {
  storage: {
    provider: 'postgres',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'agent_memory',
      user: 'postgres',
      password: process.env.DB_PASSWORD,
    },
  },
  
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
  
  extraction: {
    llmProvider: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
    batchSize: 10,
    confidenceThreshold: 0.7,
    enabledTypes: [
      MemoryType.FACT,
      MemoryType.PREFERENCE,
      MemoryType.DECISION,
      MemoryType.CORRECTION,
    ],
  },
  
  retrieval: {
    defaultLimit: 5,
    useCrossEncoder: true,
    diversityFactor: 0.3,
    strategies: [
      RetrievalStrategy.SEMANTIC,
      RetrievalStrategy.RECENCY,
      RetrievalStrategy.IMPORTANCE,
    ],
  },
  
  policies: {
    decay: {
      halfLifeDays: {
        [MemoryImportance.CRITICAL]: 3650,
        [MemoryImportance.HIGH]: 365,
        [MemoryImportance.MEDIUM]: 90,
        [MemoryImportance.LOW]: 30,
        [MemoryImportance.TRANSIENT]: 7,
      },
      usageDecayFactor: 0.5,
    },
    forgetting: {
      forgetThreshold: 0.1,
      capacityLimit: 10000,
      archiveBeforeDelete: true,
    },
    contradiction: {
      defaultStrategy: ContradictionStrategy.HIGHEST_CONFIDENCE,
      similarityThreshold: 0.8,
      autoResolve: true,
    },
  },
  
  multiTenancy: {
    enabled: true,
    defaultTenantId: 'default',
  },
  
  observability: {
    logging: {
      level: 'info',
      format: 'json',
    },
    metrics: {
      enabled: true,
      provider: 'prometheus',
    },
    tracing: {
      enabled: true,
      provider: 'jaeger',
    },
  },
};
```

---

## Performance Considerations *(planned)*

### 1. Caching Strategy

```typescript
class MemoryCache {
  private cache: Map<string, CachedMemory>;
  private ttl: number;
  
  async get(key: string): Promise<Memory[] | null> {
    const cached = this.cache.get(key);
    if (!cached || Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return cached.memories;
  }
  
  async set(key: string, memories: Memory[]): Promise<void> {
    this.cache.set(key, {
      memories,
      timestamp: Date.now(),
    });
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Invalidate cache entries matching pattern
    for (const key of this.cache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

### 2. Batch Processing

```typescript
class BatchProcessor {
  private queue: MemoryOperation[] = [];
  private batchSize: number;
  private flushInterval: number;
  
  async add(operation: MemoryOperation): Promise<void> {
    this.queue.push(operation);
    
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }
  
  private async flush(): Promise<void> {
    const operations = this.queue.splice(0, this.batchSize);
    await this.processBatch(operations);
  }
  
  private async processBatch(operations: MemoryOperation[]): Promise<void> {
    // Group by type for efficient processing
    const creates = operations.filter(op => op.type === 'create');
    const updates = operations.filter(op => op.type === 'update');
    const deletes = operations.filter(op => op.type === 'delete');
    
    await Promise.all([
      this.storage.batchCreate(creates.map(op => op.memory)),
      this.storage.batchUpdate(updates.map(op => ({ id: op.id, updates: op.updates }))),
      this.storage.batchDelete(deletes.map(op => op.id)),
    ]);
  }
}
```

### 3. Connection Pooling

```typescript
class ConnectionPool {
  private pool: Pool;
  private maxConnections: number;
  
  constructor(config: ConnectionPoolConfig) {
    this.pool = new Pool({
      max: config.maxConnections || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  
  async query(text: string, params?: any[]): Promise<QueryResult> {
    const client = await this.pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }
}
```

---

## Security Considerations *(planned)*

### 1. Data Encryption

```typescript
class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor(encryptionKey: string) {
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }
  
  encrypt(text: string): { ciphertext: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let ciphertext = cipher.update(text, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
    };
  }
  
  decrypt(data: { ciphertext: string; iv: string; authTag: string }): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(data.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let plaintext = decipher.update(data.ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  }
}
```

### 2. Access Control

```typescript
class AccessControl {
  async checkPermission(
    userId: string,
    memoryId: string,
    action: 'read' | 'write' | 'delete'
  ): Promise<boolean> {
    const memory = await this.storage.read(memoryId);
    if (!memory) return false;
    
    // Check ownership
    if (memory.ownerId === userId) return true;
    
    // Check shared access
    if (memory.sharedWith?.includes(userId)) return true;
    
    // Check role-based access
    const userRole = await this.getUserRole(userId);
    if (this.hasRolePermission(userRole, action)) return true;
    
    return false;
  }
}
```

---

## Monitoring & Observability *(planned)*

### Key Metrics to Track

```typescript
interface MemoryMetrics {
  // Volume metrics
  totalMemories: number;
  memoriesByType: Record<MemoryType, number>;
  memoriesByImportance: Record<MemoryImportance, number>;
  
  // Performance metrics
  extractionLatency: number;      // p50, p95, p99
  retrievalLatency: number;       // p50, p95, p99
  storageLatency: number;         // p50, p95, p99
  
  // Quality metrics
  extractionConfidence: number;   // Average confidence score
  retrievalRelevance: number;     // User feedback score
  contradictionRate: number;      // % of memories with contradictions
  
  // System metrics
  storageSize: number;            // Total storage used
  cacheHitRate: number;           // Cache effectiveness
  errorRate: number;              // Error rate by operation
}
```

### Health Checks

```typescript
class HealthChecker {
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkStorageHealth(),
      this.checkEmbeddingHealth(),
      this.checkLLMHealth(),
    ]);
    
    const results = checks.map((result, index) => ({
      component: ['storage', 'embedding', 'llm'][index],
      status: result.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      latency: result.status === 'fulfilled' ? result.value : undefined,
      error: result.status === 'rejected' ? result.reason : undefined,
    }));
    
    return {
      status: results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded',
      timestamp: new Date(),
      checks: results,
    };
  }
}
```

---

## Deployment Considerations *(planned)*

### 1. Environment Variables

```bash
# Storage
STORAGE_PROVIDER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agent_memory
DB_USER=postgres
DB_PASSWORD=secret

# Embedding
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...

# LLM
LLM_PROVIDER=openai
LLM_MODEL=gpt-4

# Security
ENCRYPTION_KEY=your-32-character-secret-key

# Observability
LOG_LEVEL=info
METRICS_ENABLED=true
TRACING_ENABLED=true
```

### 2. Docker Configuration

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 3. Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-memory
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-memory
  template:
    metadata:
      labels:
        app: agent-memory
    spec:
      containers:
      - name: agent-memory
        image: reatech/agent-memory:latest
        ports:
        - containerPort: 3000
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: agent-memory-secrets
              key: db-password
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## Future Enhancements

1. **Graph-based Memory Relationships**: Implement graph database for complex memory relationships
2. **Federated Learning**: Train extraction models across distributed data
3. **Multi-modal Memories**: Support for images, audio, and video memories
4. **Real-time Collaboration**: Shared memory spaces for team agents
5. **Advanced Analytics**: Memory usage patterns and insights
6. **Auto-tuning**: Self-optimizing retrieval and decay parameters
7. **Edge Deployment**: Lightweight version for edge computing
8. **Blockchain Integration**: Immutable memory audit trails

---

This architecture provides a robust, scalable foundation for building a production-grade agent memory system that truly understands what to remember, what to forget, and how to handle contradictions intelligently.
