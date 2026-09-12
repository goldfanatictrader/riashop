# Milestone 4 + Milestone 5 + Milestone 6 Report

Date: 2026-09-12

## Delivered

- Server-authoritative invoice finalization, product/customer snapshots, fixed-rupiah discount and shipping, monthly `RNS-YYYYMM-NNNN` allocation, history/detail, cancellation, and duplicate-to-draft flow.
- Thin invoice-local customer list/create and product selectors that consume the shared `/api/v1/customers` and `/api/v1/products` contracts without adding management screens.
- Deterministic, text/vector A4 PDFs using `pdf-lib`, Indonesian rupiah and terbilang, long-name wrapping, repeated multi-page headers, in-app preview, native file share, download fallback, and optional authenticated R2 archive.
- Installable PWA manifest with PNG icons, service-worker app-shell/static asset cache, local invoice-draft persistence, online/offline status, and Indonesian retry/error states.

## Files changed

- Invoice feature/API/tests: `src/features/invoicing/Invoicing.tsx`, `api.ts`, `domain.ts`, `pdf.ts`, `server.ts`, and their unit/integration tests.
- Worker and contracts: `src/worker.ts`, `api/openapi.yaml`.
- Shell/PWA: `src/app/App.tsx`, `src/app/styles.css`, `src/main.tsx`, `public/sw.js`, `public/manifest.webmanifest`, `public/_headers`, and three PNG files under `public/icons/`.
- Tooling/dependencies: `package.json`, `package-lock.json`, `tsconfig.json` (`pdf-lib` and Node test types).
- Documentation/evidence: `docs/15_DECISION_LOG.md` and five mobile screenshots under `docs/screenshots/`.

Shared shell/security files were changed minimally to wire invoice navigation, register the service worker, show connectivity, and permit only `blob:` PDF frames. The pre-existing untracked `.devcontainer/` directory was not changed. The locked schema and migration were not changed.

## Commands executed

The Ona environment exposed no repository tasks and had no Node/npm binary. Checks therefore used the same temporary Node 22.23.2 distribution under `/tmp` as the preceding milestone; no Dev Container files were changed.

```bash
npm install pdf-lib
npm install --save-dev @types/node
npm run lint
npm run typecheck
npm test
npm run build
npx wrangler deploy --dry-run
git diff --check
npx wrangler d1 migrations apply ria-noel-shop --local
npx wrangler d1 execute ria-noel-shop --local --command=<local reference seed>
npx wrangler dev --ip 0.0.0.0 --port 8787 --var OPERATOR_PASSCODE:<local> --var SESSION_SECRET:<local>
curl POST /api/v1/auth/login
curl POST /api/v1/invoices/finalize
gitpod environment port open 8787 --name ria-noel-shop --protocol http
browser mobile navigation/snapshot/screenshot/evaluation commands
```

`sharp` was installed temporarily without saving to dependencies solely to rasterize the existing SVG app icons into required PNG sizes, then pruned.

## Automated results

- `npm run lint`: passed, no warnings/errors.
- `npm run typecheck`: passed, no TypeScript errors.
- `npm test`: passed; 4 files, 19 tests. Node printed only its `node:sqlite` experimental warning.
- Integration tests run against `database/schema.sql` in SQLite and verify the reference total/terbilang, sequential unique allocation, historical product/customer snapshots, and retained cancellation.
- PDF tests verify byte-for-byte deterministic regeneration, `%PDF` output, sub-500KB reference output, required filename, and multi-page output for 60 lines.
- `npm run build`: passed. Initial app JS is 246.15 kB raw / 75.65 kB gzip; lazy PDF JS is 423.71 kB raw / 176.86 kB gzip.
- `npx wrangler deploy --dry-run`: passed with D1, R2, and static asset bindings recognized.
- `git diff --check`: passed after final documentation cleanup.

## Manual verification

- Local authenticated API finalization returned `201`, `RNS-202609-0001`, two `Rp540.000` lines, `Rp1.080.000` total, and `Satu Juta Delapan Puluh Ribu Rupiah`.
- At 390×844 Chromium, history reopened the finalized invoice with snapshot lines and totals. Duplicate created a populated editable draft with customer, both items, unit labels, quantity steppers, and total.
- Computed UI sizes: body 17px, inputs 18–20px, smallest button 48px, and every quantity-stepper button 48px.
- PDF preview initially exposed a CSP defect; after adding `frame-src 'self' blob:` to both Worker and static headers, preview opened with zero console errors.
- Navigating editor → home → editor preserved the full draft. With Chromium forced offline, the offline banner appeared, the populated `Rp1.080.000` draft remained available, and finalization was blocked with a clear retry state. Restoring the connection retained the draft.
- Service-worker check reported one active registration/controller, the `ria-noel-shell-v1` cache, and the linked manifest.

Screenshots:

- [Invoice editor](docs/screenshots/m4-editor-mobile.png)
- [Invoice history](docs/screenshots/m4-history-mobile.png)
- [PDF preview](docs/screenshots/m5-pdf-preview-mobile.png)
- [Offline persisted draft](docs/screenshots/m6-offline-draft-mobile.png)

## Known limitations

- A real Android device was not available. The implementation takes the standards-based `navigator.canShare({files})` → `navigator.share({files})` route required for the Android share sheet, but final WhatsApp selection/attachment must still be accepted on physical Android hardware.
- Full product/customer APIs and management UI are owned by the parallel milestones and are not present in this worktree. Invoice-local selectors are implemented against their documented endpoints; list/create interaction awaits those routes being merged. The reference editor was manually exercised through the history **Duplikat Nota** path and the invoice server API was exercised directly.
- Headless Chromium's built-in PDF viewer showed the PDF but also displayed its browser-level password-save prompt in the captured preview screenshot; deterministic PDF parsing/render structure is additionally covered by automated tests.
- Offline policy intentionally does not finalize or invent invoice numbers. Cached shell and drafts work during temporary loss; API-backed pickers/history still require connectivity.

## Next step

Merge the independently owned product/customer API slices, run the complete create-through-picker flow, then perform the P0 Android install/native-share/WhatsApp acceptance and Milestone 7 accessibility/security hardening.
