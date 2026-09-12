# 09 — PDF Invoice Specification

## Goal
Create a lightweight, deterministic invoice PDF suitable for WhatsApp sharing and printing.

## Generation
Use `pdf-lib` in the browser from the finalized invoice snapshot returned by the API.

Do not:
- use AI image generation;
- rasterize the entire invoice as one screenshot;
- rely on headless Chromium for V1.

## Page
Default: A4 portrait.

Margins:
- 14–18mm practical range.

Use standard fonts for body text to keep output stable. Decorative brand elements may be embedded as optimized raster/vector assets.

## Structure
1. Header: logo + `NOTA PENJUALAN`.
2. Metadata: invoice number, date, cashier/store.
3. Customer block.
4. Item table.
5. Summary: subtotal, discount, shipping, grand total.
6. Amount in words.
7. Thank-you/footer branding.

## Required invoice fields
- invoice number;
- invoice date;
- shop name;
- customer name;
- line item name;
- variant/size if present;
- unit price;
- quantity + unit label;
- line total;
- subtotal;
- discount if > 0;
- shipping if > 0;
- grand total;
- amount in words.

## Formatting
- Money: Indonesian thousands separators.
- Do not show `.00`.
- Use `Rp` consistently.
- Ensure long product names wrap without overlapping cells.
- Repeat table header if invoice spans pages.

## Amount in words
Generate in Indonesian from integer rupiah.
Example:
`1.080.000` → `Satu Juta Delapan Puluh Ribu Rupiah`.

Unit tests are required for the number-to-words function.

## Filename
`RiaNoelShop_<invoice-number>.pdf`

Example:
`RiaNoelShop_RNS-202609-0012.pdf`

## File size target
Typical invoice < 500KB.
Optimize logo/assets before embedding.
Do not embed full-resolution product photographs in the PDF.

## Archive
Recommended R2 key:
`invoices/2026/09/RNS-202609-0012.pdf`

Store key on invoice only after successful upload.

## Regeneration
If archive is absent, PDF must be regenerated from invoice snapshots and produce materially equivalent content.

## Visual reference
`../assets/reference/invoice-reference.jpg`

Use the reference for brand direction, not as a mandate to reproduce every decorative element. Readability and small file size are more important.
