"use client";

import React from "react";
import { toast } from "sonner";
import ResourcePage from "@/components/resource-page";
import ProductsTable from "@/components/tables/products-table";
import type { Product } from "@/components/tables/products-table";
import ImportDialog from "@/components/dialogs/import-product-dialog";
import AddProductDialog from "@/components/dialogs/add-product-dialog";

export default function ProductsPageComponent() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [query, setQuery] = React.useState<string>("")

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
  };

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    ;(async () => {
      try {
        // Generate a large set of dummy products for frontend-only development (10,000 items)
        const COUNT = 10000
        const promos = ["None"]
        const items = Array.from({ length: COUNT }, (_, i) => {
          const idx = i + 1
          return {
            id: `p-${idx}`,
            Name: `Produk ${idx}`,
            Code: `KP-${String(idx).padStart(3, "0")}`,
            Price: 10000 + (i % 50) * 500, // varying small price
            Promotion: promos[i % promos.length],
          }
        })
        if (!mounted) return
        const normalized: Product[] = (items || []).map((it: any) => ({
          id: String(it.id),
          Name: it.Name ?? it.name ?? "",
          Code: it.Code ?? it.sku ?? "",
          Price:
            typeof it.Price === "number"
              ? it.Price
              : Number(it.Price ?? it.price ?? 0),
          Promotion: it.Promotion ?? it.status ?? "None",
        }))
        setProducts(normalized)
      } catch (err) {
        console.error('Failed to load products', err)
        const _err: any = err
        toast.error(typeof _err === 'string' ? _err : _err?.message || 'Failed to load products')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <ResourcePage
        searchPlaceholder="Search products..."
        onSearch={(q) => setQuery(q)}
        toolbarActions={[
          { label: "Import", node: <ImportDialog /> },
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
        <ProductsTable data={
          query
            ? products.filter((p) => {
                const q = query.toLowerCase()
                return ((p.Name || '').toLowerCase().includes(q) || (p.Code || '').toLowerCase().includes(q))
              })
            : products
        } loading={loading} />
      </ResourcePage>
    </div>
  );
}
