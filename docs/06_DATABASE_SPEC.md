# 06 — Database Specification

## Database
Cloudflare D1 / SQLite-compatible SQL.

## Core tables
- `products`
- `customers`
- `invoices`
- `invoice_items`
- `invoice_sequences`
- `settings`

Authentication/session tables may be added depending on the chosen signed-session implementation, but keep them minimal.

## IDs
Use text UUID/ULID-style IDs generated in Worker code. Do not rely on sequential public IDs.

## Money
All money stored as INTEGER rupiah.

## Timestamps
Store UTC ISO-8601 text or integer Unix timestamps consistently. UI renders local Indonesian time.

## Product model
Key fields:
- id
- name
- category
- variant
- unit_label
- price_rupiah
- image_key
- is_active
- created_at
- updated_at

No stock quantity in V1.

## Customer model
Key fields:
- id
- name
- whatsapp_number
- address
- note
- is_active
- created_at
- updated_at

## Invoice model
Key fields:
- id
- invoice_number
- sequence_year_month
- sequence_number
- customer_id nullable
- customer_name_snapshot
- whatsapp_snapshot
- invoice_date
- subtotal_rupiah
- discount_rupiah
- shipping_rupiah
- grand_total_rupiah
- amount_in_words
- status
- pdf_r2_key nullable
- cancelled_at nullable
- created_at
- updated_at

## Invoice item model
Key fields:
- id
- invoice_id
- product_id nullable
- product_name_snapshot
- variant_snapshot
- unit_label_snapshot
- unit_price_rupiah
- quantity
- line_total_rupiah
- sort_order

The snapshot fields are authoritative for historical rendering.

## Sequence model
`invoice_sequences` stores one row per `YYYYMM`.

Atomic behavior:
1. transaction begins;
2. read current sequence;
3. increment/create;
4. create invoice with assigned number;
5. commit.

Never generate invoice numbers solely in the browser.

## Soft deletion
Use `is_active` for products/customers.
Historical invoices must survive master-data changes.

## Indexes
At minimum:
- products active/name;
- customers active/name;
- customers whatsapp number;
- invoices invoice_number unique;
- invoices invoice_date;
- invoices customer_id;
- invoice_items invoice_id.

## Migration policy
- schema changes are migration files;
- no manual production schema edits;
- migrations must be idempotent where practical or versioned clearly;
- seed data must never overwrite real data.

See `../database/schema.sql` for the initial implementation schema.
