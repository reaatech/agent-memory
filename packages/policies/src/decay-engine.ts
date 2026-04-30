import { MemoryImportance } from '@reaatech/agent-memory-core';
import type { Memory } from '@reaatech/agent-memory-core';
import type { DecayConfig, DecayDecision } from './types.js';

/**
 * Calculates decayed importance of memories over time.
 *
 * Combines:
 * - Exponential time decay based on importance half-life
 * - Usage boost for frequently accessed memories
 * - Recency boost for recently created memories
 *
 * Scores are clamped to the range [0, 1].
 */
export class DecayEngine {
  constructor(private config: DecayConfig) {
    for (const [importance, halfLife] of Object.entries(config.halfLifeDays)) {
      if (!Number.isFinite(halfLife) || halfLife <= 0) {
        throw new RangeError(
          `halfLifeDays for ${importance} must be a positive number, got ${halfLife}`,
        );
      }
    }
  }

  calculateDecayedImportance(memory: Memory, now: Date = new Date()): number {
    const baseImportance = this.importanceToNumber(memory.importance);
    const timeDecay = this.calculateTimeDecay(memory, now);
    const usageBoost = this.calculateUsageBoost(memory, now);
    const recencyBoost = this.calculateRecencyBoost(memory, now);

    return Math.max(0, Math.min(1, baseImportance * timeDecay * usageBoost * recencyBoost));
  }

  evaluate(memory: Memory, now: Date = new Date()): DecayDecision {
    const score = this.calculateDecayedImportance(memory, now);

    if (memory.importance === MemoryImportance.CRITICAL) {
      return {
        score,
        frozen: true,
        reason: 'critical_importance',
      };
    }

    if (score < this.config.minimumThreshold) {
      return {
        score,
        frozen: false,
        reason: 'below_minimum_threshold',
      };
    }

    return {
      score,
      frozen: false,
      reason: 'within_threshold',
    };
  }

  private calculateTimeDecay(memory: Memory, now: Date): number {
    const ageInDays = (now.getTime() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const halfLife = this.getHalfLife(memory.importance);

    // Exponential decay: importance * (0.5)^(age/halfLife)
    return 0.5 ** (ageInDays / halfLife);
  }

  private calculateUsageBoost(memory: Memory, now: Date): number {
    const daysSinceAccess =
      (now.getTime() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);

    // Frequently accessed memories decay slower (boost > 1)
    // Unused memories decay faster (boost < 1)
    const recencyFactor = Math.exp(-daysSinceAccess / 30); // 30-day window

    return 1 + this.config.usageBoostFactor * recencyFactor;
  }

  private calculateRecencyBoost(memory: Memory, now: Date): number {
    const ageInDays = (now.getTime() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // Small boost for very recent memories (< 7 days)
    if (ageInDays < 7) {
      return 1.1;
    }

    return 1.0;
  }

  private getHalfLife(importance: MemoryImportance): number {
    return this.config.halfLifeDays[importance];
  }

  private importanceToNumber(importance: MemoryImportance): number {
    const values: Record<MemoryImportance, number> = {
      [MemoryImportance.CRITICAL]: 1.0,
      [MemoryImportance.HIGH]: 0.8,
      [MemoryImportance.MEDIUM]: 0.5,
      [MemoryImportance.LOW]: 0.3,
      [MemoryImportance.TRANSIENT]: 0.1,
    };

    return values[importance];
  }
}
