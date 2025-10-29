'use client';

import * as React from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { fetchWithAuthClient } from '@/lib/auth/client';
import formatIDR from '@/lib/utils/currency';

type Props = {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialItem?: { id: string; label: string; qty?: number; price?: number; appliedPromoId?: string; appliedPromoName?: string } | null;
  onApply?: (item: { id: string; label: string; qty: number; price?: number; appliedPromoId?: string; appliedPromoName?: string }) => void;
};

export default function ItemInvoiceDialog({ trigger, open, onOpenChange, initialItem = null, onApply }: Props) {
  // local selected item state - initialize from initialItem when dialog opens
  const [selectedItem, setSelectedItem] = React.useState<{ id: string; label: string; qty: number; price?: number; appliedPromoId?: string; appliedPromoName?: string } | null>(
    initialItem ? { id: initialItem.id, label: initialItem.label, qty: initialItem.qty ?? 1, price: initialItem.price, appliedPromoId: initialItem.appliedPromoId, appliedPromoName: initialItem.appliedPromoName } : null
  );
  const [selectedQty, setSelectedQty] = React.useState<number>(initialItem?.qty ?? 1);

  React.useEffect(() => {
    if (open) {
      setSelectedItem(
        initialItem
          ? { id: initialItem.id, label: initialItem.label, qty: initialItem.qty ?? 1, price: initialItem.price, appliedPromoId: initialItem.appliedPromoId, appliedPromoName: initialItem.appliedPromoName }
          : null
      );
      setSelectedQty(initialItem?.qty ?? 1);
    }
  }, [open, initialItem]);

  function handleApply(item?: { id: string; label: string; qty?: number; price?: number; appliedPromoId?: string; appliedPromoName?: string }) {
    const toApply = item ? { id: item.id, label: item.label, qty: item.qty ?? 1, price: item.price, appliedPromoId: item.appliedPromoId, appliedPromoName: item.appliedPromoName } : selectedItem;
    if (!toApply) return;
    if (onApply) onApply(toApply);
    if (onOpenChange) onOpenChange(false);
  }

  function ItemCard({ id, label, price, qty, onQtyChange }: { id: string; label: string; price?: number; qty: number; onQtyChange: (q: number) => void }) {
    return (
      <div className="border rounded px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-2">Qty (pcs)</div>
            <div className="flex items-center rounded overflow-hidden">
              <button type="button" onClick={() => onQtyChange(Math.max(1, qty - 1))} className="px-3 py-2 bg-muted hover:bg-muted/80 text-sm" aria-label="Decrease quantity">
                -
              </button>
              <div className="px-3 py-2 bg-muted flex-1 text-center text-sm">{qty}</div>
              <button type="button" onClick={() => onQtyChange(qty + 1)} className="px-3 py-2 bg-muted hover:bg-muted/80 text-sm" aria-label="Increase quantity">
                +
              </button>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-2">Price</div>
            <div className="px-3 py-2 bg-muted rounded text-sm text-center">{formatIDR(price ?? 0)}</div>
          </div>
        </div>
      </div>
    );
  }

  // promotions state for the Promotions tab
  const [promotions, setPromotions] = React.useState<Array<{ id: string; name?: string; type?: string; value?: number; promoText?: string; minQty?: number; price?: number }>>([]);
  const [promotionsLoading, setPromotionsLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    async function loadPromotions() {
      setPromotionsLoading(true);
      try {
        const res = await fetchWithAuthClient('/api/promotion');
        if (!res.ok) return;
        const body = await res.json().catch(() => ({}));
        const items = Array.isArray(body?.promotions) ? body.promotions : [];
        const normalized = items.map((p: any) => ({
          id: String(p.id),
          name: p.name ?? p.Name ?? p.Name ?? '',
          type: p.type ?? undefined,
          value: typeof p.value === 'number' ? p.value : typeof p.discount === 'number' ? p.discount : undefined,
          promoText: p.promoText ?? p.code ?? p.Code ?? undefined,
          minQty: typeof p.minQty === 'number' ? p.minQty : undefined,
          price: typeof p.price === 'number' ? p.price : undefined,
        }));
        if (!mounted) return;
        setPromotions(normalized);
      } catch (e) {
        // ignore errors silently here
        console.error('Failed to load promotions for dialog', e);
      } finally {
        if (mounted) setPromotionsLoading(false);
      }
    }

    // load once when component mounts
    void loadPromotions();
    return () => {
      mounted = false;
    };
  }, []);

  // compute unit price according to promotion and selected qty
  function computeUnitPriceForPromotion(promo: any | null, qty: number, basePrice?: number) {
    const bp = typeof basePrice === 'number' ? basePrice : 0;
    if (!promo) return bp;

    // buy2: promo.value = harga untuk 1 item, promo.price = harga per item ketika qty >= minQty
    if (promo.type === 'buy2') {
      const singlePrice = typeof promo.value === 'number' ? promo.value : bp;
      const bulkUnitPrice = typeof promo.price === 'number' ? promo.price : singlePrice;
      const minQty = typeof promo.minQty === 'number' && promo.minQty > 0 ? promo.minQty : 2;
      return qty >= minQty ? bulkUnitPrice : singlePrice;
    }

    // persen: hitung unit price setelah diskon %
    if (promo.type === 'by%') {
      const pct = typeof promo.value === 'number' ? promo.value : (typeof promo.discount === 'number' ? promo.discount : 0);
      return Math.round(bp * (100 - pct) / 100);
    }

    // nominal potongan: kurangi harga unit
    if (promo.type === 'discount') {
      const amt = typeof promo.value === 'number' ? promo.value : 0;
      return Math.max(0, bp - amt);
    }

    return bp;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Editing item cart</DialogTitle>
          {/* description under title: show item label or placeholder */}
          <div className="text-sm text-muted-foreground mt-1">{selectedItem?.label ?? initialItem?.label ?? '{label}'}</div>
        </DialogHeader>
        <div className="py-2">
          {/* add gap between title/description and tabs */}
          <div className="mt-4">
            <Tabs defaultValue="items">
              <TabsList>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="promotions">Promotions</TabsTrigger>
              </TabsList>

              <div className="mt-3">
                <TabsContent value="items">
                  <ItemCard id={selectedItem?.id ?? initialItem?.id ?? 'dummy-1'} label={selectedItem?.label ?? initialItem?.label ?? 'Item 1'} price={selectedItem?.price ?? initialItem?.price ?? 0} qty={selectedQty} onQtyChange={(q) => setSelectedQty(q)} />
                </TabsContent>

                <TabsContent value="promotions">
                  <div className="grid grid-cols-1 gap-2">
                    {promotionsLoading ? (
                      <div className="text-sm text-muted-foreground">Loading promotions…</div>
                    ) : promotions.length === 0 ? (
                      <div className="border rounded p-2 text-sm text-muted-foreground">No promotions</div>
                    ) : (
                      promotions.map((p) => (
                        <div key={p.id} className="border rounded p-2 flex items-center justify-between">
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {p.type ? (p.type === 'discount' ? `Rp ${Number(p.value ?? 0).toLocaleString('id-ID')}` : `${p.value ?? 0}%`) : (typeof p.value === 'number' ? `${p.value}%` : '-')}
                              {p.promoText ? ` — ${p.promoText}` : ''}
                            </div>
                          </div>
                              <div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const qtyToApply = selectedQty ?? 1;
                                    const basePrice = selectedItem?.price ?? initialItem?.price ?? 0;
                                    const unitPrice = computeUnitPriceForPromotion(p, qtyToApply, basePrice);
                                    // Apply promotion to the currently edited product (do not add promo as separate line)
                                    const targetId = selectedItem?.id ?? initialItem?.id ?? `item-${Date.now()}`;
                                    // keep the original product label when applying promo
                                    const targetLabel = selectedItem?.label ?? initialItem?.label ?? 'Item';
                                    handleApply({ id: targetId, label: targetLabel, qty: qtyToApply, price: unitPrice, appliedPromoId: p.id, appliedPromoName: p.name });
                                  }}>
                                  Apply
                                </Button>
                              </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => {
                // close without applying
                if (onOpenChange) onOpenChange(false);
              }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // apply selected item with selectedQty
                const id = selectedItem?.id ?? initialItem?.id ?? 'dummy-1';
                const label = selectedItem?.label ?? initialItem?.label ?? 'Item 1';
                const price = selectedItem?.price ?? initialItem?.price ?? 0;
                handleApply({ id, label, qty: selectedQty, price });
              }}>
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
