import type { Memory } from '@core/types.js';
import type { ForgettingConfig, ForgettingDecision, DecayDecision } from './types.js';
import type { DecayEngine } from './decay-engine.js';

/**
 * Evaluates whether memories should be retained, archived, or forgotten.
 *
 * Checks in order:
 * 1. Explicit expiration
 * 2. Decay score below threshold
 * 3. Capacity limits
 */
export class ForgettingPolicy {
  constructor(
    private config: ForgettingConfig,
    private decayEngine: DecayEngine
  ) {}

  async evaluate(memory: Memory): Promise<ForgettingDecision> {
    // Check expiration
    if (memory.expiresAt && memory.expiresAt < new Date()) {
      return {
        action: this.config.archiveBeforeDelete ? 'archive' : 'forget',
        reason: 'expired',
      };
    }

    // Check decay score
    const decayDecision: DecayDecision = this.decayEngine.evaluate(memory);
    if (decayDecision.score < this.config.forgetThreshold) {
      return {
        action: this.config.archiveBeforeDelete ? 'archive' : 'forget',
        reason: 'low_decay_score',
        score: decayDecision.score,
      };
    }

    return {
      action: 'retain',
      reason: 'within_threshold',
    };
  }

  async evaluateBatch(memories: Memory[], currentCount: number): Promise<ForgettingDecision[]> {
    const decisions = await Promise.all(memories.map((m) => this.evaluate(m)));

    // If over capacity, mark lowest-scored active memories for archiving
    const scored = memories
      .map((m, i) => ({
        memory: m,
        originalIndex: i,
        decision: decisions[i],
        score: this.decayEngine.calculateDecayedImportance(m),
      }))
      .filter((s) => s.decision.action === 'retain')
      .sort((a, b) => a.score - b.score);

    // Account for memories already individually marked for forgetting/archiving
    const retainedCount = currentCount - (memories.length - scored.length);
    const overage = retainedCount - this.config.capacityLimit;

    for (let i = 0; i < overage && i < scored.length; i++) {
      const idx = scored[i].originalIndex;
      decisions[idx] = {
        action: 'archive',
        reason: 'capacity_limit',
        score: scored[i].score,
      };
    }

    return decisions;
  }
}
