# Security policy

## Supported versions

This project ships from `master`. The latest deployed build at the project's
hosted URL is the only supported version. Older commits do not receive
security fixes.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security reports.**

Use GitHub's private vulnerability reporting:

1. Go to <https://github.com/arshad-shah/tools/security/advisories/new>
2. Describe the issue, ideally with:
   - The tool / page affected
   - Steps to reproduce
   - The impact (data exposure, XSS, prototype pollution, etc.)
   - Your suggested fix, if you have one

You'll get an acknowledgement within 7 days. Most fixes ship within 30 days
of a confirmed report; you'll be credited in the release notes unless you
prefer to stay anonymous.

## Scope

In scope:

- The application code in this repository (`src/**`)
- The build & CI workflows in `.github/workflows/**`

Out of scope:

- Vulnerabilities in third-party dependencies that have no exploitable path
  in this app — please report those upstream
- Self-XSS via the user's own browser DevTools or pasted scripts
- Missing security headers on the static-hosted deployment (these are set
  at the platform layer, not in the repo)
