import { describe, it, expect } from 'vitest';
import { MemoryType } from '@core/types.js';
import { ConversationTurn, ExtractionResult, ExtractionConfig } from './types.js';

describe('extraction types', () => {
  it('allows conversation turn construction', () => {
    const turn: ConversationTurn = {
      speaker: 'user',
      content: 'Hello',
      timestamp: new Date(),
    };

    expect(turn.speaker).toBe('user');
  });

  it('allows extraction result construction', () => {
    const result: ExtractionResult = {
      candidates: [],
      rejected: [],
      confidence: 0.95,
      latencyMs: 120,
    };

    expect(result.confidence).toBe(0.95);
  });

  it('allows extraction config construction', () => {
    const config: ExtractionConfig = {
      batchSize: 10,
      confidenceThreshold: 0.7,
      enabledTypes: [MemoryType.FACT, MemoryType.PREFERENCE],
      tenantId: 'tenant-1',
      ownerId: 'owner-1',
    };

    expect(config.batchSize).toBe(10);
  });
});
