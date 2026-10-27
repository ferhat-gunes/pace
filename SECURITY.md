# Security policy

## Reporting

Please use GitHub's private **Security Advisories** feature to report suspected vulnerabilities. Include a concise description, affected route or feature, and safe reproduction details. Do not include real user emails, authentication codes, API keys, or habit exports in a public issue.

## Sensitive configuration

Cloudflare secrets must be configured as runtime secrets. Never commit `AUTH_SECRET`, `RESEND_API_KEY`, `.dev.vars`, `.env`, or user exports.

## Data boundaries

All account reads and writes must use the authenticated server-side user ID. A user ID supplied by the browser is not an authorization credential. Login codes expire after ten minutes, have a limited number of attempts, and sessions are stored as token hashes.
