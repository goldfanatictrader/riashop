# 12 — QA & Acceptance Criteria

## Release gate
V1 cannot ship until all P0 scenarios below pass on a real Android phone.

## P0 functional tests

### Auth
- valid login succeeds;
- invalid login fails with friendly message;
- protected API rejects unauthenticated requests;
- session survives normal app reopen;
- logout ends session.

### Products
- add product;
- upload product image;
- edit price/name;
- deactivate product;
- deactivated product does not appear in normal picker;
- historical invoices remain unchanged after product edit.

### Customers
- add customer;
- normalize WhatsApp number;
- search customer;
- create customer inline while drafting invoice;
- historical invoice snapshot remains unchanged after customer edit.

### Invoice
- select customer;
- add one product;
- add multiple products;
- increase/decrease quantity;
- remove item;
- discount applied correctly;
- shipping applied correctly;
- grand total cannot become negative;
- invoice number unique under concurrent creation;
- finalized invoice visible in history;
- duplicate invoice creates new number;
- cancel retains history.

### PDF
- generated PDF opens;
- correct invoice number/date/customer;
- totals match server snapshot;
- long product name wraps;
- multi-page invoice renders safely;
- Indonesian amount-in-words is correct for test cases;
- file is reasonably small;
- file can be shared from Android.

### Share
- `navigator.share` path tested on supported Android browser;
- PDF appears in native share sheet;
- fallback works when file sharing unsupported.

## P0 usability tests
- no core body text under 16px;
- no critical icon-only action;
- touch targets >= 48px;
- primary create action obvious on home;
- operator can complete existing-customer invoice without documentation;
- back navigation does not lose invoice draft.

## P0 network tests
- failed API mutation shows error and preserves draft;
- slow network shows progress;
- archive upload failure does not lose finalized invoice;
- stale session sends user back to login without data corruption.

## Accessibility
- keyboard navigable on desktop;
- labels tied to inputs;
- visible focus;
- contrast checked;
- screen-reader names on icons;
- reduced-motion respected.

## Unit tests
Required for:
- rupiah formatting;
- phone normalization;
- invoice calculations;
- invoice number formatter;
- Indonesian number-to-words;
- validation schemas.

## Integration tests
Required for:
- finalize invoice transaction;
- invoice sequence uniqueness;
- product snapshot behavior;
- customer snapshot behavior;
- cancellation transition.

## Acceptance test script
1. Add `Mangkok Jago Printing Batik`, 15 cm, Rp90.000/lusin.
2. Add `Piring Batik Printing`, 20 cm, Rp90.000/lusin.
3. Add customer `Ibu Hilda Kusuma Dewi`.
4. Create invoice with 6 lusin each.
5. Expected subtotal/grand total: Rp1.080.000 with no discount/shipping.
6. Expected amount in words: `Satu Juta Delapan Puluh Ribu Rupiah`.
7. Generate PDF.
8. Share via Android native share sheet.
9. Reopen invoice history and share again.

This scenario mirrors the current real usage reference and must pass before handoff.
