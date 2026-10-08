# Security model

## Primary rules

- The backend is the source of truth for access control.
- Public share links must never grant direct object storage access.
- Private files must be retrieved using short-lived signed URLs only.
- User input is never trusted.

## Planned protections

- Password hashing via bcrypt or Argon2
- Expiration checks in backend
- Rate limiting for sensitive endpoints
- Structured logging without sensitive payloads
- RLS policies to isolate user data
- Cloudflare WAF and HTTPS enforcement
