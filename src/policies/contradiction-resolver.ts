import type { Memory } from '@core/types.js';
import { ContradictionStrategy } from '@core/types.js';
import type { ContradictionConfig, ContradictionDecision, PolicyRule } from './types.js';
import type { Contradiction } from './contradiction-detector.js';

/**
 * Resolves contradictions between memories using configured strategies.
 *
 * Supports:
 * - NEWEST_WINS: Replace old with new
 * - OLDEST_WINS: Keep existing, reject new
 * - HIGHEST_CONFIDENCE: Compare confidence scores
 * - MANUAL_REVIEW: Flag for human review
 * - Custom policy rules
 */
export class ContradictionResolver {
  constructor(
    private config: ContradictionConfig,
    private customRules: PolicyRule[] = []
  ) {}

  /**
   * Resolve contradictions by evaluating custom rules first, then falling back
   * to the configured default strategy.
   *
   * @param newMemory - The incoming memory candidate
   * @param _existingMemories - Existing memories (reserved for future use)
   * @param contradictions - Contradictions detected for this memory
   * @returns A decision indicating whether to accept, reject, replace, or flag for review
   */
  async resolve(
    newMemory: Memory,
    _existingMemories: Memory[],
    contradictions: Contradiction[]
  ): Promise<ContradictionDecision> {
    if (contradictions.length === 0) {
      return {
        action: 'accept',
        memory: newMemory,
        reason: 'no_contradictions',
      };
    }

    // Evaluate custom rules first (highest priority)
    const ruleDecision = this.evaluateRules(newMemory, contradictions);
    if (ruleDecision) {
      return ruleDecision;
    }

    // Fall back to default strategy
    return this.applyStrategy(this.config.defaultStrategy, newMemory, contradictions);
  }

  private evaluateRules(
    newMemory: Memory,
    contradictions: Contradiction[]
  ): ContradictionDecision | null {
    const sortedRules = [...this.customRules].sort((a, b) => b.priority - a.priority);

    let bestDecision: ContradictionDecision | null = null;

    for (const rule of sortedRules) {
      if (this.ruleMatches(rule, newMemory)) {
        const decision = this.executeRuleAction(rule, newMemory, contradictions);
        if (rule.override) {
          return decision;
        }
        if (!bestDecision) {
          bestDecision = decision;
        }
      }
    }

    return bestDecision;
  }

  private ruleMatches(rule: PolicyRule, memory: Memory): boolean {
    switch (rule.condition.type) {
      case 'importance_equals':
        return memory.importance === rule.condition.value;
      case 'memory_type_in':
        return rule.condition.values.includes(memory.type);
      case 'tag_matches': {
        try {
          const pattern = new RegExp(rule.condition.pattern);
          return memory.tags.some((tag) => pattern.test(tag));
        } catch {
          return false;
        }
      }
      case 'confidence_above':
        return memory.confidence >= rule.condition.threshold;
      case 'source_is':
        return memory.source === rule.condition.value;
      case 'age_exceeds': {
        const ageInDays = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return ageInDays > rule.condition.days;
      }
      case 'custom':
        return rule.condition.evaluate(memory, {});
      default:
        return false;
    }
  }

  private executeRuleAction(
    rule: PolicyRule,
    newMemory: Memory,
    contradictions: Contradiction[]
  ): ContradictionDecision {
    switch (rule.action.type) {
      case 'prefer_new':
        return {
          action: 'replace',
          memory: newMemory,
          archiveIds: contradictions.map((c) => c.existingMemory.id),
          reason: `rule:${rule.id}`,
        };
      case 'prefer_existing':
        return {
          action: 'reject',
          memory: newMemory,
          reason: `rule:${rule.id}`,
        };
      case 'require_review':
        return {
          action: 'review',
          memory: newMemory,
          reason: `rule:${rule.id}`,
        };
      default:
        return {
          action: 'review',
          memory: newMemory,
          reason: `unhandled_rule_action:${rule.action.type}`,
        };
    }
  }

  private applyStrategy(
    strategy: ContradictionStrategy,
    newMemory: Memory,
    contradictions: Contradiction[]
  ): ContradictionDecision {
    switch (strategy) {
      case ContradictionStrategy.NEWEST_WINS:
        return {
          action: 'replace',
          memory: newMemory,
          archiveIds: contradictions.map((c) => c.existingMemory.id),
          reason: 'newest_wins',
        };

      case ContradictionStrategy.OLDEST_WINS:
        return {
          action: 'reject',
          memory: newMemory,
          reason: 'oldest_wins',
        };

      case ContradictionStrategy.HIGHEST_CONFIDENCE: {
        const maxConfidence = Math.max(
          newMemory.confidence,
          ...contradictions.map((c) => c.existingMemory.confidence)
        );

        if (newMemory.confidence >= maxConfidence) {
          return {
            action: 'replace',
            memory: newMemory,
            archiveIds: contradictions.map((c) => c.existingMemory.id),
            reason: 'highest_confidence',
          };
        }

        return {
          action: 'reject',
          memory: newMemory,
          reason: 'existing_higher_confidence',
        };
      }

      case ContradictionStrategy.MANUAL_REVIEW:
        return {
          action: 'review',
          memory: newMemory,
          reason: 'manual_review_required',
        };

      default:
        return {
          action: 'review',
          memory: newMemory,
          reason: `unknown_strategy:${strategy as string}`,
        };
    }
  }
}
