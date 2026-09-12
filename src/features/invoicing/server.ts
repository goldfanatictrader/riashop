import { Hono } from "hono";
import { amountInWords } from "./domain";
import type { Bindings } from "../../worker";

type InvoiceEnv = { Bindings: Bindings };

interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name_snapshot: string;
  whatsapp_snapshot: string | null;
  invoice_date: string;
  subtotal_rupiah: number;
  discount_rupiah: number;
  shipping_rupiah: number;
  grand_total_rupiah: number;
  amount_in_words: string;
  status: "finalized" | "cancelled";
  pdf_r2_key: string | null;
  created_at: string;
}

interface ItemRow {
  id: string;
  product_id: string | null;
  product_name_snapshot: string;
  variant_snapshot: string | null;
  unit_label_snapshot: string;
  unit_price_rupiah: number;
  quantity: number;
  line_total_rupiah: number;
}

interface FinalizeItem { productId: string; quantity: number }

function error(message: string, code = "VALIDATION_ERROR") {
  return { error: { code, message } };
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function mapInvoice(row: InvoiceRow, items: ItemRow[]) {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    customer: { id: row.customer_id, name: row.customer_name_snapshot, whatsapp: row.whatsapp_snapshot },
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name_snapshot,
      variant: item.variant_snapshot,
      unitLabel: item.unit_label_snapshot,
      unitPriceRupiah: item.unit_price_rupiah,
      quantity: item.quantity,
      lineTotalRupiah: item.line_total_rupiah,
    })),
    subtotalRupiah: row.subtotal_rupiah,
    discountRupiah: row.discount_rupiah,
    shippingRupiah: row.shipping_rupiah,
    grandTotalRupiah: row.grand_total_rupiah,
    amountInWords: row.amount_in_words,
    status: row.status,
    pdfR2Key: row.pdf_r2_key,
    createdAt: row.created_at,
  };
}

async function loadInvoice(db: D1Database, id: string) {
  const row = await db.prepare(`SELECT id, invoice_number, customer_id, customer_name_snapshot,
    whatsapp_snapshot, invoice_date, subtotal_rupiah, discount_rupiah, shipping_rupiah,
    grand_total_rupiah, amount_in_words, status, pdf_r2_key, created_at
    FROM invoices WHERE id = ?`).bind(id).first<InvoiceRow>();
  if (!row) return null;
  const itemResult = await db.prepare(`SELECT id, product_id, product_name_snapshot, variant_snapshot,
    unit_label_snapshot, unit_price_rupiah, quantity, line_total_rupiah
    FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, id`).bind(id).all<ItemRow>();
  return mapInvoice(row, itemResult.results);
}

export const invoiceRoutes = new Hono<InvoiceEnv>();

