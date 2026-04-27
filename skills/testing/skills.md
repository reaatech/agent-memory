# Test Agent Skills

## Overview

The Test Agent is responsible for testing strategies, quality assurance, and ensuring the reliability of the agent-memory system. This agent focuses on comprehensive test coverage, performance validation, and maintaining high quality standards throughout the development lifecycle.

## Skills

### 1. Test Strategy Design

**Skill ID**: `testing.test-strategy-design`

**Description**: Designs comprehensive testing strategies for the agent-memory system.

**Capabilities**:
- Create test pyramids for different components
- Define testing levels (unit, integration, e2e, performance)
- Plan test data management strategies
- Design test automation frameworks
- Establish quality gates and metrics

**Input Context**:
```typescript
interface TestStrategyDesignContext {
  component: string;
  complexity: 'simple' | 'moderate' | 'complex';
  riskLevel: 'low' | 'medium' | 'high';
  performanceRequirements?: PerformanceRequirements;
  securityRequirements?: SecurityRequirements;
}
```

**Output**:
```typescript
interface TestStrategyResult {
  testLevels: TestLevel[];
  coverageTargets: CoverageTargets;
  automationPlan: AutomationPlan;
  qualityGates: QualityGate[];
  estimatedEffort: string;
}
```

### 2. Unit Test Generation

**Skill ID**: `testing.unit-test-generation`

**Description**: Generates comprehensive unit tests for code components.

**Capabilities**:
- Write tests using Vitest framework
- Create mock objects and stubs
- Test edge cases and error conditions
- Validate TypeScript types
- Ensure test isolation and independence

**Input Context**:
```typescript
interface UnitTestGenerationContext {
  codeComponent: string;
  testFramework: 'vitest' | 'jest';
  coverageTarget: number;
  edgeCases?: string[];
  mockRequirements?: MockRequirement[];
}
```

### 3. Integration Test Design

**Skill ID**: `testing.integration-test-design`

**Description**: Designs integration tests for component interactions.

**Capabilities**:
- Test storage adapter integrations
- Validate database operations
- Test API contract compliance
- Validate data flow between components
- Test error handling across boundaries

**Input Context**:
```typescript
interface IntegrationTestDesignContext {
  components: string[];
  integrationPoints: string[];
  testScenarios: TestScenario[];
  dataRequirements?: DataRequirement[];
}
```

### 4. Performance Testing

**Skill ID**: `testing.performance-testing`

**Description**: Designs and executes performance tests for the memory system.

**Capabilities**:
- Create load testing scenarios
- Design stress tests
- Validate memory and CPU usage
- Test scalability under load
- Benchmark retrieval latency

**Input Context**:
```typescript
interface PerformanceTestingContext {
  performanceTargets: PerformanceTargets;
  loadProfiles: LoadProfile[];
  testDuration: string;
  monitoringRequirements?: MonitoringRequirement[];
}
```

**Output**:
```typescript
interface PerformanceTestResult {
  latencyMetrics: LatencyMetrics;
  throughputMetrics: ThroughputMetrics;
  resourceUsage: ResourceUsage;
  bottlenecks: string[];
  recommendations: string[];
}
```

### 5. Contract Testing

**Skill ID**: `testing.contract-testing`

**Description**: Implements contract testing for API compatibility.

**Capabilities**:
- Define API contracts using OpenAPI/Pact
- Test provider and consumer contracts
- Validate backward compatibility
- Test version compatibility
- Automate contract verification

**Input Context**:
```typescript
interface ContractTestingContext {
  apiEndpoint: string;
  contractType: 'openapi' | 'pact' | 'graphql';
  compatibilityRequirements: CompatibilityRequirements;
  versioningStrategy?: VersioningStrategy;
}
```

### 6. Test Data Management

**Skill ID**: `testing.test-data-management`

**Description**: Manages test data creation, maintenance, and cleanup.

**Capabilities**:
- Create test data factories
- Design data seeding strategies
- Manage test data lifecycle
- Create data anonymization for production-like data
- Implement data cleanup procedures

**Input Context**:
```typescript
interface TestDataManagerContext {
  dataRequirements: DataRequirement[];
  dataVolume: 'small' | 'medium' | 'large';
  isolationLevel: 'process' | 'thread' | 'database';
  cleanupStrategy?: CleanupStrategy;
}
```

### 7. Quality Metrics Analysis

**Skill ID**: `testing.quality-metrics-analysis`

