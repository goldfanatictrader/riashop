export interface InvoiceProduct {
  id: string;
  name: string;
  category: string | null;
  variant: string | null;
  unitLabel: string;
  priceRupiah: number;
  imageUrl?: string | null;
}

export interface InvoiceCustomer {
  id: string;
  name: string;
  whatsappNumber: string | null;
  address?: string | null;
}

export interface InvoiceItemSnapshot {
  id: string;
  productId: string | null;
  productName: string;
  variant: string | null;
  unitLabel: string;
  unitPriceRupiah: number;
  quantity: number;
  lineTotalRupiah: number;
}

export interface FinalizedInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: {
    id: string | null;
    name: string;
    whatsapp: string | null;
  };
  items: InvoiceItemSnapshot[];
  subtotalRupiah: number;
  discountRupiah: number;
  shippingRupiah: number;
  grandTotalRupiah: number;
  amountInWords: string;
  status: "finalized" | "cancelled";
  pdfR2Key: string | null;
  createdAt: string;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  grandTotalRupiah: number;
  status: "finalized" | "cancelled";
}

export { formatRupiah } from "../../shared/currency";

const SMALL_NUMBERS = [
  "Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan",
  "Sepuluh", "Sebelas",
] as const;

function spellBelowQuadrillion(value: number): string {
  if (value < 12) return SMALL_NUMBERS[value];
  if (value < 20) return `${spellBelowQuadrillion(value - 10)} Belas`;
  if (value < 100) {
    const remainder = value % 10;
    return `${spellBelowQuadrillion(Math.floor(value / 10))} Puluh${remainder ? ` ${spellBelowQuadrillion(remainder)}` : ""}`;
  }
  if (value < 200) return `Seratus${value > 100 ? ` ${spellBelowQuadrillion(value - 100)}` : ""}`;
  if (value < 1_000) {
    const remainder = value % 100;
    return `${spellBelowQuadrillion(Math.floor(value / 100))} Ratus${remainder ? ` ${spellBelowQuadrillion(remainder)}` : ""}`;
  }
  if (value < 2_000) return `Seribu${value > 1_000 ? ` ${spellBelowQuadrillion(value - 1_000)}` : ""}`;
  if (value < 1_000_000) {
    const remainder = value % 1_000;
    return `${spellBelowQuadrillion(Math.floor(value / 1_000))} Ribu${remainder ? ` ${spellBelowQuadrillion(remainder)}` : ""}`;
  }
  if (value < 1_000_000_000) {
    const remainder = value % 1_000_000;
    return `${spellBelowQuadrillion(Math.floor(value / 1_000_000))} Juta${remainder ? ` ${spellBelowQuadrillion(remainder)}` : ""}`;
  }
  if (value < 1_000_000_000_000) {
    const remainder = value % 1_000_000_000;
    return `${spellBelowQuadrillion(Math.floor(value / 1_000_000_000))} Miliar${remainder ? ` ${spellBelowQuadrillion(remainder)}` : ""}`;
  }
  const remainder = value % 1_000_000_000_000;
  return `${spellBelowQuadrillion(Math.floor(value / 1_000_000_000_000))} Triliun${remainder ? ` ${spellBelowQuadrillion(remainder)}` : ""}`;
}

export function amountInWords(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Nilai rupiah harus berupa bilangan bulat positif");
  return `${spellBelowQuadrillion(value)} Rupiah`;
}

export function calculateTotals(
  lines: Array<{ unitPriceRupiah: number; quantity: number }>,
  discountRupiah = 0,
  shippingRupiah = 0,
) {
  const lineTotals = lines.map(({ unitPriceRupiah, quantity }) => unitPriceRupiah * quantity);
  if (lineTotals.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error("Total barang harus berupa rupiah bulat");
  }
  const subtotalRupiah = lineTotals.reduce((total, value) => total + value, 0);
  const grandTotalRupiah = Math.max(0, subtotalRupiah - discountRupiah + shippingRupiah);
  if (![subtotalRupiah, discountRupiah, shippingRupiah, grandTotalRupiah].every(Number.isSafeInteger)) {
    throw new Error("Total nota terlalu besar");
  }
  return { lineTotals, subtotalRupiah, grandTotalRupiah };
}

export function formatInvoiceNumber(yearMonth: string, sequence: number): string {
  if (!/^\d{6}$/u.test(yearMonth) || !Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error("Urutan nota tidak valid");
  }
  return `RNS-${yearMonth}-${String(sequence).padStart(4, "0")}`;
}
