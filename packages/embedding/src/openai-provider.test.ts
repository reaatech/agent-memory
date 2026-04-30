import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAIEmbeddingProvider } from './openai-provider.js';

describe('OpenAIEmbeddingProvider', () => {
  const config = { apiKey: 'test-key', model: 'text-embedding-3-small' };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }],
            }),
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
    const provider = new OpenAIEmbeddingProvider(config);
    const result = await provider.embed('hello');
    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(body.input).toEqual(['hello']);
    expect(body.model).toBe('text-embedding-3-small');
  });

  it('embeds a batch of texts', async () => {
    const provider = new OpenAIEmbeddingProvider(config);
    const result = await provider.embedBatch(['hello', 'world']);
    expect(result).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);
    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(body.input).toEqual(['hello', 'world']);
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
    const provider = new OpenAIEmbeddingProvider(config);
    await expect(provider.embed('hello')).rejects.toThrow('OpenAI embedding error: HTTP 401');
  });

  it('returns correct model info for text-embedding-3-small', () => {
    const provider = new OpenAIEmbeddingProvider(config);
    const info = provider.getModelInfo();
    expect(info.name).toBe('text-embedding-3-small');
    expect(info.dimensions).toBe(1536);
    expect(info.maxInputLength).toBe(8191);
  });

  it('returns correct model info for text-embedding-3-large', () => {
    const provider = new OpenAIEmbeddingProvider({
      apiKey: 'test-key',
      model: 'text-embedding-3-large',
    });
    expect(provider.getModelInfo().dimensions).toBe(3072);
  });

  it('returns correct model info for text-embedding-ada-002', () => {
    const provider = new OpenAIEmbeddingProvider({
      apiKey: 'test-key',
      model: 'text-embedding-ada-002',
    });
    expect(provider.getModelInfo().dimensions).toBe(1536);
  });

  it('uses custom dimensions when provided', () => {
    const provider = new OpenAIEmbeddingProvider({
      apiKey: 'test-key',
      model: 'text-embedding-3-small',
      dimensions: 512,
    });
    expect(provider.getModelInfo().dimensions).toBe(512);
  });

  it('sends custom dimensions in request body', async () => {
    const provider = new OpenAIEmbeddingProvider({
      apiKey: 'test-key',
      model: 'text-embedding-3-small',
      dimensions: 512,
    });
    await provider.embed('hello');
    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(body.dimensions).toBe(512);
  });

  it('uses custom baseUrl', async () => {
    const provider = new OpenAIEmbeddingProvider({
      apiKey: 'test-key',
      model: 'text-embedding-3-small',
      baseUrl: 'https://custom.openai.com/v1',
    });
    await provider.embed('hello');
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toBe('https://custom.openai.com/v1/embeddings');
  });

  it('defaults to OpenAI base URL', async () => {
    const provider = new OpenAIEmbeddingProvider(config);
    await provider.embed('hello');
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toBe('https://api.openai.com/v1/embeddings');
  });
});
