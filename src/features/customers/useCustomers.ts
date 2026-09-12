import { useCallback, useEffect, useState } from "react";
import { listCustomers } from "./customerApi";
import type { Customer } from "./types";

export function useCustomers(options: { search?: string; active?: boolean } = {}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const search = options.search ?? "";
  const active = options.active;
  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try { setCustomers(await listCustomers({ search, active })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Daftar customer belum dapat dibuka."); }
    finally { setLoading(false); }
  }, [active, search]);
  useEffect(() => {
    const timeout = window.setTimeout(() => { void reload(); }, 250);
    return () => window.clearTimeout(timeout);
  }, [reload]);
  return { customers, loading, error, reload };
}
