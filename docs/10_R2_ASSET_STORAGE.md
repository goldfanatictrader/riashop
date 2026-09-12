# 10 — R2 Asset & Storage Rules

## Bucket purpose
R2 contains binary objects only:
- product images;
- optional archived invoice PDFs;
- small application-controlled brand assets if needed outside the frontend bundle.

## Suggested prefixes
```text
products/{product-id}/primary.webp
products/{product-id}/additional-01.webp
invoices/{yyyy}/{mm}/{invoice-number}.pdf
```

## Do not use
- user-provided filenames as authoritative object keys;
- spaces or random directory conventions;
- public write access;
- a single flat bucket namespace for everything.

## Product image rules
Target source:
- 1:1 crop;
- max 1600×1600 master-equivalent;
- WebP preferred;
- display derivative 800–1200px;
- typical web object < 200KB if quality permits.

Validate:
- MIME;
- extension independently;
- maximum upload size;
- image decoding.

## Access
V1 can serve product images through an authenticated/public-safe Worker route depending on whether the application remains private.

Invoice PDFs must not be globally guessable public objects. Stream through authorized Worker or use short-lived signed access if implemented.

## Cleanup
When a product image is replaced:
1. upload new object;
2. update D1 row;
3. only then delete old object asynchronously/best effort.

Never delete the old object before the new reference is committed.

## Invoice archive failure
A failed archive upload must not roll back an already finalized invoice. Mark `pdf_r2_key` null and allow retry/regeneration.
