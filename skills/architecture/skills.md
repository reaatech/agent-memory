# Architecture Agent Skills

## Overview

The Architecture Agent is responsible for system design, architectural decisions, and ensuring the technical integrity of the agent-memory project. This agent focuses on high-level design patterns, component interactions, and long-term maintainability.

## Skills

### 1. System Design Review

**Skill ID**: `architecture.system-design-review`

**Description**: Reviews and validates system architecture decisions against the established ARCHITECTURE.md specification.

**Capabilities**:
- Evaluate component interactions and data flow
- Assess scalability and performance implications
- Identify potential bottlenecks or single points of failure
- Validate adherence to layered architecture principles
- Review storage abstraction and adapter patterns

**Input Context**:
```typescript
interface SystemDesignReviewContext {
  designProposal: string;
  affectedComponents: string[];
  performanceRequirements?: PerformanceRequirements;
  scalabilityNeeds?: ScalabilityNeeds;
}
```

**Output**:
```typescript
interface ArchitectureReviewResult {
  approval: boolean;
  concerns: string[];
  recommendations: string[];
  complianceScore: number; // 0-100
}
```

### 2. Technology Stack Evaluation

**Skill ID**: `architecture.tech-stack-evaluation`

**Description**: Evaluates technology choices for storage adapters, embedding providers, and LLM integrations.

**Capabilities**:
- Compare vector database options (Qdrant vs Pinecone vs pgvector)
- Assess embedding model trade-offs
- Evaluate LLM provider capabilities and costs
- Analyze dependency compatibility and version management
- Review licensing and compliance implications

**Input Context**:
```typescript
interface TechStackEvaluationContext {
  component: 'storage' | 'embedding' | 'llm' | 'infrastructure';
  options: TechnologyOption[];
  constraints: TechnologyConstraints;
  budget?: BudgetConstraints;
}
```

### 3. API Design

**Skill ID**: `architecture.api-design`

**Description**: Designs and validates public API interfaces for the memory system.

**Capabilities**:
- Design intuitive and consistent API interfaces
- Ensure backward compatibility
- Validate TypeScript type safety
- Review error handling patterns
- Assess developer experience

**Input Context**:
```typescript
interface APIDesignContext {
  moduleName: string;
  useCases: UseCase[];
  targetAudience: 'internal' | 'public';
  compatibilityRequirements?: CompatibilityRequirements;
}
```

### 4. Data Model Design

**Skill ID**: `architecture.data-model-design`

**Description**: Designs and validates data models for memory storage and retrieval.

**Capabilities**:
- Design Memory interface and related types
- Optimize data structures for performance
- Plan database schemas for different storage backends
- Design indexing strategies
- Validate data relationships and constraints

**Input Context**:
```typescript
interface DataModelDesignContext {
  entityType: 'memory' | 'relationship' | 'metadata';
  storageBackend: 'qdrant' | 'pinecone' | 'postgres';
  queryPatterns: QueryPattern[];
  performanceTargets?: PerformanceTargets;
}
```

### 5. Integration Architecture

**Skill ID**: `architecture.integration-architecture`

**Description**: Designs integration patterns for connecting agent-memory with external systems.

**Capabilities**:
- Design adapter patterns for storage backends
- Plan LLM integration strategies
- Design event-driven architectures
- Plan multi-tenant isolation strategies
- Design authentication and authorization flows

**Input Context**:
```typescript
interface IntegrationArchitectureContext {
  externalSystem: string;
  integrationType: 'sync' | 'async' | 'event-driven';
  dataFlow: DataFlowDescription;
  securityRequirements?: SecurityRequirements;
}
```

### 6. Performance Architecture

**Skill ID**: `architecture.performance-architecture`

**Description**: Designs and optimizes system performance characteristics.

**Capabilities**:
- Design caching strategies
- Plan connection pooling and resource management
- Optimize query performance
- Design batch processing strategies
- Plan for horizontal scaling

**Input Context**:
```typescript
interface PerformanceArchitectureContext {
  currentBottlenecks: string[];
  performanceTargets: PerformanceTargets;
  resourceConstraints?: ResourceConstraints;
  scalingRequirements?: ScalingRequirements;
}
```

### 7. Migration Planning

**Skill ID**: `architecture.migration-planning`

**Description**: Plans and validates migration strategies for system changes.

**Capabilities**:
- Design backward-compatible migrations
- Plan data migration strategies
- Validate rollback procedures
- Assess migration risks
- Plan phased rollouts

**Input Context**:
```typescript
interface MigrationPlanningContext {
  migrationType: 'schema' | 'api' | 'infrastructure';
  currentVersion: string;
  targetVersion: string;
  downtimeTolerance?: DowntimeTolerance;
}
```

## Usage Guidelines

### When to Invoke

Invoke the Architecture Agent when:
- Making significant architectural changes
- Adding new storage adapters or integrations
- Designing new public APIs
- Planning performance optimizations
- Evaluating technology choices
- Planning major refactoring

### Domain Context: agent-memory

When designing for agent-memory, pay special attention to:
- The **Policy Engine** as a first-class pluggable layer (not an afterthought)
- **Memory lifecycle states** (active, archived, pending_review, forgotten) and their transitions
- **Contradiction resolution** as a core differentiator — designs should support auditable, rule-based decisions
- **Embedding provider abstraction** so users can swap models without data loss

### Best Practices

1. **Always provide context**: Include relevant sections from ARCHITECTURE.md and DEV_PLAN.md
2. **Specify constraints**: Clearly define performance, security, and compatibility requirements
3. **Consider trade-offs**: Be prepared to discuss pros and cons of different approaches
4. **Validate compliance**: Ensure proposals align with established architecture principles

### Example Invocation

```typescript
const context: SystemDesignReviewContext = {
  designProposal: 'Implement Redis caching layer for frequently accessed memories',
  affectedComponents: ['MemoryRetriever', 'MemoryStorage', 'ContextInjector'],
  performanceRequirements: {
    targetLatency: 50, // ms
    targetThroughput: 1000, // requests/second
  },
  scalabilityNeeds: {
    maxConcurrentUsers: 10000,
    maxMemoriesPerTenant: 1000000,
  },
};

const result = await architectureAgent.invoke('architecture.system-design-review', context);
```

## Quality Metrics

The Architecture Agent measures success using:
- **Compliance Score**: Adherence to ARCHITECTURE.md principles (target: ≥95%)
- **Performance Impact**: Meets or exceeds performance targets
- **Maintainability**: Code complexity and modularity metrics
- **Scalability**: Ability to handle projected growth
- **Security**: Security posture and vulnerability assessment

## Related Skills

- **Code Agent**: Implementation of architectural decisions
- **Security Agent**: Security review of architectural choices
- **DevOps Agent**: Infrastructure and deployment implications
- **Test Agent**: Testability of architectural designs
