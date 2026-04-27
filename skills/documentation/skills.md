# Documentation Agent Skills

## Overview

The Documentation Agent is responsible for technical writing, documentation strategy, and ensuring clear, comprehensive documentation for the agent-memory project. This agent focuses on user guides, API documentation, tutorials, and maintaining documentation quality and consistency.

## Skills

### 1. API Documentation

**Skill ID**: `documentation.api-documentation`

**Description**: Creates comprehensive API documentation for the agent-memory system.

**Capabilities**:
- Generate TypeDoc documentation
- Create OpenAPI/Swagger specifications
- Write endpoint reference documentation
- Document request/response schemas
- Create code examples and usage patterns

**Input Context**:
```typescript
interface APIDocumentationContext {
  apiType: 'rest' | 'graphql' | 'grpc';
  targetAudience: 'developer' | 'integrator' | 'architect';
  complexity: 'basic' | 'intermediate' | 'advanced';
  includeExamples: boolean;
  includeSdks: boolean;
}
```

**Output**:
```typescript
interface APIDocumentationResult {
  referenceDocs: ReferenceDoc[];
  codeExamples: CodeExample[];
  sdkDocumentation: SDKDoc[];
  changelog: ChangeLog;
  migrationGuides: MigrationGuide[];
}
```

### 2. Tutorial Creation

**Skill ID**: `documentation.tutorial-creation`

**Description**: Creates step-by-step tutorials and learning materials.

**Capabilities**:
- Design learning paths for different user types
- Create hands-on coding tutorials
- Write conceptual guides
- Develop quickstart guides
- Create video tutorial scripts

**Input Context**:
```typescript
interface TutorialCreationContext {
  topic: string;
  targetAudience: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives: string[];
  prerequisiteKnowledge?: string[];
  estimatedDuration: string;
  format: 'text' | 'video' | 'interactive';
}
```

### 3. Architecture Documentation

**Skill ID**: `documentation.architecture-documentation`

**Description**: Documents system architecture and design decisions.

**Capabilities**:
- Create architecture diagrams
- Document design patterns
- Write architectural decision records (ADRs)
- Document data flow and system interactions
- Create component documentation

**Input Context**:
```typescript
interface ArchitectureDocumentationContext {
  documentationType: 'overview' | 'detailed' | 'adr';
  systemComponents: string[];
  targetAudience: 'developer' | 'architect' | 'stakeholder';
  includeDiagrams: boolean;
  includeDecisionRationale: boolean;
}
```

### 4. User Guide Writing

**Skill ID**: `documentation.user-guide-writing`

**Description**: Creates user guides and how-to documentation.

**Capabilities**:
- Write installation and setup guides
- Create configuration documentation
- Document common use cases
- Write troubleshooting guides
- Create FAQ sections

**Input Context**:
```typescript
interface UserGuideContext {
  guideType: 'getting-started' | 'configuration' | 'troubleshooting' | 'faq';
  targetAudience: 'end-user' | 'administrator' | 'developer';
  productArea: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
  includeScreenshots: boolean;
}
```

### 5. Documentation Strategy

**Skill ID**: `documentation.documentation-strategy`

**Description**: Plans and implements documentation strategies.

**Capabilities**:
- Design information architecture
- Plan documentation structure
- Create style guides
- Plan documentation workflows
- Implement documentation automation

**Input Context**:
```typescript
interface DocumentationStrategyContext {
  projectType: 'library' | 'application' | 'platform';
  targetAudiences: string[];
  documentationGoals: string[];
  existingDocumentation?: ExistingDoc[];
  constraints?: DocumentationConstraints;
}
```

**Output**:
```typescript
interface DocumentationStrategyResult {
  informationArchitecture: InformationArchitecture;
  styleGuide: StyleGuide;
  contentPlan: ContentPlan;
  workflowPlan: WorkflowPlan;
  automationPlan: AutomationPlan;
  successMetrics: SuccessMetric[];
}
```

### 6. Technical Blog Writing

**Skill ID**: `documentation.technical-blog-writing`

**Description**: Creates technical blog posts and articles.

**Capabilities**:
- Write technical deep-dives
- Create announcement posts
- Write case studies
- Create thought leadership content
- Optimize for SEO

**Input Context**:
```typescript
interface TechnicalBlogContext {
  topic: string;
  blogType: 'technical-deep-dive' | 'announcement' | 'case-study' | 'tutorial';
  targetAudience: 'developer' | 'technical-lead' | 'cto';
  keyMessages: string[];
  seoKeywords?: string[];
  wordCount?: number;
}
```

### 7. Documentation Quality Assurance

**Skill ID**: `documentation.documentation-quality-assurance`

**Description**: Ensures documentation quality and consistency.

**Capabilities**:
- Review documentation for accuracy
- Check for consistency and style compliance
- Validate code examples
- Test documentation completeness
- Gather and analyze user feedback

