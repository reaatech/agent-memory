import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CohereEmbeddingProvider } from './cohere-provider.js';

describe('CohereEmbeddingProvider', () => {
  const config = { apiKey: 'test-key', model: 'embed-english-v3' };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        const body = JSON.parse((init.body as string) ?? '{}');
        const numTexts: number = Array.isArray(body.texts) ? body.texts.length : 1;
        const embeddings = Array.from({ length: numTexts }, (_, i) => [
          (i + 1) * 0.1,
          (i + 1) * 0.2,
          (i + 1) * 0.3,
        ]);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ embeddings }),
          text: () => Promise.resolve(''),
        } as Response);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('embeds a single text', async () => {
    const provider = new CohereEmbeddingProvider(config);
    const result = await provider.embed('hello');
    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(body.texts).toEqual(['hello']);
    expect(body.model).toBe('embed-english-v3');
    expect(body.input_type).toBe('search_document');
  });

  it('embeds a batch of texts', async () => {
    const provider = new CohereEmbeddingProvider(config);
    const result = await provider.embedBatch(['hello', 'world']);
    expect(result).toEqual([
      [0.1, 0.2, 0.3],
      [0.2, 0.4, 0.6],
    ]);
  });

  it('throws on API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Unauthorized'),
        } as Response),
      ),
    );
    const provider = new CohereEmbeddingProvider(config);
    await expect(provider.embed('hello')).rejects.toThrow('Cohere embedding error: HTTP 401');
  });

  it('returns correct model info for embed-english-v3', () => {
    const provider = new CohereEmbeddingProvider(config);
    const info = provider.getModelInfo();
    expect(info.name).toBe('embed-english-v3');
    expect(info.dimensions).toBe(1024);
    expect(info.maxInputLength).toBe(512);
  });

  it('returns correct model info for embed-multilingual-v3', () => {
    const provider = new CohereEmbeddingProvider({
      apiKey: 'test-key',
      model: 'embed-multilingual-v3',
    });
    expect(provider.getModelInfo().dimensions).toBe(1024);
  });

  it('uses custom dimensions when provided', () => {
    const provider = new CohereEmbeddingProvider({
      apiKey: 'test-key',
      model: 'embed-english-v3',
      dimensions: 256,
    });
    expect(provider.getModelInfo().dimensions).toBe(256);
  });

  it('sends custom dimensions in request body', async () => {
    const provider = new CohereEmbeddingProvider({
      apiKey: 'test-key',
      model: 'embed-english-v3',
      dimensions: 256,
    });
    await provider.embed('hello');
    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(body.dimensions).toBe(256);
  });

  it('handles float-wrapped embedding response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              embeddings: {
                float: [[0.1, 0.2, 0.3]],
              },
            }),
          text: () => Promise.resolve(''),
        } as Response),
      ),
    );
    const provider = new CohereEmbeddingProvider(config);
    const result = await provider.embed('hello');
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });
});
