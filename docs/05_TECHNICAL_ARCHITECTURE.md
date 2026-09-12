# 05 — Technical Architecture

## Stack

### Frontend
- React
- Vite
- TypeScript
- PWA manifest + service worker
- lightweight CSS architecture; Tailwind is optional, not required

### Edge backend
- Cloudflare Workers
- Hono router/API
- static assets served by Workers asset binding

### Data
- Cloudflare D1 for relational application data
- Cloudflare R2 for product images and optional archived PDFs

### PDF
- `pdf-lib` in browser for deterministic PDF generation

## Why not Next.js
The product does not need SSR, complex public SEO routes, React Server Components, or framework-level server rendering. Vite + React keeps the runtime and deployment simpler for a small private utility PWA.

## Logical architecture
```text
Android PWA
  |
  | HTTPS
  v
Cloudflare Worker
  |-- Static Assets (React build)
  |-- Hono API /api/*
  |-- Session validation
  |-- D1 bindings
  |-- R2 bindings
  |
  +--> D1
  |     products
  |     customers
  |     invoices
  |     invoice_items
  |     invoice_sequences
  |     sessions (optional if cookie token design requires)
  |
  +--> R2
        product-images/
        invoices/
```

## Runtime responsibility split

### Browser
- render UI;
- form state;
- client validation;
- product image preprocessing/compression before upload where possible;
- PDF generation from finalized invoice snapshot;
- Web Share API;
- app-shell caching.

### Worker
- authentication/session verification;
- authoritative validation;
- CRUD API;
- invoice number transaction/sequence;
- invoice finalization;
- signed/authorized R2 upload/download routes where needed;
- security headers.

### D1
Authoritative structured data.

### R2
Binary objects only. Do not put business logic in object names.

## API style
- `/api/v1/*`
- JSON request/response except object upload/download endpoints.
- consistent error envelope.

Example:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nama customer wajib diisi",
    "fields": {"name": "required"}
  }
}
```

## State model
### Invoice
- `draft` — client-only or temporary server draft if implemented;
- `finalized` — invoice number assigned, snapshot persisted;
- `cancelled` — historical record retained.

V1 should avoid complex workflow states.

## Cloudflare deployment
Recommended single Worker project:
- `dist/` frontend build served as static assets;
- Worker intercepts `/api/*`;
- D1 binding: `DB`;
- R2 binding: `FILES`.

## Suggested repository layout
```text
/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── products/
│   │   ├── customers/
│   │   └── invoices/
│   ├── lib/
│   └── main.tsx
├── worker/
│   ├── index.ts
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── db/
├── public/
├── migrations/
├── tests/
├── wrangler.jsonc
├── vite.config.ts
└── package.json
```

## Performance targets
- initial JS: aim < 200KB gzip;
- lazy-load non-core routes;
- product thumbnails < 80KB typical;
- product display images < 200KB typical;
- invoice PDF < 500KB typical;
- no heavy charting, animation, or admin UI dependencies.

## Resilience
- UI preserves in-progress invoice draft while navigating inside the PWA.
- Network failures never silently discard work.
- Invoice number is assigned server-side only after successful finalization.
- PDF may be regenerated from stored invoice snapshots.