**Input Context**:
```typescript
interface DocumentationQAContext {
  documentationSet: DocumentationSet;
  qualityCriteria: QualityCriterion[];
  targetAudience: string;
  reviewFocus?: ('accuracy' | 'clarity' | 'completeness' | 'consistency')[];
  userFeedback?: UserFeedback[];
}
```

**Output**:
```typescript
interface DocumentationQAResult {
  qualityScore: number; // 0-100
  issues: DocumentationIssue[];
  recommendations: Recommendation[];
  accuracyValidation: AccuracyValidation;
  userSatisfaction: number; // 0-100
}
```

## Usage Guidelines

### When to Invoke

Invoke the Documentation Agent when:
- Launching new features or products
- Creating API reference documentation
- Writing user guides and tutorials
- Planning documentation strategy
- Improving documentation quality
- Creating marketing technical content

### Domain Context: agent-memory

When documenting agent-memory:
- The **Policy Engine** is the key differentiator — explain pluggable rules with concrete examples
- Document **memory lifecycle states** with diagrams showing transitions (active → archived → forgotten)
- Include **contradiction resolution** examples showing how conflicting facts are handled
- API docs must show `Memory` interface with all fields, including `lifecycle` and `ownerId`
- Tutorials should cover: installation, first extraction, retrieval, and configuring a custom policy rule
- Keep ARCHITECTURE.md and DEV_PLAN.md in sync with code changes

### Best Practices

1. **User-centric**: Write for the target audience
2. **Clear and concise**: Use simple, direct language
3. **Consistent**: Follow style guides and templates
4. **Accurate**: Validate all technical information
5. **Searchable**: Optimize for discoverability
6. **Maintainable**: Keep documentation up-to-date

### Example Invocation

```typescript
const context: TutorialCreationContext = {
  topic: 'Getting Started with agent-memory',
  targetAudience: 'beginner',
  learningObjectives: [
    'Install and configure agent-memory',
    'Create your first memory',
    'Retrieve memories in conversations',
    'Understand memory types and importance',
  ],
  prerequisiteKnowledge: ['Basic TypeScript', 'Node.js fundamentals'],
  estimatedDuration: '30 minutes',
  format: 'text',
};

const result = await documentationAgent.invoke('documentation.tutorial-creation', context);
```

## Documentation Standards

### Style Guide
```typescript
interface StyleGuide {
  voice: 'active' | 'passive';
  tone: 'formal' | 'conversational' | 'technical';
  perspective: 'first-person' | 'second-person' | 'third-person';
  readingLevel: 'grade-8' | 'grade-10' | 'grade-12' | 'college';
  formatting: {
    headings: 'sentence-case' | 'title-case';
    codeBlocks: 'inline' | 'block';
    lists: 'bulleted' | 'numbered';
    links: 'descriptive' | 'url';
  };
}
```

### Documentation Structure
```typescript
interface DocumentationStructure {
  gettingStarted: {
    installation: string;
    quickstart: string;
    configuration: string;
  };
  guides: {
    tutorials: string[];
    howTos: string[];
    explanations: string[];
  };
  reference: {
    api: string;
    configuration: string;
    types: string;
  };
  concepts: {
    overview: string;
    architecture: string;
    designPatterns: string;
  };
}
```

### Quality Criteria
```typescript
interface DocumentationQualityCriteria {
  accuracy: {
    technicalAccuracy: number; // 0-100
    codeExampleValidity: number; // 0-100
    linkValidity: number; // 0-100
  };
  usability: {
    clarity: number; // 0-100
    completeness: number; // 0-100
    findability: number; // 0-100
  };
  maintainability: {
    modularity: number; // 0-100
    updateFrequency: number; // 0-100
    versionControl: number; // 0-100
  };
}
```

## Documentation Tools

### Authoring Tools
- **Markdown**: Primary format for documentation
- **TypeDoc**: API documentation generation
- **Docusaurus**: Documentation website
- **Swagger/OpenAPI**: API specification

### Diagram Tools
- **Mermaid**: Diagram as code
- **Draw.io**: Visual diagramming
- **PlantUML**: UML diagrams
- **Excalidraw**: Hand-drawn style diagrams

### Quality Tools
- **Vale**: prose linter
- **Markdownlint**: Markdown style checker
- **Prettier**: Code formatting
- **GitHub Actions**: Documentation CI/CD

### Analytics Tools
- **Google Analytics**: User behavior tracking
- **Hotjar**: User session recordings
- **Search analytics**: Documentation search analysis

## Quality Metrics

The Documentation Agent measures success using:
- **Documentation Coverage**: Target ≥95% of features documented
- **User Satisfaction**: Target ≥4.5/5 rating
- **Search Success Rate**: Target ≥80% successful searches
- **Time to First Success**: Target <10 minutes for getting started
- **Documentation Freshness**: Target <30 days since last update
- **Code Example Success Rate**: Target ≥95% working examples

## Related Skills

- **Architecture Agent**: Architecture documentation and ADRs
- **Code Agent**: Code documentation and examples
- **Test Agent**: Documentation testing and validation
- **DevOps Agent**: Documentation deployment and automation
