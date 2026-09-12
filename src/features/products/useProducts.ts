import { useCallback, useEffect, useState } from "react";
import { listProducts } from "./productApi";
import type { Product } from "./types";

export function useProducts(options: { search?: string; active?: boolean } = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const search = options.search ?? "";
  const active = options.active;

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProducts(await listProducts({ search, active }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Daftar barang belum dapat dibuka.");
    } finally {
      setLoading(false);
    }
  }, [active, search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void reload(); }, 250);
    return () => window.clearTimeout(timeout);
  }, [reload]);

  return { products, loading, error, reload };
}
