import type { Memory } from '@reaatech/agent-memory-core';
import type { MetadataFilter } from './types.js';

export function matchesMetadataFilter(memory: Memory, filters?: MetadataFilter): boolean {
  if (!filters) return true;

  if (filters.types && !filters.types.includes(memory.type)) {
    return false;
  }
  if (filters.importance && memory.importance !== filters.importance) {
    return false;
  }
  if (filters.tags && !filters.tags.some((tag) => memory.tags.includes(tag))) {
    return false;
  }
  if (filters.category && memory.category !== filters.category) {
    return false;
  }
  if (filters.source && memory.source !== filters.source) {
    return false;
  }
  if (filters.createdAfter && memory.createdAt < filters.createdAfter) {
    return false;
  }
  if (filters.createdBefore && memory.createdAt > filters.createdBefore) {
    return false;
  }
  if (filters.embeddingModel && memory.embeddings.model !== filters.embeddingModel) {
    return false;
  }

  return true;
}
