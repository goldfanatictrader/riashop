import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { FinalizedInvoice } from "./domain";
import { generateInvoicePdf, invoicePdfFilename } from "./pdf";

function invoice(itemCount = 2): FinalizedInvoice {
  return {
    id: "invoice-1", invoiceNumber: "RNS-202609-0012", invoiceDate: "2026-09-12",
    customer: { id: "customer-1", name: "Ibu Hilda Kusuma Dewi", whatsapp: "628123456789" },
    items: Array.from({ length: itemCount }, (_, index) => ({
      id: `item-${index}`, productId: `product-${index}`,
      productName: `Mangkok Jago Printing Batik dengan nama barang panjang ${index + 1}`,
      variant: "15 cm", unitLabel: "lusin", unitPriceRupiah: 90_000, quantity: 6, lineTotalRupiah: 540_000,
    })),
    subtotalRupiah: itemCount * 540_000, discountRupiah: 0, shippingRupiah: 0,
    grandTotalRupiah: itemCount * 540_000,
    amountInWords: "Satu Juta Delapan Puluh Ribu Rupiah", status: "finalized", pdfR2Key: null,
    createdAt: "2026-09-12T08:30:00.000Z",
  };
}

describe("PDF nota", () => {
  it("menghasilkan berkas deterministik dan ringan", async () => {
    const first = await generateInvoicePdf(invoice());
    const second = await generateInvoicePdf(invoice());
    expect(first.slice(0, 4)).toEqual(new TextEncoder().encode("%PDF"));
    expect(first).toEqual(second);
    expect(first.byteLength).toBeLessThan(500_000);
    expect(invoicePdfFilename("RNS-202609-0012")).toBe("RiaNoelShop_RNS-202609-0012.pdf");
  });

  it("memecah daftar panjang ke beberapa halaman", async () => {
    const loaded = await PDFDocument.load(await generateInvoicePdf(invoice(60)));
    expect(loaded.getPageCount()).toBeGreaterThan(1);
  });
});
