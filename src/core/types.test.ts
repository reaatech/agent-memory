import { describe, it, expect } from 'vitest';
import { MemoryType, MemoryImportance, MemoryLifecycle, ContradictionStrategy } from './types.js';

describe('core types', () => {
  it('has correct memory type values', () => {
    expect(MemoryType.FACT).toBe('fact');
    expect(MemoryType.PREFERENCE).toBe('preference');
    expect(MemoryType.DECISION).toBe('decision');
    expect(MemoryType.CORRECTION).toBe('correction');
    expect(MemoryType.CONTEXT).toBe('context');
    expect(MemoryType.EPISODIC).toBe('episodic');
  });

  it('has correct importance levels', () => {
    expect(MemoryImportance.CRITICAL).toBe('critical');
    expect(MemoryImportance.HIGH).toBe('high');
    expect(MemoryImportance.MEDIUM).toBe('medium');
    expect(MemoryImportance.LOW).toBe('low');
    expect(MemoryImportance.TRANSIENT).toBe('transient');
  });

  it('has correct lifecycle states', () => {
    expect(MemoryLifecycle.ACTIVE).toBe('active');
    expect(MemoryLifecycle.ARCHIVED).toBe('archived');
    expect(MemoryLifecycle.PENDING_REVIEW).toBe('pending_review');
    expect(MemoryLifecycle.FORGOTTEN).toBe('forgotten');
  });

  it('has correct contradiction strategies', () => {
    expect(ContradictionStrategy.NEWEST_WINS).toBe('newest_wins');
    expect(ContradictionStrategy.OLDEST_WINS).toBe('oldest_wins');
    expect(ContradictionStrategy.HIGHEST_CONFIDENCE).toBe('highest_confidence');
    expect(ContradictionStrategy.MANUAL_REVIEW).toBe('manual_review');
  });
});
