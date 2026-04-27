# Contributing to agent-memory

Thank you for your interest in contributing to agent-memory! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

### Our Pledge

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to a positive environment:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

Examples of unacceptable behavior:

- The use of sexualized language or imagery and unwelcome sexual attention
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team at conduct@reaatech.dev. All complaints will be reviewed and investigated promptly and fairly.

## Getting Started

### Prerequisites

- Node.js 20+ 
- pnpm 8+
- Git
- Docker (for running tests with databases)

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub (GitHub user: `reaatech`)

2. **Clone your fork locally:**
   ```bash
   git clone https://github.com/reaatech/agent-memory.git
   cd agent-memory
   ```

3. **Install dependencies:**
   ```bash
   pnpm install
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Build the project:**
   ```bash
   pnpm run build
   ```

### Project Structure

```
agent-memory/
├── src/                    # Source code
│   ├── core/              # Core types and math utilities
│   ├── storage/           # Storage adapters (in-memory, postgres)
│   ├── retrieval/         # Memory retrieval + context injection
│   │   └── strategies/    # Pluggable retrieval strategies
│   ├── policies/          # Memory management policies (decay, forget, contradiction)
│   ├── extraction/        # Memory extraction from conversations
│   ├── events/            # Event bus for memory lifecycle hooks
│   ├── embedding/         # Embedding providers (OpenAI, Cohere, HuggingFace)
│   └── llm/               # LLM provider (OpenAI)
├── examples/              # Example implementations
├── skills/                # AI agent skills (for development)
├── package.json           # Project metadata
├── tsconfig.json          # TypeScript configuration
└── CONTRIBUTING.md        # This file
```

## Development Workflow

### Branch Strategy

We use a trunk-based development approach with short-lived feature branches:

- **main**: Production-ready code
- **feature/***: New features (e.g., `feature/qdrant-adapter`)
- **fix/***: Bug fixes (e.g., `fix/memory-leak`)
- **docs/***: Documentation updates (e.g., `docs/api-reference`)

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear, semantic commit messages:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Example:**
```
feat(storage): add Pinecone adapter implementation

Implement Pinecone storage adapter with metadata filtering
and batch operations support.

Closes #123
```

### Pre-commit Hooks

We use Husky for pre-commit hooks. Before committing, the following checks run automatically:

- ESLint (code quality)
- Prettier (code formatting)

To set up Husky:
```bash
pnpm run prepare
```

## Pull Request Process

### Before Submitting

1. **Ensure your code follows our standards:**
   ```bash
   pnpm run lint
   pnpm run format
   pnpm run typecheck
   ```

2. **Run all tests:**
   ```bash
   pnpm run test
   ```

3. **Update documentation:**
   - Update README.md if needed
   - Add JSDoc comments for public APIs
   - Update examples if API changes

4. **Check test coverage:**
   ```bash
   pnpm run test:coverage
   ```
   Target: ≥90% coverage

### Submitting a Pull Request

1. **Create a branch** from `main` with a descriptive name
2. **Make your changes** following our coding standards
3. **Push to your fork** and create a Pull Request
4. **Fill out the PR template** completely
5. **Link related issues** in the PR description

### PR Review Process

1. **Automated checks** must pass (CI/CD pipeline)
2. **Code review** by at least one maintainer
3. **Address feedback** and update your PR
4. **Approval** from maintainers
5. **Merge** by a maintainer (squash and merge preferred)

### PR Template

```markdown
## Description
<!-- Describe your changes in detail -->

## Related Issue
<!-- Link to the issue this PR addresses -->

## Type of Change
<!-- Mark the relevant option with an x -->
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
<!-- Describe the tests you ran -->
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance tests
- [ ] Manual testing

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No new warnings or errors
```

## Coding Standards

### TypeScript

- **Strict mode enabled**: All code must compile with `strict: true`
- **No `any` types**: Use proper TypeScript types
- **Explicit return types**: Always specify function return types
- **Interface over type**: Prefer interfaces for object shapes
- **Immutable by default**: Use `readonly` and `const` where possible

### Code Style

We use ESLint and Prettier for consistent code style:

```bash
# Check code style
pnpm run lint

# Fix style issues automatically
pnpm run lint:fix

