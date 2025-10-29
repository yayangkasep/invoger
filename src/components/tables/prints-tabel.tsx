'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { IconTrash } from '@tabler/icons-react';
import useSelectOutlets from '@/hooks/select-outlets';
import computeTotals from '@/lib/utils/calculator';
import renderPrintTemplate from '@/lib/utils/prints-template';
import { escapeHtml, formatAddressForHtml, formatTextLinesToHtml, formatPhoneForHtml } from '@/lib/utils/format-address-phone';

// Define simple types used by this component
type Align = 'left' | 'center' | 'right';
type HeaderBlock = {
  id: string;
  text: string;
  bold?: boolean;
  italic?: boolean;
  align?: Align;
};
type FooterBlock = {
  id: string;
  text: string;
  bold?: boolean;
  italic?: boolean;
  align?: Align;
};

function PrintsTable() {
  const isMobile = useIsMobile();
  const { outlets, loading, error } = useSelectOutlets();

  // outlet search UI state
  const [query, setQuery] = React.useState('');
  const [filtered, setFiltered] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState<number>(-1);
  const [selected, setSelected] = React.useState<any | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // header/footer editor state
  const [headerBlocks, setHeaderBlocks] = React.useState<HeaderBlock[]>([]);
  const headerRefs = React.useRef<Record<string, Record<number, HTMLTextAreaElement | null>>>({});
  const [focusHeaderId, setFocusHeaderId] = React.useState<string | null>(null);
  const [footerBlocks, setFooterBlocks] = React.useState<FooterBlock[]>([]);
  const [footerTemplate, setFooterTemplate] = React.useState<string | null>(null);
  // keep the original/default template loaded from server so we can restore
  const [defaultHeaderBlocks, setDefaultHeaderBlocks] = React.useState<HeaderBlock[] | null>(null);
  const [defaultFooterBlocks, setDefaultFooterBlocks] = React.useState<FooterBlock[] | null>(null);

  // preview/iframe state
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const iframeInitialHeightRef = React.useRef<number | null>(null);
  const [iframeHeight, setIframeHeight] = React.useState<string | undefined>(undefined);
  const [previewHtml, setPreviewHtml] = React.useState<string | null>(null);

  // helper generate id (use crypto.randomUUID when available)
  const genId = React.useCallback((prefix: string) => {
    try {
      if (typeof window !== 'undefined' && (window.crypto as any)?.randomUUID) {
        return `${prefix}-${(window.crypto as any).randomUUID()}`;
      }
    } catch (_) {}
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }, []);

  // saving state
  const [saving, setSaving] = React.useState(false);

  async function saveTemplate() {
    if (!selected) return alert('Pilih outlet terlebih dahulu');
    setSaving(true);
    try {
      const payload = {
        outletId: selected.id,
        outletLabel: selected.name ?? selected.Name ?? selected.label ?? null,
        headerBlocks: headerBlocks || [],
        footerBlocks: footerBlocks || [],
        footerTemplate: footerTemplate || null,
        updatedAt: new Date().toISOString(),
      } as any;

      const res = await fetch('/api/prints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Save template failed', body);
        alert('Failed to save template: ' + (body?.error || res.statusText));
      } else {
        alert('Template saved successfully');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save template due to network error');
    } finally {
      setSaving(false);
    }
  }

  React.useEffect(() => {
    setFiltered(outlets || []);
  }, [outlets]);

  // simple client-side filter (debounced)
  React.useEffect(() => {
    const id = setTimeout(() => {
      const q = (query || '').toLowerCase().trim();
      if (!q) {
        setFiltered(outlets || []);
        setHighlight(-1);
        return;
      }
      const f = (outlets || []).filter((o: any) => (o.name ?? o.Name ?? o.Code ?? o.id).toLowerCase().includes(q));
      setFiltered(f);
      setHighlight(f.length ? 0 : -1);
    }, 150);
    return () => clearTimeout(id);
  }, [query, outlets]);

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
    // try to find full outlet object from loaded outlets; fallback to id/label
    const found = (outlets || []).find((o: any) => o.id === id) || {
      id,
      name: label,
    };
    setSelected(found);
    setQuery(label);
    setOpen(false);

    // Immediately populate header blocks from the selected outlet so the
    // editor shows the outlet-specific values right away (avoid stale state
    // when switching outlets).
    try {
      const f = found as any;
      const storeName = f.storeName ?? f.StoreName ?? 'RAJA SUSU';
      const outletName = f.name ?? f.Name ?? f.label ?? '';
      const addr = f.address ?? f.raw?.address ?? f.Address ?? '';
      const phone = f.phone ?? f.Phone ?? '';
      const blocks: HeaderBlock[] = [];
      blocks.push({
        id: 'h-store',
        text: storeName,
        bold: true,
        align: 'center',
      });
      blocks.push({
        id: 'h-outlet',
        text: outletName,
        bold: false,
        align: 'center',
      });
      if (addr) blocks.push({ id: 'h-addr', text: addr, bold: false, align: 'center' });
      if (phone)
        blocks.push({
          id: 'h-phone',
          text: `Tlp ${phone}`,
          bold: false,
          align: 'center',
        });
      setHeaderBlocks(blocks);
      // Initially assume defaults are the outlet-derived blocks until we fetch
      // a saved template from the server.
      setDefaultHeaderBlocks(blocks);

      // Reset footer blocks to match footerTemplate (if any) so preview updates
      // when changing outlets. We will then attempt to fetch a saved template
      // from the server and overwrite these if a saved template exists.
      if (footerTemplate) {
        const lines = footerTemplate
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        const fblocks: FooterBlock[] = lines.map((ln, i) => ({
          id: genId(`f-${i}`),
          text: ln,
          bold: false,
          italic: false,
          align: 'center',
        }));
        setFooterBlocks(fblocks);
        setDefaultFooterBlocks(fblocks);
      } else {
        setFooterBlocks([]);
        setDefaultFooterBlocks(null);
      }

      // fetch saved prints-template from server for this outlet and prefer
      // server values when present (headerBlocks/footerBlocks/footerTemplate)
      (async () => {
        try {
          const res = await fetch(`/api/prints?outletId=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
          if (!res.ok) return;
          const body = await res.json().catch(() => ({}));
          const tpl = body?.template;
          if (!tpl) return;

          // apply server header blocks if present
          if (Array.isArray(tpl.headerBlocks) && tpl.headerBlocks.length > 0) {
            setHeaderBlocks(tpl.headerBlocks as HeaderBlock[]);
            setDefaultHeaderBlocks(tpl.headerBlocks as HeaderBlock[]);
          }

          // apply server footer blocks / template if present
          if (Array.isArray(tpl.footerBlocks) && tpl.footerBlocks.length > 0) {
            setFooterBlocks(tpl.footerBlocks as FooterBlock[]);
            setDefaultFooterBlocks(tpl.footerBlocks as FooterBlock[]);
            if (tpl.footerTemplate) setFooterTemplate(tpl.footerTemplate as string);
          } else if (typeof tpl.footerTemplate === 'string' && tpl.footerTemplate.trim().length > 0) {
            const lines = (tpl.footerTemplate as string)
              .split('\n')
              .map((l: string) => l.trim())
              .filter(Boolean);
            const fblocks: FooterBlock[] = lines.map((ln, i) => ({
              id: genId(`f-${i}`),
              text: ln,
              bold: false,
              italic: false,
              align: 'center',
            }));
            setFooterBlocks(fblocks);
            setDefaultFooterBlocks(fblocks);
            setFooterTemplate(tpl.footerTemplate as string);
          }
        } catch (e) {
          // ignore fetch errors - fallback to outlet defaults already set above
        }
      })();
    } catch (_) {
      // ignore
    }
  }

  // build preview when selected/outlet/header/footer changes
  React.useEffect(() => {
    if (!selected) {
      setPreviewHtml(null);
      return;
    }
    // If headerBlocks is empty, compute initial blocks from selected outlet.
    // Use a local `initialBlocks` so we can generate preview immediately without
    // relying on state updates (which are async) and causing stale reads.
    let initialBlocks: HeaderBlock[] | undefined = undefined;
    if (!headerBlocks || headerBlocks.length === 0) {
      const storeName = selected.storeName ?? selected.StoreName ?? 'RAJA SUSU';
      const outletName = selected.name ?? selected.Name ?? selected.label ?? '';
      const addr = selected.address ?? selected.raw?.address ?? selected.Address ?? '';
      const phone = selected.phone ?? selected.Phone ?? '';
      const blocks: HeaderBlock[] = [];
      // 1) storeName (bold)
      blocks.push({
        id: 'h-store',
        text: storeName,
        bold: true,
        align: 'center',
      });
      // 2) outlet name
      blocks.push({
        id: 'h-outlet',
        text: outletName,
        bold: false,
        align: 'center',
      });
      // 3) address
      if (addr) blocks.push({ id: 'h-addr', text: addr, bold: false, align: 'center' });
      // 4) phone
      if (phone)
        blocks.push({
          id: 'h-phone',
          text: `Tlp ${phone}`,
          bold: false,
          align: 'center',
        });
      initialBlocks = blocks;
      // update state so editor shows these blocks (won't be immediately available in this render)
      setHeaderBlocks(blocks);
    }

    // populate footerBlocks from footerTemplate if empty
    let initialFooterBlocks: FooterBlock[] | undefined = undefined;
    if ((!footerBlocks || footerBlocks.length === 0) && footerTemplate) {
      const lines = footerTemplate
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const fblocks: FooterBlock[] = lines.map((ln, i) => ({
        id: genId(`f-${i}`),
        text: ln,
        bold: false,
        italic: false,
        align: 'center',
      }));
      initialFooterBlocks = fblocks;
      setFooterBlocks(fblocks);
    }

    const items = [
      { label: 'Sample Item', qty: 2, price: 15000 },
      { label: 'Another Item', qty: 1, price: 5000 },
    ];
    const totals = computeTotals(
      items.map((i) => ({ ...i, price: i.price ?? 0 })),
      { format: false }
    );
    // Determine the blocks to use for generating headerHtml. Prefer current state
    // but if we just computed initialBlocks use that (avoids stale empty-state reads).
    const effectiveBlocks = headerBlocks && headerBlocks.length > 0 ? headerBlocks : initialBlocks ?? [];
    const storeNameFromBlocks = effectiveBlocks.length > 0 ? effectiveBlocks[0].text : selected.storeName ?? selected.StoreName ?? selected.name ?? selected.Name ?? selected.label ?? '';
    const blocksForHtml = effectiveBlocks.slice(1);
    // detect whether a phone block exists so we can insert a spacer after address
    const hasPhoneBlock = blocksForHtml.some((bb) => bb.id === 'h-phone');
    const headerHtml = blocksForHtml
      .map((b) => {
        const align = b.align === 'left' ? 'left' : b.align === 'right' ? 'right' : 'center';
        // For address/phone blocks prefer preserving the editor's explicit
        // newline boundaries (one textarea per logical line). This avoids
        // re-splitting on commas which could change the user's intended
        // line breaks. For other blocks use the shared formatter.
        let contentHtml = '';
        if (b.id === 'h-addr' || b.id === 'h-phone') {
          contentHtml = String(b.text || '')
            .split('\n')
            .map((p) => escapeHtml(String(p).trim()))
            .filter(Boolean)
            .join('<br>');
        } else {
          contentHtml = formatTextLinesToHtml(b.text || '');
        }
        if (b.bold) contentHtml = `<strong>${contentHtml}</strong>`;
        if (b.italic) contentHtml = `<em>${contentHtml}</em>`;
        // when this is the address block and a phone block exists, add a non-breaking
        // spacer to ensure a visible blank line between address and phone in the
        // final rendered headerHtml (we add &nbsp; inside a div so CSS won't collapse it)
        if (b.id === 'h-addr' && hasPhoneBlock) {
          // insert two non-breaking-space divs to create two visible blank lines
          return `<div style="text-align:${align};">${contentHtml}</div><div>&nbsp;</div>`;
        }
        // after phone block, add a small height spacer so there's gap before cashier
        if (b.id === 'h-phone') {
          return `<div style="text-align:${align};">${contentHtml}</div><div style="height:6px"></div>`;
        }
        return `<div style="text-align:${align};">${contentHtml}</div>`;
      })
      .join('');

    // build footerHtml from footerBlocks (prefer state, fallback to initialFooterBlocks)
    const effectiveFooterBlocks = footerBlocks && footerBlocks.length > 0 ? footerBlocks : initialFooterBlocks ?? [];
    // compute created timestamp for footer
    const created = new Date();
    const createdStr = `${String(created.getDate()).padStart(2, '0')} ${created.toLocaleString(undefined, { month: 'short' })} ${created.getFullYear()} ${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(2, '0')}`;
    const footerLinesHtml = effectiveFooterBlocks
      .map((b, idx) => {
        let content = formatTextLinesToHtml(b.text || '');
        if (b.bold) content = `<strong>${content}</strong>`;
        if (b.italic) content = `<em>${content}</em>`;
        const align = b.align === 'left' ? 'left' : b.align === 'right' ? 'right' : 'center';
        // use a block-level element for per-line alignment and add a <br/> between blocks
        return `<div style="text-align: ${align};">${content}${idx < effectiveFooterBlocks.length - 1 ? '<br/>' : ''}</div>`;
      })
      .join('\n');

    const footerHtml = `
      <div class="text-center my-2"></div>
      <div>
        ${footerLinesHtml}
      </div>
      <div class="text-center"></div>
      <!-- spacer between footer lines and created timestamp -->
      <div style="height:8px; line-height:8px">&nbsp;</div>
      <div class="text-center mt-3">
        <p class="m-0"> Created : ${escapeHtml(createdStr)} </p>
      </div>
    `;

    const meta: any = {
      // storeName goes to the template h2, headerHtml contains other header blocks
      storeName: (storeNameFromBlocks || selected.name) ?? selected.Name ?? selected.label,
      headerHtml: headerHtml || undefined,
      outletName: selected.name ?? selected.Name ?? selected.label,
      address: selected.address ?? selected.raw?.address ?? '',
      phone: selected.phone ?? '',
      // Prefer footerHtml (from editor blocks). If footerHtml exists, do not
      // pass footerText to the template to avoid duplicate rendering.
      footerText: footerHtml && footerHtml.length > 0 ? undefined : footerTemplate || undefined,
      footerHtml: footerHtml || undefined,
      cashier: selected.cashier ?? '',
      // pass invoice/outlet code so prints-template can build a SO/receipt number
      invoiceNumber: (selected.invoiceNumber as any) ?? (selected.InvoiceNumber as any) ?? (selected.code as any) ?? (selected.Code as any) ?? undefined,
      outletCode: (selected.code as any) ?? (selected.Code as any) ?? undefined,
      createdAt: new Date(),
    };
    const html = renderPrintTemplate(items, totals, meta);
    setPreviewHtml(html);
  }, [selected, headerBlocks, footerTemplate, footerBlocks]);

  // listen for iframe height messages so preview can fit (same pattern as invoice table)
  React.useEffect(() => {
    function onMessage(e: MessageEvent) {
      try {
        const d = e.data as any;
        if (d && d.type === 'invoice-height' && typeof d.height === 'number') {
          // preserve the initial iframe height reported on first load so the
          // preview keeps its original size even if the content later grows
          // (e.g., client increases font size or adds lines).
          const reported = Number(d.height) + 60;
          if (iframeInitialHeightRef.current == null) {
            iframeInitialHeightRef.current = reported;
            setIframeHeight(`${reported}px`);
          } else {
            // keep using the initial height (do not expand)
            setIframeHeight(`${iframeInitialHeightRef.current}px`);
          }
        }
      } catch (_) {}
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // focus the header textarea when requested (after inserting new block)
  React.useEffect(() => {
    if (!focusHeaderId) return;
    // focusHeaderId may be composite: "blockId::lineIndex"
    const parts = focusHeaderId.split('::');
    const blockId = parts[0];
    const lineIndex = parts.length > 1 ? Number(parts[1]) : 0;
    const el = headerRefs.current[blockId] ? headerRefs.current[blockId][lineIndex] : null;
    if (el) {
      try {
        el.focus();
        const len = el.value?.length ?? 0;
        el.setSelectionRange(len, len);
      } catch (_) {
        // ignore
      }
    }
    setFocusHeaderId(null);
  }, [focusHeaderId]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
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
                  // clear editors and preview so UI resets
                  setHeaderBlocks([]);
                  setFooterBlocks([]);
                  setPreviewHtml(null);
                  iframeInitialHeightRef.current = null;
                  setIframeHeight(undefined);
                  // focus back to local input via ref
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-destructive hover:bg-destructive/10">
                <IconTrash size={16} />
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
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              // open previewHtml in a new window and trigger print
              if (!previewHtml) return;
              const w = window.open('', '_blank');
              if (!w) return;
              try {
                w.document.open();
                w.document.write(previewHtml);
                w.document.close();
                // focus and attempt to print when the new window is ready
                try {
                  w.focus();
                } catch (_) {}
                const doPrint = () => {
                  try {
                    w.print();
                  } catch (_) {}
                };
                // prefer load event, fallback to timeout
                if (w.addEventListener) {
                  w.addEventListener('load', () => setTimeout(doPrint, 100));
                } else {
                  setTimeout(doPrint, 500);
                }
              } catch (e) {
                // ignore errors (popup blockers, etc.)
              }
            }}>
            Test Print
          </Button>
          <Button onClick={saveTemplate} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
      {selected ? (
        // prevent grid items from stretching to the height of the tallest column
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-start">
          <Card className="h-full flex flex-col min-h-0">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Editor Header</CardTitle>
              <div>
                <Button
                  size="sm"
                  onClick={() => {
                    const id = genId('h');
                    setHeaderBlocks((s) => [
                      ...s,
                      {
                        id,
                        text: '',
                        bold: false,
                        italic: false,
                        align: 'center',
                      },
                    ]);
                  }}>
                  + Tambah
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="flex flex-col gap-3">
                {(headerBlocks || []).map((b, idx) => {
                  return (
                    <div key={b.id} className="border rounded p-2">
                      <div className="mb-2 relative">
                        {/* For normal header blocks render single textarea; for address block render multiple line textareas */}
                        {b.id === 'h-addr' || b.id === 'h-phone' ? (
                          (() => {
                            const lines = String(b.text || '').split('\n');
                            return (
                              <div>
                                {lines.map((line, li) => (
                                  <div key={li} className="flex items-start gap-2 mb-2">
                                    <textarea
                                      ref={(el) => {
                                        headerRefs.current[b.id] = headerRefs.current[b.id] || {};
                                        headerRefs.current[b.id][li] = el;
                                        return undefined;
                                      }}
                                      className={`flex-1 w-full resize-none rounded border p-2 text-sm break-words`}
                                      rows={1}
                                      value={line}
                                      onChange={(e) => {
                                        // strip newline characters from user input so Enter doesn't create
                                        // a new logical line; new lines are only created by the + button
                                        const newLineRaw = e.target.value;
                                        const newLine = newLineRaw.replace(/\r?\n/g, '');
                                        setHeaderBlocks((s) =>
                                          s.map((x) => {
                                            if (x.id !== b.id) return x;
                                            const parts = String(x.text || '').split('\n');
                                            parts[li] = newLine;
                                            return {
                                              ...x,
                                              text: parts.join('\n'),
                                            };
                                          })
                                        );
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          // prevent Enter from inserting newlines/create new textareas
                                          e.preventDefault();
                                          // move focus to next line if present
                                          const parts = String(b.text || '').split('\n');
                                          const next = li + 1;
                                          if (next < parts.length) {
                                            setFocusHeaderId(`${b.id}::${next}`);
                                          }
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      title="Hapus baris"
                                      onClick={() => {
                                        setHeaderBlocks((s) =>
                                          s.map((x) => {
                                            if (x.id !== b.id) return x;
                                            const parts = String(x.text || '').split('\n');
                                            const newParts = parts.filter((_, idx) => idx !== li);
                                            return {
                                              ...x,
                                              text: newParts.join('\n'),
                                            };
                                          })
                                        );
                                        // focus neighboring line after deletion
                                        setTimeout(() => {
                                          const prevLines = lines.length;
                                          const target = li < prevLines - 1 ? li : Math.max(0, li - 1);
                                          setFocusHeaderId(`${b.id}::${target}`);
                                        }, 0);
                                      }}
                                      className="p-1 text-destructive rounded hover:bg-destructive/10">
                                      <IconTrash size={16} />
                                    </button>
                                  </div>
                                ))}
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    title={b.id === 'h-addr' ? 'Tambah baris alamat' : 'Tambah baris telepon'}
                                    onClick={() => {
                                      // append an empty line to the address/phone block
                                      setHeaderBlocks((s) => {
                                        return s.map((x) => {
                                          if (x.id !== b.id) return x;
                                          const cur = String(x.text || '');
                                          // ensure a new blank line is added even when current text is empty
                                          const newText = cur ? cur + '\n' : '\n';
                                          return { ...x, text: newText };
                                        });
                                      });
                                      // focus the newly created line (which will be at index = previous lines.length)
                                      const newIndex = String(b.text || '').split('\n').length;
                                      setTimeout(() => setFocusHeaderId(`${b.id}::${newIndex}`), 0);
                                    }}
                                    className="rounded bg-accent px-2 py-0.5 text-xs text-accent-foreground hover:brightness-95">
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <textarea
                            ref={(el) => {
                              headerRefs.current[b.id] = headerRefs.current[b.id] || {};
                              headerRefs.current[b.id][0] = el;
                              return undefined;
                            }}
                            className={`w-full resize-none rounded border p-2 text-sm whitespace-nowrap overflow-x-auto overflow-y-hidden`}
                            rows={1}
                            value={b.text}
                            onChange={(e) => {
                              setHeaderBlocks((s) => s.map((x) => (x.id === b.id ? { ...x, text: e.target.value } : x)));
                            }}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-1 text-sm">
                          <input type="checkbox" checked={!!b.bold} onChange={(e) => setHeaderBlocks((s) => s.map((x) => (x.id === b.id ? { ...x, bold: e.target.checked } : x)))} />
                          <span className="ml-1">Tebal</span>
                        </label>
                        <label className="inline-flex items-center gap-1 text-sm">
                          <input type="checkbox" checked={!!b.italic} onChange={(e) => setHeaderBlocks((s) => s.map((x) => (x.id === b.id ? { ...x, italic: e.target.checked } : x)))} />
                          <span className="ml-1">Miring</span>
                        </label>
                        <div className="flex items-center gap-1 text-sm">
                          <span>Posisi:</span>
                          <select value={b.align} onChange={(e) => setHeaderBlocks((s) => s.map((x) => (x.id === b.id ? { ...x, align: e.target.value as any } : x)))} className="rounded border px-2 py-1 text-sm">
                            <option value="left">Kiri</option>
                            <option value="center">Tengah</option>
                            <option value="right">Kanan</option>
                          </select>
                        </div>
                        <div className="ml-auto">
                          <button onClick={() => setHeaderBlocks((s) => s.filter((x) => x.id !== b.id))} className="text-destructive p-1 rounded hover:bg-destructive/10">
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            {/* <CardFooter>
              <div className="text-xs text-muted-foreground">Header editor</div>
            </CardFooter> */}
          </Card>

          <Card className="h-full flex flex-col min-h-0">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Editor Footer</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    // add a new empty footer block
                    const id = genId('f');
                    setFooterBlocks((s) => [
                      ...s,
                      {
                        id,
                        text: '',
                        bold: false,
                        italic: false,
                        align: 'center',
                      },
                    ]);
                  }}>
                  + Tambah
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    // Restore to the saved defaults (from server) if available.
                    // If no saved defaults exist, fall back to built-in defaults.
                    const builtIn = ['Harga sudah termasuk PPN 11%', 'www.rajasusu.com', 'Follow IG: rajasusu_official', 'Terima Kasih'];

                    // restore header as well if we have server defaults
                    if (defaultHeaderBlocks && defaultHeaderBlocks.length > 0) {
                      setHeaderBlocks(defaultHeaderBlocks);
                    } else if (selected) {
                      // re-create header from selected outlet data
                      const f = selected as any;
                      const storeName = f.storeName ?? f.StoreName ?? 'RAJA SUSU';
                      const outletName = f.name ?? f.Name ?? f.label ?? '';
                      const addr = f.address ?? f.raw?.address ?? f.Address ?? '';
                      const phone = f.phone ?? f.Phone ?? '';
                      const blocks: HeaderBlock[] = [];
                      blocks.push({
                        id: 'h-store',
                        text: storeName,
                        bold: true,
                        align: 'center',
                      });
                      blocks.push({
                        id: 'h-outlet',
                        text: outletName,
                        bold: false,
                        align: 'center',
                      });
                      if (addr)
                        blocks.push({
                          id: 'h-addr',
                          text: addr,
                          bold: false,
                          align: 'center',
                        });
                      if (phone)
                        blocks.push({
                          id: 'h-phone',
                          text: `Tlp ${phone}`,
                          bold: false,
                          align: 'center',
                        });
                      setHeaderBlocks(blocks);
                    }

                    if (defaultFooterBlocks && defaultFooterBlocks.length > 0) {
                      setFooterBlocks(defaultFooterBlocks);
                      setFooterTemplate(defaultFooterBlocks.map((b) => b.text).join('\n'));
                    } else {
                      const blocks = builtIn.map((ln, i) => ({
                        id: genId(`f-${i}`),
                        text: ln,
                        bold: false,
                        italic: false,
                        align: 'center' as const,
                      }));
                      setFooterBlocks(blocks);
                      setFooterTemplate(builtIn.join('\n'));
                    }
                  }}>
                  Restore default
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="flex flex-col gap-3">
                {(footerBlocks || []).map((b, idx) => (
                  <div key={b.id} className="border rounded p-2">
                    <div className="mb-2">
                      <textarea className="w-full resize-none rounded border p-2 text-sm whitespace-nowrap overflow-x-auto overflow-y-hidden" rows={1} value={b.text} onChange={(e) => setFooterBlocks((s) => s.map((x) => (x.id === b.id ? { ...x, text: e.target.value } : x)))} />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1 text-sm">
                        <input type="checkbox" checked={!!b.bold} onChange={(e) => setFooterBlocks((s) => s.map((x) => (x.id === b.id ? { ...x, bold: e.target.checked } : x)))} /> <span className="ml-1">Tebal</span>
                      </label>
                      <label className="inline-flex items-center gap-1 text-sm">
                        <input type="checkbox" checked={!!b.italic} onChange={(e) => setFooterBlocks((s) => s.map((x) => (x.id === b.id ? { ...x, italic: e.target.checked } : x)))} /> <span className="ml-1">Miring</span>
                      </label>
                      <div className="flex items-center gap-1 text-sm">
                        <span>Posisi:</span>
                        <select
                          value={b.align ?? 'center'}
                          onChange={(e) => {
                            const val = e.target.value as HeaderBlock['align'];
                            setFooterBlocks((s) => s.map((x) => (x.id === b.id ? { ...x, align: val } : x)));
                          }}
                          className="rounded border px-2 py-1 text-sm">
                          <option value="left">Kiri</option>
                          <option value="center">Tengah</option>
                          <option value="right">Kanan</option>
                        </select>
                      </div>
                      <div className="ml-auto">
                        <button onClick={() => setFooterBlocks((s) => s.filter((x) => x.id !== b.id))} className="text-destructive p-1 rounded hover:bg-destructive/10">
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            {/* <CardFooter>
              <div className="text-xs text-muted-foreground">Footer editor</div>
            </CardFooter> */}
          </Card>

          <Card className="h-full flex flex-col min-h-0">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center overflow-auto">
              <div className="w-full h-full flex items-start justify-center">
                {previewHtml ? (
                  // use maxHeight and internal scrolling so the iframe's tall content
                  // doesn't stretch the parent card/column. iframe will render at
                  // 100% height of this container and the container scrolls when needed.
                  <div
                    // use the iframeHeight reported by the iframe so the white
                    // preview area expands to show the full rendered content.
                    style={{
                      width: '8cm',
                      height: iframeHeight || '520px',
                      overflow: 'auto',
                    }}
                    className="rounded-md bg-white overflow-y-auto no-scrollbar">
                    <iframe
                      ref={iframeRef}
                      title="Print preview"
                      srcDoc={previewHtml}
                      className="w-full border-none rounded-md bg-white block"
                      // iframe will fill the container height; container provides minHeight
                      style={{
                        height: '100%',
                        display: 'block',
                        border: 'none',
                      }}
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-input bg-background p-4 text-muted-foreground w-[100%] h-[100%] flex items-center justify-center">No preview available</div>
                )}
              </div>
            </CardContent>
            {/* <CardFooter>
              <div className="text-xs text-muted-foreground">
                Live preview of header/footer and sample items
              </div>
            </CardFooter> */}
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default PrintsTable;
export { PrintsTable };
