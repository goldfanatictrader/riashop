import { afterEach, describe, expect, it, vi } from "vitest";
import { listInvoices } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("invoice list client", () => {
  it("meneruskan search dan cursor serta mempertahankan metadata halaman", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: "invoice-31", invoiceNumber: "RNS-202609-0031" }],
      meta: { nextCursor: "60" },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listInvoices({ search: "Ibu Ria", cursor: "30" })).resolves.toMatchObject({
      items: [{ id: "invoice-31" }], nextCursor: "60",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/invoices?search=Ibu+Ria&cursor=30",
      { credentials: "include" },
    );
  });
});
