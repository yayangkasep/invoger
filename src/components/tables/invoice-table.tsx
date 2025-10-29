'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { IconTrendingUp, IconEye, IconGardenCartOff, IconCalendar, IconTrash, IconEyeOff } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption } from '@/components/ui/table';
import { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import useSelectOutlets from '@/hooks/select-outlets';
import useSelectProducts from '@/hooks/select-products';
import computeTotals, { computeLineTotal } from '@/lib/utils/calculator';
import formatIDR from '@/lib/utils/currency';
import renderInvoiceTemplate from '@/lib/utils/invoice-template';
import promotions from '@/lib/utils/promotions';
import { blocksToHtml, replaceVariables } from '@/lib/utils/prints-template';
import randomInvoices from '@/lib/utils/random-invoice';
import randomTimes, { randomTimeBetween } from '@/lib/utils/random-times';
import generateRandomPayments from '@/lib/utils/random-payments';
import { findMethodById, computePaymentForMethod } from '@/lib/utils/payments';
import InvoicePreviewDialog from '@/components/dialogs/invoice-preview-dialog';
import ItemInvoiceDialog from '@/components/dialogs/item-invoice-dialog';

function OutletSelect({ clearToken, onChange }: { clearToken?: number; onChange?: (outlet: any) => void }) {
  const { outlets, loading, error } = useSelectOutlets();

  // UI state
  const [query, setQuery] = React.useState('');
  const [filtered, setFiltered] = React.useState<typeof outlets>([]);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState<number>(-1);
  const [selected, setSelected] = React.useState<{
    id: string;
    label: string;
  } | null>(null);

  React.useEffect(() => {
    setFiltered(outlets);
  }, [outlets]);

  // simple client-side filter (debounced)
  React.useEffect(() => {
    const id = setTimeout(() => {
      const q = (query || '').toLowerCase().trim();
      if (!q) {
        setFiltered(outlets);
        setHighlight(-1);
        return;
      }
      const f = outlets.filter((o) => (o.name ?? o.Name ?? o.Code ?? o.id).toLowerCase().includes(q));
      setFiltered(f);
      setHighlight(f.length ? 0 : -1);
    }, 150);
    return () => clearTimeout(id);
  }, [query, outlets]);

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // only open dropdown with keyboard if user has typed something
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && query.length > 0) setOpen(true);
    if (e.key === 'ArrowDown') setHighlight((h) => Math.min((filtered.length || 0) - 1, h + 1));
    if (e.key === 'ArrowUp') setHighlight((h) => Math.max(0, h - 1));
    if (e.key === 'Enter' && highlight >= 0 && filtered[highlight]) {
      const o = filtered[highlight];
      selectOutlet(o.id, o.name ?? o.Name ?? o.Code ?? o.id);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  function selectOutlet(id: string, label: string) {
    setSelected({ id, label });
    setQuery(label);
    setOpen(false);
    // notify parent with full outlet object if available
    const found = outlets.find((o) => o.id === id) || null;
    if (onChange) onChange(found);
  }

  // when parent signals clear (token changes), reset internal UI
  React.useEffect(() => {
    if (typeof clearToken !== 'undefined') {
      setSelected(null);
      setQuery('');
      setFiltered(outlets);
      setOpen(false);
      setHighlight(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearToken]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id="outlet"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder={loading ? 'Loading outlets...' : error ? 'Failed to load outlets' : 'Search outlets...'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKey}
        onFocus={() => {
          if (query.length > 0) setOpen(true);
        }}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {/* clear button (trash) - shown only when a selection exists */}
      {selected ? (
        <button
          aria-label="Clear outlet"
          onClick={(e) => {
            e.preventDefault();
            setSelected(null);
            setQuery('');
            setFiltered(outlets);
            setOpen(false);
            // focus back to input
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-destructive hover:bg-destructive/10">
          <IconTrash className="size-4" />
        </button>
      ) : null}
      {open && query.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-lg">
          {loading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="p-2 text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">No outlets found</div>
          ) : (
            filtered.map((o, idx) => {
              const label = o.name ?? o.Name ?? o.Code ?? o.id;
              const isHighlighted = idx === highlight;
              return (
                <div
                  role="option"
                  aria-selected={isHighlighted}
                  key={o.id}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    selectOutlet(o.id, label);
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                  className={`cursor-pointer rounded px-2 py-1 text-sm ${isHighlighted ? 'bg-accent text-accent-foreground' : 'text-foreground'}`}>
                  {label}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function ProductSelect({ onSelect, clearToken }: { onSelect?: (p: { id: string; label: string; price?: number }) => void; clearToken?: number }) {
  const { products, loading, error } = useSelectProducts();
  const [query, setQuery] = React.useState('');
  const [filtered, setFiltered] = React.useState<typeof products>([]);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState<number>(-1);
  const [selected, setSelected] = React.useState<{
    id: string;
    label: string;
  } | null>(null);

  React.useEffect(() => {
    setFiltered(products);
  }, [products]);

  React.useEffect(() => {
    const id = setTimeout(() => {
      const q = (query || '').toLowerCase().trim();
      if (!q) {
        setFiltered(products);
        setHighlight(-1);
        return;
      }
      const f = products.filter((o) => (o.name ?? o.Name ?? o.Code ?? o.id).toLowerCase().includes(q));
      setFiltered(f);
      setHighlight(f.length ? 0 : -1);
    }, 150);
    return () => clearTimeout(id);
  }, [query, products]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && query.length > 0) setOpen(true);
    if (e.key === 'ArrowDown') setHighlight((h) => Math.min((filtered.length || 0) - 1, h + 1));
    if (e.key === 'ArrowUp') setHighlight((h) => Math.max(0, h - 1));
    if (e.key === 'Enter' && highlight >= 0 && filtered[highlight]) {
      const o = filtered[highlight];
      selectProduct(o.id, o.name ?? o.Name ?? o.Code ?? o.id);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  function selectProduct(id: string, label: string) {
    const prod = products.find((it) => it.id === id);
    const price = prod?.Price;
    setSelected({ id, label });
    setQuery(label);
    setOpen(false);
    if (onSelect) onSelect({ id, label, price });
  }

  // when parent signals clear (token changes), reset internal UI
  React.useEffect(() => {
    if (typeof clearToken !== 'undefined') {
      setSelected(null);
      setQuery('');
      setOpen(false);
      setFiltered(products);
      setHighlight(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearToken]);

  return (
    <div className="relative">
      <input
        id="add-item"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder={loading ? 'Loading products...' : error ? 'Failed to load products' : 'Search products...'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKey}
        onFocus={() => {
          if (query.length > 0) setOpen(true);
        }}
      />
      {open && query.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-lg">
          {loading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="p-2 text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">No products found</div>
          ) : (
            filtered.map((o, idx) => {
              const label = o.name ?? o.Name ?? o.Code ?? o.id;
              const isHighlighted = idx === highlight;
              return (
                <div
                  role="option"
                  aria-selected={isHighlighted}
                  key={o.id}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    selectProduct(o.id, label);
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                  className={`cursor-pointer rounded px-2 py-1 text-sm ${isHighlighted ? 'bg-accent text-accent-foreground' : 'text-foreground'}`}>
                  {label}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function InvoiceTable() {
  const [items, setItems] = React.useState<Array<{ id: string; label: string; qty: number; price?: number; appliedPromoId?: string; appliedPromoName?: string }>>([]);
  const [itemDialogOpen, setItemDialogOpen] = React.useState<boolean>(false);
  const [itemDialogInitial, setItemDialogInitial] = React.useState<{ id: string; label: string; qty?: number; price?: number; appliedPromoId?: string; appliedPromoName?: string } | null>(null);
  const [productClearToken, setProductClearToken] = React.useState(0);
  const [paymentMethod, setPaymentMethod] = React.useState<string>('Cash');
  const [cashAmount, setCashAmount] = React.useState<string>('');
  const [massPrint, setMassPrint] = React.useState<string>('');
  const [startInvoice, setStartInvoice] = React.useState<string>('');
  const [endInvoice, setEndInvoice] = React.useState<string>('');
  const [startPoint, setStartPoint] = React.useState<string>('');
  const [nameMember, setNameMember] = React.useState<string>('');
  const [phoneMember, setPhoneMember] = React.useState<string>('');
  const [outletClearToken, setOutletClearToken] = React.useState<number>(0);
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [dateOpen, setDateOpen] = React.useState<boolean>(false);
  const [invoiceTemplate, setInvoiceTemplate] = React.useState<string | null>(null);
  const [invoiceTemplateBase, setInvoiceTemplateBase] = React.useState<string | null>(null);
  const [invoiceTemplates, setInvoiceTemplates] = React.useState<Array<string> | null>(null);
  const [selectedOutlet, setSelectedOutlet] = React.useState<any | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const [iframeHeight, setIframeHeight] = React.useState<string | undefined>(undefined);
  const [previewOpen, setPreviewOpen] = React.useState<boolean>(false);
  const isMobile = useIsMobile();

  // (no UI surcharge preview here; surcharge is still calculated and injected into invoice meta)

  React.useEffect(() => {
    // invoice table doesn't use centralized pagination state; we expose `isMobile` for responsive behaviors below
  }, [isMobile]);

  React.useEffect(() => {
    // build raw invoice items; we'll compute promotion adjustments and adjusted prices inside the async renderer
    const rawInvoiceItems = items.map((i) => ({
      label: i.label,
      qty: i.qty,
      price: i.price ?? 0,
      appliedPromoId: (i as any).appliedPromoId,
      appliedPromoName: (i as any).appliedPromoName,
    }));
    // determine invoice number or numbers to display in preview.
    // If startInvoice/endInvoice are numeric, use exclusive range (start+1 .. end-1).
    let invoiceNumberDisplay = startInvoice;
    const s = Number(startInvoice);
    const e = Number(endInvoice);
    // treat empty inputs as "not provided" — Number('') === 0 which is undesired here
    const sValid = typeof startInvoice === 'string' && startInvoice.trim().length > 0 && Number.isFinite(s);
    const eValid = typeof endInvoice === 'string' && endInvoice.trim().length > 0 && Number.isFinite(e);
    if (sValid && eValid) {
      const min = Math.min(s, e) + 1;
      const max = Math.max(s, e) - 1;
      if (min <= max) {
        // parse requested massPrint count (if numeric). default to 1
        let count = Number(massPrint);
        if (!Number.isFinite(count) || count <= 0) count = 1;
        const maxPossible = max - min + 1;
        if (count > maxPossible) count = maxPossible;
        try {
          const generated = randomInvoices([min, max], {
            count: count,
            unique: true,
            asString: true,
          });
          invoiceNumberDisplay = Array.isArray(generated) ? generated.join(', ') : String(generated);
        } catch (err) {
          // fallback to a simple range string if generation fails
          invoiceNumberDisplay = `${min}-${max}`;
        }
      }
    } else if (sValid) {
      // only start provided: use the start value as-is
      invoiceNumberDisplay = startInvoice;
    } else if (eValid) {
      // only end provided: use the end value as-is
      invoiceNumberDisplay = endInvoice;
    }
    const meta: any = {
      invoiceNumber: invoiceNumberDisplay,
      // set createdAt to a random time (09:00-21:00) on the selected date (or today)
      createdAt: (() => {
        try {
          const base = date ? new Date(date) : new Date();
          const rand = randomTimeBetween('09:00', '21:00');
          base.setHours(rand.getHours(), rand.getMinutes(), rand.getSeconds(), rand.getMilliseconds());
          return base;
        } catch (e) {
          return date ?? new Date();
        }
      })(),
      cashier: 'POS',
      // inject payment info from the form so preview reflects frontend inputs
      // we'll populate paymentMethod/paymentAmount below (so we can resolve surcharge)
      paymentMethod: paymentMethod,
      paymentAmount: cashAmount || undefined,
      // extra fields from the UI
      startPoint: startPoint || undefined,
      nameMember: nameMember || undefined,
      phoneMember: phoneMember || undefined,
    };
    // payment metadata will be resolved later after promotions/totals are computed
    async function attachTemplate() {
      if (selectedOutlet) {
        meta.outletName = selectedOutlet.name ?? selectedOutlet.Name ?? '';
        meta.outletCode = selectedOutlet.Code ?? selectedOutlet.code ?? '';
        meta.address = selectedOutlet.address ?? selectedOutlet.raw?.address ?? '';
        meta.phone = selectedOutlet.phone ?? '';
        meta.wa = selectedOutlet.wa ?? '';
        meta.cashier = selectedOutlet.cashier ?? meta.cashier;

        try {
          const res = await fetch(`/api/prints?outletId=${encodeURIComponent(String(selectedOutlet.id))}`, { credentials: 'same-origin' });
          const body = await res.json().catch(() => null);
          const tpl = res.ok && body && body.template ? body.template : null;
          if (tpl) {
            // build headerHtml/footerHtml using helpers exported from prints-template
            if (tpl.headerBlocks && Array.isArray(tpl.headerBlocks) && tpl.headerBlocks.length > 0) {
              // skip the first store block because renderInvoiceTemplate already shows storeName in the H2
              meta.headerHtml = blocksToHtml(tpl.headerBlocks, selectedOutlet, {
                skipStoreBlock: true,
              });
            }
            if (tpl.footerTemplate && typeof tpl.footerTemplate === 'string' && tpl.footerTemplate.trim().length > 0) {
              const replaced = replaceVariables(tpl.footerTemplate, selectedOutlet);
              meta.footerHtml = `<div style="text-align:center; white-space:pre-wrap;">${replaced.replace(/\r?\n/g, '<br/>')}</div>`;
            } else if (tpl.footerBlocks && Array.isArray(tpl.footerBlocks) && tpl.footerBlocks.length > 0) {
              meta.footerHtml = blocksToHtml(tpl.footerBlocks, selectedOutlet);
            }
          }
        } catch (e) {
          // ignore template fetch errors
        }
      }
    }
    // attach template then render — support mass-print by generating multiple templates when requested
    (async () => {
      await attachTemplate();

      // compute promotions and adjusted unit prices for each invoice item
      let invoiceItems = rawInvoiceItems;
      try {
        const adjusted = await Promise.all(
          rawInvoiceItems.map(async (it) => {
            try {
              // prefer an explicitly applied promotion id, then appliedPromoName, then fallback to label lookup
              let adj: any = null;
              if (it.appliedPromoId) {
                const promo = await promotions.findPromotionById(it.appliedPromoId);
                adj = promotions.computePromotionAdjustment(promo, it.qty, it.price ?? 0);
              } else if (it.appliedPromoName) {
                adj = await promotions.applyPromotionByName(it.appliedPromoName, it.qty, it.price ?? 0);
              } else {
                adj = await promotions.applyPromotionByName(it.label, it.qty, it.price ?? 0);
              }
              const unitPrice = typeof adj.unitPrice === 'number' ? adj.unitPrice : it.price ?? 0;
              // keep originalPrice so template can show original -> discount -> final unit
              return { ...it, originalPrice: it.price ?? 0, price: unitPrice, adjustment: adj };
            } catch (e) {
              return { ...it, originalPrice: it.price ?? 0, price: it.price ?? 0 };
            }
          })
        );
        invoiceItems = adjusted;
      } catch (e) {
        invoiceItems = rawInvoiceItems;
      }

      // after applying promotions compute totals using adjusted invoice items
      const totals = computeTotals(
        invoiceItems.map((i) => ({ ...i, price: i.price ?? 0 })),
        { format: false }
      );

      // try to fetch CSS once and reuse
      let cssText = '';
      try {
        const cssRes = await fetch('/template.css', { credentials: 'same-origin' });
        if (cssRes.ok) cssText = await cssRes.text();
      } catch (e) {
        // ignore
      }

      // determine how many templates to render
      const count = Number(massPrint) && Number.isFinite(Number(massPrint)) && Number(massPrint) > 0 ? Math.floor(Math.abs(Number(massPrint))) : 1;

      // build an array of invoice numbers to render
      let invoiceNumbers: string[] = [];
      const s = Number(startInvoice);
      const e = Number(endInvoice);
      const sValid = typeof startInvoice === 'string' && startInvoice.trim().length > 0 && Number.isFinite(s);
      const eValid = typeof endInvoice === 'string' && endInvoice.trim().length > 0 && Number.isFinite(e);

      if (sValid && eValid) {
        const min = Math.min(s, e) + 1;
        const max = Math.max(s, e) - 1;
        if (min <= max) {
          let useCount = count;
          const maxPossible = max - min + 1;
          if (useCount > maxPossible) useCount = maxPossible;
          try {
            const generated = randomInvoices([min, max], { count: useCount, unique: true, asString: true });
            if (Array.isArray(generated)) invoiceNumbers = generated.map(String);
            else invoiceNumbers = [String(generated)];
          } catch (err) {
            // fallback to a simple sequential range
            for (let i = 0; i < useCount; i++) invoiceNumbers.push(String(min + i));
          }
        }
      }

      if (invoiceNumbers.length === 0 && sValid) {
        // generate sequential numbers starting at startInvoice
        for (let i = 0; i < count; i++) invoiceNumbers.push(String(s + i));
      }

      if (invoiceNumbers.length === 0 && eValid) {
        for (let i = 0; i < count; i++) invoiceNumbers.push(String(e + i));
      }

      if (invoiceNumbers.length === 0) {
        // fallback: repeat the single display value
        const display = (() => {
          // reuse earlier logic to produce a single display
          let invoiceNumberDisplay = startInvoice;
          try {
            const s2 = Number(startInvoice);
            const e2 = Number(endInvoice);
            const sV = typeof startInvoice === 'string' && startInvoice.trim().length > 0 && Number.isFinite(s2);
            const eV = typeof endInvoice === 'string' && endInvoice.trim().length > 0 && Number.isFinite(e2);
            if (sV && eV) {
              const min = Math.min(s2, e2) + 1;
              const max = Math.max(s2, e2) - 1;
              if (min <= max) {
                invoiceNumberDisplay = `${min}-${max}`;
              }
            }
          } catch (e) {}
          return invoiceNumberDisplay || '';
        })();
        for (let i = 0; i < count; i++) invoiceNumbers.push(display);
      }

      // render templates for each invoice number
      const templates: string[] = [];

      // generate unique random times up-front for each template when possible
      let generatedTimes: Date[] = [];
      // generate randomized payments for mass-print scenario (only if multiple templates)
      let generatedPayments: Array<{ methodId: string; paidAmount: number }> | null = null;
      try {
        // try to produce unique Date[] values (randomTimes returns Date[] by default)
  generatedTimes = randomTimes('09:00', '21:00', { count: invoiceNumbers.length, unique: true, asString: false }) as Date[];
      } catch (e) {
        generatedTimes = [];
      }

      try {
        if (invoiceNumbers.length > 1) {
          const availableMethodIds = [
            'Master Visa',
            'BCA CARD',
            'Debit bca',
            'Debit Mandiri',
            'Bank Lain',
            'Debit BNI',
            'Debit BRI',
            'Transfer BCA',
            'Transfer Mandiri',
            'ShopeePay',
          ];
          generatedPayments = generateRandomPayments(totals.totalRupiah, invoiceNumbers.length, {
            methods: availableMethodIds,
            includeCash: true,
            cashRoundingStep: 10000,
            unique: true,
          });
        }
      } catch (e) {
        generatedPayments = null;
      }

      let idx = 0;
      for (const invNum of invoiceNumbers) {
        const metaCopy = { ...meta, invoiceNumber: invNum } as any;
        try {
          if (generatedTimes && generatedTimes.length > idx) {
            metaCopy.createdAt = generatedTimes[idx];
          } else {
            // fallback: randomize individually
            const base = date ? new Date(date) : new Date();
            const rand = randomTimeBetween('09:00', '21:00');
            base.setHours(rand.getHours(), rand.getMinutes(), rand.getSeconds(), rand.getMilliseconds());
            metaCopy.createdAt = base;
          }

          // assign randomized payment info only for mass-print (multiple templates)
          if (generatedPayments && generatedPayments.length > idx) {
            const pay = generatedPayments[idx];
            try {
              // try to find method label for display
              const methodObj = findMethodById(pay.methodId as string);
              if (methodObj) {
                metaCopy.paymentMethod = methodObj.label;
                // compute expected surcharge (based on totals.totalRupiah)
                const payInfo = computePaymentForMethod(totals.totalRupiah, methodObj);
                metaCopy.paymentAmount = pay.paidAmount;
                metaCopy.paymentSurcharge = payInfo.surcharge;
                metaCopy.paymentSurchargePercent = methodObj.surcharge?.type === 'percent' ? methodObj.surcharge.value : undefined;
              } else {
                // cash or unknown method id -> use raw values
                metaCopy.paymentMethod = String(pay.methodId ?? 'Cash');
                metaCopy.paymentAmount = pay.paidAmount;
              }
            } catch (e) {
              // fallback: just set basic fields
              metaCopy.paymentMethod = String(pay.methodId ?? 'Cash');
              metaCopy.paymentAmount = pay.paidAmount;
            }
          }
          else {
            // single/manual payment selection: reflect current `paymentMethod` and `cashAmount` state
            try {
              const pm = paymentMethod;
              if (pm) {
                // try to resolve a PaymentMethod by id or by label
                let methodObj: any = null;
                try {
                  methodObj = findMethodById(pm as string) || null;
                } catch (_) {
                  methodObj = null;
                }
                // if not found by id, try matching by label (case-insensitive)
                if (!methodObj) {
                  try {
                    if (String(pm).toLowerCase() === 'master visa' || String(pm).toLowerCase() === 'master_visa') {
                      methodObj = findMethodById('master_visa');
                    } else if (String(pm).toLowerCase() === 'bca card' || String(pm).toLowerCase() === 'bca_card') {
                      methodObj = findMethodById('bca_card');
                    }
                  } catch (e) {
                    methodObj = null;
                  }

                }

                if (methodObj) {
                  metaCopy.paymentMethod = methodObj.label;
                  const payInfo = computePaymentForMethod(totals.totalRupiah, methodObj);
                  metaCopy.paymentAmount = payInfo.gross;
                  metaCopy.paymentSurcharge = payInfo.surcharge;
                  metaCopy.paymentSurchargePercent = methodObj.surcharge?.type === 'percent' ? methodObj.surcharge.value : undefined;
                } else {
                  // if cash selected, use cashAmount if provided, otherwise use totals
                  if (String(pm).toLowerCase() === 'cash') {
                    metaCopy.paymentMethod = 'Cash';
                    const cleaned = (cashAmount || '').replace(/[^0-9.-]+/g, '');
                    const parsed = Number(cleaned);
                    metaCopy.paymentAmount = Number.isFinite(parsed) ? parsed : totals.totalRupiah;
                  } else {
                    // unknown method label — pass it through and don't set surcharge
                    metaCopy.paymentMethod = String(pm);
                    metaCopy.paymentAmount = totals.totalRupiah;
                  }
                }
              }
            } catch (e) {
              // ignore and continue
            }
          }
        } catch (e) {
          metaCopy.createdAt = date ?? new Date();
        }
        idx++;
        let html = renderInvoiceTemplate(invoiceItems, totals, metaCopy);
        if (cssText) {
          if (html.includes('</head>')) html = html.replace('</head>', `<style>${cssText}</style></head>`);
          else if (html.includes('<body')) html = html.replace('<body', `<head><style>${cssText}</style></head><body`);
          else html = `<style>${cssText}</style>` + html;
        }
        templates.push(html);
      }

      setInvoiceTemplates(templates);
      setInvoiceTemplate(templates.length ? templates[0] : null);
    })();
  }, [items, date, startInvoice, endInvoice, massPrint, selectedOutlet, paymentMethod, cashAmount]);

  // listen for height messages from the injected script inside the iframe
  React.useEffect(() => {
    function onMessage(e: MessageEvent) {
      try {
        const d = e.data as any;
        if (d && d.type === 'invoice-height' && typeof d.height === 'number') {
          // add buffer to avoid clipping bottom content
          setIframeHeight(`${d.height + 60}px`);
        }
      } catch (_) {}
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // listen for confirmation from InvoicePreviewDialog to start printing in the current tab
  React.useEffect(() => {
    const onConfirm = async (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail || {};
        const fromEvent: string[] | undefined = Array.isArray(detail.templates) ? detail.templates : undefined;

        const templatesToPrint: string[] = fromEvent && fromEvent.length > 0 ? fromEvent : invoiceTemplates && invoiceTemplates.length > 0 ? invoiceTemplates : invoiceTemplate ? [invoiceTemplate] : [];

        if (!templatesToPrint || templatesToPrint.length === 0) {
          alert('No templates available to print');
          return;
        }

        // Use a hidden iframe in the current tab to print templates sequentially.
        // This avoids opening new blank tabs/popups and keeps the user on /menu/Invoice.
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '-10000px';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        // helper to print a single template by setting srcdoc and waiting for load
        const printOne = (tpl: string) =>
          new Promise<void>((resolve) => {
            try {
              // srcdoc will trigger load event on modern browsers
              (iframe as HTMLIFrameElement).srcdoc = tpl;
            } catch (_) {
              try {
                const doc = (iframe as HTMLIFrameElement).contentDocument;
                if (doc) {
                  doc.open();
                  doc.write(tpl);
                  doc.close();
                }
              } catch (_) {}
            }

            const win = (iframe as HTMLIFrameElement).contentWindow;
            let resolved = false;
            const finish = () => {
              if (resolved) return;
              resolved = true;
              // small delay after print to let print dialog appear
              setTimeout(() => resolve(), 700);
            };

            const onLoad = () => {
              try {
                win?.focus();
                win?.print();
              } catch (_) {
                // ignore
              }
              finish();
            };

            // attach load listener with fallback timeout
            iframe.addEventListener('load', onLoad, { once: true });
            setTimeout(() => {
              // fallback: try print even if load didn't fire
              try {
                win?.focus();
                win?.print();
              } catch (_) {}
              finish();
            }, 1200);
          });

        for (const tpl of templatesToPrint) {
          try {
            // each print waits for previous to complete
            // ensure tpl is a string
            if (!tpl) continue;
            // print and wait
             
            await printOne(tpl);
            // small gap between prints
             
            await new Promise((r) => setTimeout(r, 300));
          } catch (_) {
            // ignore and continue with next template
          }
        }

        try {
          document.body.removeChild(iframe);
        } catch (_) {}
      } catch (err) {
        // generic fallback
         
        console.error('Print flow failed', err);
        alert('Print failed');
      }
    };

    window.addEventListener('invoice-preview-confirm', onConfirm as EventListener);
    return () => window.removeEventListener('invoice-preview-confirm', onConfirm as EventListener);
  }, [invoiceTemplates, invoiceTemplate]);

  function formatDate(d: Date | undefined) {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return (
    <div className="grid h-screen grid-cols-1 md:[grid-template-columns:8fr_4fr] gap-2 overflow-hidden p-0">
      {/* === Card Kiri: Generator Struk === */}
      <Card className="@container/card flex flex-col h-full min-w-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Generator invoice</CardTitle>
          <CardAction>
            <Badge variant="outline" className="flex items-center gap-1">
              <IconTrendingUp className="size-4" /> Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Form state and inputs */}
          <div className="flex flex-col gap-4 h-full">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-10">
                <Label htmlFor="outlet" className="block mb-4">
                  Outlet
                </Label>
                <OutletSelect clearToken={outletClearToken} onChange={(o) => setSelectedOutlet(o)} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="date" className="block mb-4">
                  Date
                </Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Input id="date" readOnly placeholder="Select date" value={formatDate(date)} />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <div>
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => {
                          setDate(d as Date | undefined);
                          // close popover when a date is chosen
                          setDateOpen(false);
                        }}
                      />
                      <div className="flex gap-2 items-center justify-end p-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setDate(undefined);
                            // keep popover open so user can pick again
                          }}>
                          Clear
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            setDate(today);
                            setDateOpen(false);
                          }}>
                          Today
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Label htmlFor="add-item">Add Item</Label>
            <ProductSelect
              clearToken={productClearToken}
              onSelect={(p) => {
                // add selected product to invoice items
                setItems((cur) => {
                  const exists = cur.find((it) => it.id === p.id);
                  if (exists) return cur.map((it) => (it.id === p.id ? { ...it, qty: it.qty + 1 } : it));
                  // after adding, increment clear token so ProductSelect clears itself
                  setProductClearToken((t) => t + 1);
                  return [
                    {
                      id: p.id,
                      label: p.label,
                      qty: 1,
                      price: typeof p.price === 'number' ? p.price : undefined,
                    },
                    ...cur,
                  ];
                });
              }}
            />
            {/* Items Table Placeholder — growable area */}
            <div className="flex-1 min-h-[200px] overflow-y-auto overflow-x-hidden">
              {items.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <IconGardenCartOff className="w-12 h-12" />
                  <div className="text-sm text-center">Cart is empty!</div>
                </div>
              ) : (
                <Table className="w-full table-auto min-w-0">
                  {/* <TableCaption className="text-center">Items added to the invoice</TableCaption> */}
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => (
                      <TableRow key={it.id}>
                          <TableCell className="break-words max-w-[200px]">
                            <button
                              onClick={() => {
                                setItemDialogInitial(it);
                                setItemDialogOpen(true);
                              }}
                              className="text-left w-full text-foreground hover:underline"
                            >
                              {it.label}
                            </button>
                          </TableCell>
                        <TableCell className="break-words">{it.qty}</TableCell>
                        <TableCell className="break-words">{typeof it.price === 'number' ? formatIDR(it.price) : '-'}</TableCell>
                        <TableCell className="break-words">{formatIDR(computeLineTotal({ ...it, price: it.price ?? 0 }))}</TableCell>
                        <TableCell className="w-px">
                          <button aria-label={`Remove ${it.label}`} onClick={() => setItems((cur) => cur.filter((x) => x.id !== it.id))} className="p-1 rounded hover:bg-destructive/10 text-destructive">
                            <IconTrash className="size-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Item edit/add dialog - opens when clicking an item or using a trigger */}
            <ItemInvoiceDialog
              open={itemDialogOpen}
              onOpenChange={(v) => {
                setItemDialogOpen(!!v);
                if (!v) setItemDialogInitial(null);
              }}
              initialItem={itemDialogInitial}
              onApply={(item) => {
                setItems((cur) => {
                  const exists = cur.find((it) => it.id === item.id);
                  if (exists)
                    return cur.map((it) =>
                      it.id === item.id
                        ? { ...it, qty: item.qty, price: item.price ?? it.price, appliedPromoId: item.appliedPromoId ?? it.appliedPromoId, appliedPromoName: item.appliedPromoName ?? it.appliedPromoName }
                        : it
                    );
                  return [
                    {
                      id: item.id,
                      label: item.label,
                      qty: item.qty,
                      price: item.price,
                      appliedPromoId: item.appliedPromoId,
                      appliedPromoName: item.appliedPromoName,
                    },
                    ...cur,
                  ];
                });
              }}
            />

            <Label htmlFor="payment-method">Payment Method</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select id="payment-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="appearance-none w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10">
                  <option value="Cash">Cash</option>
                  <option value="Debit bca">Debit bca</option>
                  <option value="Debit Mandiri">Debit Mandiri</option>
                  <option value="Bank Lain">Bank Lain</option>
                  <option value="Debit BNI">Debit BNI</option>
                  <option value="Debit BRI">Debit BRI</option>
                  <option value="master_visa">Master Visa</option>
                  <option value="bca_card">BCA CARD</option>
                  <option value="Transfer BCA">Transefer BCA</option>
                  <option value="Transfer Mandiri">Transefer Mandiri</option>
                  <option value="ShopeePay">ShopeePay</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" className="text-muted-foreground">
                    <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </div>
              </div>

              {paymentMethod === 'Cash' ? <input id="payment-amount" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="Amount" className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" /> : null}
            </div>
            {/* <Label htmlFor="mass-print">Mass Print</Label> */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="massprint" className="block mb-1 text-sm">
                  Mass Print
                </Label>
                <input
                  id="massprint"
                  value={massPrint}
                  onChange={(e) => {
                    const raw = e.target.value;
                    // allow empty while the user is editing, but enforce minimum value of 1
                    if (raw === '') {
                      setMassPrint('');
                      return;
                    }
                    // coerce to a finite integer
                    const num = Number(raw);
                    if (!Number.isFinite(num) || num < 1) {
                      setMassPrint('1');
                    } else {
                      // keep an integer string (remove decimals / leading zeros)
                      setMassPrint(String(Math.floor(Math.abs(num))));
                    }
                  }}
                  placeholder="Default: 1"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="startinvoice" className="block mb-1 text-sm">
                  Start Invoice
                </Label>
                <input id="startinvoice" value={startInvoice} onChange={(e) => setStartInvoice(e.target.value)} placeholder="Start invoice number" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <Label htmlFor="endinvoice" className="block mb-1 text-sm">
                  End Invoice
                </Label>
                <input id="endinvoice" value={endInvoice} onChange={(e) => setEndInvoice(e.target.value)} placeholder="End invoice number" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <Label htmlFor="startpoint" className="block mb-1 text-sm">Start Point</Label>
                <input id="startpoint" value={startPoint} onChange={(e) => setStartPoint(e.target.value)} placeholder="Start Point" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <Label htmlFor="namemember" className="block mb-1 text-sm">Name</Label>
                <input id="namemember" value={nameMember} onChange={(e) => setNameMember(e.target.value)} placeholder="Name" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <Label htmlFor="phonemember" className="block mb-1 text-sm">Phone</Label>
                <input id="phonemember" value={phoneMember} onChange={(e) => setPhoneMember(e.target.value)} placeholder="Phone" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-3" style={{ position: 'relative', zIndex: 50 }}>
          <Button
            variant="outline"
            onClick={() => {
              // clear everything
              setItems([]);
              // bump tokens to signal children to reset
              setProductClearToken((t) => t + 1);
              setOutletClearToken((t) => t + 1);
              // reset payment and amounts
              setPaymentMethod('Cash');
              setCashAmount('');
              // reset mass print/start/end
              setMassPrint('');
              setStartInvoice('');
              setEndInvoice('');
              // reset date to today
              // reset date to today
              setDate(new Date());
            }}>
            Clear
          </Button>
          {/* Print button removed: logic moved to Save & Print trigger */}

          {/* Preview trigger button (opens InvoicePreviewDialog) - open dialog and pass current live template */}
          <InvoicePreviewDialog
            open={previewOpen}
            onOpenChange={(v) => setPreviewOpen(!!v)}
            template={invoiceTemplate}
            templates={invoiceTemplates ?? undefined}
            trigger={
              <Button
                className="flex items-center gap-2"
                onClick={async () => {
                  // only open the preview; actual printing will start when the user confirms
                  setPreviewOpen(true);
                }}>
                Save & Print
              </Button>
            }
          />
        </CardFooter>
      </Card>

      {/* === Card Kanan: Pratinjau Struk === */}
      <Card className="@container/card flex flex-col h-full min-w-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Live Preview</CardTitle>
          <CardAction>
            <Badge variant="outline" className="flex items-center gap-1">
              <IconEye className="!w-6 !h-6" />
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="flex-1 flex items-center justify-center min-h-0 overflow-x-hidden">
          <div className="w-full h-full flex items-start justify-center overflow-y-auto overflow-x-hidden">
            {/* inner padded preview card */}
            <div className="bg-white rounded-lg border p-4 shadow-sm w-full max-w-[420px] h-full">
              <div className="w-full h-full flex items-start justify-center overflow-hidden">
                {!selectedOutlet ? (
                  // no outlet selected — show empty preview with eye-off icon
                  <div className="rounded-md border border-input bg-background p-4 text-muted-foreground w-[100%] h-[100%] flex flex-col items-center justify-center gap-2">
                    <IconEyeOff className="w-12 h-12" />
                    <div className="text-sm">Select outlet to live preview</div>
                  </div>
                ) : invoiceTemplate ? (
                  <div style={{ width: '8cm', height: '100%' }} className="rounded-md overflow-auto bg-white">
                    <iframe ref={iframeRef} title="Invoice preview" srcDoc={invoiceTemplate ?? undefined} className="w-full h-full border rounded-md bg-white" style={{ height: '100%' }} sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals" />
                  </div>
                ) : (
                  <div className="rounded-md border border-input bg-background p-4 text-muted-foreground w-[100%] h-[100%] flex items-center justify-center">Loading preview…</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
