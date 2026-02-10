# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Security Scanning

This project uses multiple layers of security scanning:

### 1. **npm audit** (Dependencies)
- Runs automatically on every push/PR via GitHub Actions
- Checks for known vulnerabilities in npm packages
- Fails CI on HIGH or CRITICAL vulnerabilities
- Run locally: `npm run audit:check`

### 2. **CodeQL Analysis** (Code)
- Runs weekly and on every push/PR
- Scans for security vulnerabilities in JavaScript/TypeScript code
- Detects: SQL injection, XSS, path traversal, hardcoded secrets, etc.
- Queries: `security-extended` + `security-and-quality`

### 3. **TruffleHog** (Secrets)
- Scans for accidentally committed secrets
- Checks: API keys, tokens, passwords, certificates
- Runs on every push/PR

### 4. **Dependency Review** (Pull Requests)
- Reviews new dependencies added in PRs
- Blocks PRs with vulnerable or incompatible licenses
- Auto-comments on PRs with security insights

### 5. **Dependabot** (Automated Updates)
- Weekly checks for outdated dependencies
- Automatically opens PRs for security patches
- Groups related updates to reduce PR noise

## Reporting a Vulnerability

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email: [security contact needed - add your email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and provide a timeline for fixes.

## Security Best Practices in This Project

✅ **Authentication**
- JWT tokens with 15-minute expiration
- Token blacklist for logout/revocation
- bcrypt with 12 salt rounds

✅ **Input Validation**
- Zod schemas for all user input
- Recursive sanitization against XSS
- SQL injection protection via parameterized queries (Drizzle ORM)

✅ **Security Headers**
- CSP (Content Security Policy)
- HSTS (Strict-Transport-Security)
- X-Frame-Options, X-Content-Type-Options
- Referrer-Policy

✅ **Rate Limiting**
- Auth endpoints: 5 req/min
- Upload endpoints: 10 req/hour
- General API: 100 req/15min

✅ **Audit Logging**
- All sensitive operations logged
- Includes: user, action, timestamp, IP, result

## Recent Security Improvements

### February 2026
- ✅ Removed all hardcoded passwords from codebase
- ✅ Deleted `/api/admin/reset-all-passwords` endpoint (critical vulnerability)
- ✅ Implemented JWT 15min expiration + token blacklist
- ✅ Fixed user-id hardcoded in API calls
- ✅ Added auth validation to all hooks (useTasks, useVisits)
- ✅ Upgraded bcrypt salt rounds: 10 → 12
- ✅ Added comprehensive security scanning to CI/CD

## Security Roadmap

🚧 **In Progress**
- [ ] Database-level pagination (prevent DoS on large datasets)
- [ ] Redis-based rate limiting (currently in-memory)
- [ ] Persistent audit log (currently in-memory, max 1000 entries)

📋 **Planned**
- [ ] 2FA/MFA for admin accounts
- [ ] IP whitelisting for admin panel
- [ ] Automated security updates via Dependabot auto-merge
- [ ] SAST integration (Snyk or similar)
- [ ] Penetration testing report

## Known Issues

### xlsx Library (HIGH severity - No fix available)
- **Issue**: Prototype Pollution + ReDoS vulnerabilities
- **Impact**: Used only for Excel import (admin-only feature)
- **Mitigation**: 
  - Feature is admin-only (authenticated + authorized users)
  - Input validation applied before processing
  - Rate limited (10 uploads/hour)
- **Status**: Monitoring for upstream fixes or alternative libraries
- **Alternative**: Considering migration to `exceljs` (actively maintained)

