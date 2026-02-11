# Security Policy

## Supported Versions

The following versions of VocalGuard are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of VocalGuard seriously. If you believe you have found a security vulnerability, please report it to us responsibly.

### How to Report

Please **do not** open a public GitHub issue for security vulnerabilities. Instead, follow one of these methods:

1. **GitHub Private Vulnerability Reporting**: Use the "Report a vulnerability" button under the **Security** tab of this repository.
2. **Email**: Send a detailed report to [VocalGuard](mailto:[EMAIL_ADDRESS]) (Note: Check with maintainers for the correct address).

### What to Include

To help us address the issue quickly, please include:
- A clear description of the vulnerability.
- Steps to reproduce the issue (including any scripts or screenshots).
- Potential impact of the vulnerability.
- Any suggested fixes or mitigations.

### Our Response Process

After receiving your report:
- We will acknowledge receipt of your report within **48 hours**.
- We will provide an initial assessment and keep you updated on the progress towards a fix.
- Once a fix is verified, we will coordinate the public disclosure with you.

## Third-Party Dependencies

VocalGuard uses several libraries (FastAPI, PyTorch, Firebase, etc.). If you discover a vulnerability in an upstream dependency, please report it to the respective security team. If the vulnerability is in our implementation/usage of a dependency, please report it to us using the process above.
