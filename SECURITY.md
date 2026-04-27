# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in `@reaatech/agent-memory`, please report it responsibly.

**Please do NOT open a public GitHub issue for security bugs.**

Instead, send an email to **security@reaatech.dev** with the following details:

- A description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact
- Suggested fix (if you have one)

We aim to respond to security reports within **48 hours** and will keep you informed throughout the remediation process.

## Security Considerations

- API keys for embedding and LLM providers should never be committed to source control.
- PostgreSQL connections should use TLS in production.
- This library does not yet provide encryption at rest; sensitive memory data should be encrypted at the storage layer.

## Acknowledgments

We thank all security researchers who help keep agent-memory safe.
