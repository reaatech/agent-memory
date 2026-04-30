# @reaatech/agent-memory-llm

[![npm version](https://img.shields.io/npm/v/@reaatech/agent-memory-llm.svg)](https://www.npmjs.com/package/@reaatech/agent-memory-llm)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/agent-memory/ci.yml?branch=main&label=CI)](https://github.com/reaatech/agent-memory/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

LLM provider abstraction for memory extraction, classification, and structured reasoning. Ships with an OpenAI provider; implement the `LLMProvider` interface to integrate any model (Anthropic, local models via Ollama, etc.).

## Installation

```bash
npm install @reaatech/agent-memory-llm
# or
pnpm add @reaatech/agent-memory-llm
```

## Feature Overview

- **Single-method completion interface** — `complete()` for freeform and `completeStructured()` for JSON schema output
- **OpenAI provider** — pre-built for any OpenAI-compatible API (GPT-4o, GPT-4o-mini, local Ollama)
- **Fetch with timeout** — 30-second default timeout with custom abort signals
- **Zero dependencies beyond core** — lightweight and tree-shakeable
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import { OpenAILLMProvider } from '@reaatech/agent-memory-llm';

const llm = new OpenAILLMProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
});

// Free-form completion
const result = await llm.complete(
  'Extract any facts or preferences from: "I prefer dark mode and live in Seattle."',
);

// Structured output with JSON schema
const extraction = await llm.completeStructured<{ facts: string[] }>(
  'Extract user facts from the conversation.',
  {
    type: 'object',
    properties: {
      facts: { type: 'array', items: { type: 'string' } },
    },
    required: ['facts'],
  },
);
```

## API Reference

### `LLMProvider` Interface

The contract all providers must implement:

```typescript
interface LLMProvider {
  complete(prompt: string): Promise<string>;
  completeStructured<T>(prompt: string, schema: object): Promise<T>;
}
```

### `OpenAILLMProvider` (class)

OpenAI-compatible provider supporting any OpenAI API endpoint.

```typescript
import { OpenAILLMProvider } from '@reaatech/agent-memory-llm';

const llm = new OpenAILLMProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
  baseUrl: 'https://api.openai.com/v1',  // optional, for custom endpoints
  temperature: 0.3,                       // optional, defaults to 0.1
});
```

#### `OpenAILLMConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiKey` | `string` | (required) | OpenAI API key |
| `model` | `string` | (required) | Model name (`gpt-4o`, `gpt-4o-mini`, etc.) |
| `baseUrl` | `string` | `https://api.openai.com/v1` | API base URL for compatible endpoints |
| `temperature` | `number` | `0.1` | Sampling temperature (0–2) |

### `complete(prompt: string): Promise<string>`

Makes a chat completion request and returns the message content as a string.

```typescript
const text = await llm.complete('Summarize this conversation in 3 bullet points.');
```

### `completeStructured<T>(prompt: string, schema: object): Promise<T>`

Makes a chat completion with structured output parsing. Pass a JSON schema object; the response is parsed and validated as type `T`.

```typescript
interface Preferences {
  likes: string[];
  dislikes: string[];
}

const prefs = await llm.completeStructured<Preferences>(
  'Extract user preferences.',
  {
    type: 'object',
    properties: {
      likes: { type: 'array', items: { type: 'string' } },
      dislikes: { type: 'array', items: { type: 'string' } },
    },
  },
);
```

## Usage Patterns

### Using with Ollama (Local Models)

Any OpenAI-compatible endpoint works:

```typescript
const localLlm = new OpenAILLMProvider({
  apiKey: 'ollama',
  model: 'llama3.2',
  baseUrl: 'http://localhost:11434/v1',
});
```

### Creating a Custom Provider

Implement `LLMProvider`:

```typescript
import type { LLMProvider } from '@reaatech/agent-memory-llm';

class AnthropicProvider implements LLMProvider {
  constructor(private config: { apiKey: string; model: string }) {}

  async complete(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    return data.content[0].text;
  }

  async completeStructured<T>(prompt: string, schema: object): Promise<T> {
    // Implement with tool-use or prompt-engineering
    const text = await this.complete(prompt);
    return JSON.parse(text) as T;
  }
}
```

## Related Packages

- [`@reaatech/agent-memory-core`](https://www.npmjs.com/package/@reaatech/agent-memory-core) — Core types including `Memory`, `ConversationTurn`
- [`@reaatech/agent-memory-extraction`](https://www.npmjs.com/package/@reaatech/agent-memory-extraction) — Uses LLM providers for memory extraction
- [`@reaatech/agent-memory`](https://www.npmjs.com/package/@reaatech/agent-memory) — Main facade

## License

[MIT](https://github.com/reaatech/agent-memory/blob/main/LICENSE)
