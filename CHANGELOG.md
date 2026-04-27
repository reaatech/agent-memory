# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-22

### Added
- Initial public release of `@reaatech/agent-memory`.
- `AgentMemory` facade class for unified memory management.
- **Storage adapters**: In-memory adapter for testing and lightweight deployments; PostgreSQL + pgvector adapter for production.
- **Embedding providers**: OpenAI (`text-embedding-3-small`, `text-embedding-3-large`, `ada-002`), Cohere, and HuggingFace Inference API.
- **LLM provider**: OpenAI provider for memory extraction.
- **Memory extraction**: `MemoryExtractor` with LLM-powered fact, preference, decision, and correction extraction from conversations.
- **Retrieval strategies**: Semantic similarity, recency-based, importance-based, topic-based, and adaptive weighted combination.
- **Context injection**: `ContextInjector` formats retrieved memories for LLM prompt insertion with token budget management.
- **Policy engine**: Configurable decay engine, forgetting policy, and contradiction detection/resolution.
- **Event system**: `InMemoryEventBus` for subscribing to memory lifecycle events (extracted, stored, retrieved, forgotten, contradictions).
- **Embedding cache**: In-memory LRU cache with TTL for embedding vectors.
- TypeScript strict mode with full type safety across the public API.
- Comprehensive test suite with Vitest covering unit tests for all modules.

### Notes
- This is an early release focused on the PostgreSQL + OpenAI stack.
- Qdrant and Pinecone adapters are on the roadmap for future releases.
- Cross-encoder re-ranking is planned for a future update.

[0.1.0]: https://github.com/reaatech/agent-memory/releases/tag/v0.1.0
