'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconEdit } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, Row, SortingState, useReactTable, VisibilityState, ColumnFiltersState } from '@tanstack/react-table';
import EditProductDialog from '@/components/dialogs/edit-product-dialog';
import DeleteProductDialog from '@/components/dialogs/delete-product-dialog';

export type Product = {
  id: string;
  Code?: string;
  Name?: string;
  Price?: number;
  Promotion?: string;
  uuid?: string;
};

function ProductsTableContent({ data: initialData, loading: loadingProp, resetPaginationKey }: { data?: Product[]; loading?: boolean; resetPaginationKey?: number }) {
  const [data, setData] = React.useState<Product[]>(() => initialData || []);
  const [deleteOpenId, setDeleteOpenId] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const displayLoading = typeof loadingProp === 'boolean' ? loadingProp : loading;

  React.useEffect(() => {
    setData(initialData || []);
  }, [initialData]);

  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const idParam = searchParams?.get?.('ID') ?? null;
    if (idParam) {
      const found = data.find((d) => d.uuid === idParam || d.id === idParam);
      if (found) {
        if (deleteOpenId === found.id) {
          // nothing to do, delete already open
        } else {
          setSelectedProduct(found);
          setEditOpen(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, data]);

  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 100,
  });

  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (isMobile) {
      setPagination((p) => ({ ...p, pageSize: 20 }));
      setColumnVisibility({ Promotion: false });
    }
  }, [isMobile]);

  React.useEffect(() => {
    if (typeof resetPaginationKey !== 'undefined') {
      setPagination({ pageIndex: 0, pageSize: 100 });
    }
  }, [resetPaginationKey]);

  const table = useReactTable({
    data,
    columns: React.useMemo<ColumnDef<Product>[]>(
      () => [
        {
          accessorKey: 'Name',
          header: () => <div className="text-left">Name</div>,
          cell: ({ row }) => <div className="truncate w-full">{row.original.Name || '-'}</div>,
        },
        {
          accessorKey: 'Code',
          header: () => <div className="text-center">Code</div>,
          cell: ({ row }) => <div className="font-mono text-sm text-center">{row.original.Code || '-'}</div>,
        },
        {
          accessorKey: 'Price',
          header: () => <div className="text-center">Price</div>,
          cell: ({ row }) => {
            const price = row.original.Price;
            if (price === undefined || price === null || Number.isNaN(Number(price))) {
              return <div className="text-center font-mono">-</div>;
            }
            const formatted = Number(price).toLocaleString('id-ID');
            return <div className="text-center font-mono">Rp {formatted}</div>;
          },
        },
        {
          accessorKey: 'Promotion',
          header: () => <div className="text-center">Promotion</div>,
          cell: ({ row }) => (
            <div className="flex items-center justify-center gap-2">
              <span>{row.original.Promotion || '-'}</span>
            </div>
          ),
        },
        {
          id: 'actions',
          header: () => <div className="text-center">Action</div>,
          cell: ({ row }) => (
            <div className="flex justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="data-[state=open]:bg-muted text-muted-foreground flex size-8">
                    <IconEdit />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedProduct(row.original);
                      setEditOpen(true);
                      const params = new URLSearchParams(Array.from(searchParams || []));
                      params.set('ID', row.original.uuid || row.original.id);
                      router.replace(`${location.pathname}?${params.toString()}`);
                    }}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setDeleteOpenId(row.original.id);
                      const params = new URLSearchParams(Array.from(searchParams || []));
                      params.set('ID', row.original.uuid || row.original.id);
                      router.replace(`${location.pathname}?${params.toString()}`);
                    }}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        },
      ],
      [data, searchParams, router]
    ),
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  React.useEffect(() => {
    const pageCount = table.getPageCount();
    if (pagination.pageIndex >= pageCount) {
      setPagination((p) => ({ ...p, pageIndex: Math.max(0, pageCount - 1) }));
    }
    if (data.length > 0 && pagination.pageSize > data.length) {
      setPagination((p) => ({ ...p, pageSize: data.length }));
    }
  }, [data.length, table, pagination.pageIndex, pagination.pageSize]);

  const pageSizeOptions = React.useMemo(() => {
    const step = 100;
    const opts: number[] = [];
    const maxOptions = 10;
    let next = step;
    while (opts.length < maxOptions && next <= data.length) {
      opts.push(next);
      next += step;
    }
    if (opts.length === 0 && data.length > 0) {
      opts.push(data.length);
    }
    return opts;
  }, [data.length]);

  return (
    <div className="w-full">
      <EditProductDialog
        product={selectedProduct}
        open={editOpen}
        onOpenChange={(v) => {
          if (!v) setSelectedProduct(null);
          setEditOpen(v);
          if (!v) {
            const params = new URLSearchParams(Array.from(searchParams || []));
            params.delete('ID');
            router.replace(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
          }
        }}
        trigger={<></> as any}
        onUpdate={(updated) => {
          setData((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...(updated as any) } : r)));
          setEditOpen(false);
        }}
      />
      <DeleteProductDialog
        id={deleteOpenId ?? ''}
        open={deleteOpenId !== null}
        productName={deleteOpenId ? data.find((d) => d.id === deleteOpenId)?.Name : undefined}
        onOpenChange={(v) => {
          if (!v) setDeleteOpenId(null);
          if (!v) {
            const params = new URLSearchParams(Array.from(searchParams || []));
            params.delete('ID');
            router.replace(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
          }
        }}
        trigger={<></>}
        onDeleted={(deletedId) => {
          if (!deletedId) return;
          setData((prev) => prev.filter((r) => r.id !== deletedId));
          toast.success('Deleted 1 product');
          setDeleteOpenId(null);
        }}
      />
      <div className="overflow-hidden rounded-lg border">
        {displayLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Load produk...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <colgroup>
                <col style={{ width: '50%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: 56 }} />
              </colgroup>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="relative min-w-0">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="min-w-0">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={table.getAllLeafColumns().length} className="h-24 text-center">
                      No products.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-4 mt-3">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select value={`${table.getState().pagination.pageSize}`} onValueChange={(value) => table.setPageSize(Number(value))}>
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft />
            </Button>
            <Button variant="outline" className="size-8" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft />
            </Button>
            <Button variant="outline" className="size-8" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <span className="sr-only">Go to next page</span>
              <IconChevronRight />
            </Button>
            <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductsTable(props: { data?: Product[]; loading?: boolean; resetPaginationKey?: number }) {
  return (
    <React.Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>}>
      <ProductsTableContent {...props} />
    </React.Suspense>
  );
}

export default ProductsTable;