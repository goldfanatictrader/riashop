# 02 — Scope & Business Rules

## Locked V1 scope

### Included
- Simple operator login/session.
- Product CRUD.
- Customer CRUD.
- Invoice creation.
- Invoice item snapshots.
- Automatic totals.
- PDF generation.
- Native share flow.
- Invoice history.
- Product image storage.
- Optional invoice PDF archive.
- PWA installability.

### Excluded
- Inventory quantity tracking.
- Purchase orders.
- Supplier management.
- Accounting journal.
- Cashflow reporting.
- Customer portal.
- Payment collection.
- Public shop checkout.
- Complex roles/permissions.
- AI-generated invoice visuals.

## Business rules

### BR-01 Invoice number
Format:
`RNS-YYYYMM-NNNN`

Example:
`RNS-202609-0012`

Sequence resets monthly. Sequence creation must be atomic in D1 to avoid duplicate numbers.

### BR-02 Currency
- Currency: IDR.
- UI formatting: `Rp90.000`.
- Store money as integer rupiah, never floating point.

### BR-03 Quantity
- Store quantity as numeric decimal to support units if needed.
- Default practical usage is integer quantity.
- Unit label stored per invoice item snapshot, e.g. `pcs`, `lusin`, `set`.

### BR-04 Product price
- Product master contains default price.
- Invoice item copies the price at time of invoice creation.
- Changing product price later must not change historical invoices.

### BR-05 Product snapshot
Each invoice item stores a snapshot of:
- product name;
- variant/size;
- unit label;
- unit price.

Historical invoice rendering must use snapshot values, not current product master values.

### BR-06 Totals
For each line:
`line_total = unit_price × quantity`

Invoice:
`subtotal = sum(line_total)`

`grand_total = max(0, subtotal - discount + shipping)`

All monetary values are integer rupiah.

### BR-07 Discount
V1 discount is a fixed rupiah amount, not percentage.

### BR-08 Shipping
V1 shipping is an optional fixed rupiah amount.

### BR-09 Finalization
Generating/saving an invoice finalizes its commercial snapshot.
After finalization:
- no destructive in-place editing;
- use **Duplikat Nota** to create a corrected/new invoice;
- cancellation is allowed with reason optional.

### BR-10 Customer phone
Normalize Indonesian WhatsApp numbers to a canonical digits-only form, preferably `62...`.
Display may be formatted for readability.

### BR-11 Product images
- One primary image required for good UX but not database-enforced.
- Images stored in R2.
- Allowed: WebP, PNG, JPEG.
- UI should prefer WebP after client compression.

### BR-12 Invoice archive
R2 invoice PDF storage is optional per implementation but recommended for exact historical re-download.
If a PDF object is missing, regenerate deterministically from stored invoice snapshot.

### BR-13 Deletion
- Products/customers referenced by invoices must not be hard-deleted.
- Use `is_active = 0` / soft deactivation.
- Invoices are never hard-deleted in normal UI.

## Usability rules
- The operator must never be forced to type a product price that already exists.
- Main actions must have text labels.
- Minimum touch target: 48×48 CSS px; prefer 52–56 px.
- Core body text: 16–18px.
- Input text: >= 18px.
- Page titles: 24–30px.
- Primary action button: full-width on mobile when practical.
