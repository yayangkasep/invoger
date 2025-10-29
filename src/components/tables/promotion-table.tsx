"use client"

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react";

type Promotion = {
  id: string;
  name: string;
  code?: string; // legacy: used previously for promo code or text
  promoText?: string; // new: explicit promo text/message
  type?: string; // 'by%' or 'discount'
  value?: number; // numeric value: percent or amount
  minQty?: number;
  price?: number;
  discount?: number; // legacy percent field
  active?: boolean;
};

export default function PromotionTable({ data, loading }: { data: Promotion[]; loading?: boolean }) {
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(100);

  // keep pageIndex valid when data length or pageSize changes
  React.useEffect(() => {
    const pageCount = Math.max(1, Math.ceil((data?.length || 0) / pageSize));
    if (pageIndex >= pageCount) setPageIndex(Math.max(0, pageCount - 1));
  }, [data?.length, pageSize, pageIndex]);

  const pageCount = Math.max(1, Math.ceil((data?.length || 0) / pageSize));
  const paginated = (data || []).slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const pageSizeOptions = React.useMemo(() => {
    const opts = [10, 20, 50, 100];
    return opts.filter((n) => n <= Math.max(100, data?.length || 0));
  }, [data?.length]);

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-lg border">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Load promotions...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <colgroup>
                <col style={{ width: '40%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: 56 }} />
              </colgroup>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-center">Value</TableHead>
                  <TableHead className="text-center">Promo Text</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                      {data?.length ? 'No promotions on this page' : 'No promotions'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((p) => (
                    <TableRow key={p.id} className="relative min-w-0">
                      <TableCell className="truncate w-full">{p.name || '-'}</TableCell>
                      <TableCell className="text-center font-mono">
                        {p.type
                          ? p.type === 'by%'
                            ? '% (by%)'
                            : p.type === 'discount'
                            ? 'Discount (Rp)'
                            : p.type === 'buy2'
                            ? 'Buy 2'
                            : p.type
                          : typeof p.discount === 'number'
                          ? '% (by%)'
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {(() => {
                          // handle buy2 specially (minQty + price)
                          if (p.type === 'buy2') {
                            const min = typeof p.minQty === 'number' ? p.minQty : undefined;
                            const pr = typeof p.price === 'number' ? p.price : undefined;
                            if (typeof min === 'number' && typeof pr === 'number') {
                              return `Min ${min} • Rp ${Number(pr).toLocaleString('id-ID')}`;
                            }
                            return '-';
                          }
                          // prefer explicit type+value
                          const val = typeof p.value === 'number' ? p.value : typeof p.discount === 'number' ? p.discount : undefined;
                          if (typeof val === 'number') {
                            if (p.type === 'discount') {
                              return `Rp ${Number(val).toLocaleString('id-ID')}`;
                            }
                            return `${val}%`;
                          }
                          return '-';
                        })()}
                      </TableCell>
                      <TableCell className="text-center font-mono">{p.promoText ?? p.code ?? '-'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="outline">Edit</Button>
                          <Button size="sm" variant="destructive">Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 mt-3">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">0 of {data?.length || 0} row(s) selected.</div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">Rows per page</Label>
            <Select value={`${pageSize}`} onValueChange={(value) => { setPageSize(Number(value)); setPageIndex(0); }}>
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue placeholder={`${pageSize}`} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((pageSizeOption) => (
                  <SelectItem key={pageSizeOption} value={`${pageSizeOption}`}>{pageSizeOption}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">Page {pageIndex + 1} of {pageCount}</div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPageIndex(0)} disabled={pageIndex === 0}>
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft />
            </Button>
            <Button variant="outline" className="size-8" size="icon" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={pageIndex === 0}>
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft />
            </Button>
            <Button variant="outline" className="size-8" size="icon" onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))} disabled={pageIndex >= pageCount - 1}>
              <span className="sr-only">Go to next page</span>
              <IconChevronRight />
            </Button>
            <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => setPageIndex(pageCount - 1)} disabled={pageIndex >= pageCount - 1}>
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
