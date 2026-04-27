import type { Memory } from '@core/types.js';
import type { ConversationTurn } from '@extraction/types.js';

/**
 * Injects retrieved memories into conversation context.
 *
 * Formats memories by type and truncates to fit within a token budget.
 */
export class ContextInjector {
  private charsPerToken: number;

  constructor(
    private maxTokens: number = 2000,
    charsPerToken: number = 3
  ) {
    if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
      throw new RangeError(`maxTokens must be a positive integer, got ${maxTokens}`);
    }
    if (charsPerToken <= 0 || charsPerToken > 10) {
      throw new RangeError(`charsPerToken must be between 1 and 10, got ${charsPerToken}`);
    }
    this.charsPerToken = charsPerToken;
  }

  async injectMemoriesIntoContext(
    _conversation: ConversationTurn[],
    memories: Memory[],
    tokenBudget?: number
  ): Promise<string> {
    const budget = tokenBudget ?? this.maxTokens;
    if (budget <= 0) {
      throw new RangeError(`tokenBudget must be a positive integer, got ${budget}`);
    }
    const formatted = this.formatMemories(memories);
    const truncated = this.truncateToBudget(formatted, budget);

    return this.createInjectionPrompt(truncated);
  }

  private formatMemories(memories: Memory[]): string {
    const sections: Record<string, string[]> = {
      facts: [],
      preferences: [],
      decisions: [],
      corrections: [],
      context: [],
      episodic: [],
    };

    for (const memory of memories) {
      const formatted = this.formatMemory(memory);
      const key = `${memory.type}s`;
      sections[key].push(formatted);
    }

    const parts: string[] = [];
    for (const [type, items] of Object.entries(sections)) {
      if (items.length > 0) {
        parts.push(`## ${type.toUpperCase()}\n${items.join('\n')}`);
      }
    }

    return parts.join('\n\n');
  }

  private formatMemory(memory: Memory): string {
    const date = memory.createdAt.toLocaleDateString();
    const confidence = Math.round(memory.confidence * 100);
    return `- ${memory.content} (confidence: ${confidence}%, ${date})`;
  }

  private truncateToBudget(text: string, budget: number): string {
    const maxChars = budget * this.charsPerToken;
    if (text.length <= maxChars) return text;

    // Use Array.from to avoid splitting multi-byte characters
    const chars = Array.from(text);
    return chars.slice(0, maxChars).join('') + '\n... (truncated)';
  }

  private createInjectionPrompt(formattedMemories: string): string {
    return `The following information has been retrieved from long-term memory and should be considered in your response:

${formattedMemories}

Use this information to provide more personalized and contextually relevant responses.`;
  }
}
