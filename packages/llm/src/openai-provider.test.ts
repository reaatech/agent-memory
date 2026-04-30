import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAILLMProvider } from './openai-provider.js';

describe('OpenAILLMProvider', () => {
  const config = { apiKey: 'test-key', model: 'gpt-4o-mini' };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: 'Hello, world!',
                  },
                },
              ],
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

  it('returns completion text', async () => {
    const provider = new OpenAILLMProvider(config);
    const result = await provider.complete('Say hello');
    expect(result).toBe('Hello, world!');
  });

  it('sends correct request body', async () => {
    const provider = new OpenAILLMProvider(config);
    await provider.complete('Say hello');
    expect(fetch).toHaveBeenCalledTimes(1);
    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toBe('Say hello');
    expect(body.temperature).toBe(0.2);
  });

  it('uses custom temperature', async () => {
    const provider = new OpenAILLMProvider({ ...config, temperature: 0.9 });
    await provider.complete('Say hello');
    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(body.temperature).toBe(0.9);
  });

  it('throws on API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          text: () => Promise.resolve('Rate limited'),
        } as Response),
      ),
    );
    const provider = new OpenAILLMProvider(config);
    await expect(provider.complete('Say hello')).rejects.toThrow('OpenAI API error: HTTP 429');
  });

  it('returns empty string when no choices', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [] }),
          text: () => Promise.resolve(''),
        } as Response),
      ),
    );
    const provider = new OpenAILLMProvider(config);
    const result = await provider.complete('Say hello');
    expect(result).toBe('');
  });

  it('parses structured response as JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({ name: 'Alice', age: 30 }),
                  },
                },
              ],
            }),
          text: () => Promise.resolve(''),
        } as Response),
      ),
    );
    const provider = new OpenAILLMProvider(config);
    const result = await provider.completeStructured<{ name: string; age: number }>(
      'Extract info',
      {},
    );
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('uses custom baseUrl', async () => {
    const provider = new OpenAILLMProvider({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      baseUrl: 'https://custom.openai.com/v1',
    });
    await provider.complete('Say hello');
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toBe('https://custom.openai.com/v1/chat/completions');
  });

  it('defaults to OpenAI base URL', async () => {
    const provider = new OpenAILLMProvider(config);
    await provider.complete('Say hello');
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
  });
});
