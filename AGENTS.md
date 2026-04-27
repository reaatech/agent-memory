# Agent Skills for agent-memory Development

This document describes the AI agent skills system for developing the agent-memory project. Each skill represents a specialized capability that AI agents can use to assist with different aspects of the project.

## Overview

The agent-memory project uses a multi-agent development approach where specialized AI agents handle different domains:

- **Architecture Agent**: System design and architecture decisions
- **Code Agent**: Implementation and code quality
- **Test Agent**: Testing strategies and quality assurance
- **DevOps Agent**: Infrastructure and deployment
- **Security Agent**: Security reviews and compliance
- **Documentation Agent**: Technical writing and documentation

## Skills Directory Structure

```
skills/
├── architecture/
│   └── skills.md      # Architecture design and review skills
├── code/
│   └── skills.md      # Code implementation and review skills
├── testing/
│   └── skills.md      # Testing and QA skills
├── devops/
│   └── skills.md      # DevOps and infrastructure skills
├── security/
│   └── skills.md      # Security and compliance skills
└── documentation/
    └── skills.md      # Documentation and technical writing skills
```

## Agent Coordination Workflow

Development flows through agents in a pipeline. Each agent owns a domain but must read the architecture and plan before acting:

1. **Architecture Agent** — Designs systems, APIs, and data models. Outputs are reviewed by Security Agent before implementation begins.
2. **Code Agent** — Implements approved designs. Must reference ARCHITECTURE.md types and interfaces. Opens the door for Test Agent.
3. **Test Agent** — Writes tests for Code Agent's output. Uses in-memory adapter for unit tests; requires real backends for integration tests.
4. **Security Agent** — Reviews architecture and code for vulnerabilities, compliance, and data protection. Can block any phase.
5. **DevOps Agent** — Sets up infrastructure, CI/CD, and observability after core implementation stabilizes.
6. **Documentation Agent** — Writes docs, tutorials, and API references once interfaces are stable.

**Handoff Rules:**
- Architecture decisions must be recorded in ARCHITECTURE.md before Code Agent begins.
- Code Agent must not change public APIs without Architecture Agent review.
- Test Agent must achieve ≥90% coverage before a feature is considered complete.
- Security Agent reviews are mandatory before any storage or encryption code merges.

## Agent Memory

Before starting any task, every agent must:
1. Read the relevant skill documentation in `skills/<domain>/skills.md`
2. Read ARCHITECTURE.md for system context and type definitions
3. Read DEV_PLAN.md for current phase and priorities
4. Check existing code in `src/` to follow established patterns

## Agent Invocation

In the Kimi CLI context, agents are invoked by referencing the relevant context and skill domain. There is no runtime `invoke()` function. Instead:

- Use `@architecture` or reference `skills/architecture/skills.md` when making design decisions.
- Use `@code` or reference `skills/code/skills.md` when implementing features.
- Use `@testing` or reference `skills/testing/skills.md` when writing tests.
- Use `@security` or reference `skills/security/skills.md` when reviewing vulnerabilities.
- Use `@devops` or reference `skills/devops/skills.md` when setting up infrastructure.
- Use `@documentation` or reference `skills/documentation/skills.md` when writing docs.

Each skill file defines the specific capabilities, inputs, and quality metrics for that domain.

## GitHub Organization

- **Owner**: `reaatech`
- **Repository**: `reaatech/agent-memory`

## Contributing

When contributing to this project, AI agents should:

1. Review relevant skill documentation
2. Follow the established patterns and conventions
3. Ensure all changes align with the project's architecture and quality standards
4. Update skill documentation when adding new capabilities

## Related Documentation

- [DEV_PLAN.md](./DEV_PLAN.md) - Development roadmap and timeline
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture specification
