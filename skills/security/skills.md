# Security Agent Skills

## Overview

The Security Agent is responsible for security reviews, compliance, and ensuring the agent-memory system meets enterprise-grade security standards. This agent focuses on threat modeling, vulnerability assessment, data protection, and regulatory compliance.

## Skills

### 1. Threat Modeling

**Skill ID**: `security.threat-modeling`

**Description**: Identifies and analyzes potential security threats to the system.

**Capabilities**:
- Conduct STRIDE threat analysis
- Create data flow diagrams for security analysis
- Identify attack vectors and threat actors
- Assess threat likelihood and impact
- Recommend mitigation strategies

**Input Context**:
```typescript
interface ThreatModelingContext {
  systemComponents: string[];
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  threatActors: string[];
  attackSurface: AttackSurfaceDescription;
  complianceRequirements?: ComplianceRequirements;
}
```

**Output**:
```typescript
interface ThreatModelResult {
  threats: Threat[];
  riskScores: RiskScore[];
  mitigations: MitigationStrategy[];
  residualRisks: ResidualRisk[];
  securityControls: SecurityControl[];
}
```

### 2. Security Code Review

**Skill ID**: `security.security-code-review`

**Description**: Reviews code for security vulnerabilities and compliance.

**Capabilities**:
- Identify OWASP Top 10 vulnerabilities
- Check for injection vulnerabilities
- Validate authentication and authorization
- Review cryptographic implementations
- Assess input validation and sanitization

**Input Context**:
```typescript
interface SecurityCodeReviewContext {
  codeChanges: CodeChange[];
  reviewFocus: ('injection' | 'auth' | 'crypto' | 'data-protection' | 'owasp')[];
  complianceStandards?: string[];
  threatModel?: ThreatModel;
}
```

**Output**:
```typescript
interface SecurityCodeReviewResult {
  vulnerabilities: Vulnerability[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  remediation: RemediationPlan;
  complianceGaps: ComplianceGap[];
  securityScore: number; // 0-100
}
```

### 3. Data Protection & Privacy

**Skill ID**: `security.data-protection-privacy`

**Description**: Ensures data protection and privacy compliance.

**Capabilities**:
- Design data encryption strategies (at rest and in transit)
- Implement data anonymization and pseudonymization
- Plan data retention and deletion policies
- Ensure GDPR, CCPA, and other privacy regulation compliance
- Design data access controls and audit trails

**Input Context**:
```typescript
interface DataProtectionContext {
  dataTypes: DataType[];
  dataClassification: DataClassification;
  privacyRegulations: string[]; // GDPR, CCPA, HIPAA, etc.
  dataRetentionRequirements?: RetentionRequirements;
  crossBorderDataTransfer?: boolean;
}
```

### 4. Authentication & Authorization

**Skill ID**: `security.authentication-authorization`

**Description**: Designs and validates authentication and authorization systems.

**Capabilities**:
- Design OAuth 2.0 and OpenID Connect flows
- Implement JWT token management
- Plan role-based access control (RBAC)
- Design attribute-based access control (ABAC)
- Validate session management security

**Input Context**:
```typescript
interface AuthenticationAuthorizationContext {
  authenticationMethods: ('oauth2' | 'jwt' | 'api-key' | 'saml')[];
  authorizationModel: 'rbac' | 'abac' | 'rebac';
  multiTenancy: boolean;
  sessionRequirements?: SessionRequirements;
  complianceRequirements?: ComplianceRequirements;
}
```

### 5. Vulnerability Assessment

**Skill ID**: `security.vulnerability-assessment`

**Description**: Conducts vulnerability assessments and penetration testing.

**Capabilities**:
- Perform automated vulnerability scanning
- Conduct manual penetration testing
- Assess dependency vulnerabilities
- Test API security
- Validate infrastructure security

**Input Context**:
```typescript
interface VulnerabilityAssessmentContext {
  assessmentType: 'automated' | 'manual' | 'hybrid';
  scope: string[];
  testingDepth: 'basic' | 'standard' | 'comprehensive';
  complianceRequirements?: ComplianceRequirements;
  previousAssessments?: AssessmentResult[];
}
```

