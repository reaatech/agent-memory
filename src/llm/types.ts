/**
 * LLM provider abstraction for memory extraction.
 */
export interface LLMProvider {
  /** Generate a completion from a prompt */
  complete(prompt: string): Promise<string>;
  /** Generate a structured completion from a prompt and schema */
  completeStructured<T>(prompt: string, schema: object): Promise<T>;
}
