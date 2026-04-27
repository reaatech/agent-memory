import type { EmbeddingProvider, ModelInfo } from './types.js';
import { withRetry } from '@core/retry.js';
import { fetchWithTimeout } from '../utils/fetch.js';

export interface CohereEmbeddingConfig {
  apiKey: string;
  model: string;
  dimensions?: number;
}

/**
 * Cohere embedding provider.
 *
 * Supports Cohere's embed models (e.g. embed-english-v3).
 */
export class CohereEmbeddingProvider implements EmbeddingProvider {
  private config: CohereEmbeddingConfig;

  constructor(config: CohereEmbeddingConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error('Cohere API key is required');
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
      maxInputLength: 512,
    };
  }

  private async fetchEmbeddings(texts: string[]): Promise<number[][]> {
    const url = 'https://api.cohere.com/v1/embed';
    const body: Record<string, unknown> = {
      model: this.config.model,
      texts,
      input_type: 'search_document',
      embedding_types: ['float'],
    };

    if (this.config.dimensions) {
      body.dimensions = this.config.dimensions;
    }

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Cohere embedding error: HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      embeddings?: number[][] | { float?: number[][] };
    };

    const embeddings = Array.isArray(data.embeddings)
      ? data.embeddings
      : (data.embeddings?.float ?? []);

    if (embeddings.length !== texts.length) {
      throw new Error(`Cohere returned ${embeddings.length} embeddings, expected ${texts.length}`);
    }

    return embeddings;
  }

  private defaultDimensions(): number {
    const model = this.config.model;
    // Exact match first to avoid substring confusion (e.g., light model)
    if (model === 'embed-english-light-v3.0' || model === 'embed-english-light-v3') {
      return 384;
    }
    if (model.includes('embed-english-v3')) {
      return 1024;
    }
    if (model === 'embed-multilingual-light-v3.0') {
      return 384;
    }
    if (model.includes('embed-multilingual-v3')) {
      return 1024;
    }
    return 1024;
  }
}