**Description**: Analyzes quality metrics and provides improvement recommendations.

**Capabilities**:
- Analyze test coverage reports
- Track defect density and trends
- Monitor test execution times
- Analyze flaky test patterns
- Provide quality improvement recommendations

**Input Context**:
```typescript
interface QualityMetricsContext {
  metrics: QualityMetric[];
  timeRange: string;
  comparisonBaseline?: string;
  improvementGoals?: ImprovementGoal[];
}
```

**Output**:
```typescript
interface QualityMetricsResult {
  currentQuality: QualityScore;
  trends: Trend[];
  riskAreas: RiskArea[];
  improvementRecommendations: Recommendation[];
  actionPlan: ActionPlan;
}
```

## Usage Guidelines

### When to Invoke

Invoke the Test Agent when:
- Starting new feature development
- Planning test automation
- Reviewing test coverage
- Investigating quality issues
- Planning performance testing
- Setting up CI/CD quality gates

### Domain Context: agent-memory

When testing agent-memory:
- Use the **In-Memory Adapter** for unit tests to avoid external dependencies
- Test **contradiction resolution** with explicit scenarios: newest wins, highest confidence, manual review
- Test **decay engine** with simulated time (do not wait real days)
- Test **policy rules** in isolation: each rule should be a pure function with deterministic output
- Integration tests must run against **PostgreSQL + pgvector** (use Testcontainers)
- Validate that `MemoryLifecycle` transitions are correct and irreversible where specified

### Best Practices

1. **Test early and often**: Integrate testing throughout development
2. **Maintain high coverage**: Target ≥90% code coverage
3. **Test in isolation**: Ensure tests are independent and repeatable
4. **Use realistic data**: Test with production-like data volumes
5. **Automate everything**: Automate all repeatable tests
6. **Monitor quality trends**: Track quality metrics over time

### Example Invocation

```typescript
const context: TestStrategyDesignContext = {
  component: 'MemoryRetriever with hybrid search',
  complexity: 'complex',
  riskLevel: 'high',
  performanceRequirements: {
    targetLatency: 100, // ms
    maxConcurrentUsers: 10000,
  },
  securityRequirements: {
    dataEncryption: true,
    accessControl: true,
  },
};

const result = await testAgent.invoke('testing.test-strategy-design', context);
```

## Quality Standards

### Test Coverage Requirements
```typescript
interface CoverageTargets {
  lines: number;        // Target: ≥90%
  branches: number;     // Target: ≥85%
  functions: number;    // Target: ≥90%
  statements: number;   // Target: ≥90%
}
```

### Performance Testing Standards
```typescript
interface PerformanceTestStandards {
  unitTests: {
    maxDuration: 100;    // ms per test
    totalDuration: 300;  // seconds for suite
  };
  integrationTests: {
    maxDuration: 5000;   // ms per test
    totalDuration: 600;  // seconds for suite
  };
  loadTests: {
    targetConcurrentUsers: 1000;
    targetDuration: 3600; // seconds
  };
}
```

### Test Data Standards
```typescript
interface TestDataStandards {
  isolation: 'database-per-test' | 'transaction-rollback' | 'truncate';
  volume: {
    unitTests: 'minimal';
    integrationTests: 'realistic';
    performanceTests: 'production-scale';
  };
  anonymization: {
    required: true;
    techniques: ['hashing', 'masking', 'generalization'];
  };
}
```

## Testing Tools & Frameworks

### Primary Testing Stack
- **Test Runner**: Vitest
- **Assertion Library**: Vitest built-in assertions
- **Mocking**: Vitest mocking utilities
- **Coverage**: Vitest coverage (v8 provider)

### CI/CD Integration
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: ['20', '22']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run build
      - run: pnpm run test
      - run: pnpm run format:check
```

## Quality Gates

### Pre-commit Gates
- ESLint passes with no errors
- TypeScript compilation succeeds
- Unit tests pass
- Code coverage ≥90%

### Pre-merge Gates
- All tests pass (unit, integration, e2e)
- Performance benchmarks meet targets
- Contract tests pass
- Security scan passes
- Code review approved

### Pre-release Gates
- All quality gates pass
- Performance testing completed
- Security audit completed
- Documentation updated
- Changelog updated

## Related Skills

- **Code Agent**: Implementation quality and testability
- **Architecture Agent**: Testability of architectural designs
- **Security Agent**: Security testing and vulnerability assessment
- **DevOps Agent**: CI/CD pipeline and test automation
