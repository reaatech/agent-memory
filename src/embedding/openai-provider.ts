import type { EmbeddingProvider, ModelInfo } from './types.js';
import { withRetry } from '@core/retry.js';
import { fetchWithTimeout } from '../utils/fetch.js';

export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model: string;
  dimensions?: number;
  baseUrl?: string;
}

/**
 * OpenAI embedding provider.
 *
 * Supports text-embedding-3-small, text-embedding-3-large, and ada-002.
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private config: OpenAIEmbeddingConfig;

  constructor(config: OpenAIEmbeddingConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error('OpenAI API key is required');
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
    const dims = this.config.dimensions ?? this.defaultDimensions();
    return {
      name: this.config.model,
      dimensions: dims,
      maxInputLength: 8191,
    };
  }

  private async fetchEmbeddings(texts: string[]): Promise<number[][]> {
    const url = `${this.config.baseUrl ?? 'https://api.openai.com/v1'}/embeddings`;
    const body: Record<string, unknown> = {
      model: this.config.model,
      input: texts,
    };

    if (this.config.dimensions) {
      body.dimensions = this.config.dimensions;
    }

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding error: HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      data: { embedding: number[] }[];
    };

    if (!Array.isArray(data?.data)) {
      throw new Error('Unexpected OpenAI embedding response format');
    }

    return data.data.map((d) => d.embedding);
  }

  private defaultDimensions(): number {
    switch (this.config.model) {
      case 'text-embedding-3-small':
        return 1536;
      case 'text-embedding-3-large':
        return 3072;
      case 'text-embedding-ada-002':
        return 1536;
      default:
        return 1536;
    }
  }
}
