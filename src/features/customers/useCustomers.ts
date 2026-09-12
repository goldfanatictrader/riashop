import { useCallback, useEffect, useRef, useState } from "react";
import { listCustomers } from "./customerApi";
import type { Customer } from "./types";
import { mergePageById } from "../../shared/pagination";

export function useCustomers(options: { search?: string; active?: boolean } = {}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const search = options.search ?? "";
  const active = options.active;
  const reload = useCallback(async () => {
    const request = ++requestSequence.current;
    setLoading(true); setError("");
    try {
      const page = await listCustomers({ search, active });
      if (request === requestSequence.current) { setCustomers(page.items); setNextCursor(page.nextCursor); }
    } catch (reason) {
      if (request === requestSequence.current) setError(reason instanceof Error ? reason.message : "Daftar customer belum dapat dibuka.");
    } finally { if (request === requestSequence.current) setLoading(false); }
  }, [active, search]);
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const request = ++requestSequence.current;
    setLoadingMore(true); setError("");
    try {
      const page = await listCustomers({ search, active, cursor: nextCursor });
      if (request === requestSequence.current) {
        setCustomers((current) => mergePageById(current, page.items));
        setNextCursor(page.nextCursor);
      }
    } catch (reason) {
      if (request === requestSequence.current) setError(reason instanceof Error ? reason.message : "Customer berikutnya belum dapat dimuat.");
    } finally { if (request === requestSequence.current) setLoadingMore(false); }
  }, [active, loadingMore, nextCursor, search]);
  useEffect(() => {
    requestSequence.current += 1;
    const timeout = window.setTimeout(() => {
      setCustomers([]); setLoadingMore(false); setNextCursor(null);
      void reload();
    }, 250);
    return () => { window.clearTimeout(timeout); requestSequence.current += 1; };
  }, [reload]);
  return { customers, loading, loadingMore, error, nextCursor, reload, loadMore };
}
