'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconEdit } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import EditOutletDialog from '@/components/dialogs/edit-outlet-dialog';
import DeleteOutletDialog from '@/components/dialogs/delete-outlet-dialog';
import { toast } from 'sonner';
import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable, VisibilityState, ColumnFiltersState } from '@tanstack/react-table';

const schema = z.object({
  id: z.string(),
  uuid: z.string().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  cashier: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type Outlet = z.infer<typeof schema>;

// Component yang menggunakan useSearchParams
function OutletTableContent({ data: initialData, optimisticItems, loading: loadingProp }: { data?: Outlet[]; optimisticItems?: Outlet[]; loading?: boolean }) {
  const [serverData, setServerData] = React.useState<Outlet[]>(() => initialData || []);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [deleteOpenId, setDeleteOpenId] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [selectedOutlet, setSelectedOutlet] = React.useState<Outlet | null>(null);
  const displayLoading = typeof loadingProp === 'boolean' ? loadingProp : loading;
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
      setColumnVisibility({ phone: false });
    }
  }, [isMobile]);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  const combinedData = React.useMemo(() => {
    const optimistic = optimisticItems || [];
    const realIds = new Set(serverData.map((d) => d.id));
    const filteredOptimistic = optimistic.filter((o) => !realIds.has(o.id));
    return [...filteredOptimistic, ...serverData];
  }, [serverData, optimisticItems]);

  React.useEffect(() => {
    setServerData(initialData || []);
  }, [initialData]);

  React.useEffect(() => {
    const idParam = searchParams?.get?.('ID') ?? null;
    if (idParam) {
      const found = serverData.find((d) => d.id === idParam || (d as any).uuid === idParam);
      if (found) {
        if (deleteOpenId === found.id) {
          // already open for delete
        } else {
          setSelectedOutlet(found);
          setEditOpen(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, serverData]);

  const columns = React.useMemo<ColumnDef<Outlet>[]>(
    () => [
      {
        accessorKey: 'name',
        header: () => <div className="text-left">Name</div>,
        cell: ({ row }) => <div className="truncate w-full max-w-full">{row.original.name || '-'}</div>,
      },
      {
        accessorKey: 'code',
        header: () => <div className="text-center">Code</div>,
        cell: ({ row }) => <div className="font-mono text-sm text-center truncate">{row.original.code || '-'}</div>,
      },
      {
        accessorKey: 'cashier',
        header: () => <div className="text-left">Cashier</div>,
        cell: ({ row }) => <div className="truncate w-full max-w-full">{row.original.cashier || '-'}</div>,
      },
      {
        accessorKey: 'address',
        header: () => <div className="text-left">Address</div>,
        cell: ({ row }) => <div className="truncate w-full max-w-full whitespace-nowrap">{row.original.address || '-'}</div>,
      },
      {
        accessorKey: 'phone',
        header: () => <div className="text-center">Phone</div>,
        cell: ({ row }) => <div className="font-mono text-sm text-center truncate">{row.original.phone || '-'}</div>,
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
                    setSelectedOutlet(row.original);
                    setEditOpen(true);
                    const params = new URLSearchParams(Array.from(searchParams || []));
                    params.set('ID', (row.original as any).uuid || row.original.id);
                    router.replace(`${location.pathname}?${params.toString()}`);
                  }}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const identifier = (row.original as any).uuid || row.original.id;
                    setDeleteOpenId(identifier);
                    const params = new URLSearchParams(Array.from(searchParams || []));
                    params.set('ID', identifier);
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
    [serverData, searchParams, router]
  );

  const table = useReactTable({
    data: combinedData,
    columns,
    state: { sorting, columnVisibility, columnFilters, pagination },
    getRowId: (row) => row.id.toString(),
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
    if (combinedData.length > 0 && pagination.pageSize > combinedData.length) {
      setPagination((p) => ({ ...p, pageSize: combinedData.length }));
    }
  }, [combinedData.length, table, pagination.pageIndex, pagination.pageSize]);

  const pageSizeOptions = React.useMemo(() => {
    const step = 100;
    const opts: number[] = [];
    const maxOptions = 10;
    let next = step;
    while (opts.length < maxOptions && next <= combinedData.length) {
      opts.push(next);
      next += step;
    }
    if (opts.length === 0 && combinedData.length > 0) opts.push(combinedData.length);
    return opts;
  }, [combinedData.length]);

  return (
    <div className="w-full">
      <EditOutletDialog
        outlet={selectedOutlet}
        open={editOpen}
        onOpenChange={(v) => {
          if (!v) setSelectedOutlet(null);
          setEditOpen(v);
          if (!v) {
            const params = new URLSearchParams(Array.from(searchParams || []));
            params.delete('ID');
            router.replace(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
          }
        }}
        trigger={<></>}
        onUpdate={(updated) => {
          setServerData((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...(updated as any) } : r)));
          setEditOpen(false);
        }}
      />
      <DeleteOutletDialog
        id={deleteOpenId ?? ''}
        open={deleteOpenId !== null}
        outletName={deleteOpenId ? serverData.find((d) => d.id === deleteOpenId || (d as any).uuid === deleteOpenId)?.name : undefined}
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
          setServerData((prev) => prev.filter((r) => r.id !== deletedId && (r as any).uuid !== deletedId));
          toast.success('Deleted 1 outlet');
          setDeleteOpenId(null);
        }}
      />
      <div className="overflow-hidden rounded-lg border">
        {displayLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading outlet...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '50%' }} />
                <col style={{ width: '12%' }} />
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
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No outlets.
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

// Wrapper component dengan Suspense
export function OutletTable(props: { data?: Outlet[]; optimisticItems?: Outlet[]; loading?: boolean }) {
  return (
    <React.Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>}>
      <OutletTableContent {...props} />
    </React.Suspense>
  );
}

export default OutletTable;