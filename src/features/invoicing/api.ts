import type { FinalizedInvoice, InvoiceCustomer, InvoiceListItem, InvoiceProduct } from "./domain";
import type { Page } from "../../shared/pagination";

interface ErrorBody { error?: { message?: string } }
interface ListBody { data?: unknown[]; meta?: { nextCursor?: string | null } }

async function messageFrom(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({})) as ErrorBody;
  return body.error?.message ?? fallback;
}

async function jsonRequest<T>(url: string, init?: RequestInit, fallback = "Data belum dapat dimuat."): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  if (!response.ok) throw new Error(await messageFrom(response, fallback));
  return (await response.json() as { data: T }).data;
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

export async function listCustomers(search = ""): Promise<InvoiceCustomer[]> {
  const response = await fetch(`/api/v1/customers?active=1&search=${encodeURIComponent(search)}`, { credentials: "include" });
  if (!response.ok) throw new Error(await messageFrom(response, "Customer belum dapat dimuat."));
  const body = await response.json() as ListBody;
  return (body.data ?? []).map((raw) => {
    const row = object(raw);
    return {
      id: String(row.id ?? ""), name: String(row.name ?? ""),
      whatsappNumber: stringOrNull(row.whatsappNumber ?? row.whatsapp_number),
      address: stringOrNull(row.address),
    };
  });
}

export async function createCustomer(input: { name: string; whatsappNumber: string }): Promise<InvoiceCustomer> {
  const raw = await jsonRequest<unknown>("/api/v1/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }, "Customer belum dapat disimpan.");
  const row = object(raw);
  return {
    id: String(row.id ?? ""), name: String(row.name ?? input.name),
    whatsappNumber: stringOrNull(row.whatsappNumber ?? row.whatsapp_number ?? input.whatsappNumber),
    address: stringOrNull(row.address),
  };
}

export async function listProducts(search = ""): Promise<InvoiceProduct[]> {
  const response = await fetch(`/api/v1/products?active=1&search=${encodeURIComponent(search)}`, { credentials: "include" });
  if (!response.ok) throw new Error(await messageFrom(response, "Barang belum dapat dimuat."));
  const body = await response.json() as ListBody;
  return (body.data ?? []).map((raw) => {
    const row = object(raw);
    return {
      id: String(row.id ?? ""), name: String(row.name ?? ""), category: stringOrNull(row.category),
      variant: stringOrNull(row.variant), unitLabel: String(row.unitLabel ?? row.unit_label ?? "pcs"),
      priceRupiah: Number(row.priceRupiah ?? row.price_rupiah ?? 0),
      imageUrl: stringOrNull(row.imageUrl ?? row.image_url),
    };
  });
}

export function finalizeInvoice(input: {
  customerId: string; invoiceDate: string; discountRupiah: number; shippingRupiah: number;
  items: Array<{ productId: string; quantity: number }>;
}) {
  return jsonRequest<FinalizedInvoice>("/api/v1/invoices/finalize", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  }, "Koneksi terputus. Nota belum tersimpan.");
}

export async function listInvoices(options: { search?: string; cursor?: string } = {}): Promise<Page<InvoiceListItem>> {
  const query = new URLSearchParams();
  if (options.search) query.set("search", options.search);
  if (options.cursor) query.set("cursor", options.cursor);
  const response = await fetch(`/api/v1/invoices${query.size ? `?${query}` : ""}`, { credentials: "include" });
  if (!response.ok) throw new Error(await messageFrom(response, "Riwayat nota belum dapat dimuat."));
  const body = await response.json() as { data: InvoiceListItem[]; meta?: { nextCursor?: string | null } };
  return { items: body.data, nextCursor: body.meta?.nextCursor ?? null };
}

export function getInvoice(id: string) {
  return jsonRequest<FinalizedInvoice>(`/api/v1/invoices/${encodeURIComponent(id)}`, undefined, "Nota belum dapat dimuat.");
}

export function cancelInvoice(id: string) {
  return jsonRequest<FinalizedInvoice>(`/api/v1/invoices/${encodeURIComponent(id)}/cancel`, { method: "POST" }, "Nota belum dapat dibatalkan.");
}

export async function archivePdf(id: string, bytes: Uint8Array): Promise<void> {
  const response = await fetch(`/api/v1/invoices/${encodeURIComponent(id)}/pdf`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/pdf" }, body: bytes as BodyInit,
  });
  if (!response.ok) throw new Error(await messageFrom(response, "Arsip online belum tersimpan."));
}
