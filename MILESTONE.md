# Milestone 7 — QA and Hardening

Date: 2026-09-12
Branch: `ona/auto-m7-qa`

## Outcome

Milestone 7 hardening is implemented without changing locked V1 behavior. The server remains authoritative for invoice totals, sequence allocation, snapshots, state transitions, and R2 keys. Automated release gates pass; production release still requires the documented real-Android P0 acceptance run.

## Files changed

- `src/worker.test.ts` — protected-route, expired-session, security-header, and secure-cookie coverage.
- `src/features/invoicing/server.integration.test.ts` — server-authoritative adjusted totals, concurrent unique sequences, and full transaction rollback coverage.
- `src/features/invoicing/domain.test.ts` — additional Indonesian amount-in-words boundary cases.
- `src/features/invoicing/pdf.test.ts` — generated PDF content-stream assertion for the snapshot amount in words.
- `src/features/products/api/productRoutes.test.ts` — MIME/signature mismatch, declared oversize, replacement ordering, and D1-failure R2 cleanup coverage.
- `src/app/styles.css` — 16px minimum copy, 48px button minimum, focus-preserving responsive guards, and 390px layout fixes.
- `src/app/App.tsx` — reduced-motion-aware programmatic navigation.
- `src/features/invoicing/Invoicing.tsx` — semantic PDF preview dialog and lazy product image decoding.
- `src/features/products/ProductPicker.tsx`, `src/features/products/ProductScreen.tsx` — lazy product image decoding.
- `public/_headers`, `src/worker.ts` — matching CSP, nosniff, referrer, permissions, and frame-deny headers; CSP retains `blob:` PDF frames and same-origin PWA workers/manifests.
- `vite.config.ts` — production source maps disabled; existing on-demand PDF chunk retained.
- `DEPLOYMENT.md` — production D1/R2/secrets/deploy/health/custom-domain checklist.
- `docs/15_DECISION_LOG.md` — D-021 and D-022 hardening/release decisions.
- `MILESTONE.md` — commands, results, manual checks, limitations, and production handoff.

The pre-existing untracked `.devcontainer/` directory was not modified.

## Commands executed

```text
git status --short
find/sed/grep audits of source, docs, tests, CSS, headers, and configuration
gitpod environment task list (the environment defines no repository one-shot task)
curl Node.js 22.23.2 archive and official SHASUMS256.txt into /tmp
sha256sum --check (passed)
npm ci
npm run lint
npm run typecheck
npm test
npm run build
du -ah dist
git diff --check
npx wrangler dev --ip 0.0.0.0 --port 8787 with local non-production test vars
Chromium/Playwright snapshots, screenshots, viewport measurements, keyboard focus checks, and accessibility-tree inspection
curl header and Set-Cookie checks against local Wrangler
npx wrangler help for D1, R2, secrets, migrations, and deployment syntax
```

Node/npm were absent from `PATH`. Checks therefore used a temporary Node.js 22.23.2 installation under `/tmp`; its archive passed verification against Node.js's official SHA-256 manifest. No runtime files were added to the repository.

## Check results

- `npm ci`: passed; 224 packages installed, 0 vulnerabilities.
- `npm run lint`: passed with no errors or warnings.
- `npm run typecheck`: passed with no TypeScript errors.
- `npm test`: passed; 6 files and 41 tests.
- `npm run build`: passed; production `dist` is 772 KB total.
- Initial application JS: 258.64 KB / 77.75 KB gzip.
- PDF chunk: 423.66 KB / 176.83 KB gzip and loaded only for PDF actions.
- CSS: 14.54 KB / 3.55 KB gzip.
- `git diff --check`: passed.
- Static and Worker responses include CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options: DENY`.
- Login response cookie confirmed `HttpOnly`, `Secure`, `SameSite=Lax`, path `/`, and 30-day `Max-Age`.

## Manual verification notes

- Chromium at 390×844: login, home, and empty invoice editor rendered with zero horizontal overflow.
- Chromium at 1440×900: home and invoice editor rendered with zero horizontal overflow and a centered 680px working column.
- Measured visible controls had no target below 48×48 CSS px; visible leaf text had no size below 16px.
- Login/input labels and named controls were present in the accessibility tree. Keyboard Tab focus showed a 4px visible outline with 3px offset.
- Core text/action contrast checks ranged from 4.72:1 to 16.49:1.
- Reduced-motion behavior, semantic PDF preview labeling, and the explicit product/customer/invoice control names were code-audited.
- Local Wrangler confirmed the PWA CSP allows same-origin service workers/manifests and `blob:` PDF frames while denying object/embed and external framing.

## Performance and known limitations

- `pdf-lib` remains the largest dependency, but it is already isolated in a lazy chunk and is not part of initial page load.
- Product photos remain the main LCP/bandwidth risk because V1 accepts source files up to 5 MB and has no server-side image transformer. List images now load/decode lazily; operators should follow the documented WebP target of 800–1200px and typically below 200 KB.
- No source map is emitted into the production static asset bundle.
- The full P0 script was not run on a real Android phone, and native share/install/reopen behavior was not claimed as verified.
- The browser smoke test used local Wrangler and did not substitute for production D1/R2 smoke testing or backup/recovery validation.

## Next step

Follow `DEPLOYMENT.md` to provision production D1/R2 bindings and secrets, deploy, set the Healthcheck URL/custom domain, then complete all P0 acceptance scenarios on a real Android phone before release.
