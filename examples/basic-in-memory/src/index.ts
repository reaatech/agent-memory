/**
 * Basic example using the in-memory storage adapter.
 *
 * This is ideal for testing, demos, and lightweight deployments.
 * Data is not persisted across restarts.
 */

import { AgentMemory, MemoryType, OpenAILLMProvider } from '@reaatech/agent-memory';

const openai = new OpenAILLMProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
});

const memory = new AgentMemory({
  storage: { provider: 'memory' },
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY!,
  },
  extraction: {
    llmProvider: openai,
    enabledTypes: [MemoryType.FACT, MemoryType.PREFERENCE, MemoryType.CORRECTION],
    batchSize: 10,
    confidenceThreshold: 0.7,
  },
});

async function main(): Promise<void> {
  const conversation = [
    { speaker: 'user' as const, content: 'I prefer dark mode interfaces', timestamp: new Date() },
    { speaker: 'agent' as const, content: 'Noted! I will use dark mode.', timestamp: new Date() },
    { speaker: 'user' as const, content: 'I live in Seattle', timestamp: new Date() },
  ];

  const stored = await memory.extractAndStore(conversation);
  console.log(`Stored ${stored.length} memories`);

  const relevant = await memory.retrieve('Where does the user live?', { limit: 3 });
  console.log(
    'Relevant memories:',
    relevant.map((m) => m.content),
  );
}

main().catch(console.error);
