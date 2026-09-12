# 00 — Documentation Index

## Build sequence

### Phase A — Foundation
1. Read `01_PRD.md` and `02_SCOPE_AND_BUSINESS_RULES.md`.
2. Implement project shell, Cloudflare Worker, static asset serving, D1 and R2 bindings.
3. Apply SQL in `database/schema.sql`.
4. Implement minimal session authentication.

### Phase B — Core invoice flow
1. Product list and product picker.
2. Customer picker/create customer.
3. Create invoice draft.
4. Quantity, discount, shipping, totals.
5. Generate deterministic PDF.
6. Share PDF with native Web Share API.
7. Persist invoice and optional PDF archive.

### Phase C — Supporting screens
1. Home.
2. Product management.
3. Customer management inside invoice flow plus simple list.
4. Invoice history and re-open/re-share.
5. Settings limited to shop identity and invoice defaults.

### Phase D — PWA and quality
1. Installable manifest and icons.
2. Service worker caching for app shell.
3. Offline/read-only behavior for previously loaded data where reasonable.
4. Accessibility and large touch-target audit.
5. Mobile performance audit.

## Documentation groups

### Product
- `01_PRD.md`
- `02_SCOPE_AND_BUSINESS_RULES.md`
- `03_USER_FLOWS.md`

### Design
- `04_UI_UX_AND_DESIGN_SYSTEM.md`
- `assets/reference/*`

### Software
- `05_TECHNICAL_ARCHITECTURE.md`
- `06_DATABASE_SPEC.md`
- `07_API_SPEC.md`
- `08_PWA_FRONTEND_SPEC.md`
- `09_PDF_INVOICE_SPEC.md`
- `10_R2_ASSET_STORAGE.md`
- `database/schema.sql`
- `api/openapi.yaml`

### Operations and quality
- `11_SECURITY_AND_PRIVACY.md`
- `12_QA_AND_ACCEPTANCE.md`
- `13_IMPLEMENTATION_PLAN.md`
- `14_CODING_AGENT_INSTRUCTIONS.md`
- `15_DECISION_LOG.md`

## Definition of done for V1
The project is V1-complete only when an operator can perform this on an Android phone:

1. Open installed PWA from home screen.
2. Tap **Buat Nota**.
3. Select or create a customer.
4. Select products visually.
5. Change quantities.
6. Add optional discount/shipping.
7. Generate a valid PDF.
8. Preview the PDF.
9. Share it through the Android share sheet and select WhatsApp.
10. Reopen the same invoice from **Nota Sebelumnya** and share it again.

No other feature is required for V1 completion.
