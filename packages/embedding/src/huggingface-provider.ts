import { fetchWithTimeout, withRetry } from '@reaatech/agent-memory-core';
import type { EmbeddingProvider, ModelInfo } from './types.js';

export interface HuggingFaceEmbeddingConfig {
  apiKey: string;
  model: string;
}

/**
 * HuggingFace Inference API embedding provider.
 *
 * Uses the feature-extraction pipeline for sentence-transformers models.
 */
export class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
  private config: HuggingFaceEmbeddingConfig;

  constructor(config: HuggingFaceEmbeddingConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error('HuggingFace API key is required');
    }
    this.config = config;
  }

  async embed(text: string): Promise<number[]> {
    const response = await withRetry(() => this.fetchEmbeddings([text]));
    return response[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    return withRetry(() => this.fetchEmbeddings(texts));
  }

  getModelInfo(): ModelInfo {
    return {
      name: this.config.model,
      dimensions: this.defaultDimensions(),
      maxInputLength: 512,
    };
  }

  private async fetchEmbeddings(texts: string[]): Promise<number[][]> {
    const url = `https://api-inference.huggingface.co/pipeline/feature-extraction/${encodeURIComponent(this.config.model)}`;

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ inputs: texts }),
    });

    if (!response.ok) {
      throw new Error(`HuggingFace embedding error: HTTP ${response.status}`);
    }

    const data = (await response.json()) as Record<string, unknown> | number[][] | number[];

    // Check for HF cold-start / model loading response
    if (data !== null && typeof data === 'object' && !Array.isArray(data) && 'error' in data) {
      const errorMsg = typeof data.error === 'string' ? data.error : 'Unknown HF error';
      throw new Error(`HuggingFace API error: ${errorMsg}`);
    }

    // HF returns number[] for single input, number[][] for batch
    if (!Array.isArray(data)) {
      throw new Error('Unexpected HuggingFace response format');
    }

    if (data.length === 0) {
      return [];
    }

    // If first element is a number, it's a single embedding wrapped as number[]
    if (typeof data[0] === 'number') {
      return [data as number[]];
    }

    return data as number[][];
  }

  private defaultDimensions(): number {
    if (this.config.model.includes('all-MiniLM-L6-v2')) {
      return 384;
    }
    if (this.config.model.includes('all-MiniLM-L12-v2')) {
      return 384;
    }
    if (this.config.model.includes('all-mpnet-base-v2')) {
      return 768;
    }
    return 384;
  }
}
