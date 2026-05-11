# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in MathFlow, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: **security@mathflow.app** (or use GitHub's private vulnerability reporting feature)

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix release**: As soon as possible, typically within 2 weeks for critical issues

## Scope

This policy covers:
- The MathFlow application (frontend and backend)
- Dependencies used by MathFlow
- The self-hosted deployment configuration

## BYOK (Bring Your Own Key) Notice

MathFlow's AI features use your own API keys (BYOK model). API keys are stored in your browser's localStorage and sent directly from your server to the AI provider. MathFlow does not store, log, or transmit your API keys to any MathFlow-operated server.
