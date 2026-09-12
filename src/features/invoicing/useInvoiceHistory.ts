import { useCallback, useEffect, useRef, useState } from "react";
import { mergePageById } from "../../shared/pagination";
import type { InvoiceListItem } from "./domain";
import { listInvoices } from "./api";

export function useInvoiceHistory(search: string) {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const reload = useCallback(async () => {
    const request = ++requestSequence.current;
    setLoading(true); setError("");
    try {
      const page = await listInvoices({ search });
      if (request === requestSequence.current) { setInvoices(page.items); setNextCursor(page.nextCursor); }
    } catch (reason) {
      if (request === requestSequence.current) setError(reason instanceof Error ? reason.message : "Riwayat nota belum dapat dimuat.");
    } finally { if (request === requestSequence.current) setLoading(false); }
  }, [search]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const request = ++requestSequence.current;
    setLoadingMore(true); setError("");
    try {
      const page = await listInvoices({ search, cursor: nextCursor });
      if (request === requestSequence.current) {
        setInvoices((current) => mergePageById(current, page.items));
        setNextCursor(page.nextCursor);
      }
    } catch (reason) {
      if (request === requestSequence.current) setError(reason instanceof Error ? reason.message : "Nota berikutnya belum dapat dimuat.");
    } finally { if (request === requestSequence.current) setLoadingMore(false); }
  }, [loadingMore, nextCursor, search]);

  useEffect(() => {
    requestSequence.current += 1;
    const timeout = window.setTimeout(() => {
      setInvoices([]); setLoadingMore(false); setNextCursor(null);
      void reload();
    }, 250);
    return () => { window.clearTimeout(timeout); requestSequence.current += 1; };
  }, [reload]);

  return { invoices, nextCursor, loading, loadingMore, error, reload, loadMore };
}
