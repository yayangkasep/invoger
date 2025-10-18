"use client"

import * as React from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconEdit } from "@tabler/icons-react"
import { toast } from "sonner"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  ColumnFiltersState,
} from "@tanstack/react-table"


const schema = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string().optional(),
  cashier: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
})

export type Outlet = z.infer<typeof schema>

const columns: ColumnDef<Outlet>[] = [
  {
    accessorKey: "name",
    header: () => <div className="text-left">Name</div>,
    cell: ({ row }) => <div className="truncate w-full">{row.original.name || "-"}</div>,
  },
  {
    accessorKey: "code",
    header: () => <div className="text-center">Code</div>,
    cell: ({ row }) => <div className="font-mono text-sm text-center truncate">{row.original.code || "-"}</div>,
  },
  {
    accessorKey: "cashier",
    header: () => <div className="text-left">Cashier</div>,
    cell: ({ row }) => <div className="truncate w-full">{row.original.cashier || "-"}</div>,
  },
  {
    accessorKey: "address",
    header: () => <div className="text-left">Address</div>,
    cell: ({ row }) => <div className="truncate w-full">{row.original.address || "-"}</div>,
  },
  {
    accessorKey: "phone",
    header: () => <div className="text-center">Phone</div>,
    cell: ({ row }) => <div className="font-mono text-sm text-center truncate">{row.original.phone || "-"}</div>,
  },
  {
    id: "actions",
    header: () => <div className="text-center">Action</div>,
    cell: () => (
      <div className="flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="data-[state=open]:bg-muted text-muted-foreground flex size-8">
              <IconEdit />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem>Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
]

export function OutletTable({ data: initialData, optimisticItems, loading: loadingProp }: { data?: Outlet[]; optimisticItems?: Outlet[]; loading?: boolean }) {
  const [serverData, setServerData] = React.useState<Outlet[]>(() => initialData || [])
  const [loading, setLoading] = React.useState<boolean>(false)
  const displayLoading = typeof loadingProp === "boolean" ? loadingProp : loading
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 100 })

  const combinedData = React.useMemo(() => {
    const optimistic = optimisticItems || []
    const realIds = new Set(serverData.map((d) => d.id))
    const filteredOptimistic = optimistic.filter((o) => !realIds.has(o.id))
    return [...filteredOptimistic, ...serverData]
  }, [serverData, optimisticItems])

  React.useEffect(() => {
    setServerData(initialData || [])
  }, [initialData])

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
  })

  React.useEffect(() => {
    const pageCount = table.getPageCount()
    if (pagination.pageIndex >= pageCount) {
      setPagination((p) => ({ ...p, pageIndex: Math.max(0, pageCount - 1) }))
    }
    // avoid setting pageSize to 0 on initial empty dataset
    if (combinedData.length > 0 && pagination.pageSize > combinedData.length) {
      setPagination((p) => ({ ...p, pageSize: combinedData.length }))
    }
  }, [combinedData.length, table, pagination.pageIndex, pagination.pageSize])

  const pageSizeOptions = React.useMemo(() => {
    const step = 100
    const opts: number[] = []
    const maxOptions = 10
    let next = step
    while (opts.length < maxOptions && next <= combinedData.length) {
      opts.push(next)
      next += step
    }
    if (opts.length === 0 && combinedData.length > 0) opts.push(combinedData.length)
    return opts
  }, [combinedData.length])

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-lg border">
        {displayLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading outlet...</div>
        ) : (
          <Table className="table-auto w-full">
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "32%" }} />
              <col style={{ width: "12%" }} />
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
                  <TableRow key={row.id} className="relative">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
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
  )
}

export default OutletTable
