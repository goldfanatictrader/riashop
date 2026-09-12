import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoiceRoutes } from "./server";
import type { Bindings } from "../../worker";

class TestStatement {
  private values: SQLInputValue[] = [];
  constructor(private readonly database: DatabaseSync, private readonly sql: string) {}
  bind(...values: unknown[]) { this.values = values as SQLInputValue[]; return this; }
  async first<T>() { return (this.database.prepare(this.sql).get(...this.values) ?? null) as T | null; }
  async all<T>() { return { results: this.database.prepare(this.sql).all(...this.values) as T[], success: true, meta: {} }; }
  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, results: [], meta: { changes: Number(result.changes) } };
  }
  execute() { return this.database.prepare(this.sql).run(...this.values); }
}

function d1(database: DatabaseSync): D1Database {
  return {
    prepare: (sql: string) => new TestStatement(database, sql),
    batch: async (statements: D1PreparedStatement[]) => {
      database.exec("BEGIN IMMEDIATE");
      try {
        const results = statements.map((statement) => {
          const result = (statement as unknown as TestStatement).execute();
          return { success: true, results: [], meta: { changes: Number(result.changes) } };
        });
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
}

describe("integrasi finalisasi nota", () => {
  let database: DatabaseSync;
  let env: Bindings;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    database.exec(readFileSync("database/schema.sql", "utf8"));
    const now = "2026-09-12T00:00:00.000Z";
    database.prepare(`INSERT INTO customers (id, name, whatsapp_number, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)`).run("customer-1", "Ibu Hilda Kusuma Dewi", "628123456789", now, now);
    const addProduct = database.prepare(`INSERT INTO products
      (id, name, variant, unit_label, price_rupiah, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 'lusin', 90000, 1, ?, ?)`);
    addProduct.run("product-1", "Mangkok Jago Printing Batik", "15 cm", now, now);
    addProduct.run("product-2", "Piring Batik Printing", "20 cm", now, now);
    env = {
      DB: d1(database),
      FILES: { put: vi.fn(), get: vi.fn() } as unknown as R2Bucket,
      ASSETS: { fetch: vi.fn() } as unknown as Fetcher,
      OPERATOR_PASSCODE: "2468",
      SESSION_SECRET: "unused-in-direct-route-test",
    };
  });

  async function finalize() {
    return invoiceRoutes.request("https://ria.test/api/v1/invoices/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://ria.test" },
      body: JSON.stringify({
        customerId: "customer-1", invoiceDate: "2026-09-12", discountRupiah: 0, shippingRupiah: 0,
        items: [{ productId: "product-1", quantity: 6 }, { productId: "product-2", quantity: 6 }],
      }),
    }, env);
  }

  it("menghitung referensi, menyimpan snapshot, dan mengalokasikan nomor", async () => {
    const response = await finalize();
    expect(response.status).toBe(201);
    const body = await response.json() as { data: { id: string; invoiceNumber: string; grandTotalRupiah: number; amountInWords: string; items: Array<{ unitPriceRupiah: number }> } };
    expect(body.data).toMatchObject({
      invoiceNumber: "RNS-202609-0001",
      grandTotalRupiah: 1_080_000,
      amountInWords: "Satu Juta Delapan Puluh Ribu Rupiah",
    });

    database.prepare("UPDATE products SET name = 'Nama Baru', price_rupiah = 100000 WHERE id = 'product-1'").run();
    database.prepare("UPDATE customers SET name = 'Customer Baru' WHERE id = 'customer-1'").run();
    const detail = await invoiceRoutes.request(`https://ria.test/api/v1/invoices/${body.data.id}`, undefined, env);
    const detailBody = await detail.json() as { data: { customer: { name: string }; items: Array<{ productName: string; unitPriceRupiah: number }> } };
    expect(detailBody.data.customer.name).toBe("Ibu Hilda Kusuma Dewi");
    expect(detailBody.data.items[0]).toMatchObject({ productName: "Mangkok Jago Printing Batik", unitPriceRupiah: 90_000 });
  });

  it("memberi nomor unik untuk finalisasi berurutan dan mempertahankan pembatalan", async () => {
    const first = await finalize();
    const second = await finalize();
    const firstData = (await first.json() as { data: { id: string; invoiceNumber: string } }).data;
    const secondData = (await second.json() as { data: { invoiceNumber: string } }).data;
    expect([firstData.invoiceNumber, secondData.invoiceNumber]).toEqual(["RNS-202609-0001", "RNS-202609-0002"]);

    const cancelled = await invoiceRoutes.request(`https://ria.test/api/v1/invoices/${firstData.id}/cancel`, {
      method: "POST", headers: { Origin: "https://ria.test" },
    }, env);
    expect(cancelled.status).toBe(200);
    await expect(cancelled.json()).resolves.toMatchObject({ data: { status: "cancelled" } });
    expect(database.prepare("SELECT COUNT(*) AS count FROM invoices").get()).toEqual({ count: 2 });
  });
});