**Output**:
```typescript
interface VulnerabilityAssessmentResult {
  vulnerabilities: Vulnerability[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  exploitationLikelihood: number; // 0-1
  businessImpact: string;
  remediationPriority: RemediationPriority[];
  retestRequired: boolean;
}
```

### 6. Security Monitoring & Incident Response

**Skill ID**: `security.security-monitoring-incident-response`

**Description**: Designs security monitoring and incident response capabilities.

**Capabilities**:
- Design security event logging
- Create intrusion detection rules
- Plan incident response procedures
- Design security alerting systems
- Implement forensic data collection

**Input Context**:
```typescript
interface SecurityMonitoringContext {
  monitoringScope: string[];
  threatIntelligence?: ThreatIntelligenceFeed[];
  incidentResponseRequirements?: IncidentResponseRequirements;
  complianceRequirements?: ComplianceRequirements;
  existingTools?: SecurityTool[];
}
```

### 7. Compliance & Audit

**Skill ID**: `security.compliance-audit`

**Description**: Ensures compliance with security standards and regulations.

**Capabilities**:
- Assess SOC 2, ISO 27001, GDPR compliance
- Create compliance evidence and documentation
- Plan security audits
- Design audit trails and logging
- Implement compliance monitoring

**Input Context**:
```typescript
interface ComplianceAuditContext {
  complianceFrameworks: string[]; // SOC2, ISO27001, GDPR, HIPAA, etc.
  auditScope: string[];
  auditType: 'internal' | 'external' | 'regulatory';
  previousAuditResults?: AuditResult[];
  remediationTimeline?: Timeline;
}
```

**Output**:
```typescript
interface ComplianceAuditResult {
  complianceStatus: ComplianceStatus;
  gaps: ComplianceGap[];
  evidenceRequired: EvidenceRequirement[];
  remediationPlan: RemediationPlan;
  auditReadiness: number; // 0-100
  estimatedEffort: string;
}
```

## Usage Guidelines

### When to Invoke

Invoke the Security Agent when:
- Designing new features or architecture
- Reviewing code for security vulnerabilities
- Planning compliance audits
- Responding to security incidents
- Implementing authentication/authorization
- Handling sensitive data

### Domain Context: agent-memory

When reviewing agent-memory security:
- **Memories may contain PII** — all storage adapters must support encryption at rest
- **Multi-tenancy isolation** is critical: validate that tenant A cannot query tenant B's memories
- **Embedding provider APIs** handle sensitive text; ensure no PII leaks to third-party embeddings
- **Contradiction audit logs** must be tamper-evident and retained per compliance requirements
- **GDPR right to be forgotten** requires hard deletion of `FORGOTTEN` lifecycle memories with proof
- Review the **Policy Engine** for rule injection vulnerabilities (custom rules execute user code)

### Best Practices

1. **Security by design**: Integrate security from the beginning
2. **Defense in depth**: Multiple layers of security controls
3. **Least privilege**: Minimum necessary access rights
4. **Zero trust**: Never trust, always verify
5. **Continuous monitoring**: Real-time security monitoring
6. **Regular assessments**: Periodic security assessments and audits

### Example Invocation

```typescript
const context: ThreatModelingContext = {
  systemComponents: [
    'MemoryExtractor',
    'MemoryStorage',
    'MemoryRetriever',
    'ContextInjector',
  ],
  dataClassification: 'confidential',
  threatActors: [
    'external-attacker',
    'malicious-insider',
    'competitor',
    'nation-state',
  ],
  attackSurface: {
    entryPoints: ['API endpoints', 'Database connections', 'Third-party integrations'],
    dataFlows: ['User input → Memory extraction → Storage', 'Query → Retrieval → LLM context'],
    assets: ['Memory data', 'User preferences', 'API keys', 'Database credentials'],
  },
  complianceRequirements: {
    frameworks: ['GDPR', 'SOC2', 'ISO27001'],
    dataResidency: 'US',
  },
};

const result = await securityAgent.invoke('security.threat-modeling', context);
```

