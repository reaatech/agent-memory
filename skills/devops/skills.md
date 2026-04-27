# DevOps Agent Skills

## Overview

The DevOps Agent is responsible for infrastructure, deployment, monitoring, and operational excellence of the agent-memory system. This agent focuses on automation, scalability, reliability, and maintaining production-ready infrastructure.

## Skills

### 1. Infrastructure as Code

**Skill ID**: `devops.infrastructure-as-code`

**Description**: Designs and implements infrastructure using code-based tools.

**Capabilities**:
- Create Terraform configurations for cloud resources
- Design container orchestration with Kubernetes
- Implement infrastructure automation
- Manage infrastructure state and versioning
- Plan multi-environment deployments

**Input Context**:
```typescript
interface InfrastructureAsCodeContext {
  cloudProvider: 'aws' | 'gcp' | 'azure' | 'self-hosted';
  environment: 'development' | 'staging' | 'production';
  scalabilityRequirements: ScalabilityRequirements;
  budgetConstraints?: BudgetConstraints;
  complianceRequirements?: ComplianceRequirements;
}
```

**Output**:
```typescript
interface InfrastructureAsCodeResult {
  terraformModules: TerraformModule[];
  kubernetesManifests: KubernetesManifest[];
  estimatedCost: number;
  deploymentPlan: DeploymentPlan;
  rollbackStrategy: RollbackStrategy;
}
```

### 2. CI/CD Pipeline Design

**Skill ID**: `devops.ci-cd-pipeline-design`

**Description**: Designs and implements continuous integration and deployment pipelines.

**Capabilities**:
- Create GitHub Actions workflows
- Design multi-stage deployment pipelines
- Implement automated testing in CI/CD
- Plan blue-green and canary deployments
- Manage artifact versioning and promotion

**Input Context**:
```typescript
interface CICDPipelineContext {
  repository: string;
  branchingStrategy: 'main' | 'gitflow' | 'trunk-based';
  deploymentStrategy: 'blue-green' | 'canary' | 'rolling';
  testingRequirements?: TestingRequirement[];
  approvalRequirements?: ApprovalRequirement[];
}
```

### 3. Container Orchestration

**Skill ID**: `devops.container-orchestration`

**Description**: Designs and manages containerized deployments.

**Capabilities**:
- Create Docker images and Dockerfiles
- Design Kubernetes deployments and services
- Implement auto-scaling policies
- Manage resource allocation and limits
- Plan pod security and network policies

**Input Context**:
```typescript
interface ContainerOrchestrationContext {
  applicationType: 'stateless' | 'stateful' | 'hybrid';
  scalingNeeds: ScalingNeeds;
  resourceRequirements: ResourceRequirements;
  networkingRequirements?: NetworkingRequirements;
  securityRequirements?: SecurityRequirements;
}
```

### 4. Monitoring & Observability

**Skill ID**: `devops.monitoring-observability`

**Description**: Implements comprehensive monitoring and observability solutions.

**Capabilities**:
- Design metrics collection with Prometheus
- Create dashboards with Grafana
- Implement distributed tracing with Jaeger
- Set up alerting and notification systems
- Plan log aggregation and analysis

**Input Context**:
```typescript
interface MonitoringObservabilityContext {
  systemComponents: string[];
  criticalMetrics: string[];
  alertingRequirements: AlertingRequirements;
  retentionRequirements?: RetentionRequirements;
  complianceRequirements?: ComplianceRequirements;
}
```

**Output**:
```typescript
interface MonitoringObservabilityResult {
  metrics: MetricDefinition[];
  dashboards: DashboardDefinition[];
  alerts: AlertDefinition[];
  tracingConfiguration: TracingConfiguration;
  logAggregationStrategy: LogAggregationStrategy;
}
```

### 5. Database Operations

**Skill ID**: `devops.database-operations`

**Description**: Manages database operations and data persistence.

**Capabilities**:
- Design database deployment strategies
- Implement backup and restore procedures
- Plan database scaling and sharding
- Manage database migrations
- Monitor database performance

**Input Context**:
```typescript
interface DatabaseOperationsContext {
  databaseType: 'postgresql' | 'mysql' | 'mongodb' | 'redis';
  deploymentType: 'single-node' | 'cluster' | 'managed';
  dataVolume: string;
  performanceRequirements?: PerformanceRequirements;
  backupRequirements?: BackupRequirements;
}
```

### 6. Security Operations

**Skill ID**: `devops.security-operations`

**Description**: Implements security operations and compliance.

**Capabilities**:
- Design network security policies
- Implement secrets management
- Plan vulnerability scanning
- Manage SSL/TLS certificates
- Implement access control and authentication

**Input Context**:
```typescript
interface SecurityOperationsContext {
  securityLevel: 'basic' | 'standard' | 'high';
  complianceFrameworks: string[];
  threatModel: ThreatModel;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
}
```

### 7. Disaster Recovery

**Skill ID**: `devops.disaster-recovery`

**Description**: Plans and implements disaster recovery strategies.

**Capabilities**:
- Design backup and restore strategies
- Plan multi-region deployments
- Implement failover mechanisms
- Create recovery time objectives (RTO)
- Plan recovery point objectives (RPO)

