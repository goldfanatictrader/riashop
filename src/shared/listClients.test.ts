import { afterEach, describe, expect, it, vi } from "vitest";
import { listCustomers } from "../features/customers/customerApi";
import { listProducts } from "../features/products/productApi";

afterEach(() => vi.unstubAllGlobals());

describe("paginated list clients", () => {
  it("meneruskan cursor customer dan metadata halaman", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "c-51" }], meta: { nextCursor: null } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(listCustomers({ search: "Ria", active: true, cursor: "50" })).resolves.toMatchObject({ items: [{ id: "c-51" }], nextCursor: null });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/customers?search=Ria&active=1&cursor=50", { credentials: "include" });
  });

  it("meneruskan cursor barang dan metadata halaman", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "p-51" }], meta: { nextCursor: "100" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(listProducts({ search: "Piring", cursor: "50" })).resolves.toMatchObject({ items: [{ id: "p-51" }], nextCursor: "100" });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/products?search=Piring&cursor=50", { credentials: "include" });
  });
});
