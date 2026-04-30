import { withRetry } from '@reaatech/agent-memory-core';
import { fetchWithTimeout } from '@reaatech/agent-memory-core';
import type { LLMProvider } from './types.js';

export interface OpenAILLMConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
}

/**
 * OpenAI LLM provider for memory extraction.
 */
export class OpenAILLMProvider implements LLMProvider {
  constructor(private config: OpenAILLMConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error('OpenAI API key is required');
    }
  }

  async complete(prompt: string): Promise<string> {
    return withRetry(() => this.chatCompletion(prompt));
  }

  async completeStructured<T>(prompt: string, _schema: object): Promise<T> {
    const text = await this.chatCompletion(prompt);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error('Failed to parse structured response from LLM');
    }
  }

  private async chatCompletion(prompt: string): Promise<string> {
    const url = `${this.config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`;

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that extracts memorable facts from conversations.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature ?? 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    if (!Array.isArray(data?.choices)) {
      throw new Error('Unexpected OpenAI response format: missing choices array');
    }

    return data.choices[0]?.message?.content ?? '';
  }
}
