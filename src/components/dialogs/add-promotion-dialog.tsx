"use client"

import * as React from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWithAuthClient } from "@/lib/auth/client";
import { toast } from "sonner";

type Promotion = { id: string; name: string; code?: string; discount?: number; active?: boolean };

export default function AddPromotionDialog({ open, onOpenChange, onAdd }: { open?: boolean; onOpenChange?: (v: boolean) => void; onAdd?: (p: Promotion) => void }) {
  const [name, setName] = React.useState("");
  const [typeOption, setTypeOption] = React.useState<string>("");
  const [value, setValue] = React.useState<number | "">("");
  const [promoText, setPromoText] = React.useState("");
  const [minQty, setMinQty] = React.useState<number | "">("");
  const [priceAmount, setPriceAmount] = React.useState<number | "">("");
  const [saving, setSaving] = React.useState(false);

  // format number with comma as thousand separator (e.g. 1,234,567)
  const formatNumberWithCommas = (v: number | "") => {
    if (v === "") return "";
    try {
      const n = Number(v);
      if (Number.isNaN(n)) return "";
      return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } catch {
      return "";
    }
  };

  const parseNumberFromInput = (s: string): number | "" => {
    const cleaned = String(s).replace(/,/g, "").trim();
    if (cleaned === "") return "";
    const n = Number(cleaned);
    return Number.isNaN(n) ? "" : n;
  };

  React.useEffect(() => {
    if (!open) {
      setName("");
      setTypeOption("");
      setValue("");
      setMinQty("");
      setPriceAmount("");
      setPromoText("");
    }
  }, [open]);

  async function handleSave() {
    const payload: any = {
      name,
      type: typeOption,
      value: typeof value === "number" ? value : Number(value || 0),
      promoText,
    };
    if (typeOption === 'buy2') {
      payload.minQty = typeof minQty === 'number' ? minQty : Number(minQty || 0);
      payload.price = typeof priceAmount === 'number' ? priceAmount : Number(priceAmount || 0);
    }
    setSaving(true);
    try {
      // try to POST to server; if it fails, still call onAdd locally
      try {
        const res = await fetchWithAuthClient("/api/promotion/addPromotion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) {
          const body = await res.json().catch(() => null);
          const p = body?.promotion;
          if (p && onAdd) {
            onAdd({ id: String(p.id), name: p.name ?? name, code: p.code ?? payload.promoText, promoText: p.promoText ?? payload.promoText, type: p.type ?? payload.type, value: p.value ?? payload.value, minQty: p.minQty ?? payload.minQty, price: p.price ?? payload.price, discount: p.discount ?? (payload.type === 'by%' ? payload.value : undefined), active: p.active ?? true } as any);
          }
        } else {
          // fallback to local add
          if (onAdd) onAdd({ id: `temp-${Date.now()}`, name: payload.name, code: payload.promoText, promoText: payload.promoText, type: payload.type, value: payload.value, minQty: payload.minQty, price: payload.price, discount: payload.type === 'by%' ? payload.value : undefined, active: true } as any);
        }
      } catch (e) {
        if (onAdd) onAdd({ id: `temp-${Date.now()}`, name: payload.name, code: payload.promoText, promoText: payload.promoText, type: payload.type, value: payload.value, minQty: payload.minQty, price: payload.price, discount: payload.type === 'by%' ? payload.value : undefined, active: true } as any);
      }
      toast.success("Promotion added");
      if (onOpenChange) onOpenChange(false);
    } catch (err) {
      console.error("Failed to create promotion", err);
      toast.error("Failed to create promotion");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>Add Promotion</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Add Promotion</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />

          <Label>Type</Label>
          <Select value={typeOption} onValueChange={(v) => setTypeOption(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="by%">%</SelectItem>
              <SelectItem value="discount">Discount</SelectItem>
              <SelectItem value="buy2">Buy 2 and save more!</SelectItem>
            </SelectContent>
          </Select>

          {typeOption ? (
            <>
              {typeOption === 'buy2' ? (
                <>
                  <Label>Min Qty</Label>
                  <Input value={minQty === "" ? "" : String(minQty)} onChange={(e) => setMinQty(e.target.value === "" ? "" : Number(e.target.value))} />

                  <Label>Price (Rp)</Label>
                  <Input value={priceAmount === "" ? "" : formatNumberWithCommas(priceAmount)} onChange={(e) => setPriceAmount(parseNumberFromInput(e.target.value))} />
                </>
              ) : (
                <>
                  <Label>{typeOption === 'by%' ? 'Discount (%)' : 'Discount (Rp)'}</Label>
                  <Input
                    value={value === "" ? "" : formatNumberWithCommas(value)}
                    onChange={(e) => setValue(parseNumberFromInput(e.target.value))}
                  />
                </>
              )}
            </>
          ) : null}

          <Label>Promo Text</Label>
          <Input value={promoText} onChange={(e) => setPromoText(e.target.value)} />
        </div>
        <DialogFooter>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || name.trim().length === 0}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
