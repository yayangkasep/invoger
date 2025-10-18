"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { IconDotsVertical, IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconEdit } from "@tabler/icons-react"
import { toast } from "sonner"
import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, Row, SortingState, useReactTable, VisibilityState, ColumnFiltersState, } from "@tanstack/react-table"

export type Product = {
	id: string
	Code?: string
	Name?: string
	Price?: number
	Promotion?: string
}

const columns: ColumnDef<Product>[] = [
	{
		accessorKey: "Name",
		header: () => <div className="text-left">Name</div>,
		cell: ({ row }) => <div className="truncate w-full">{row.original.Name || "-"}</div>,
	},
	{
		accessorKey: "Code",
		header: () => <div className="text-center">Code</div>,
		cell: ({ row }) => <div className="font-mono text-sm text-center">{row.original.Code || "-"}</div>,
	},
	{
		accessorKey: "Price",
		header: () => <div className="text-center">Price</div>,
		cell: ({ row }) => {
			const price = row.original.Price
			if (price === undefined || price === null || Number.isNaN(Number(price))) {
				return <div className="text-center font-mono">-</div>
			}
			const formatted = Number(price).toLocaleString("id-ID")
			return <div className="text-center font-mono">Rp {formatted}</div>
		},
	},
	{
		accessorKey: "Promotion",
		header: () => <div className="text-center">Promotion</div>,
		cell: ({ row }) => (
			<div className="flex items-center justify-center gap-2">
				<span>{row.original.Promotion || "-"}</span>
			</div>
		),
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
						<DropdownMenuItem>Delete</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		),
	},
]

export function ProductsTable({ data: initialData, loading: loadingProp, resetPaginationKey }: { data?: Product[], loading?: boolean, resetPaginationKey?: number }) {
	const [data, setData] = React.useState<Product[]>(() => initialData || [])
	const [loading, setLoading] = React.useState<boolean>(false)
	const displayLoading = typeof loadingProp === 'boolean' ? loadingProp : loading

	React.useEffect(() => {
		setData(initialData || [])
	}, [initialData])
	const [rowSelection, setRowSelection] = React.useState({})
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]) 
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 100 })

	// Reset pagination when key changes (useful when parent wants to restore defaults)
	React.useEffect(() => {
		if (typeof resetPaginationKey !== 'undefined') {
			setPagination({ pageIndex: 0, pageSize: 100 })
		}
	}, [resetPaginationKey])

	const table = useReactTable({
		data,
		columns,
		state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
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
	})

	React.useEffect(() => {
		const pageCount = table.getPageCount()
		if (pagination.pageIndex >= pageCount) {
			setPagination((p) => ({ ...p, pageIndex: Math.max(0, pageCount - 1) }))
		}
		// Only reduce pageSize when we actually have rows. This avoids setting pageSize to 0
		// during initial mount when data is empty which causes "No products" to show.
		if (data.length > 0 && pagination.pageSize > data.length) {
			setPagination((p) => ({ ...p, pageSize: data.length }))
		}
	}, [data.length, table, pagination.pageIndex, pagination.pageSize])

	const pageSizeOptions = React.useMemo(() => {
		const step = 100
		const opts: number[] = []
		const maxOptions = 10
		let next = step
		while (opts.length < maxOptions && next <= data.length) {
			opts.push(next)
			next += step
		}
		if (opts.length === 0 && data.length > 0) {
			// if there are fewer than `step` rows, offer the whole length as an option
			opts.push(data.length)
		}
		return opts
	}, [data.length])

	return (
			<div className="w-full">
				<div className="overflow-hidden rounded-lg border">
					
				{displayLoading ? (
						<div className="p-6 text-center text-sm text-muted-foreground">Load produk...</div>
				) : (
					<Table className="table-auto w-full">
						<colgroup>
							<col style={{ width: '40%' }} /> {/* Name (matches header w-2/5) */}
							<col style={{ width: '12%' }} /> {/* Code */}
							<col style={{ width: '12%' }} /> {/* Price */}
							<col style={{ width: '30%' }} /> {/* Promotion */}
							<col style={{ width: 56 }} /> {/* Action */}
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
										No products.
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

export default ProductsTable

