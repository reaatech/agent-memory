import { describe, it, expect } from 'vitest';
import { MemoryImportance } from '@core/types.js';
import {
  DecayConfig,
  PolicyRule,
  DecayDecision,
  ForgettingDecision,
  ContradictionDecision,
} from './types.js';

describe('policies types', () => {
  it('allows decay config construction', () => {
    const config: DecayConfig = {
      halfLifeDays: {
        [MemoryImportance.CRITICAL]: 3650,
        [MemoryImportance.HIGH]: 365,
        [MemoryImportance.MEDIUM]: 90,
        [MemoryImportance.LOW]: 30,
        [MemoryImportance.TRANSIENT]: 7,
      },
      usageBoostFactor: 0.5,
      minimumThreshold: 0.1,
    };

    expect(config.halfLifeDays[MemoryImportance.CRITICAL]).toBe(3650);
  });

  it('allows policy rule construction', () => {
    const rule: PolicyRule = {
      id: 'test-rule',
      priority: 100,
      condition: { type: 'importance_equals', value: MemoryImportance.CRITICAL },
      action: { type: 'freeze_decay' },
    };

    expect(rule.priority).toBe(100);
  });

  it('allows custom policy condition', () => {
    const rule: PolicyRule = {
      id: 'custom-rule',
      priority: 50,
      condition: {
        type: 'custom',
        evaluate: (_memory, _context) => true,
      },
      action: {
        type: 'custom',
        execute: async () => {},
      },
    };

    expect(rule.condition.type).toBe('custom');
  });

  it('allows decision constructions', () => {
    const decayDecision: DecayDecision = { score: 0.5, frozen: false, reason: 'test' };
    const forgettingDecision: ForgettingDecision = {
      action: 'archive',
      reason: 'capacity',
      score: 0.2,
    };
    const contradictionDecision: ContradictionDecision = {
      action: 'replace',
      reason: 'higher_confidence',
      archiveIds: ['old-id'],
    };

    expect(decayDecision.frozen).toBe(false);
    expect(forgettingDecision.action).toBe('archive');
    expect(contradictionDecision.action).toBe('replace');
  });
});
