/**
 * Core type definitions for the agent-memory system.
 *
 * These types define the fundamental data structures for memories,
 * their metadata, lifecycle, and relationships.
 */

/** Unique identifier for a memory (UUID v4) */
export type MemoryId = string;

/** Tenant identifier for multi-tenancy isolation */
export type TenantId = string;

/** Owner/user identifier */
export type OwnerId = string;

/**
 * Categories of memory based on what they represent.
 */
export enum MemoryType {
  /** Objective information about the world or user */
  FACT = 'fact',
  /** User preferences, likes, dislikes */
  PREFERENCE = 'preference',
  /** Decisions made by the agent or user */
  DECISION = 'decision',
  /** Corrections to previously stored information */
  CORRECTION = 'correction',
  /** Situational or conversational context */
  CONTEXT = 'context',
  /** Specific events or experiences */
  EPISODIC = 'episodic',
}

/**
 * Importance levels control retention and decay behavior.
 * Critical memories never decay; transient memories decay quickly.
 */
export enum MemoryImportance {
  /** Never decay, retain indefinitely */
  CRITICAL = 'critical',
  /** Long retention (default ~1 year half-life) */
  HIGH = 'high',
  /** Standard retention (default ~3 months half-life) */
  MEDIUM = 'medium',
  /** Short retention (default ~1 month half-life) */
  LOW = 'low',
  /** Temporary, quick decay (default ~1 week half-life) */
  TRANSIENT = 'transient',
}

/**
 * Source of the memory — who or what created it.
 */
export enum MemorySource {
  /** Direct statement from the user */
  USER_STATEMENT = 'user_statement',
  /** Inference made by the agent */
  AGENT_INFERENCE = 'agent_inference',
  /** System-generated event or rule */
  SYSTEM_EVENT = 'system_event',
}

/**
 * Lifecycle states for a memory.
 * Memories transition through states as they age, are reviewed, or forgotten.
 */
export enum MemoryLifecycle {
  /** Available for retrieval */
  ACTIVE = 'active',
  /** Retained but not retrieved unless explicitly requested */
  ARCHIVED = 'archived',
  /** Flagged for manual review (e.g., unresolved contradiction) */
  PENDING_REVIEW = 'pending_review',
  /** Soft-deleted, retained for audit only */
  FORGOTTEN = 'forgotten',
}

/**
 * Embedding metadata tracks which model produced the vector.
 */
export interface EmbeddingMetadata {
  /** Dense vector for semantic search */
  vector: number[];
  /** Embedding model used */
  model: string;
  /** Vector dimensions */
  dimensions: number;
}

/**
 * A single version entry in the memory history trail.
 */
export interface MemoryVersion {
  version: number;
  changes: Record<string, unknown>;
  changedAt: Date;
  changedBy?: string;
}

/**
 * The fundamental data structure representing a single memory unit.
 */
export interface Memory {
  /** Unique identifier */
  id: MemoryId;
  /** Tenant for multi-tenancy isolation */
  tenantId: TenantId;
  /** Owner/user this memory belongs to */
  ownerId: OwnerId;

  /** The actual memory text */
  content: string;
  /** Category of memory */
  type: MemoryType;
  /** Optional sub-categorization */
  category?: string;

  /** Origin of the memory */
  source: MemorySource;
  /** Importance level affecting retention */
  importance: MemoryImportance;
  /** Confidence score 0.0–1.0 */
  confidence: number;
  /** Searchable tags */
  tags: string[];

  /** Current lifecycle state */
  lifecycle: MemoryLifecycle;

  /** When memory was created */
  createdAt: Date;
  /** Last modification */
  updatedAt: Date;
  /** For decay and usage boost calculation */
  lastAccessedAt: Date;
  /** Optional expiration date */
  expiresAt?: Date;

  /** IDs of related memories */
  relatesTo?: MemoryId[];
  /** IDs of contradictory memories */
  contradicts?: MemoryId[];
  /** IDs of memories this replaces */
  supersedes?: MemoryId[];

  /** Semantic embedding metadata */
  embeddings: EmbeddingMetadata;

  /** Optimistic locking version */
  version: number;
  /** Audit trail */
  history: MemoryVersion[];
}

/**
 * Strategies for resolving contradictions between memories.
 */
export enum ContradictionStrategy {
  /** Newer memory wins */
  NEWEST_WINS = 'newest_wins',
  /** Older memory wins */
  OLDEST_WINS = 'oldest_wins',
  /** Highest confidence wins */
  HIGHEST_CONFIDENCE = 'highest_confidence',
  /** Flag for human review */
  MANUAL_REVIEW = 'manual_review',
}

/**
 * A candidate memory before it is fully processed and stored.
 */
export interface MemoryCandidate {
  content: string;
  type: MemoryType;
  category?: string;
  source: MemorySource;
  importance: MemoryImportance;
  confidence: number;
  tags: string[];
  expiresAt?: Date;
}

/**
 * A single turn in a conversation.
 */
export interface ConversationTurn {
  speaker: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

/**
 * Health status reported by storage adapters and services.
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  latencyMs?: number;
  error?: string;
}
