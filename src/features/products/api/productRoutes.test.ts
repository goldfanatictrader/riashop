import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "../../../worker";
import { productRoutes } from "./productRoutes";

type Row = Record<string, string | number | null>;

function productDatabase({ failImageUpdate = false } = {}) {
  const rows: Row[] = [];
  const prepare = vi.fn((sql: string) => ({
    bind: (...values: (string | number | null)[]) => ({
      first: async () => {
        const row = rows.find((item) => item.id === values[0]);
        return row ? { ...row } : null;
      },
      all: async () => ({ results: sql.includes("is_active = ?") ? rows.filter((row) => row.is_active === values.at(-1)) : [...rows] }),
      run: async () => {
        if (sql.includes("INSERT INTO products")) {
          const [id, name, category, variant, unit, price, created, updated] = values;
          rows.push({ id, name, category, variant, unit_label: unit, price_rupiah: price, image_key: null, is_active: 1, created_at: created, updated_at: updated });
        } else {
          if (failImageUpdate && sql.includes("image_key = ?")) throw new Error("forced database failure");
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

    const created = await productRoutes.request("https://test/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gelas", unitLabel: "pcs", priceRupiah: 10_000 }),
    }, env);
    const id = (await created.json() as { data: { id: string } }).data.id;
    const mismatched = await productRoutes.request(`https://test/${id}/image`, {
      method: "POST", headers: { "Content-Type": "image/png" },
      body: new Uint8Array([0xff, 0xd8, 0xff]),
    }, env);
    expect(mismatched.status).toBe(400);
    expect(env.FILES.put).not.toHaveBeenCalled();

    const oversized = await productRoutes.request(`https://test/${id}/image`, {
      method: "POST", headers: { "Content-Type": "image/webp", "Content-Length": String(5 * 1024 * 1024 + 1) },
      body: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
    }, env);
    expect(oversized.status).toBe(400);
  });

  it("menghapus gambar lama hanya setelah referensi baru tersimpan", async () => {
    const { database, rows } = productDatabase();
    const put = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn().mockResolvedValue(undefined);
    const env = environment(database, { put, delete: remove });
    const created = await productRoutes.request("https://test/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Piring", unitLabel: "pcs", priceRupiah: 50_000 }),
    }, env);
    const id = (await created.json() as { data: { id: string } }).data.id;
    const webp = () => new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

    await productRoutes.request(`https://test/${id}/image`, {
      method: "POST", headers: { "Content-Type": "image/webp" }, body: webp(),
    }, env);
    const firstKey = put.mock.calls[0][0] as string;
    expect(rows[0].image_key).toBe(firstKey);
    const replaced = await productRoutes.request(`https://test/${id}/image`, {
      method: "POST", headers: { "Content-Type": "image/webp" }, body: webp(),
    }, env);

    expect(replaced.status).toBe(200);
    expect(put).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(firstKey);
  });

  it("membersihkan objek baru bila pembaruan referensi D1 gagal", async () => {
    const { database } = productDatabase({ failImageUpdate: true });
    const put = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn().mockResolvedValue(undefined);
    const env = environment(database, { put, delete: remove });
    const created = await productRoutes.request("https://test/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Piring", unitLabel: "pcs", priceRupiah: 50_000 }),
    }, env);
    const id = (await created.json() as { data: { id: string } }).data.id;
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const response = await productRoutes.request(`https://test/${id}/image`, {
      method: "POST", headers: { "Content-Type": "image/png" }, body: png,
    }, env);

    expect(response.status).toBe(500);
    const newKey = put.mock.calls[0][0] as string;
    expect(remove).toHaveBeenCalledWith(newKey);
  });
});
