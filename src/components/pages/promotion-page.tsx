"use client"

import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import ResourcePage from "@/components/resource-page";
import PromotionTable from "@/components/tables/promotion-table";
import AddPromotionDialog from "@/components/dialogs/add-promotion-dialog";
import ImportDialog from "@/components/dialogs/import-product-dialog";
import { fetchWithAuthClient } from "@/lib/auth/client";
import { toast } from "sonner";

type Promotion = {
  id: string;
  name: string;
  code?: string;
  promoText?: string;
  type?: string; // 'by%' or 'discount'
  value?: number;
  minQty?: number;
  price?: number;
  discount?: number;
  active?: boolean;
};

export default function PromotionPage() {
  const [promotions, setPromotions] = React.useState<Promotion[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [query, setQuery] = React.useState<string>("");

  async function loadPromotions() {
    setLoading(true);
    try {
  const res = await fetchWithAuthClient("/api/promotion");
      if (!res.ok) {
        if (res.status === 401) toast.error("Unauthorized. Please login.");
        throw new Error(`Failed to load promotions: ${res.status}`);
      }
      const payload = await res.json().catch(() => ({}));
      const items = Array.isArray(payload?.promotions) ? payload.promotions : [];
      const normalized: Promotion[] = items.map((p: any) => ({
        id: String(p.id),
        name: p.name ?? p.Name ?? '',
        promoText: p.promoText ?? p.code ?? undefined,
        type: p.type ?? undefined,
        value: typeof p.value === 'number' ? p.value : typeof p.discount === 'number' ? p.discount : undefined,
        minQty: typeof p.minQty === 'number' ? p.minQty : undefined,
        price: typeof p.price === 'number' ? p.price : undefined,
        active: typeof p.active === 'boolean' ? p.active : true,
      }));
      setPromotions(normalized);
    } catch (err) {
      console.error("Failed to load promotions", err);
      toast.error(String(err instanceof Error ? err.message : "Failed to load promotions"));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadPromotions();
  }, []);

  const handleAddLocal = (p: Promotion) => setPromotions((s) => [p, ...s]);

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="px-4 lg:px-6 py-6">
            <ResourcePage
              searchPlaceholder="Search promotions..."
              onSearch={(q) => setQuery(q)}
              toolbarActions={[
                {
                  label: "Add Promotion",
                  node: (
                    <AddPromotionDialog
                      open={dialogOpen}
                      onOpenChange={setDialogOpen}
                      onAdd={(p: Promotion) => handleAddLocal(p)}
                    />
                  ),
                },
              ]}
            >
              <PromotionTable
                data={
                  query
                    ? promotions.filter((p) => (p.name || "").toLowerCase().includes(query.toLowerCase()) || (p.code || "").toLowerCase().includes(query.toLowerCase()))
                    : promotions
                }
                loading={loading}
              />
            </ResourcePage>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