**Input Context**:
```typescript
interface DisasterRecoveryContext {
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
  rto: string; // e.g., "4 hours"
  rpo: string; // e.g., "1 hour"
  budgetConstraints?: BudgetConstraints;
  geographicRequirements?: GeographicRequirements;
}
```

**Output**:
```typescript
interface DisasterRecoveryResult {
  backupStrategy: BackupStrategy;
  failoverStrategy: FailoverStrategy;
  recoveryProcedures: RecoveryProcedure[];
  testingPlan: TestingPlan;
  estimatedCost: number;
}
```

## Usage Guidelines

### When to Invoke

Invoke the DevOps Agent when:
- Setting up new infrastructure
- Designing CI/CD pipelines
- Planning deployments
- Implementing monitoring
- Planning disaster recovery
- Optimizing operational costs

### Domain Context: agent-memory

When operating agent-memory infrastructure:
- Storage backends (Postgres, Qdrant, Pinecone) require backup and disaster recovery procedures
- The **decay engine** may run as a scheduled job (e.g., daily cron) — monitor its execution and memory impact
- Embedding provider API keys are sensitive secrets; rotate them regularly
- Multi-tenancy requires tenant isolation validation in CI
- Performance benchmarks must cover retrieval latency with 1M+ memories per tenant

### Best Practices

1. **Infrastructure as Code**: Always version control infrastructure
2. **Automate everything**: Automate deployments, testing, and monitoring
3. **Monitor proactively**: Set up alerts before issues occur
4. **Plan for failure**: Design for high availability and disaster recovery
5. **Security first**: Implement security at every layer
6. **Cost optimization**: Monitor and optimize cloud costs

### Example Invocation

```typescript
const context: InfrastructureAsCodeContext = {
  cloudProvider: 'aws',
  environment: 'production',
  scalabilityRequirements: {
    maxConcurrentUsers: 100000,
    maxMemoriesPerTenant: 1000000,
    autoScaling: true,
  },
  budgetConstraints: {
    monthlyBudget: 5000,
    currency: 'USD',
  },
  complianceRequirements: {
    frameworks: ['SOC2', 'GDPR'],
    dataResidency: 'US',
  },
};

const result = await devopsAgent.invoke('devops.infrastructure-as-code', context);
```

## Infrastructure Standards

### Cloud Infrastructure
```yaml
# AWS Infrastructure Example
Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsSupport: true
      EnableDnsHostnames: true
  
  EKSCluster:
    Type: AWS::EKS::Cluster
    Properties:
      Name: agent-memory-cluster
      Version: '1.28'
      ResourcesVpcConfig:
        SubnetIds: [!Ref PrivateSubnet1, !Ref PrivateSubnet2]
  
  RDSInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      Engine: postgres
      EngineVersion: '15.4'
      DBInstanceClass: db.r6g.large
      MultiAZ: true
      BackupRetentionPeriod: 30
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-memory
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-memory
  template:
    metadata:
      labels:
        app: agent-memory
    spec:
      containers:
      - name: agent-memory
        image: reatech/agent-memory:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: agent-memory-secrets
              key: db-password
```

### Monitoring Configuration
```yaml
# Prometheus scrape config
scrape_configs:
  - job_name: 'agent-memory'
    static_configs:
      - targets: ['agent-memory:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s

# Alertmanager config
alert:
  - name: HighMemoryUsage
    condition: memory_usage > 80%
    for: 5m
    severity: warning
    annotations:
      summary: "High memory usage detected"
```

## Tools & Technologies

### Infrastructure
- **IaC**: Terraform, Pulumi
- **Containers**: Docker, containerd
- **Orchestration**: Kubernetes, EKS, GKE, AKS
- **Service Mesh**: Istio, Linkerd

### CI/CD
- **Pipeline**: GitHub Actions, GitLab CI, Jenkins
- **Artifact Management**: GitHub Packages, Docker Hub, ECR
- **Secret Management**: HashiCorp Vault, AWS Secrets Manager

### Monitoring
- **Metrics**: Prometheus, Grafana, CloudWatch
- **Logging**: ELK Stack, Loki, CloudWatch Logs
- **Tracing**: Jaeger, Zipkin, AWS X-Ray
- **Alerting**: Alertmanager, PagerDuty, Opsgenie

### Security
- **Scanning**: Trivy, Snyk, Clair
- **Secrets**: HashiCorp Vault, AWS Secrets Manager
- **Network**: Security Groups, Network Policies, WAF

## Quality Metrics

The DevOps Agent measures success using:
- **Uptime**: Target ≥99.9% availability
- **Deployment Frequency**: Target daily deployments
- **Lead Time**: Target <1 hour from commit to production
- **Mean Time to Recovery**: Target <1 hour
- **Change Failure Rate**: Target <5%
- **Cost Efficiency**: Stay within budget constraints

## Related Skills

- **Architecture Agent**: Infrastructure architecture decisions
- **Security Agent**: Security compliance and vulnerability management
- **Code Agent**: Application deployment requirements
- **Test Agent**: Test environment and automation infrastructure
