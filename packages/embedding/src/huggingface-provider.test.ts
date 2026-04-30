import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HuggingFaceEmbeddingProvider } from './huggingface-provider.js';

describe('HuggingFaceEmbeddingProvider', () => {
  const config = { apiKey: 'test-key', model: 'sentence-transformers/all-MiniLM-L6-v2' };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              [0.1, 0.2, 0.3],
              [0.4, 0.5, 0.6],
            ]),
          text: () => Promise.resolve(''),
        } as Response),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('embeds a single text', async () => {
    const provider = new HuggingFaceEmbeddingProvider(config);
    const result = await provider.embed('hello');
    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toBe(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers%2Fall-MiniLM-L6-v2',
    );
    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(body.inputs).toEqual(['hello']);
  });

  it('embeds a batch of texts', async () => {
    const provider = new HuggingFaceEmbeddingProvider(config);
    const result = await provider.embedBatch(['hello', 'world']);
    expect(result).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
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
    const provider = new HuggingFaceEmbeddingProvider(config);
    await expect(provider.embed('hello')).rejects.toThrow('HuggingFace embedding error: HTTP 401');
  });

  it('returns correct model info for all-MiniLM-L6-v2', () => {
    const provider = new HuggingFaceEmbeddingProvider(config);
    const info = provider.getModelInfo();
    expect(info.name).toBe('sentence-transformers/all-MiniLM-L6-v2');
    expect(info.dimensions).toBe(384);
    expect(info.maxInputLength).toBe(512);
  });

  it('returns correct dimensions for all-mpnet-base-v2', () => {
    const provider = new HuggingFaceEmbeddingProvider({
      apiKey: 'test-key',
      model: 'sentence-transformers/all-mpnet-base-v2',
    });
    expect(provider.getModelInfo().dimensions).toBe(768);
  });

  it('handles single embedding response format', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([0.1, 0.2, 0.3]),
          text: () => Promise.resolve(''),
        } as Response),
      ),
    );
    const provider = new HuggingFaceEmbeddingProvider(config);
    const result = await provider.embed('hello');
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it('throws on unexpected response format', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ not_an_array: true }),
          text: () => Promise.resolve(''),
        } as Response),
      ),
    );
    const provider = new HuggingFaceEmbeddingProvider(config);
    await expect(provider.embed('hello')).rejects.toThrow('Unexpected HuggingFace response format');
  });

  it('handles empty response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
          text: () => Promise.resolve(''),
        } as Response),
      ),
    );
    const provider = new HuggingFaceEmbeddingProvider(config);
    const result = await provider.embedBatch(['hello']);
    expect(result).toEqual([]);
  });
});
