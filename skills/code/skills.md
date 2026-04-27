# Code Agent Skills

## Overview

The Code Agent is responsible for implementation, code quality, and ensuring adherence to TypeScript best practices. This agent focuses on writing clean, maintainable, and performant code that aligns with the project's architecture and quality standards.

## Skills

### 1. Code Implementation

**Skill ID**: `code.implementation`

**Description**: Implements features and components according to the ARCHITECTURE.md specification.

**Capabilities**:
- Write TypeScript code with strict type safety
- Implement design patterns (adapter, factory, strategy, etc.)
- Create modular and reusable components
- Follow SOLID principles
- Implement error handling and recovery

**Input Context**:
```typescript
interface CodeImplementationContext {
  feature: string;
  specifications: string;
  dependencies: string[];
  performanceRequirements?: PerformanceRequirements;
  testRequirements?: TestRequirements;
}
```

**Output**:
```typescript
interface CodeImplementationResult {
  files: CodeFile[];
  complexity: number;
  testCoverage: number;
  performanceImpact?: PerformanceImpact;
}
```

### 2. Code Review

**Skill ID**: `code.code-review`

**Description**: Reviews code changes for quality, performance, and adherence to standards.

**Capabilities**:
- Identify code smells and anti-patterns
- Check for TypeScript best practices
- Validate error handling completeness
- Assess performance implications
- Review security considerations
- Check for proper documentation

**Input Context**:
```typescript
interface CodeReviewContext {
  changes: CodeChange[];
  affectedFiles: string[];
  reviewFocus?: ('quality' | 'performance' | 'security' | 'maintainability')[];
  standards?: CodeStandards;
}
```

**Output**:
```typescript
interface CodeReviewResult {
  approval: boolean;
  issues: CodeIssue[];
  suggestions: string[];
  qualityScore: number; // 0-100
}
```

### 3. Refactoring

**Skill ID**: `code.refactoring`

**Description**: Plans and executes code refactoring while maintaining functionality.

**Capabilities**:
- Identify refactoring opportunities
- Plan safe refactoring strategies
- Maintain backward compatibility
- Preserve test coverage
- Update documentation

**Input Context**:
```typescript
interface RefactoringContext {
  targetCode: string;
  refactoringGoal: string;
  constraints?: RefactoringConstraints;
  compatibilityRequirements?: CompatibilityRequirements;
}
```

### 4. Type System Design

**Skill ID**: `code.type-system-design`

**Description**: Designs and implements TypeScript type systems for complex domains.

**Capabilities**:
- Design generic types and interfaces
- Implement type guards and type narrowing
- Create utility types
- Design discriminated unions
- Implement advanced type patterns

**Input Context**:
```typescript
interface TypeSystemDesignContext {
  domain: string;
  complexity: 'simple' | 'moderate' | 'complex';
  extensibilityNeeds: ExtensibilityNeeds;
  compatibilityRequirements?: CompatibilityRequirements;
}
```

### 5. Performance Optimization

**Skill ID**: `code.performance-optimization`

**Description**: Optimizes code for performance while maintaining readability.

**Capabilities**:
- Identify performance bottlenecks
- Implement caching strategies
- Optimize algorithms and data structures
- Reduce memory footprint
- Improve execution speed

**Input Context**:
```typescript
interface PerformanceOptimizationContext {
  currentPerformance: PerformanceMetrics;
  targetPerformance: PerformanceTargets;
  constraints?: OptimizationConstraints;
  acceptableTradeoffs?: Tradeoff[];
}
```

### 6. Error Handling Design

**Skill ID**: `code.error-handling-design`

**Description**: Designs comprehensive error handling strategies.

**Capabilities**:
- Design error hierarchies
- Implement proper error propagation
- Create user-friendly error messages
- Design recovery strategies
- Implement logging and monitoring

**Input Context**:
```typescript
interface ErrorHandlingDesignContext {
  component: string;
  failureModes: string[];
  recoveryStrategies?: RecoveryStrategy[];
  userExperienceRequirements?: UXRequirements;
}
```

### 7. Documentation Generation

**Skill ID**: `code.documentation-generation`

**Description**: Generates code documentation and inline comments.

**Capabilities**:
- Write JSDoc comments
- Create API documentation
- Generate usage examples
- Document complex algorithms
- Create migration guides

**Input Context**:
```typescript
interface DocumentationGenerationContext {
  codeElement: string;
  documentationType: 'api' | 'tutorial' | 'reference';
  targetAudience: 'developer' | 'user' | 'maintainer';
  complexity: 'basic' | 'intermediate' | 'advanced';
}
```

## Usage Guidelines

### When to Invoke

Invoke the Code Agent when:
- Implementing new features or components
- Reviewing pull requests
- Planning refactoring efforts
- Designing type systems
- Optimizing performance
- Creating documentation

### Domain Context: agent-memory

When implementing agent-memory features:
- Respect the `Memory` interface contract: all fields (including `lifecycle`, `ownerId`, `tenantId`) must be handled
- Storage adapters must implement the full `MemoryStorage` interface; use the in-memory adapter for unit tests
- The **Policy Engine** uses pluggable `PolicyRule` objects — implement rules as pure, testable functions
- Never use `any` in the public API; use strict types for `MemoryType`, `MemoryImportance`, `MemoryLifecycle`
- Event hooks (`memory:extracted`, `memory:stored`, etc.) must be emitted at the correct lifecycle points

### Best Practices

1. **Follow TypeScript strict mode**: All code must pass strict TypeScript checks
2. **Maintain test coverage**: Ensure ≥90% test coverage for new code
3. **Use meaningful names**: Choose descriptive variable and function names
4. **Keep functions small**: Functions should do one thing well
5. **Document complex logic**: Add comments for non-obvious code
6. **Handle errors gracefully**: Always consider error cases

### Example Invocation

```typescript
const context: CodeImplementationContext = {
  feature: 'Memory Retriever with hybrid search',
  specifications: 'Implement semantic search with metadata filtering and re-ranking',
  dependencies: ['MemoryStorage', 'EmbeddingService', 'CrossEncoder'],
  performanceRequirements: {
    targetLatency: 100, // ms
    maxMemoryUsage: 50, // MB
  },
  testRequirements: {
    unitTests: true,
    integrationTests: true,
    performanceTests: true,
  },
};

const result = await codeAgent.invoke('code.implementation', context);
```

## Quality Metrics

The Code Agent measures success using:
- **Code Quality Score**: Based on complexity, maintainability, and best practices (target: ≥85%)
- **Test Coverage**: Percentage of code covered by tests (target: ≥90%)
- **Performance**: Meets or exceeds performance targets
- **Type Safety**: No `any` types in public API
- **Documentation**: Complete API documentation and inline comments

## Code Standards

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022"],
    "declaration": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### ESLint Configuration (flat config, ESM)
```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node, ...globals.vitest },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  }
);
```

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

## Related Skills

- **Architecture Agent**: Architectural guidance and design patterns
- **Test Agent**: Test strategy and quality assurance
- **Security Agent**: Security review and compliance
- **Documentation Agent**: Technical writing and user documentation