invoiceRoutes.get("/api/v1/invoices", async (c) => {
  const search = (c.req.query("search") ?? "").trim().slice(0, 100);
  const status = c.req.query("status");
  if (status && status !== "finalized" && status !== "cancelled") {
    return c.json(error("Status nota tidak valid."), 400);
  }
  const rawCursor = c.req.query("cursor") ?? "0";
  const offset = Number(rawCursor);
  if (!Number.isSafeInteger(offset) || offset < 0) return c.json(error("Halaman nota tidak valid."), 400);

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (search) {
    conditions.push("(invoice_number LIKE ? OR customer_name_snapshot LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await c.env.DB.prepare(`SELECT id, invoice_number, invoice_date,
    customer_name_snapshot, grand_total_rupiah, status
    FROM invoices ${where} ORDER BY invoice_date DESC, created_at DESC LIMIT 31 OFFSET ?`)
    .bind(...params, offset).all<{
      id: string; invoice_number: string; invoice_date: string; customer_name_snapshot: string;
      grand_total_rupiah: number; status: "finalized" | "cancelled";
    }>();
  const hasMore = result.results.length > 30;
  return c.json({
    data: result.results.slice(0, 30).map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date,
      customerName: row.customer_name_snapshot,
      grandTotalRupiah: row.grand_total_rupiah,
      status: row.status,
    })),
    meta: { nextCursor: hasMore ? String(offset + 30) : null },
  });
});

invoiceRoutes.post("/api/v1/invoices/finalize", async (c) => {
  if (!isSameOrigin(c.req.raw)) return c.json(error("Permintaan tidak diizinkan.", "FORBIDDEN"), 403);
  let body: Record<string, unknown>;
  try {
    body = await c.req.json<Record<string, unknown>>();
  } catch {
    return c.json(error("Data nota belum lengkap."), 400);
  }

  const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
  const invoiceDate = typeof body.invoiceDate === "string" ? body.invoiceDate : "";
  const discountRupiah = body.discountRupiah ?? 0;
  const shippingRupiah = body.shippingRupiah ?? 0;
  const items = Array.isArray(body.items) ? body.items as Array<Record<string, unknown>> : [];
  if (!customerId) return c.json(error("Pilih customer terlebih dahulu."), 400);
  if (!validDate(invoiceDate)) return c.json(error("Tanggal nota tidak valid."), 400);
  if (!Number.isSafeInteger(discountRupiah) || (discountRupiah as number) < 0) return c.json(error("Diskon tidak valid."), 400);
  if (!Number.isSafeInteger(shippingRupiah) || (shippingRupiah as number) < 0) return c.json(error("Ongkir tidak valid."), 400);
  if (items.length < 1 || items.length > 100) return c.json(error("Pilih minimal satu barang (maksimal 100)."), 400);

  const cleanItems: FinalizeItem[] = [];
  const productIds = new Set<string>();
  for (const item of items) {
    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    const quantity = item.quantity;
    if (!productId || typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000) {
      return c.json(error("Jumlah barang tidak valid."), 400);
    }
    if (productIds.has(productId)) return c.json(error("Barang yang sama tercantum lebih dari sekali."), 400);
    productIds.add(productId);
    cleanItems.push({ productId, quantity });
  }

  const customer = await c.env.DB.prepare("SELECT id FROM customers WHERE id = ? AND is_active = 1")
    .bind(customerId).first<{ id: string }>();
  if (!customer) return c.json(error("Customer tidak ditemukan atau sudah nonaktif.", "CUSTOMER_NOT_FOUND"), 404);
  const placeholders = cleanItems.map(() => "?").join(",");
  const found = await c.env.DB.prepare(`SELECT id, price_rupiah FROM products WHERE is_active = 1 AND id IN (${placeholders})`)
    .bind(...cleanItems.map((item) => item.productId)).all<{ id: string; price_rupiah: number }>();
  if (found.results.length !== cleanItems.length) {
    return c.json(error("Ada barang yang tidak ditemukan atau sudah nonaktif.", "PRODUCT_NOT_FOUND"), 404);
  }
  const prices = new Map(found.results.map((product) => [product.id, product.price_rupiah]));
  const subtotal = cleanItems.reduce((sum, item) => sum + (prices.get(item.productId) ?? 0) * item.quantity, 0);
  if (!Number.isSafeInteger(subtotal)) return c.json(error("Jumlah menghasilkan pecahan rupiah atau terlalu besar."), 400);
  const grandTotal = Math.max(0, subtotal - (discountRupiah as number) + (shippingRupiah as number));
  if (!Number.isSafeInteger(grandTotal)) return c.json(error("Total nota terlalu besar."), 400);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const yearMonth = invoiceDate.slice(0, 7).replace("-", "");
  const valuesSql = cleanItems.map(() => "(?, ?, ?)").join(", ");
  const requestBindings = cleanItems.flatMap((item, index) => [item.productId, item.quantity, index]);
  const sequenceStatement = c.env.DB.prepare(`INSERT INTO invoice_sequences (year_month, last_sequence, updated_at)
    VALUES (?, 1, ?) ON CONFLICT(year_month) DO UPDATE SET
    last_sequence = last_sequence + 1, updated_at = excluded.updated_at`).bind(yearMonth, now);
  const invoiceStatement = c.env.DB.prepare(`WITH requested(product_id, quantity, sort_order) AS (VALUES ${valuesSql}),
    totals AS (SELECT SUM(p.price_rupiah * r.quantity) AS subtotal
      FROM requested r JOIN products p ON p.id = r.product_id AND p.is_active = 1)
    INSERT INTO invoices (id, invoice_number, sequence_year_month, sequence_number, customer_id,
      customer_name_snapshot, whatsapp_snapshot, invoice_date, subtotal_rupiah, discount_rupiah,
      shipping_rupiah, grand_total_rupiah, amount_in_words, status, created_at, updated_at)
    SELECT ?, printf('RNS-%s-%04d', s.year_month, s.last_sequence), s.year_month, s.last_sequence,
      c.id, c.name, c.whatsapp_number, ?, t.subtotal, ?, ?, max(0, t.subtotal - ? + ?), ?, 'finalized', ?, ?
    FROM invoice_sequences s, customers c, totals t
    WHERE s.year_month = ? AND c.id = ? AND c.is_active = 1 AND t.subtotal = ?`)
    .bind(...requestBindings, id, invoiceDate, discountRupiah, shippingRupiah, discountRupiah,
      shippingRupiah, amountInWords(grandTotal), now, now, yearMonth, customerId, subtotal);
  const itemStatement = c.env.DB.prepare(`WITH requested(product_id, quantity, sort_order) AS (VALUES ${valuesSql})
    INSERT INTO invoice_items (id, invoice_id, product_id, product_name_snapshot, variant_snapshot,
      unit_label_snapshot, unit_price_rupiah, quantity, line_total_rupiah, sort_order)
    SELECT lower(hex(randomblob(16))), ?, p.id, p.name, p.variant, p.unit_label, p.price_rupiah,
      r.quantity, CAST(p.price_rupiah * r.quantity AS INTEGER), r.sort_order
    FROM requested r JOIN products p ON p.id = r.product_id AND p.is_active = 1
    ORDER BY r.sort_order`).bind(...requestBindings, id);

  try {
    await c.env.DB.batch([sequenceStatement, invoiceStatement, itemStatement]);
  } catch (caught) {
    console.error("Invoice finalization failed", caught instanceof Error ? caught.name : "unknown");
    return c.json(error("Nota belum tersimpan. Silakan coba lagi.", "FINALIZE_FAILED"), 500);
  }
  const invoice = await loadInvoice(c.env.DB, id);
  if (!invoice) return c.json(error("Nota belum tersimpan. Silakan coba lagi.", "FINALIZE_FAILED"), 500);
  return c.json({ data: invoice }, 201);
});

invoiceRoutes.get("/api/v1/invoices/:id", async (c) => {
  const invoice = await loadInvoice(c.env.DB, c.req.param("id"));
  return invoice ? c.json({ data: invoice }) : c.json(error("Nota tidak ditemukan.", "NOT_FOUND"), 404);
});

invoiceRoutes.post("/api/v1/invoices/:id/cancel", async (c) => {
  if (!isSameOrigin(c.req.raw)) return c.json(error("Permintaan tidak diizinkan.", "FORBIDDEN"), 403);
  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(`UPDATE invoices SET status = 'cancelled', cancelled_at = ?, updated_at = ?
    WHERE id = ? AND status = 'finalized'`).bind(now, now, c.req.param("id")).run();
  if (result.meta.changes !== 1) return c.json(error("Nota tidak ditemukan atau sudah dibatalkan.", "INVALID_STATE"), 409);
  return c.json({ data: await loadInvoice(c.env.DB, c.req.param("id")) });
});

invoiceRoutes.post("/api/v1/invoices/:id/pdf", async (c) => {
  if (!isSameOrigin(c.req.raw)) return c.json(error("Permintaan tidak diizinkan.", "FORBIDDEN"), 403);
  if (c.req.header("Content-Type")?.split(";", 1)[0] !== "application/pdf") {
    return c.json(error("Berkas harus berupa PDF."), 415);
  }
  const invoice = await loadInvoice(c.env.DB, c.req.param("id"));
  if (!invoice) return c.json(error("Nota tidak ditemukan.", "NOT_FOUND"), 404);
  const bytes = await c.req.arrayBuffer();
  if (bytes.byteLength < 4 || bytes.byteLength > 2_000_000 || new TextDecoder().decode(bytes.slice(0, 4)) !== "%PDF") {
    return c.json(error("Berkas PDF tidak valid atau terlalu besar."), 400);
  }
  const [, year, month] = invoice.invoiceNumber.match(/^RNS-(\d{4})(\d{2})-/u) ?? [];
  if (!year || !month) return c.json(error("Nomor nota tidak valid.", "INVALID_STATE"), 409);
  const key = `invoices/${year}/${month}/${invoice.invoiceNumber}.pdf`;
  await c.env.FILES.put(key, bytes, { httpMetadata: { contentType: "application/pdf" } });
  await c.env.DB.prepare("UPDATE invoices SET pdf_r2_key = ?, updated_at = ? WHERE id = ?")
    .bind(key, new Date().toISOString(), invoice.id).run();
  return c.json({ data: { pdfR2Key: key } });
});

invoiceRoutes.get("/api/v1/invoices/:id/pdf", async (c) => {
  const invoice = await loadInvoice(c.env.DB, c.req.param("id"));
  if (!invoice) return c.json(error("Nota tidak ditemukan.", "NOT_FOUND"), 404);
  if (!invoice.pdfR2Key) return c.json(error("Arsip PDF belum tersedia.", "PDF_NOT_ARCHIVED"), 404);
  const object = await c.env.FILES.get(invoice.pdfR2Key);
  if (!object) return c.json(error("Arsip PDF belum tersedia.", "PDF_NOT_ARCHIVED"), 404);
  c.header("Content-Type", "application/pdf");
  c.header("Content-Disposition", `attachment; filename="RiaNoelShop_${invoice.invoiceNumber}.pdf"`);
  c.header("Cache-Control", "private, no-store");
  return c.body(object.body);
});
