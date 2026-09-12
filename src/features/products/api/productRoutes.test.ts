import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "../../../worker";
import { productRoutes } from "./productRoutes";

type Row = Record<string, string | number | null>;

function productDatabase() {
  const rows: Row[] = [];
  const prepare = vi.fn((sql: string) => ({
    bind: (...values: (string | number | null)[]) => ({
      first: async () => rows.find((row) => row.id === values[0]) ?? null,
      all: async () => ({ results: sql.includes("is_active = ?") ? rows.filter((row) => row.is_active === values.at(-1)) : [...rows] }),
      run: async () => {
        if (sql.includes("INSERT INTO products")) {
          const [id, name, category, variant, unit, price, created, updated] = values;
          rows.push({ id, name, category, variant, unit_label: unit, price_rupiah: price, image_key: null, is_active: 1, created_at: created, updated_at: updated });
        } else {
          const row = rows.find((item) => item.id === values.at(-1));
          if (row && sql.includes("is_active = 0")) { row.is_active = 0; row.updated_at = values[0]; }
          if (row && sql.includes("image_key = ?")) { row.image_key = values[0]; row.updated_at = values[1]; }
          if (row && sql.includes("name = ?")) { row.name = values[0]; row.price_rupiah = values[1]; row.updated_at = values[2]; }
        }
        return { success: true };
      },
    }),
  }));
  return { database: { prepare } as unknown as D1Database, rows };
}

function environment(database: D1Database, files: Partial<R2Bucket> = {}): Bindings {
  return {
    DB: database,
    FILES: files as R2Bucket,
    ASSETS: {} as Fetcher,
    OPERATOR_PASSCODE: "2468",
    SESSION_SECRET: "rahasia-sesi-pengujian-minimal-32-karakter",
  };
}

describe("productRoutes", () => {
  it("membuat, mengubah, mencari, dan menonaktifkan barang", async () => {
    const { database } = productDatabase();
    const env = environment(database);
    const created = await productRoutes.request("https://test/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Mug Bunga", category: "Mug", variant: "Besar", unitLabel: "pcs", priceRupiah: 90000 }),
    }, env);
    expect(created.status).toBe(201);
    const product = (await created.json() as { data: { id: string; isActive: boolean } }).data;
    expect(product.isActive).toBe(true);

    const updated = await productRoutes.request(`https://test/${product.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Mug Mawar", priceRupiah: 95000 }),
    }, env);
    expect(updated.status).toBe(200);
    await expect(updated.json()).resolves.toMatchObject({ data: { name: "Mug Mawar", priceRupiah: 95000 } });

    const deactivated = await productRoutes.request(`https://test/${product.id}/deactivate`, { method: "POST" }, env);
    expect(deactivated.status).toBe(200);
    await expect(deactivated.json()).resolves.toMatchObject({ data: { isActive: false } });
    const pickerList = await productRoutes.request("https://test/?active=1", undefined, env);
    await expect(pickerList.json()).resolves.toMatchObject({ data: [] });
  });

  it("menyimpan gambar tervalidasi dengan key buatan server", async () => {
    const { database } = productDatabase();
    const put = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn().mockResolvedValue(undefined);
    const env = environment(database, { put, delete: remove });
    const created = await productRoutes.request("https://test/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Piring", unitLabel: "pcs", priceRupiah: 50000 }),
    }, env);
    const id = (await created.json() as { data: { id: string } }).data.id;
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const response = await productRoutes.request(`https://test/${id}/image`, {
      method: "POST", headers: { "Content-Type": "image/png" }, body: pngHeader,
    }, env);
    expect(response.status).toBe(200);
    expect(put).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^products/${id}/primary-.*\\.png$`, "u")), expect.any(Uint8Array), expect.any(Object));
    await expect(response.json()).resolves.toMatchObject({ data: { imageKey: expect.stringContaining(`products/${id}/`) } });
  });

  it("menolak harga dan file gambar yang tidak valid", async () => {
    const { database } = productDatabase();
    const env = environment(database, { put: vi.fn() });
    const invalid = await productRoutes.request("https://test/", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Gelas", unitLabel: "pcs", priceRupiah: -1 }),
    }, env);
    expect(invalid.status).toBe(400);
  });
});
