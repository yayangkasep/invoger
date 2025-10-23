"use client";

import * as React from "react";
import {
  IconTrendingUp,
  IconEye,
  IconGardenCartOff,
  IconCalendar,
  IconTrash,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchWithAuthClient } from "@/lib/auth/client";

function OutletSelect({ clearToken }: { clearToken?: number }) {
  const [outlets, setOutlets] = React.useState<
    Array<{ id: string; name?: string; Name?: string; Code?: string }>
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // UI state
  const [query, setQuery] = React.useState("");
  const [filtered, setFiltered] = React.useState<typeof outlets>([]);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState<number>(-1);
  const [selected, setSelected] = React.useState<{
    id: string;
    label: string;
  } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetchWithAuthClient("/api/outlets");
        if (!res.ok) throw new Error(`Failed to load outlets: ${res.status}`);
        const body = await res.json().catch(() => ({}));
        const items = Array.isArray(body?.outlets) ? body.outlets : [];
        if (!mounted) return;
        const mapped = items.map((o: any) => ({
          id: String(o.id ?? o._id ?? o.uid ?? o.id),
          name: (o.name ?? o.Name) as string | undefined,
          Code: o.code ?? o.Code,
        }));
        setOutlets(mapped);
        setFiltered(mapped);
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.error("load outlets failed", err);
        setError(String(err instanceof Error ? err.message : err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // simple client-side filter (debounced)
  React.useEffect(() => {
    const id = setTimeout(() => {
      const q = (query || "").toLowerCase().trim();
      if (!q) {
        setFiltered(outlets);
        setHighlight(-1);
        return;
      }
      const f = outlets.filter((o) =>
        (o.name ?? o.Name ?? o.Code ?? o.id).toLowerCase().includes(q)
      );
      setFiltered(f);
      setHighlight(f.length ? 0 : -1);
    }, 150);
    return () => clearTimeout(id);
  }, [query, outlets]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // only open dropdown with keyboard if user has typed something
    if (
      !open &&
      (e.key === "ArrowDown" || e.key === "ArrowUp") &&
      query.length > 0
    )
      setOpen(true);
    if (e.key === "ArrowDown")
      setHighlight((h) => Math.min((filtered.length || 0) - 1, h + 1));
    if (e.key === "ArrowUp") setHighlight((h) => Math.max(0, h - 1));
    if (e.key === "Enter" && highlight >= 0 && filtered[highlight]) {
      const o = filtered[highlight];
      selectOutlet(o.id, o.name ?? o.Name ?? o.Code ?? o.id);
    }
    if (e.key === "Escape") setOpen(false);
  };

  function selectOutlet(id: string, label: string) {
    setSelected({ id, label });
    setQuery(label);
    setOpen(false);
  }

  // when parent signals clear (token changes), reset internal UI
  React.useEffect(() => {
    if (typeof clearToken !== "undefined") {
      setSelected(null);
      setQuery("");
      setFiltered(outlets);
      setOpen(false);
      setHighlight(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearToken]);

  return (
    <div className="relative">
      <input
        id="outlet"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder={
          loading
            ? "Loading outlets..."
            : error
            ? "Failed to load outlets"
            : "Search outlets..."
        }
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
            setQuery("");
            setFiltered(outlets);
            setOpen(false);
            // focus back to input
            const el = document.getElementById("outlet") as
              | HTMLInputElement
              | null;
            el?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-destructive hover:bg-destructive/10"
        >
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
                  className={`cursor-pointer rounded px-2 py-1 text-sm ${
                    isHighlighted
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground"
                  }`}
                >
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

function ProductSelect({
  onSelect,
  clearToken,
}: {
  onSelect?: (p: { id: string; label: string; price?: number }) => void;
  clearToken?: number;
}) {
  const [items, setItems] = React.useState<
    Array<{
      id: string;
      name?: string;
      Name?: string;
      Code?: string;
      Price?: number;
    }>
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [query, setQuery] = React.useState("");
  const [filtered, setFiltered] = React.useState<typeof items>([]);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState<number>(-1);
  const [selected, setSelected] = React.useState<{
    id: string;
    label: string;
  } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetchWithAuthClient("/api/products");
        if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
        const body = await res.json().catch(() => ({}));
        const list = Array.isArray(body?.products) ? body.products : [];
        if (!mounted) return;
        const mapped = list.map((p: any) => ({
          id: String(p.id ?? p._id ?? p.uid ?? p.id),
          name: p.name ?? p.Name,
          Code: p.code ?? p.Code,
          Price:
            typeof p.price === "number"
              ? p.price
              : Number(p.Price ?? p.price ?? 0),
        }));
        setItems(mapped);
        setFiltered(mapped);
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.error("load products failed", err);
        setError(String(err instanceof Error ? err.message : err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    const id = setTimeout(() => {
      const q = (query || "").toLowerCase().trim();
      if (!q) {
        setFiltered(items);
        setHighlight(-1);
        return;
      }
      const f = items.filter((o) =>
        (o.name ?? o.Name ?? o.Code ?? o.id).toLowerCase().includes(q)
      );
      setFiltered(f);
      setHighlight(f.length ? 0 : -1);
    }, 150);
    return () => clearTimeout(id);
  }, [query, items]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      !open &&
      (e.key === "ArrowDown" || e.key === "ArrowUp") &&
      query.length > 0
    )
      setOpen(true);
    if (e.key === "ArrowDown")
      setHighlight((h) => Math.min((filtered.length || 0) - 1, h + 1));
    if (e.key === "ArrowUp") setHighlight((h) => Math.max(0, h - 1));
    if (e.key === "Enter" && highlight >= 0 && filtered[highlight]) {
      const o = filtered[highlight];
      selectProduct(o.id, o.name ?? o.Name ?? o.Code ?? o.id);
    }
    if (e.key === "Escape") setOpen(false);
  };

  function selectProduct(id: string, label: string) {
    const prod = items.find((it) => it.id === id);
    const price = prod?.Price;
    setSelected({ id, label });
    setQuery(label);
    setOpen(false);
    if (onSelect) onSelect({ id, label, price });
  }

  // when parent signals clear (token changes), reset internal UI
  React.useEffect(() => {
    if (typeof clearToken !== "undefined") {
      setSelected(null);
      setQuery("");
      setOpen(false);
      setFiltered(items);
      setHighlight(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearToken]);

  return (
    <div className="relative">
      <input
        id="add-item"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder={
          loading
            ? "Loading products..."
            : error
            ? "Failed to load products"
            : "Search products..."
        }
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
            <div className="p-2 text-sm text-muted-foreground">
              No products found
            </div>
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
                  className={`cursor-pointer rounded px-2 py-1 text-sm ${
                    isHighlighted
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground"
                  }`}
                >
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
  const [items, setItems] = React.useState<
    Array<{ id: string; label: string; qty: number; price?: number }>
  >([]);
  const [productClearToken, setProductClearToken] = React.useState(0);
  const [paymentMethod, setPaymentMethod] = React.useState<string>("Cash");
  const [cashAmount, setCashAmount] = React.useState<string>("");
  const [massPrint, setMassPrint] = React.useState<string>("");
  const [startInvoice, setStartInvoice] = React.useState<string>("");
  const [endInvoice, setEndInvoice] = React.useState<string>("");
  const [outletClearToken, setOutletClearToken] = React.useState<number>(0);
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [dateOpen, setDateOpen] = React.useState<boolean>(false);
  const [invoiceTemplate, setInvoiceTemplate] = React.useState<string | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const [iframeHeight, setIframeHeight] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    let mounted = true;
    fetch('/tempate.html')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load template')
        return r.text()
      })
      .then((txt) => {
        if (!mounted) return
        try {
          // inject a small script that posts its height to the parent and observes DOM changes
          const marker = '</body>'
          const script = `\n<script>\n(function(){\n  function sendHeight(){\n    try{\n      var h = document.documentElement.scrollHeight || document.body.scrollHeight;\n      parent.postMessage({ type: 'invoice-height', height: h }, '*');\n    }catch(e){}\n  }\n  window.addEventListener('load', sendHeight);\n  setTimeout(sendHeight,150);\n  var mo = new MutationObserver(sendHeight);\n  mo.observe(document.documentElement || document.body, { childList:true, subtree:true, attributes:true, characterData:true });\n})();\n</script>\n`;
          const injected = txt.includes(marker) ? txt.replace(new RegExp(marker, 'i'), script + marker) : txt + script
          setInvoiceTemplate(injected)
        } catch (e) {
          setInvoiceTemplate(txt)
        }
      })
      .catch(() => { if (mounted) setInvoiceTemplate(null) })
    return () => { mounted = false }
  }, [])

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

  function formatDate(d: Date | undefined) {
    if (!d) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return (
  <div className="grid h-screen grid-cols-1 md:[grid-template-columns:8fr_4fr] gap-2 overflow-hidden p-0">
      {/* === Card Kiri: Generator Struk === */}
  <Card className="@container/card flex flex-col h-full min-w-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Generator invoice
          </CardTitle>
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
                <OutletSelect clearToken={outletClearToken} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="date" className="block mb-4">
                  Date
                </Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Input
                      id="date"
                      readOnly
                      placeholder="Select date"
                      value={formatDate(date)}
                    />
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
                          }}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            setDate(today);
                            setDateOpen(false);
                          }}
                        >
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
                  if (exists)
                    return cur.map((it) =>
                      it.id === p.id ? { ...it, qty: it.qty + 1 } : it
                    );
                  // after adding, increment clear token so ProductSelect clears itself
                  setProductClearToken((t) => t + 1);
                  return [
                    {
                      id: p.id,
                      label: p.label,
                      qty: 1,
                      price: typeof p.price === "number" ? p.price : undefined,
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="break-words max-w-[200px]">{it.label}</TableCell>
                        <TableCell className="break-words">{it.qty}</TableCell>
                        <TableCell className="break-words">
                            {typeof it.price === "number"
                              ? it.price.toFixed(2)
                              : "-"}
                          </TableCell>
                        <TableCell className="w-px">
                          <button
                            aria-label={`Remove ${it.label}`}
                            onClick={() =>
                              setItems((cur) =>
                                cur.filter((x) => x.id !== it.id)
                              )
                            }
                            className="p-1 rounded hover:bg-destructive/10 text-destructive"
                          >
                            <IconTrash className="size-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <Label htmlFor="payment-method">Payment Method</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="appearance-none w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10"
                >
                  <option value="Cash">Cash</option>
                  <option value="Debit">Debit</option>
                  <option value="Credit">Credit</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    className="text-muted-foreground"
                  >
                    <path
                      d="M7 10l5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>
              </div>
              {paymentMethod === "Cash" ? (
                <input
                  id="payment-amount"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Amount"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              ) : null}
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
                  onChange={(e) => setMassPrint(e.target.value)}
                  placeholder="Option 1"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="startinvoice" className="block mb-1 text-sm">
                  Start Invoice
                </Label>
                <input
                  id="startinvoice"
                  value={startInvoice}
                  onChange={(e) => setStartInvoice(e.target.value)}
                  placeholder="Start invoice number"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="endinvoice" className="block mb-1 text-sm">
                  End Invoice
                </Label>
                <input
                  id="endinvoice"
                  value={endInvoice}
                  onChange={(e) => setEndInvoice(e.target.value)}
                  placeholder="End invoice number"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => {
            // clear everything
            setItems([])
            // bump tokens to signal children to reset
            setProductClearToken((t) => t + 1)
            setOutletClearToken((t) => t + 1)
            // reset payment and amounts
            setPaymentMethod('Cash')
            setCashAmount('')
            // reset mass print/start/end
            setMassPrint('')
            setStartInvoice('')
            setEndInvoice('')
            // reset date to today
            setDate(new Date())
          }}>Clear</Button>
          <Button onClick={() => console.log("Save invoice (dummy)")}>
            Create Invoice
          </Button>
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
                {invoiceTemplate ? (
                  <div style={{ width: '8cm', height: '100%' }} className="rounded-md overflow-auto bg-white">
                    <iframe
                      ref={iframeRef}
                      title="Invoice preview"
                      srcDoc={invoiceTemplate}
                      className="w-full h-full border rounded-md bg-white"
                      style={{ height: '100%' }}
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
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
