"use client";

import * as React from "react";
import { fetchWithAuthClient } from "@/lib/auth/client";

export type OutletItem = {
  id: string;
  name?: string;
  Name?: string;
  Code?: string;
  phone?: string | null;
  wa?: string | null;
  cashier?: string | null;
  address?: string | null;
  raw?: any;
};

/**
 * Hook to load and normalize outlets from the API.
 * Returns outlets, loading, error and a reload() function.
 */
export default function useSelectOutlets() {
  const [outlets, setOutlets] = React.useState<OutletItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [token, setToken] = React.useState(0);

  const reload = React.useCallback(() => setToken((t) => t + 1), []);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetchWithAuthClient("/api/outlets");
        if (!res.ok) throw new Error(`Failed to load outlets: ${res.status}`);
        const body = await res.json().catch(() => ({}));
        const items = Array.isArray(body?.outlets)
          ? body.outlets
          : Array.isArray(body)
            ? body
            : [];
        if (!mounted) return;
        const mapped = items.map((o: any) => ({
          id: String(o.id ?? o._id ?? o.uid ?? o.id),
          name: o.name ?? o.Name,
          Code: o.code ?? o.Code,
          phone: o.phone ?? o.Phone ?? null,
          wa: o.wa ?? o.WA ?? null,
          cashier: o.cashier ?? null,
          address: o.address ?? null,
          raw: o,
        }));
        setOutlets(mapped);
      } catch (err: unknown) {
         
        console.error("load outlets failed", err);
        if (!mounted) return;
        setError(String(err instanceof Error ? err.message : String(err)));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token]);

  return { outlets, loading, error, reload };
}
