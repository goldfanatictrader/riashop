import { Hono } from "hono";
import type { Bindings } from "../../../worker";
import type { Customer } from "../types";
import { parseOffsetCursor } from "../../../shared/pagination";

interface CustomerRow {
  id: string;
  name: string;
  whatsapp_number: string | null;
  address: string | null;
  note: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const CUSTOMER_COLUMNS = "id, name, whatsapp_number, address, note, is_active, created_at, updated_at";

export function normalizeWhatsapp(value: string): string | null {
  const digits = value.replace(/\D/gu, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function customerFromRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    whatsappNumber: row.whatsapp_number,
    address: row.address,
    note: row.note,
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

async function findCustomer(database: D1Database, id: string): Promise<CustomerRow | null> {
  return database.prepare(`SELECT ${CUSTOMER_COLUMNS} FROM customers WHERE id = ?`)
    .bind(id).first<CustomerRow>();
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

function validatePhone(value: unknown): string | null | "invalid" | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const normalized = normalizeWhatsapp(value);
  return normalized && normalized.length >= 9 && normalized.length <= 15 ? normalized : "invalid";
}

export const customerRoutes = new Hono<{ Bindings: Bindings }>();

customerRoutes.get("/", async (c) => {
  const search = c.req.query("search")?.trim().slice(0, 100) ?? "";
  const active = parseActive(c.req.query("active"));
  if (active === "invalid") return c.json({ error: { code: "VALIDATION_ERROR", message: "Filter status customer tidak valid." } }, 400);
  const offset = parseOffsetCursor(c.req.query("cursor"));
  if (offset === null) return c.json({ error: { code: "VALIDATION_ERROR", message: "Halaman customer tidak valid." } }, 400);
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    conditions.push("(name LIKE ? ESCAPE '\\' OR whatsapp_number LIKE ? ESCAPE '\\')");
    values.push(pattern, pattern);
  }
  if (active !== null) { conditions.push("is_active = ?"); values.push(active); }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const result = await c.env.DB.prepare(
    `SELECT ${CUSTOMER_COLUMNS} FROM customers${where}
      ORDER BY is_active DESC, name COLLATE NOCASE ASC, id ASC LIMIT 51 OFFSET ?`,
  ).bind(...values, offset).all<CustomerRow>();
  const hasMore = result.results.length > 50;
  return c.json({
    data: result.results.slice(0, 50).map(customerFromRow),
    meta: { nextCursor: hasMore ? String(offset + 50) : null },
  });
});

customerRoutes.post("/", async (c) => {
  const body = await readJson(c.req.raw);
  if (!body) return c.json({ error: { code: "VALIDATION_ERROR", message: "Data customer tidak valid." } }, 400);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = validatePhone(body.whatsappNumber);
  if (!name || name.length > 160 || phone === "invalid") {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Isi nama dan nomor WhatsApp customer dengan benar." } }, 400);
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(`INSERT INTO customers
    (id, name, whatsapp_number, address, note, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)`)
    .bind(id, name, phone ?? null, optionalText(body.address, 500) ?? null, optionalText(body.note, 500) ?? null, now, now).run();
  return c.json({ data: customerFromRow((await findCustomer(c.env.DB, id))!) }, 201);
});

customerRoutes.get("/:id", async (c) => {
  const row = await findCustomer(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: { code: "NOT_FOUND", message: "Customer tidak ditemukan." } }, 404);
  return c.json({ data: customerFromRow(row) });
});

customerRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  if (!await findCustomer(c.env.DB, id)) return c.json({ error: { code: "NOT_FOUND", message: "Customer tidak ditemukan." } }, 404);
  const body = await readJson(c.req.raw);
  if (!body) return c.json({ error: { code: "VALIDATION_ERROR", message: "Data customer tidak valid." } }, 400);
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 160) return c.json({ error: { code: "VALIDATION_ERROR", message: "Nama customer wajib diisi." } }, 400);
    sets.push("name = ?"); values.push(name);
  }
  if ("whatsappNumber" in body) {
    const phone = validatePhone(body.whatsappNumber);
    if (phone === undefined || phone === "invalid") return c.json({ error: { code: "VALIDATION_ERROR", message: "Nomor WhatsApp tidak valid." } }, 400);
    sets.push("whatsapp_number = ?"); values.push(phone);
  }
  for (const [field, column] of [["address", "address"], ["note", "note"]] as const) {
    if (field in body) {
      const value = optionalText(body[field], 500);
      if (value === undefined) return c.json({ error: { code: "VALIDATION_ERROR", message: "Teks customer tidak valid." } }, 400);
      sets.push(`${column} = ?`); values.push(value);
    }
  }
  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") return c.json({ error: { code: "VALIDATION_ERROR", message: "Status customer tidak valid." } }, 400);
    sets.push("is_active = ?"); values.push(body.isActive ? 1 : 0);
  }
  if (!sets.length) return c.json({ error: { code: "VALIDATION_ERROR", message: "Tidak ada perubahan untuk disimpan." } }, 400);
  sets.push("updated_at = ?"); values.push(new Date().toISOString(), id);
  await c.env.DB.prepare(`UPDATE customers SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
  return c.json({ data: customerFromRow((await findCustomer(c.env.DB, id))!) });
});

customerRoutes.post("/:id/deactivate", async (c) => {
  const id = c.req.param("id");
  if (!await findCustomer(c.env.DB, id)) return c.json({ error: { code: "NOT_FOUND", message: "Customer tidak ditemukan." } }, 404);
  await c.env.DB.prepare("UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), id).run();
  return c.json({ data: customerFromRow((await findCustomer(c.env.DB, id))!) });
});
