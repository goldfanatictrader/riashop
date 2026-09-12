import { useCallback, useEffect, useRef, useState } from "react";
import { listProducts } from "./productApi";
import type { Product } from "./types";
import { mergePageById } from "../../shared/pagination";

export function useProducts(options: { search?: string; active?: boolean } = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const search = options.search ?? "";
  const active = options.active;

  const reload = useCallback(async () => {
    const request = ++requestSequence.current;
    setLoading(true);
    setError("");
    try {
      const page = await listProducts({ search, active });
      if (request === requestSequence.current) { setProducts(page.items); setNextCursor(page.nextCursor); }
    } catch (reason) {
      if (request === requestSequence.current) setError(reason instanceof Error ? reason.message : "Daftar barang belum dapat dibuka.");
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  }, [active, search]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const request = ++requestSequence.current;
    setLoadingMore(true); setError("");
    try {
      const page = await listProducts({ search, active, cursor: nextCursor });
      if (request === requestSequence.current) {
        setProducts((current) => mergePageById(current, page.items));
        setNextCursor(page.nextCursor);
      }
    } catch (reason) {
      if (request === requestSequence.current) setError(reason instanceof Error ? reason.message : "Barang berikutnya belum dapat dimuat.");
    } finally { if (request === requestSequence.current) setLoadingMore(false); }
  }, [active, loadingMore, nextCursor, search]);

  useEffect(() => {
    requestSequence.current += 1;
    const timeout = window.setTimeout(() => {
      setProducts([]); setLoadingMore(false); setNextCursor(null);
      void reload();
    }, 250);
    return () => { window.clearTimeout(timeout); requestSequence.current += 1; };
  }, [reload]);

  return { products, loading, loadingMore, error, nextCursor, reload, loadMore };
}
