# Milestone 2 + Milestone 3 Report

Date: 2026-09-12

## Outcome

Milestone 2 and Milestone 3 are implemented as authenticated, end-to-end product and customer slices. Products and customers can be listed, searched, created, edited, and soft-deactivated. Product images are validated by the Worker, stored in R2, referenced by `image_key`, and served through the authenticated product route. Reusable product and customer picker exports are ready for the separately owned invoice editor.

The customer picker creates a customer inside the picker, returns the persisted customer through `onSelect`, and closes through `onClose` without navigating or owning/resetting invoice draft state.

## Files changed

- Shared route integration only: `src/worker.ts` mounts `/api/v1/products` and `/api/v1/customers`.
- Shared shell integration only: `src/app/App.tsx` opens product/customer management screens; `src/app/styles.css` adds mobile feature and picker styles.
- Product API/types: `src/features/products/api/productRoutes.ts`, `src/features/products/types.ts`.
- Product UI/data: `src/features/products/productApi.ts`, `src/features/products/useProducts.ts`, `src/features/products/ProductScreen.tsx`, `src/features/products/ProductPicker.tsx`, `src/features/products/index.ts`.
- Product tests: `src/features/products/api/productRoutes.test.ts`.
- Customer API/types: `src/features/customers/api/customerRoutes.ts`, `src/features/customers/types.ts`.
- Customer UI/data: `src/features/customers/customerApi.ts`, `src/features/customers/useCustomers.ts`, `src/features/customers/CustomerScreen.tsx`, `src/features/customers/CustomerPicker.tsx`, `src/features/customers/index.ts`.
- Customer tests: `src/features/customers/api/customerRoutes.test.ts`.
- Decisions: `docs/15_DECISION_LOG.md` records server-mediated image limits/key ownership and picker state ownership.
- Report: `MILESTONE.md`.

No invoice, invoice item, PDF, service-worker, or database schema file was changed. The pre-existing untracked `.devcontainer/` directory was left unchanged.

## Commands executed

The current container did not provide Node/npm and the Ona environment exposed no repository one-shot task. Node.js 22.23.2 was therefore downloaded to `/tmp`, checked against the official SHA-256 manifest, and used without changing the repository configuration.

```bash
curl -fsSLO https://nodejs.org/dist/v22.23.2/node-v22.23.2-linux-x64.tar.xz
curl -fsSLO https://nodejs.org/dist/v22.23.2/SHASUMS256.txt
sha256sum --check --ignore-missing SHASUMS256.txt
tar -xf node-v22.23.2-linux-x64.tar.xz
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx wrangler deploy --dry-run
npx wrangler d1 migrations apply ria-noel-shop --local
npx wrangler dev --ip 0.0.0.0 --port 8787 --var OPERATOR_PASSCODE:<local-test-value> --var SESSION_SECRET:<local-test-value>
cmp database/schema.sql migrations/0001_initial_schema.sql
git diff --check
```

The local integration script logged in, listed active products, uploaded the checked-in PNG reference through `POST /products/:id/image`, fetched it back, created and searched a customer, and checked canonical phone normalization. Chromium was then run at 390×844 through the Ona browser workflow to exercise login, product create/list/edit display, customer create/list/deactivate, confirmation, accessibility labels, overflow, font sizes, and target sizes.

## Results

- `npm run lint`: passed with no warnings or errors.
- `npm run typecheck`: passed with no TypeScript errors.
- `npm test`: passed; 3 test files and 14 tests.
- `npm run build`: passed; main JavaScript 235.78 kB raw / 72.43 kB gzip, CSS 8.51 kB raw / 2.37 kB gzip.
- `npx wrangler deploy --dry-run`: passed; Worker recognized D1, R2, and asset bindings.
- Local D1 migration: all 15 initial-schema commands applied successfully.
- Locked schema comparison: passed; `database/schema.sql` still matches the initial migration exactly.
- `git diff --check`: passed.
- Node archive SHA-256 verification: passed.

## Manual verification notes

- A product named `Mug Noel Merah` was created through the mobile UI and immediately appeared in the management list. The active picker uses the same `GET /api/v1/products?active=1` source and refresh hook; deactivated records are excluded by the Worker.
- The product reference PNG uploaded through the live local Worker returned `200`, produced a server-owned `products/{id}/...png` key, was saved to D1, returned from R2 as `image/png`, and displayed in the browser product card.
- `Ibu Sari` was created through the on-screen customer form. `0813 2222 3333` was stored/displayed as `6281322223333`. Deactivation required confirmation and changed the list item to a visible `Nonaktif` state.
- A separate customer API integration created `Ibu Hilda`, normalized `0812 3456 7890` to `6281234567890`, and found the record through active search.
- At 390×844, the page had no horizontal overflow. Computed body text was 17px. An automated scan found no rendered button/input/select/textarea below 48px high and no control text below 16px.
- Labels and status messages were exposed in the browser accessibility snapshot; destructive actions have visible text and confirmation.
- Browser verification used mobile Chromium, not a physical Android phone.

## Known limitations

- The separately owned invoice editor still needs to embed `ProductPicker` and `CustomerPicker`. The stable imports are `src/features/products/index.ts` and `src/features/customers/index.ts`; picker callbacks are the integration boundary. No invoice-owned file was modified in this run.
- Product/customer list responses are capped at 200 records with `nextCursor: null`; V1 pagination was not specified for these master-data endpoints.
- Image conversion/cropping is not performed server-side. The Worker accepts validated JPEG/PNG/WebP up to 5 MB; WebP compression remains a client preference.
- The browser harness could not mount a workspace file into its isolated file chooser. Upload was therefore verified end-to-end through the same live Worker endpoint, and the resulting R2 image was verified in Chromium.
- Real Android camera selection, physical touch use, and final invoice-draft preservation must be rechecked after the invoice editor embeds the picker components.

## Next step

The invoice branch should import the controlled pickers, retain draft state in the invoice-editor parent, pass current product IDs/customer ID into the picker props, and update the draft from `onSelect`. Then run the combined M2–M4 integration tests and physical Android acceptance flow.
