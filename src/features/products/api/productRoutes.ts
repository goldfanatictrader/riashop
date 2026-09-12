import { Hono } from "hono";
import type { Bindings } from "../../../worker";
import type { Product } from "../types";
import { parseOffsetCursor } from "../../../shared/pagination";

interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  variant: string | null;
  unit_label: string;
  price_rupiah: number;
  image_key: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const PRODUCT_COLUMNS = `id, name, category, variant, unit_label, price_rupiah,
  image_key, is_active, created_at, updated_at`;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function productFromRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    variant: row.variant,
    unitLabel: row.unit_label,
    priceRupiah: row.price_rupiah,
    imageKey: row.image_key,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function optionalText(value: unknown, maximum: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maximum) : null;
}

function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function parseActive(value: string | undefined): number | null | "invalid" {
  if (value === undefined || value === "") return null;
  if (value === "1" || value === "true") return 1;
  if (value === "0" || value === "false") return 0;
  return "invalid";
}

async function findProduct(database: D1Database, id: string): Promise<ProductRow | null> {
  return database.prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ?`)
    .bind(id).first<ProductRow>();
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function validImage(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  return contentType === "image/webp" && bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export const productRoutes = new Hono<{ Bindings: Bindings }>();

productRoutes.get("/", async (c) => {
  const search = c.req.query("search")?.trim().slice(0, 100) ?? "";
  const category = c.req.query("category")?.trim().slice(0, 100) ?? "";
  const active = parseActive(c.req.query("active"));
  if (active === "invalid") {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Filter status barang tidak valid." } }, 400);
  }
  const offset = parseOffsetCursor(c.req.query("cursor"));
  if (offset === null) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Halaman barang tidak valid." } }, 400);
  }

  const conditions: string[] = [];
  const values: (string | number)[] = [];
  if (search) {
    conditions.push("(name LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR variant LIKE ? ESCAPE '\\')");
    const pattern = `%${escapeLike(search)}%`;
    values.push(pattern, pattern, pattern);
  }
  if (category) {
    conditions.push("category = ? COLLATE NOCASE");
    values.push(category);
  }
  if (active !== null) {
    conditions.push("is_active = ?");
    values.push(active);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const result = await c.env.DB.prepare(
    `SELECT ${PRODUCT_COLUMNS} FROM products${where}
      ORDER BY is_active DESC, name COLLATE NOCASE ASC, id ASC LIMIT 51 OFFSET ?`,
  ).bind(...values, offset).all<ProductRow>();
  const hasMore = result.results.length > 50;
  return c.json({
    data: result.results.slice(0, 50).map(productFromRow),
    meta: { nextCursor: hasMore ? String(offset + 50) : null },
  });
});

productRoutes.post("/", async (c) => {
  const body = await readJson(c.req.raw);
  if (!body) return c.json({ error: { code: "VALIDATION_ERROR", message: "Data barang tidak valid." } }, 400);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const unitLabel = typeof body.unitLabel === "string" ? body.unitLabel.trim() : "";
  const priceRupiah = body.priceRupiah;
  if (!name || name.length > 160 || !unitLabel || unitLabel.length > 30
    || typeof priceRupiah !== "number" || !Number.isSafeInteger(priceRupiah) || priceRupiah < 0) {
    return c.json({
      error: { code: "VALIDATION_ERROR", message: "Isi nama, satuan, dan harga barang dengan benar." },
    }, 400);
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(`INSERT INTO products
    (id, name, category, variant, unit_label, price_rupiah, image_key, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, 1, ?, ?)`)
    .bind(id, name, optionalText(body.category, 100) ?? null, optionalText(body.variant, 120) ?? null,
      unitLabel, priceRupiah, now, now).run();
  const row = await findProduct(c.env.DB, id);
  return c.json({ data: productFromRow(row!) }, 201);
});

productRoutes.get("/:id", async (c) => {
  const row = await findProduct(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: { code: "NOT_FOUND", message: "Barang tidak ditemukan." } }, 404);
  return c.json({ data: productFromRow(row) });
});

productRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  if (!await findProduct(c.env.DB, id)) {
    return c.json({ error: { code: "NOT_FOUND", message: "Barang tidak ditemukan." } }, 404);
  }
  const body = await readJson(c.req.raw);
  if (!body) return c.json({ error: { code: "VALIDATION_ERROR", message: "Data barang tidak valid." } }, 400);

  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 160) return c.json({ error: { code: "VALIDATION_ERROR", message: "Nama barang wajib diisi." } }, 400);
    sets.push("name = ?"); values.push(name);
  }
  for (const [field, column, maximum] of [["category", "category", 100], ["variant", "variant", 120]] as const) {
    if (field in body) {
      const value = optionalText(body[field], maximum);
      if (value === undefined) return c.json({ error: { code: "VALIDATION_ERROR", message: "Teks barang tidak valid." } }, 400);
      sets.push(`${column} = ?`); values.push(value);
    }
  }
  if ("unitLabel" in body) {
    const value = typeof body.unitLabel === "string" ? body.unitLabel.trim() : "";
    if (!value || value.length > 30) return c.json({ error: { code: "VALIDATION_ERROR", message: "Satuan barang wajib diisi." } }, 400);
    sets.push("unit_label = ?"); values.push(value);
  }
  if ("priceRupiah" in body) {
    if (typeof body.priceRupiah !== "number" || !Number.isSafeInteger(body.priceRupiah) || body.priceRupiah < 0) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Harga barang tidak valid." } }, 400);
    }
    sets.push("price_rupiah = ?"); values.push(body.priceRupiah);
  }
  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") return c.json({ error: { code: "VALIDATION_ERROR", message: "Status barang tidak valid." } }, 400);
    sets.push("is_active = ?"); values.push(body.isActive ? 1 : 0);
  }
  if (!sets.length) return c.json({ error: { code: "VALIDATION_ERROR", message: "Tidak ada perubahan untuk disimpan." } }, 400);
  sets.push("updated_at = ?"); values.push(new Date().toISOString(), id);
  await c.env.DB.prepare(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
  return c.json({ data: productFromRow((await findProduct(c.env.DB, id))!) });
});

productRoutes.post("/:id/deactivate", async (c) => {
  const id = c.req.param("id");
  if (!await findProduct(c.env.DB, id)) return c.json({ error: { code: "NOT_FOUND", message: "Barang tidak ditemukan." } }, 404);
  await c.env.DB.prepare("UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), id).run();
  return c.json({ data: productFromRow((await findProduct(c.env.DB, id))!) });
});

productRoutes.post("/:id/image", async (c) => {
  const id = c.req.param("id");
  const product = await findProduct(c.env.DB, id);
  if (!product) return c.json({ error: { code: "NOT_FOUND", message: "Barang tidak ditemukan." } }, 404);
  const contentType = c.req.header("Content-Type")?.split(";", 1)[0].toLowerCase() ?? "";
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const declaredSize = Number(c.req.header("Content-Length") ?? 0);
  if (!extensions[contentType] || declaredSize > MAX_IMAGE_BYTES) {
    return c.json({ error: { code: "INVALID_IMAGE", message: "Gunakan foto JPEG, PNG, atau WebP berukuran maksimal 5 MB." } }, 400);
  }
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || !validImage(bytes, contentType)) {
    return c.json({ error: { code: "INVALID_IMAGE", message: "File foto tidak valid. Pilih foto lain lalu coba lagi." } }, 400);
  }
  const key = `products/${id}/primary-${Date.now()}-${crypto.randomUUID()}.${extensions[contentType]}`;
  await c.env.FILES.put(key, bytes, { httpMetadata: { contentType }, customMetadata: { productId: id } });
  try {
    await c.env.DB.prepare("UPDATE products SET image_key = ?, updated_at = ? WHERE id = ?")
      .bind(key, new Date().toISOString(), id).run();
  } catch (error) {
    await c.env.FILES.delete(key);
    throw error;
  }
  if (product.image_key && product.image_key !== key) {
    try {
      await c.env.FILES.delete(product.image_key);
    } catch {
      console.warn("Old product image could not be removed", id);
    }
  }
  return c.json({ data: productFromRow((await findProduct(c.env.DB, id))!) });
});

productRoutes.get("/:id/image", async (c) => {
  const product = await findProduct(c.env.DB, c.req.param("id"));
  if (!product?.image_key) return c.json({ error: { code: "NOT_FOUND", message: "Foto barang belum tersedia." } }, 404);
  const object = await c.env.FILES.get(product.image_key);
  if (!object) return c.json({ error: { code: "NOT_FOUND", message: "File foto barang tidak ditemukan." } }, 404);
  const headers = new Headers({ "Cache-Control": "private, max-age=3600", ETag: object.httpEtag });
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
});
