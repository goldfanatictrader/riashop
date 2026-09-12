# Milestone 0 + Milestone 1 Report

Date: 2026-09-12

## Files changed

- Project/tooling: `package.json`, `package-lock.json`, `.gitignore`, `eslint.config.js`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`.
- Cloudflare foundation: `wrangler.jsonc`, `.dev.vars.example`, `migrations/0001_initial_schema.sql`.
- Worker/API: `src/worker.ts`, `src/worker.test.ts`.
- React UI: `src/main.tsx`, `src/app/App.tsx`, `src/app/styles.css`.
- PWA/static assets: `public/manifest.webmanifest`, `public/_headers`, `public/icons/icon-192.svg`, `public/icons/icon-512.svg`, `public/icons/icon-maskable-512.svg`.
- Documentation: `README.md`, `docs/15_DECISION_LOG.md`, `MILESTONE.md`.

The pre-existing untracked `.devcontainer/` directory was inspected but not changed.

## Commands executed

The Ona environment had no repository task for build/test and no Node.js binary, so checks used a SHA-256-verified Node.js 22.23.2 distribution unpacked under `/tmp` without modifying the repository Dev Container.

```bash
curl -fsSL https://nodejs.org/dist/latest-v22.x/
curl -fsSLO https://nodejs.org/dist/latest-v22.x/node-v22.23.2-linux-x64.tar.xz
curl -fsSLO https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt
sha256sum --check --ignore-missing SHASUMS256.txt
npm install react react-dom hono
npm install --save-dev @cloudflare/workers-types @eslint/js @types/react @types/react-dom @vitejs/plugin-react eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals typescript typescript-eslint vite vitest wrangler
npm prune
npm run lint
npm run typecheck
npm test
npm run build
npx wrangler deploy --dry-run
npx wrangler d1 migrations apply ria-noel-shop --local
npx wrangler dev --ip 0.0.0.0 --port 8787 --var OPERATOR_PASSCODE:<local-test-value> --var SESSION_SECRET:<local-test-value>
cmp database/schema.sql migrations/0001_initial_schema.sql
curl http://127.0.0.1:8787/api/v1/health
curl http://127.0.0.1:8787/api/v1/auth/session
curl -X POST http://127.0.0.1:8787/api/v1/auth/login
curl -X POST http://127.0.0.1:8787/api/v1/auth/logout
git diff --check
```

The browser verification workflow also started Chromium, used a 390×844 viewport, opened the Ona preview port, inspected the accessibility snapshot, logged in, navigated to the same URL again, measured computed sizes, clicked the primary home action, and captured screenshots for local inspection.

## Results

- `npm run lint`: passed with no warnings or errors.
- `npm run typecheck`: passed with no TypeScript errors.
- `npm test`: passed; 1 test file and 5 tests.
- `npm run build`: passed; production assets generated successfully. Main JavaScript was 223.44 kB raw / 69.96 kB gzip.
- `npx wrangler deploy --dry-run`: passed; Worker recognized D1 `DB`, R2 `FILES`, and static `ASSETS` bindings.
- Local D1 migration: 15 statements applied successfully on first run; final run reported no pending migrations.
- Locked schema comparison: passed; `migrations/0001_initial_schema.sql` matches `database/schema.sql` exactly.
- `git diff --check`: passed.

## Manual verification notes

- `GET /api/v1/health` returned `200` with `{"data":{"status":"ok","database":"ok","storage":"ok"}}`, proving the request passed through the Worker and completed both binding probes.
- Unauthenticated `GET /api/v1/auth/session` and an unknown protected API path returned `401` with Indonesian copy.
- Correct login returned `200` and a 30-day `HttpOnly`, `Secure`, `SameSite=Lax` cookie. A following session request returned `200`; logout returned `204`; the same cookie was rejected afterward.
- In Chromium at 390×844, login and home were readable without horizontal scrolling. Core body text computed to 17px. The logout target was 48px high; action targets were 104–138px high. `Buat Nota` was the largest, highest-contrast action.
- Accessibility snapshot exposed the visible labels `Buat Nota`, `Daftar Barang`, and `Nota Sebelumnya`; decorative icon glyphs were hidden from assistive technology.
- Reopening the same app URL after login returned directly to home, confirming browser-session persistence behavior.
- PWA manifest and 192/512/maskable starter icons were served through the same deployment. API and static responses included the configured CSP, nosniff, referrer, and permissions headers.

## Known limitations

- This run intentionally stops at M0/M1. The three home actions are visible and announce that their flows arrive later; product CRUD, customer CRUD, invoice creation/history, PDF generation, sharing, and R2 uploads are not implemented.
- The PWA icons are starter SVG artwork, not final approved brand exports. A service worker/offline app-shell cache belongs to Milestone 6 and is not included.
- Login throttling is best-effort in Worker-isolate memory. It is not a globally durable counter; this tradeoff is recorded in `docs/15_DECISION_LOG.md`.
- Visual verification used Chromium with a mobile viewport, not a physical Android device. The required real-device install and usability acceptance remains outstanding.
- Remote Cloudflare resources were not created or mutated. Production deployment still requires a real D1 database ID, R2 bucket, secrets, remote migration, and deployment.

## Next step

Milestone 2: implement the product vertical slice (authenticated list/search, create/edit/deactivate, R2 image upload, and mobile product picker) without expanding beyond the locked V1 scope.
