"use client";

import React from "react";
import { toast } from "sonner";
import ResourcePage from "@/components/resource-page";
import ProductsTable from "@/components/tables/products-table";
import type { Product } from "@/components/tables/products-table";
import ImportDialog from "@/components/dialogs/import-product-dialog";
import AddProductDialog from "@/components/dialogs/add-product-dialog";
import { fetchWithAuthClient } from "@/lib/auth/client";

export default function ProductsPageComponent() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [query, setQuery] = React.useState<string>("");

  const handleAdd = (p: Record<string, unknown> & { __tempId?: string }) => {
    const tempId = p.__tempId || `temp-${Date.now()}`;
    const temp: Product = {
      id: tempId,
      Name: (p.Name as string) ?? (p.name as string) ?? "",
      Code: (p.Code as string) ?? (p.sku as string) ?? "",
      Price:
        typeof p.Price === "number"
          ? (p.Price as number)
          : typeof p.price === "number"
            ? (p.price as number)
            : Number(p.Price ?? p.price ?? 0),
      Promotion: (p.Promotion as string) ?? (p.status as string) ?? "None",
    };
    setProducts((s) => [temp, ...s]);
  };

  const handleAddSuccessReplace = (tempId: string, realProduct: Product) => {
    setProducts((s) => s.map((it) => (it.id === tempId ? realProduct : it)));
  };

  const handleProductAdded = (prod: Product) => {
    setProducts((current) => {
      if (current.some((c) => c.id === prod.id)) return current;
      const withoutTemp = current.filter((c) => !c.id.startsWith("temp-"));
      return [prod, ...withoutTemp];
    });
    // refresh list from server to ensure canonical data and remove temp entries
    void loadProducts();
  };

  // load products from server (used on mount and after adds/imports)
  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetchWithAuthClient("/api/products");
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Unauthorized. Please login.");
        }
        throw new Error(`Failed to load products: ${res.status}`);
      }
      const payload = await res.json().catch(() => ({}));
      const items = Array.isArray(payload?.products) ? payload.products : [];
      const normalized: Product[] = items.map((o: any) => ({
        id: String(o.id),
        uuid: (o.uuid as string) ?? undefined,
        Name: (o.name as string) ?? (o.Name as string) ?? "",
        Code:
          (o.code as string) ?? (o.Code as string) ?? (o.sku as string) ?? "",
        Price:
          typeof o.price === "number"
            ? o.price
            : typeof o.Price === "number"
              ? o.Price
              : Number(o.Price ?? o.price ?? 0),
        Promotion:
          (o.promotion as string) ??
          (o.Promotion as string) ??
          (o.status as string) ??
          "None",
      }));
      setProducts(normalized);
    } catch (err: unknown) {
       
      console.error("Failed to load products", err);
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Failed to load products";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetchWithAuthClient("/api/products");
        if (!res.ok) {
          if (res.status === 401) {
            toast.error("Unauthorized. Please login.");
            // optionally redirect to login page
          }
          throw new Error(`Failed to load products: ${res.status}`);
        }
        const payload = await res.json().catch(() => ({}));
        const items = Array.isArray(payload?.products) ? payload.products : [];
        const normalized: Product[] = items.map((o: any) => ({
          id: String(o.id),
          uuid: (o.uuid as string) ?? undefined,
          // prefer canonical lowercase fields first, then fall back to TitleCase
          Name: (o.name as string) ?? (o.Name as string) ?? "",
          Code:
            (o.code as string) ?? (o.Code as string) ?? (o.sku as string) ?? "",
          Price:
            typeof o.price === "number"
              ? o.price
              : typeof o.Price === "number"
                ? o.Price
                : Number(o.Price ?? o.price ?? 0),
          Promotion:
            (o.promotion as string) ??
            (o.Promotion as string) ??
            (o.status as string) ??
            "None",
        }));
        if (!mounted) return;
        setProducts(normalized);
      } catch (err: unknown) {
         
        console.error("Failed to load products", err);
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Failed to load products";
        toast.error(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Create product on server and notify UI
  const createProduct = async (p: {
    name: string;
    price?: number;
    description?: string;
    meta?: any;
  }) => {
    try {
      const res = await fetchWithAuthClient("/api/products/addProducts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Create failed: ${res.status} ${txt}`);
      }
      const body = await res.json().catch(() => ({}));
      const prod = body?.product || null;
      if (prod) {
        const normalized: Product = {
          id: prod.id,
          Name: prod.Name ?? prod.name ?? "",
          Code: prod.Code ?? prod.sku ?? "",
          Price:
            typeof prod.Price === "number"
              ? prod.Price
              : Number(prod.Price ?? prod.price ?? 0),
          Promotion: prod.Promotion ?? prod.status ?? "None",
        };
        handleProductAdded(normalized);
        toast.success("Product created");
        return normalized;
      }
      throw new Error("Unexpected server response");
    } catch (err: unknown) {
       
      console.error("createProduct error", err);
      toast.error(String(err instanceof Error ? err.message : err));
      throw err;
    }
  };

  return (
    <div>
      <ResourcePage
        searchPlaceholder="Search products..."
        onSearch={(q) => setQuery(q)}
        toolbarActions={[
          {
            label: "Import",
            node: <ImportDialog onImport={() => loadProducts()} />,
          },
          {
            label: "Add Product",
            node: (
              <AddProductDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onAdd={handleAdd}
                onAddSuccessReplace={handleAddSuccessReplace}
                onProductAdded={handleProductAdded}
              />
            ),
          },
        ]}
      >
        {/* filter by Name or Code (case-insensitive) */}
        <ProductsTable
          data={
            query
              ? products.filter((p) => {
                  const q = query.toLowerCase();
                  return (
                    (p.Name || "").toLowerCase().includes(q) ||
                    (p.Code || "").toLowerCase().includes(q)
                  );
                })
              : products
          }
          loading={loading}
        />
      </ResourcePage>
    </div>
  );
}
