"use client";

import React from "react";
import { toast } from "sonner";
import { fetchWithAuthClient } from "@/lib/auth/client";
import ResourcePage from "@/components/resource-page";
import OutletTable from "@/components/tables/outlets-table";
import AddOutletDialog from "@/components/dialogs/add-outlet-dialog";
import ImportDialog from "@/components/dialogs/import-product-dialog";
import type { Outlet } from "@/components/tables/outlets-table";

export default function OutletPageComponent() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [optimisticItems, setOptimisticItems] = React.useState<Outlet[]>([]);
  const [data, setData] = React.useState<Outlet[]>([]);
  const [query, setQuery] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const loadOutlets = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuthClient("/api/outlets");
        if (!res.ok) {
          if (res.status === 401) {
            toast.error("Unauthorized. Please login.");
            setErrorMessage("Unauthorized");
            return;
          }
          const txt = await res.text().catch(() => "");
          throw new Error(`Failed to load outlets: ${res.status} ${txt}`);
        }
        const payload = await res.json().catch(() => ({}));
        const items = Array.isArray(payload?.outlets) ? payload.outlets : [];
        const normalized: Outlet[] = items.map((o: any) => ({
          id: String(o.id),
          uuid: (o.uuid as string) ?? (o.UUID as string) ?? undefined,
          code: (o.code as string) ?? (o.Code as string) ?? "",
          name: (o.name as string) ?? (o.Name as string) ?? "",
          cashier: (o.cashier as string) ?? (o.Cashier as string) ?? "",
          address: (o.address as string) ?? (o.Address as string) ?? "",
          phone: (o.phone as string) ?? (o.Phone as string) ?? "",
        }));
        if (!mounted) return;
        setData(normalized);
        setErrorMessage(null);
      } catch (err: unknown) {
         
        console.error("Failed to load outlets", err);
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Failed to load outlets";
        setErrorMessage(msg);
        toast.error(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadOutlets();

    return () => {
      mounted = false;
    };
  }, []);

  const handleOutletAdded = (
    outlet: Record<string, unknown> & { id: string },
  ) => {
    // remove temp items and refresh server data so the new outlet appears
    setOptimisticItems((current) => {
      return current.filter((c) => !String(c.id).startsWith("temp-"));
    });
    console.log("Outlet added", outlet);
    // refresh list from server
    (async () => {
      try {
        const res = await fetchWithAuthClient("/api/outlets");
        if (!res.ok) {
          console.warn("Failed to refresh outlets after add", res.status);
          return;
        }
        const payload = await res.json().catch(() => ({}));
        const items = Array.isArray(payload?.outlets) ? payload.outlets : [];
        const normalized: Outlet[] = items.map((o: any) => ({
          id: String(o.id),
          uuid: (o.uuid as string) ?? (o.UUID as string) ?? undefined,
          code: (o.code as string) ?? (o.Code as string) ?? "",
          name: (o.name as string) ?? (o.Name as string) ?? "",
          cashier: (o.cashier as string) ?? (o.Cashier as string) ?? "",
          address: (o.address as string) ?? (o.Address as string) ?? "",
          phone: (o.phone as string) ?? (o.Phone as string) ?? "",
        }));
        setData(normalized);
      } catch (e) {
        console.warn("Refresh after add failed", e);
      }
    })();
  };
  const handleOptimisticAdd = (
    payload: Record<string, unknown> & { __tempId?: string },
  ) => {
    const temp: Outlet = {
      id: String(payload.__tempId || `temp-${Date.now()}`),
      code: payload.code ? String(payload.code) : undefined,
      name: payload.name ? String(payload.name) : undefined,
      cashier: payload.cashier ? String(payload.cashier) : undefined,
      address: payload.address ? String(payload.address) : undefined,
      phone: payload.phone ? String(payload.phone) : undefined,
    };
    console.log("[OutletPage] optimistic add", temp);
    setOptimisticItems((s) => [temp, ...s]);
  };
  const filtered = React.useMemo(() => {
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter((d) => {
      const name = (d.name || "").toLowerCase();
      const code = (d.code || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [data, query]);

  return (
    <div>
      <ResourcePage
        searchPlaceholder="Search outlets..."
        onSearch={(q) => setQuery(q)}
        toolbarActions={[
          { label: "Import", node: <ImportDialog /> },
          {
            label: "Add Outlet",
            node: (
              <AddOutletDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onOutletAdded={handleOutletAdded}
                onAdd={handleOptimisticAdd}
              />
            ),
          },
        ]}
      >
        <OutletTable
          data={filtered}
          optimisticItems={optimisticItems}
          loading={loading}
        />
      </ResourcePage>
    </div>
  );
}
