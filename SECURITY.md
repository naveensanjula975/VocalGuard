# Security Policy

## Supported Versions

| Version | Security Updates |
|---|---|
| 1.0.x (current) | ✅ Actively maintained |
| < 1.0 | ❌ End of life |

---

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.** Doing so could expose the vulnerability to malicious actors before a fix is available.

### Preferred Method — GitHub Private Disclosure

1. Go to the **Security** tab of this repository.
2. Click **"Report a vulnerability"**.
3. Fill in the form with as much detail as possible.
4. Submit — only maintainers will see your report.

### Alternative — Email

Send a PGP-encrypted report to the maintainers. Check the repository's `README.md` or GitHub profile for the current contact address.

> If you cannot reach us via GitHub or email within **5 business days**, please escalate by opening a **confidential issue** using the template above.

---

## What to Include in Your Report

A high-quality vulnerability report helps us reproduce and fix issues faster. Please include:

| Field | Details |
|---|---|
| **Summary** | One-sentence description of the vulnerability |
| **Severity** | Your assessment: Critical / High / Medium / Low |
| **CVSS Score** | If you can calculate it ([calculator](https://www.first.org/cvss/calculator/3.1)) |
| **Affected Component** | e.g. `POST /api/v1/analyses`, Firebase auth layer, ML pipeline |
| **Steps to Reproduce** | Numbered, precise steps including any scripts or payloads |
| **Impact** | What data or systems could be compromised |
| **Suggested Fix** | Optional — any mitigations you've identified |
| **Proof of Concept** | Code or screenshots (kept private) |

---

## Our Response Process

| Timeline | Action |
|---|---|
| **≤ 48 hours** | Acknowledge receipt of your report |
| **≤ 7 days** | Provide initial severity assessment and triage outcome |
| **≤ 30 days** | Deliver a fix for High/Critical issues |
| **≤ 90 days** | Deliver a fix for Medium/Low issues |
| **After fix** | Coordinate public disclosure date with you |

We follow **responsible disclosure** — we will credit you in the security advisory unless you prefer to remain anonymous.

---

## Scope

### In Scope

The following are within scope for this security policy:

- **Authentication bypass** — gaining access without valid credentials
- **Authorization flaws** — accessing another user's analyses or data
- **Injection attacks** — SQL injection, command injection, SSTI, etc.
- **Sensitive data exposure** — leaking Firebase credentials, API keys, model weights
- **Denial of Service** — endpoints that can be crashed or exhausted without authentication
- **File upload vulnerabilities** — arbitrary file execution, path traversal via upload
- **CORS misconfigurations** — exploitable cross-origin request forgeries
- **Insecure dependencies** — critical CVEs in `requirements.txt` or `package.json` affecting production behaviour

### Out of Scope

The following are **not** within scope:

- Vulnerabilities in third-party services (Firebase, GCP) — report directly to Google
- Missing security headers with no practical exploit path
- Clickjacking without sensitive actions behind it
- Rate limiting bypass on non-sensitive endpoints
- Social engineering attacks
- Findings from automated scanners with no proof of exploitability

---

## Security Best Practices for Contributors

When contributing code, please follow these guidelines to avoid introducing vulnerabilities:

### Backend (FastAPI / Python)

- **Never** hardcode secrets, API keys, or credentials in source files.
- Use `os.getenv()` via `config.py` — never call it directly in route handlers.
- Validate all file uploads using `validate_audio_file()` — check MIME type **and** extension.
- Apply `@limiter.limit()` to all public-facing POST endpoints.
- Use parameterised Firestore queries — never concatenate user input into query strings.
- Keep `ALLOWED_ORIGINS` tight in production — never use `"*"` in prod.
- Do not log sensitive values (tokens, passwords, file contents).

### Frontend (React)

- Do **not** store Firebase tokens in `localStorage` for sensitive applications — prefer `sessionStorage` or in-memory.
- Sanitise any user-generated content before rendering to prevent XSS.
- Never expose `VITE_API_BASE_URL` credentials — only public API base URLs belong in `.env`.
- Use HTTPS in all production API calls.

### ML / File Handling

- Audio files are processed in isolated **temporary files** that are deleted after processing — do not persist user audio without explicit consent.
- The `tempfile.NamedTemporaryFile` pattern is used throughout — do not change this to a fixed filename without ensuring race-condition safety.
- ONNX exports should be treated as model weights — keep them out of public storage.

---

## Dependency Vulnerability Scanning

We use GitHub's **Dependabot** and **CodeQL** for automated vulnerability scanning on every push to `main`. If Dependabot opens a PR for a security update, please prioritise merging it.

To manually audit dependencies:

```bash
# Python
pip-audit -r backend/requirements.txt

# Node.js
cd frontend && npm audit
```

---

## Hall of Fame

We are grateful to the following security researchers who have responsibly disclosed vulnerabilities:

> *No disclosures have been made yet. You could be the first!*

---

## Changes to This Policy

This policy may be updated over time. Significant changes will be announced via a GitHub release note.
