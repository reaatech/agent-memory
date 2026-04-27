import type { Memory } from '@core/types.js';
import type {
  DecayConfig,
  DecayDecision,
  ForgettingConfig,
  ForgettingDecision,
  ContradictionConfig,
  ContradictionDecision,
  PolicyRule,
} from './types.js';
import type { Contradiction } from './contradiction-detector.js';
import { DecayEngine } from './decay-engine.js';
import { ForgettingPolicy } from './forgetting-policy.js';
import { ContradictionResolver } from './contradiction-resolver.js';

/**
 * Context passed to decay evaluation.
 */
export interface DecayContext {
  tenantId: string;
  now?: Date;
}

/**
 * Context passed to forgetting evaluation.
 */
export interface ForgettingContext {
  tenantId: string;
  currentMemoryCount: number;
}

/**
 * Context passed to contradiction evaluation.
 */
export interface ContradictionContext {
  tenantId: string;
}

/**
 * Orchestrates decay, forgetting, and contradiction policies.
 *
 * The PolicyEngine composes the individual policy subsystems and applies
 * user-defined {@link PolicyRule}s on top of the default behaviors.
 */
export class PolicyEngine {
  private decayEngine: DecayEngine;
  private forgettingPolicy: ForgettingPolicy;
  private contradictionResolver: ContradictionResolver;

  constructor(
    decayConfig: DecayConfig,
    forgettingConfig: ForgettingConfig,
    contradictionConfig: ContradictionConfig,
    customRules: PolicyRule[] = []
  ) {
    this.decayEngine = new DecayEngine(decayConfig);
    this.forgettingPolicy = new ForgettingPolicy(forgettingConfig, this.decayEngine);
    this.contradictionResolver = new ContradictionResolver(contradictionConfig, customRules);
  }

  /**
   * Evaluate the decayed importance of a memory.
   */
  evaluateDecay(memory: Memory, context?: DecayContext): DecayDecision {
    if (context?.now) {
      return this.decayEngine.evaluate(memory, context.now);
    }
    return this.decayEngine.evaluate(memory);
  }

  async evaluateForgetting(
    memory: Memory,
    _context?: ForgettingContext
  ): Promise<ForgettingDecision> {
    return this.forgettingPolicy.evaluate(memory);
  }

  async evaluateForgettingBatch(
    memories: Memory[],
    context?: ForgettingContext
  ): Promise<ForgettingDecision[]> {
    if (!context?.currentMemoryCount) {
      throw new Error(
        'evaluateForgettingBatch requires currentMemoryCount in context for accurate capacity-based forgetting'
      );
    }
    return this.forgettingPolicy.evaluateBatch(memories, context.currentMemoryCount);
  }

  async evaluateContradiction(
    newMemory: Memory,
    existingMemories: Memory[],
    contradictions: Contradiction[],
    _context?: ContradictionContext
  ): Promise<ContradictionDecision> {
    return this.contradictionResolver.resolve(newMemory, existingMemories, contradictions);
  }

  /**
   * Calculate the raw decayed importance score for a memory.
   */
  calculateDecayedImportance(memory: Memory): number {
    return this.decayEngine.calculateDecayedImportance(memory);
  }
}
