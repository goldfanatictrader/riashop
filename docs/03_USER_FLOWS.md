# 03 — User Flows

## Flow A — First use
1. Open PWA URL.
2. Unlock/login.
3. Install prompt may be shown non-aggressively.
4. Home displays three primary actions.
5. If there are no products, show a clear empty state with **Tambah Barang Pertama**.

## Flow B — Add product
1. Home → **Daftar Barang**.
2. Tap **Tambah Barang**.
3. Add/take product photo.
4. Enter product name.
5. Select/create category.
6. Enter size/variant.
7. Select unit label.
8. Enter price.
9. Save.
10. Return to product list with success confirmation.

### Validation
- name required;
- price >= 0;
- image optional but recommended;
- invalid image shows actionable error.

## Flow C — Create invoice for existing customer
1. Home → **Buat Nota**.
2. Tap customer field.
3. Search/select customer.
4. Tap **Tambah Barang**.
5. Product picker opens with photo cards and category filters.
6. Tap product(s).
7. Return to invoice with quantity = 1.
8. Change quantity using large + / − controls.
9. Add discount/shipping if needed.
10. Review grand total.
11. Tap **Buat PDF**.
12. Invoice is persisted/finalized.
13. PDF is generated.
14. Show preview/success page.
15. Tap **Kirim via WhatsApp**.
16. Native share sheet opens.
17. User selects WhatsApp and destination chat.

## Flow D — Create customer inside invoice
1. Create Invoice → customer picker.
2. Search yields no result or tap **Tambah Customer**.
3. Enter name.
4. Enter WhatsApp number.
5. Save.
6. New customer becomes selected automatically.
7. Continue invoice without losing invoice items.

## Flow E — Re-share old invoice
1. Home → **Nota Sebelumnya**.
2. Search by customer or invoice number.
3. Open invoice detail.
4. Tap **Bagikan PDF**.
5. Use archived PDF if available; otherwise regenerate from snapshot.
6. Native share sheet opens.

## Flow F — Correct an invoice
1. Open invoice detail.
2. Tap **Duplikat Nota**.
3. New draft is created with copied customer/items/discount/shipping.
4. Edit draft.
5. Generate a new invoice number.
6. Optionally cancel original with confirmation.

## Flow G — Network problem
### Before saving
- Keep current form state locally in memory/local persistence.
- Show non-blocking offline indicator.
- Prevent finalization if API cannot persist the invoice.

### After invoice is finalized and PDF exists locally
- Sharing the local PDF may still proceed.
- If archive upload fails, show `PDF tersimpan di perangkat, arsip online belum tersimpan` and retry later.

## Flow H — Empty states
### No products
`Belum ada barang. Tambahkan barang agar bisa membuat nota.`

### No customers
`Belum ada customer. Tambahkan customer saat membuat nota.`

### No invoices
`Belum ada nota penjualan.`

## Flow constraints
- Do not require more than one nested modal at a time.
- Back navigation must preserve invoice draft.
- Destructive actions require confirmation.
- Core actions must not rely on swipe-only gestures.
