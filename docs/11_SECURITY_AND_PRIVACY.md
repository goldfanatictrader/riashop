# 11 — Security & Privacy

## Security posture
Small private business utility, not a public multi-tenant SaaS. Keep controls appropriate but real.

## V1 authentication
Recommended minimal model:
- no public signup;
- one or a very small number of operator accounts;
- passcode/password verifier stored as a Cloudflare secret, not source code;
- login endpoint rate-limited;
- successful login creates signed, HttpOnly, Secure, SameSite=Lax session cookie;
- long but finite session lifetime, e.g. 30 days, to reduce friction for a 50+ operator;
- explicit logout.

If a stronger managed identity solution is later required, it can replace this without changing product flows.

## Never store
- plaintext password/passcode;
- secrets in frontend bundle;
- sensitive R2 credentials in browser;
- customer data in analytics payloads.

## API protections
- validate every mutation server-side;
- authorize every route except login/health/static;
- CSRF protections appropriate to cookie sessions;
- origin checks for mutations;
- request body size limits;
- file type/size validation;
- no raw SQL interpolation.

## Security headers
At minimum:
- Content-Security-Policy tuned to actual assets;
- X-Content-Type-Options: nosniff;
- Referrer-Policy;
- frame-ancestors restriction;
- Permissions-Policy where sensible.

## Customer privacy
Stored customer data is limited to business-relevant information:
- name;
- WhatsApp number;
- optional address/note;
- purchase invoice history.

Do not collect identity documents, birthdays, or unrelated profile data in V1.

## Logs
Do not log full:
- customer addresses;
- phone numbers;
- invoice PDF content;
- authentication secrets.

Use IDs and redacted context.

## Backups
D1/R2 backup strategy should be documented before production go-live. At minimum, confirm Cloudflare recovery/backup capability and keep migration files in repository.
