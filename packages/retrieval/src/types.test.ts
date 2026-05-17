import { describe, expect, it } from 'vitest';
import type { RetrievalConfig, RetrievalOptions } from './types.js';
import { RetrievalStrategy } from './types.js';

describe('retrieval types', () => {
  it('has correct retrieval strategy values', () => {
    expect(RetrievalStrategy.SEMANTIC).toBe('semantic');
    expect(RetrievalStrategy.RECENCY).toBe('recency');
    expect(RetrievalStrategy.IMPORTANCE).toBe('importance');
    expect(RetrievalStrategy.TOPIC).toBe('topic');
    expect(RetrievalStrategy.ADAPTIVE).toBe('adaptive');
  });

  it('allows retrieval options construction', () => {
    const options: RetrievalOptions = {
      limit: 5,
      diversityFactor: 0.3,
    };

    expect(options.limit).toBe(5);
  });

  it('allows retrieval config construction', () => {
    const config: RetrievalConfig = {
      defaultLimit: 5,
      useCrossEncoder: true,
      diversityFactor: 0.3,
      strategies: [RetrievalStrategy.SEMANTIC, RetrievalStrategy.RECENCY],
    };

    expect(config.strategies).toHaveLength(2);
  });
});