# Format code
pnpm run format
```

### Error Handling

- **Use custom error classes** for domain-specific errors
- **Include error codes** for programmatic handling
- **Provide helpful error messages** with context
- **Log errors appropriately** with proper severity levels

### Example Error Class

```typescript
export class MemoryNotFoundError extends Error {
  constructor(
    public readonly memoryId: string,
    public readonly tenantId?: string
  ) {
    super(`Memory with ID ${memoryId} not found${tenantId ? ` for tenant ${tenantId}` : ''}`);
    this.name = 'MemoryNotFoundError';
    this.code = 'MEMORY_NOT_FOUND';
  }
}
```

## Testing

### Test Structure

Tests are co-located with source files in `src/` using the `.test.ts` suffix:

```
src/
├── core/
│   ├── types.ts
│   ├── types.test.ts      # Tests for core types
│   ├── math.ts
│   └── math.test.ts       # Tests for math utilities
├── storage/
│   ├── in-memory.ts
│   └── in-memory.test.ts  # Tests for in-memory adapter
...
```

### Running Tests

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

### Writing Tests

- **Test behavior, not implementation**
- **Use descriptive test names**: `describe` and `it` blocks should be clear
- **Test edge cases and error conditions**
- **Mock external dependencies** appropriately
- **Keep tests independent** and idempotent

### Example Test

```typescript
describe('MemoryExtractor', () => {
  describe('extractFromConversation', () => {
    it('should extract user preferences from conversation', async () => {
      const conversation = [
        { role: 'user', content: 'I prefer dark mode interfaces' },
      ];
      
      const memories = await extractor.extractFromConversation(conversation);
      
      expect(memories).toHaveLength(1);
      expect(memories[0].type).toBe(MemoryType.PREFERENCE);
      expect(memories[0].content).toContain('dark mode');
    });
  });
});
```

## Documentation

### Documentation Standards

- **JSDoc for public APIs**: All exported functions, classes, and interfaces
- **README updates**: For user-facing changes
- **ARCHITECTURE.md**: For significant architectural changes
- **Examples**: For new features or complex functionality

### JSDoc Example

```typescript
/**
 * Extracts memorable information from a conversation.
 * 
 * @param conversation - Array of conversation turns to analyze
 * @param options - Extraction configuration options
 * @returns Promise resolving to extracted memories with confidence scores
 * 
 * @throws {ExtractionError} If the LLM provider fails
 * @throws {ValidationError} If the conversation format is invalid
 * 
 * @example
 * ```typescript
 * const memories = await extractor.extractFromConversation(conversation, {
 *   confidenceThreshold: 0.7,
 *   enabledTypes: [MemoryType.FACT, MemoryType.PREFERENCE],
 * });
 * ```
 */
async extractFromConversation(
  conversation: ConversationTurn[],
  options?: ExtractionOptions
): Promise<Memory[]> {
  // Implementation
}
```

## AI Agent Development

This project uses a multi-agent development approach. If you're contributing using AI agents:

1. **Review the AGENTS.md file** to understand the agent skills system
2. **Invoke appropriate agents** for your contribution type
3. **Follow agent recommendations** for your domain
4. **Update skill documentation** if adding new capabilities

### Available Agents

- **Architecture Agent**: For system design and architecture decisions
- **Code Agent**: For implementation and code quality
- **Test Agent**: For testing strategies and quality assurance
- **DevOps Agent**: For infrastructure and deployment
- **Security Agent**: For security reviews and compliance
- **Documentation Agent**: For technical writing and documentation

## Community

### Getting Help

- **GitHub Discussions**: For questions and discussions
- **GitHub Issues**: For bug reports and feature requests
- **Discord**: Join our community for real-time chat
- **Twitter**: Follow updates and announcements

### Reporting Bugs

Before reporting a bug:

1. **Check existing issues** to avoid duplicates
2. **Gather information**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Error messages and logs
3. **Create a minimal reproduction** if possible

### Suggesting Features

We welcome feature suggestions! Please:

1. **Check existing issues** to avoid duplicates
2. **Provide context** about the use case
3. **Describe the desired behavior** in detail
4. **Consider implementation complexity** and trade-offs

### Code of Conduct Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team at conduct@reaatech.dev.

All complaints will be reviewed and investigated promptly and fairly.

## License

By contributing to agent-memory, you agree that your contributions will be licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

Thank you to all our contributors! Your time and expertise help make agent-memory better for everyone.

Special thanks to:
- Our open-source community
- The TypeScript team
- The vector database community
- All our beta testers and early adopters

---

**Questions?** Feel free to open an issue or reach out to us on Discord.

**Ready to contribute?** Fork the repo and start coding!
