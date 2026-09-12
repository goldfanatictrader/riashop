import { describe, expect, it } from "vitest";
import { amountInWords, calculateTotals, formatInvoiceNumber, formatRupiah } from "./domain";

describe("domain nota", () => {
  it("menghitung nota referensi secara tepat", () => {
    expect(calculateTotals([
      { unitPriceRupiah: 90_000, quantity: 6 },
      { unitPriceRupiah: 90_000, quantity: 6 },
    ])).toEqual({ lineTotals: [540_000, 540_000], subtotalRupiah: 1_080_000, grandTotalRupiah: 1_080_000 });
    expect(formatRupiah(1_080_000)).toBe("Rp1.080.000");
  });

  it("menerapkan diskon, ongkir, dan batas nol", () => {
    expect(calculateTotals([{ unitPriceRupiah: 10_000, quantity: 2 }], 30_000, 5_000).grandTotalRupiah).toBe(0);
  });

  it.each([
    [0, "Nol Rupiah"],
    [11, "Sebelas Rupiah"],
    [12, "Dua Belas Rupiah"],
    [15, "Lima Belas Rupiah"],
    [21, "Dua Puluh Satu Rupiah"],
    [100, "Seratus Rupiah"],
    [111, "Seratus Sebelas Rupiah"],
    [1_000, "Seribu Rupiah"],
    [2_001, "Dua Ribu Satu Rupiah"],
    [1_080_000, "Satu Juta Delapan Puluh Ribu Rupiah"],
    [2_345_678, "Dua Juta Tiga Ratus Empat Puluh Lima Ribu Enam Ratus Tujuh Puluh Delapan Rupiah"],
    [1_000_000_000, "Satu Miliar Rupiah"],
    [1_000_000_000_000, "Satu Triliun Rupiah"],
  ])("menulis %i dalam bahasa Indonesia", (value, expected) => {
    expect(amountInWords(value)).toBe(expected);
  });

  it("memformat nomor nota", () => {
    expect(formatInvoiceNumber("202609", 12)).toBe("RNS-202609-0012");
  });
});
