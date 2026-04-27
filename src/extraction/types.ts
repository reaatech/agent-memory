import type { MemoryCandidate, Memory, MemoryType } from '@core/types.js';

/**
 * A single turn in a conversation.
 */
export interface ConversationTurn {
  /** Who spoke */
  speaker: 'user' | 'agent';
  /** The message content */
  content: string;
  /** When the turn occurred */
  timestamp: Date;
}

/**
 * Result of extracting memories from a conversation.
 */
export interface ExtractionResult {
  /** Candidates that passed the confidence threshold */
  candidates: Memory[];
  /** Candidates that were deduplicated or filtered out */
  rejected: MemoryCandidate[];
  /** Overall extraction confidence */
  confidence: number;
  /** Latency of the extraction operation */
  latencyMs: number;
}

/**
 * Configuration for the memory extractor.
 */
export interface ExtractionConfig {
  /** Number of turns to process in a single batch */
  batchSize: number;
  /** Minimum confidence to accept a candidate */
  confidenceThreshold: number;
  /** Which memory types to extract */
  enabledTypes: MemoryType[];
  /** Tenant identifier for extracted memories (defaults to 'default') */
  tenantId?: string;
  /** Owner identifier for extracted memories (defaults to 'default') */
  ownerId?: string;
}
