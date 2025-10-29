"use client";

import * as React from "react";
import { fetchWithAuthClient } from "@/lib/auth/client";

export type ProductItem = {
  id: string;
  name?: string;
  Name?: string;
  Code?: string;
  Price?: number;
  raw?: any;
};

export default function useSelectProducts() {
  const [products, setProducts] = React.useState<ProductItem[]>([]);
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
        const res = await fetchWithAuthClient("/api/products");
        if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
        const body = await res.json().catch(() => ({}));
        const list = Array.isArray(body?.products)
          ? body.products
          : Array.isArray(body)
            ? body
            : [];
        if (!mounted) return;
        const mapped = list.map((p: any) => ({
          id: String(p.id ?? p._id ?? p.uid ?? p.id),
          name: p.name ?? p.Name,
          Name: p.Name ?? p.name,
          Code: p.code ?? p.Code,
          Price:
            typeof p.price === "number"
              ? p.price
              : Number(p.Price ?? p.price ?? 0),
          raw: p,
        }));
        setProducts(mapped);
      } catch (err: unknown) {
         
        console.error("load products failed", err);
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

  return { products, loading, error, reload };
}
