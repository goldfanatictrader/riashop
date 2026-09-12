import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "../../../worker";
import { customerRoutes, normalizeWhatsapp } from "./customerRoutes";

type Row = Record<string, string | number | null>;

function customerDatabase() {
  const rows: Row[] = [];
  const prepare = vi.fn((sql: string) => ({ bind: (...values: (string | number | null)[]) => ({
    first: async () => rows.find((row) => row.id === values[0]) ?? null,
    all: async () => ({ results: sql.includes("is_active = ?") ? rows.filter((row) => row.is_active === values.at(-1)) : [...rows] }),
    run: async () => {
      if (sql.includes("INSERT INTO customers")) {
        const [id, name, phone, address, note, created, updated] = values;
        rows.push({ id, name, whatsapp_number: phone, address, note, is_active: 1, created_at: created, updated_at: updated });
      } else {
        const row = rows.find((item) => item.id === values.at(-1));
        if (row && sql.includes("is_active = 0")) { row.is_active = 0; row.updated_at = values[0]; }
        if (row && sql.includes("name = ?")) { row.name = values[0]; row.whatsapp_number = values[1]; row.updated_at = values[2]; }
      }
      return { success: true };
    },
  }) }));
  return { database: { prepare } as unknown as D1Database };
}

function environment(database: D1Database): Bindings {
  return { DB: database, FILES: {} as R2Bucket, ASSETS: {} as Fetcher, OPERATOR_PASSCODE: "2468", SESSION_SECRET: "rahasia-sesi-pengujian-minimal-32-karakter" };
}

describe("customerRoutes", () => {
  it.each([["0812 3456-7890", "6281234567890"], ["81234567890", "6281234567890"], ["+62 812 345 678", "62812345678"], ["", null]])("menormalisasi WhatsApp %s", (input, expected) => {
    expect(normalizeWhatsapp(input)).toBe(expected);
  });

  it("membuat customer, mengubahnya, lalu mengeluarkannya dari picker aktif", async () => {
    const { database } = customerDatabase();
    const env = environment(database);
    const created = await customerRoutes.request("https://test/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ibu Hilda", whatsappNumber: "0812 3456 7890", address: "Bandung" }),
    }, env);
    expect(created.status).toBe(201);
    const customer = (await created.json() as { data: { id: string } }).data;
    await expect(Promise.resolve(customer)).resolves.toMatchObject({ id: expect.any(String) });
    const detail = await customerRoutes.request(`https://test/${customer.id}`, undefined, env);
    await expect(detail.json()).resolves.toMatchObject({ data: { whatsappNumber: "6281234567890" } });

    const updated = await customerRoutes.request(`https://test/${customer.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Ibu Hilda K", whatsappNumber: "08111111111" }),
    }, env);
    expect(updated.status).toBe(200);
    await expect(updated.json()).resolves.toMatchObject({ data: { name: "Ibu Hilda K", whatsappNumber: "628111111111" } });

    await customerRoutes.request(`https://test/${customer.id}/deactivate`, { method: "POST" }, env);
    const pickerList = await customerRoutes.request("https://test/?active=1", undefined, env);
    await expect(pickerList.json()).resolves.toMatchObject({ data: [] });
  });

  it("menolak nomor WhatsApp yang terlalu pendek", async () => {
    const { database } = customerDatabase();
    const response = await customerRoutes.request("https://test/", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Ibu Ria", whatsappNumber: "123" }),
    }, environment(database));
    expect(response.status).toBe(400);
  });
});