## Security Standards

### OWASP Top 10 Compliance
```typescript
interface OWASPCompliance {
  A01_BrokenAccessControl: 'compliant' | 'non-compliant' | 'partial';
  A02_CryptographicFailures: 'compliant' | 'non-compliant' | 'partial';
  A03_Injection: 'compliant' | 'non-compliant' | 'partial';
  A04_InsecureDesign: 'compliant' | 'non-compliant' | 'partial';
  A05_SecurityMisconfiguration: 'compliant' | 'non-compliant' | 'partial';
  A06_VulnerableComponents: 'compliant' | 'non-compliant' | 'partial';
  A07_AuthenticationFailures: 'compliant' | 'non-compliant' | 'partial';
  A08_SoftwareDataIntegrityFailures: 'compliant' | 'non-compliant' | 'partial';
  A09_SecurityLoggingMonitoringFailures: 'compliant' | 'non-compliant' | 'partial';
  A10_ServerSideRequestForgery: 'compliant' | 'non-compliant' | 'partial';
}
```

### Data Encryption Standards
```typescript
interface EncryptionStandards {
  dataAtRest: {
    algorithm: 'AES-256-GCM';
    keyManagement: 'AWS KMS' | 'HashiCorp Vault' | 'Azure Key Vault';
    keyRotation: 'annual' | 'quarterly' | 'monthly';
  };
  dataInTransit: {
    protocol: 'TLS 1.3';
    certificateManagement: 'automated' | 'manual';
    mutualTLS: boolean;
  };
  databaseEncryption: {
    columnLevel: boolean;
    tablespace: boolean;
    backupEncryption: boolean;
  };
}
```

### Access Control Standards
```typescript
interface AccessControlStandards {
  authentication: {
    methods: ['OAuth 2.0', 'JWT', 'API Keys'];
    mfaRequired: boolean;
    sessionTimeout: number; // minutes
    passwordPolicy: PasswordPolicy;
  };
  authorization: {
    model: 'RBAC' | 'ABAC';
    principle: 'least-privilege';
    reviewFrequency: 'quarterly' | 'monthly' | 'weekly';
  };
  apiSecurity: {
    rateLimiting: boolean;
    inputValidation: boolean;
    outputEncoding: boolean;
    corsPolicy: CORSPolicy;
  };
}
```

## Security Tools

### Static Analysis
- **SAST**: SonarQube, Checkmarx, Fortify
- **SCA**: Snyk, Dependabot, WhiteSource
- **Secret Scanning**: GitGuardian, TruffleHog, GitLeaks

### Dynamic Analysis
- **DAST**: OWASP ZAP, Burp Suite, Acunetix
- **IAST**: Contrast Security, HCL AppScan
- **RASP**: Veracode, Imperva

### Infrastructure Security
- **Vulnerability Scanning**: Nessus, Qualys, OpenVAS
- **Container Security**: Trivy, Clair, Anchore
- **Cloud Security**: AWS Security Hub, Azure Security Center, GCP Security Command Center

### Monitoring & Response
- **SIEM**: Splunk, ELK Stack, IBM QRadar
- **IDS/IPS**: Snort, Suricata, OSSEC
- **Endpoint Security**: CrowdStrike, SentinelOne, Carbon Black

## Quality Metrics

The Security Agent measures success using:
- **Vulnerability Density**: Target <1 critical, <5 high per 1000 lines
- **Mean Time to Remediation**: Target <24 hours for critical, <7 days for high
- **Security Test Coverage**: Target ≥95%
- **Compliance Score**: Target ≥95% for all frameworks
- **Incident Response Time**: Target <1 hour for critical incidents
- **Security Training Completion**: Target 100% team completion

## Related Skills

- **Architecture Agent**: Secure architecture design
- **Code Agent**: Secure coding practices
- **DevOps Agent**: Security operations and compliance
- **Test Agent**: Security testing strategies
