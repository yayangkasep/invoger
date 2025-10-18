"use client"

import * as React from "react"
import { IconTrendingUp, IconEye, IconGardenCartOff, IconCalendar } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption } from "@/components/ui/table"
import { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function InvoiceTable() {
	const [items, setItems] = React.useState<Record<string, unknown>[]>([])
	const [date, setDate] = React.useState<Date | undefined>(new Date())
	const [dateOpen, setDateOpen] = React.useState<boolean>(false)

	function formatDate(d: Date | undefined) {
		if (!d) return ''
		const day = String(d.getDate()).padStart(2, '0')
		const month = String(d.getMonth() + 1).padStart(2, '0')
		const year = d.getFullYear()
		return `${day}/${month}/${year}`
	}
	return (
		<div className="grid h-screen grid-cols-1 md:[grid-template-columns:8fr_4fr] gap-2 overflow-hidden p-0">
			{/* === Card Kiri: Generator Struk === */}
			<Card className="@container/card flex flex-col h-full">
				<CardHeader>
					<CardTitle className="text-lg font-semibold">Generator invoice</CardTitle>
					<CardAction>
						<Badge variant="outline" className="flex items-center gap-1">
							<IconTrendingUp className="size-4" /> Active
						</Badge>
					</CardAction>
				</CardHeader>
				<CardContent className="flex-1 overflow-auto">
					{/* Form state and inputs */}
					<div className="flex flex-col gap-4 h-full">
						<div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
							<div className="sm:col-span-10">
								<Label htmlFor="outlet" className="block mb-4">Outlet</Label>
								<Input id="outlet" placeholder="Select outlet" />
							</div>
							<div className="sm:col-span-2">
								<Label htmlFor="date" className="block mb-4">Date</Label>
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
													setDate(d as Date | undefined)
													// close popover when a date is chosen
													setDateOpen(false)
												}}
											/>
											<div className="flex gap-2 items-center justify-end p-2">
												<Button
													variant="secondary"
													size="sm"
													onClick={() => {
														setDate(undefined)
														// keep popover open so user can pick again
													}}
												>
													Clear
												</Button>
												<Button
													variant="secondary"
													size="sm"
													onClick={() => {
														const today = new Date()
														setDate(today)
														setDateOpen(false)
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
						<Input id="add-item" placeholder="Add item" />
						{/* Items Table Placeholder — growable area */}
						<div className="flex-1 min-h-[250px] overflow-auto">
							{items.length === 0 ? (
								<div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
									<IconGardenCartOff className="w-12 h-12" />
									<div className="text-sm text-center">Items added to the invoice</div>
								</div>
							) : (
								<Table className="min-w-full">
									<TableCaption className="text-center">Items added to the invoice</TableCaption>
									<TableHeader>
										<TableRow>
											<TableHead>Item</TableHead>
											<TableHead>Quantity</TableHead>
											<TableHead>Price</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{/* Rows will be dynamically generated here */}
									</TableBody>
								</Table>
							)}
						</div>
						<Label htmlFor="payment">Payment Method</Label>
						<Input id="payment" placeholder="Payment method" />
						<Label htmlFor="mass-print">Mass Print</Label>
						<Input id="mass-print" placeholder="Mass print options" />
					</div>
				</CardContent>
				<CardFooter className="flex items-center justify-end gap-3">
					<Button variant="outline">Batal</Button>
					<Button onClick={() => console.log('Save invoice (dummy)')}>Simpan & Cetak Invoice</Button>
				</CardFooter>
			</Card>

			{/* === Card Kanan: Pratinjau Struk === */}
			<Card className="@container/card flex flex-col h-full">
				<CardHeader>
					<CardTitle className="text-lg font-semibold">Live Preview</CardTitle>
					<CardAction>
						<Badge variant="outline" className="flex items-center gap-1">
							<IconEye className="!w-6 !h-6" />
						</Badge>
					</CardAction>
				</CardHeader>

				<CardContent className="flex-1 flex items-center justify-center">
					<div className="rounded-md border border-input bg-background p-4 text-muted-foreground w-[90%] h-[70%] flex items-center justify-center">
						Pilih outlet untuk melihat pratinjau struk
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
