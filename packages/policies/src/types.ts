import type {
  Memory,
  MemoryImportance,
  MemorySource,
  MemoryType,
} from '@reaatech/agent-memory-core';
import type { ContradictionStrategy } from '@reaatech/agent-memory-core';

/**
 * Configuration for the decay engine.
 */
export interface DecayConfig {
  /** Half-life in days for each importance level */
  halfLifeDays: Record<MemoryImportance, number>;
  /** Usage boost factor (0 = no boost, 1 = standard) */
  usageBoostFactor: number;
  /** Minimum importance score before a memory is considered for archiving */
  minimumThreshold: number;
}

/**
 * Configuration for the forgetting policy.
 */
export interface ForgettingConfig {
  /** Importance score below which memories are forgotten */
  forgetThreshold: number;
  /** Maximum memories per tenant before capacity-based forgetting kicks in */
  capacityLimit: number;
  /** Whether to archive before deleting */
  archiveBeforeDelete: boolean;
}

/**
 * Configuration for contradiction resolution.
 */
export interface ContradictionConfig {
  /** Default strategy when no rule matches */
  defaultStrategy: ContradictionStrategy;
  /** Semantic similarity threshold to flag a contradiction */
  similarityThreshold: number;
  /** Whether to auto-resolve or always flag for review */
  autoResolve: boolean;
}

/**
 * A single policy rule for the Policy Engine.
 *
 * Rules are evaluated in priority order. The first matching rule's
 * action is applied unless a later rule has `override: true`.
 */
export interface PolicyRule {
  /** Unique rule identifier */
  id: string;
  /** Higher number = evaluated first */
  priority: number;
  /** When this rule applies */
  condition: PolicyCondition;
  /** What to do when condition matches */
  action: PolicyAction;
  /** Whether this rule can override earlier matches */
  override?: boolean;
}

/**
 * Conditions determine when a policy rule applies.
 */
export type PolicyCondition =
  | { type: 'importance_equals'; value: MemoryImportance }
  | { type: 'memory_type_in'; values: MemoryType[] }
  | { type: 'tag_matches'; pattern: string }
  | { type: 'confidence_above'; threshold: number }
  | { type: 'source_is'; value: MemorySource }
  | { type: 'age_exceeds'; days: number }
  | { type: 'custom'; evaluate: (memory: Memory, context: unknown) => boolean };

/**
 * Actions determine what happens when a rule matches.
 */
export type PolicyAction =
  | { type: 'freeze_decay' }
  | { type: 'accelerate_decay'; factor: number }
  | { type: 'archive_after'; days: number }
  | { type: 'forget_after'; days: number }
  | { type: 'require_review' }
  | { type: 'prefer_existing' }
  | { type: 'prefer_new' }
  | { type: 'custom'; execute: (memory: Memory, context: unknown) => Promise<void> };

/**
 * Decision produced by the decay engine.
 */
export interface DecayDecision {
  /** Decayed importance score (0.0–1.0) */
  score: number;
  /** Whether decay should be frozen */
  frozen: boolean;
  /** Reason for the decision */
  reason: string;
}

/**
 * Decision produced by the forgetting policy.
 */
export interface ForgettingDecision {
  /** Action to take */
  action: 'retain' | 'archive' | 'forget';
  /** Human-readable reason */
  reason: string;
  /** Optional score or metadata */
  score?: number;
}

/**
 * Decision produced by contradiction resolution.
 */
export interface ContradictionDecision {
  /** Action to take */
  action: 'accept' | 'reject' | 'replace' | 'review';
  /** The winning memory (if any) */
  memory?: Memory;
  /** IDs of memories to archive */
  archiveIds?: string[];
  /** Human-readable reason */
  reason: string;
}
