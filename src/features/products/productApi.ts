import type { Product, ProductInput } from "./types";

interface ApiEnvelope<T> { data: T }
interface ErrorEnvelope { error?: { message?: string } }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ErrorEnvelope;
    throw new Error(body.error?.message ?? "Data barang belum dapat diproses. Coba lagi.");
  }
  return ((await response.json()) as ApiEnvelope<T>).data;
}

export function listProducts(options: { search?: string; active?: boolean } = {}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (options.search) query.set("search", options.search);
  if (options.active !== undefined) query.set("active", options.active ? "1" : "0");
  const suffix = query.size ? `?${query}` : "";
  return api<Product[]>(`/api/v1/products${suffix}`);
}

export function createProduct(input: ProductInput): Promise<Product> {
  return api<Product>("/api/v1/products", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
}

export function updateProduct(id: string, input: Partial<ProductInput> & { isActive?: boolean }): Promise<Product> {
  return api<Product>(`/api/v1/products/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
}

export function deactivateProduct(id: string): Promise<Product> {
  return api<Product>(`/api/v1/products/${id}/deactivate`, { method: "POST" });
}

export function uploadProductImage(id: string, file: File): Promise<Product> {
  return api<Product>(`/api/v1/products/${id}/image`, {
    method: "POST", headers: { "Content-Type": file.type }, body: file,
  });
}

export function productImageUrl(product: Product): string | null {
  return product.imageKey ? `/api/v1/products/${product.id}/image?v=${encodeURIComponent(product.updatedAt)}` : null;
}
