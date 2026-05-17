import type { Memory } from '@reaatech/agent-memory-core';
import { cosineSimilarity, getLogger, MemoryLifecycle } from '@reaatech/agent-memory-core';

/**
 * Detects potential contradictions between a new memory and existing memories.
 *
 * Uses semantic similarity (cosine similarity of embeddings) as a proxy
 * for contradiction likelihood. High similarity + different content = potential contradiction.
 */
export class ContradictionDetector {
  constructor(private similarityThreshold = 0.85) {}

  /**
   * Detect contradictions between a new memory and existing active memories.
   *
   * @param newMemory - The incoming memory to check for contradictions
   * @param existingMemories - Existing memories to compare against
   * @returns Array of contradictions found (empty if none)
   */
  detect(newMemory: Memory, existingMemories: Memory[]): Contradiction[] {
    const contradictions: Contradiction[] = [];

    for (const existing of existingMemories) {
      if (existing.id === newMemory.id) continue;
      if (existing.lifecycle !== MemoryLifecycle.ACTIVE) continue;

      if (newMemory.embeddings.vector.length !== existing.embeddings.vector.length) {
        getLogger().warn(
          `Skipping contradiction check: vector dimension mismatch (${newMemory.embeddings.vector.length} vs ${existing.embeddings.vector.length}) for memory ${newMemory.id}`,
        );
        continue;
      }

      const similarity = cosineSimilarity(newMemory.embeddings.vector, existing.embeddings.vector);

      if (similarity >= this.similarityThreshold) {
        contradictions.push({
          newMemory,
          existingMemory: existing,
          similarity,
        });
      }
    }

    return contradictions;
  }
}

export interface Contradiction {
  newMemory: Memory;
  existingMemory: Memory;
  similarity: number;
}
