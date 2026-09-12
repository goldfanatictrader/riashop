import type { Customer, CustomerInput } from "./types";
import type { Page } from "../../shared/pagination";

interface ApiEnvelope<T> { data: T; meta?: { nextCursor?: string | null } }
interface ErrorEnvelope { error?: { message?: string } }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ErrorEnvelope;
    throw new Error(body.error?.message ?? "Data customer belum dapat diproses. Coba lagi.");
  }
  return ((await response.json()) as ApiEnvelope<T>).data;
}

export async function listCustomers(options: { search?: string; active?: boolean; cursor?: string } = {}): Promise<Page<Customer>> {
  const query = new URLSearchParams();
  if (options.search) query.set("search", options.search);
  if (options.active !== undefined) query.set("active", options.active ? "1" : "0");
  if (options.cursor) query.set("cursor", options.cursor);
  const response = await fetch(`/api/v1/customers${query.size ? `?${query}` : ""}`, { credentials: "include" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ErrorEnvelope;
    throw new Error(body.error?.message ?? "Data customer belum dapat diproses. Coba lagi.");
  }
  const body = await response.json() as ApiEnvelope<Customer[]>;
  return { items: body.data, nextCursor: body.meta?.nextCursor ?? null };
}

export function createCustomer(input: CustomerInput): Promise<Customer> {
  return api<Customer>("/api/v1/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
}

export function updateCustomer(id: string, input: Partial<CustomerInput> & { isActive?: boolean }): Promise<Customer> {
  return api<Customer>(`/api/v1/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
}

export function deactivateCustomer(id: string): Promise<Customer> {
  return api<Customer>(`/api/v1/customers/${id}/deactivate`, { method: "POST" });
}
