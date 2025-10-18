"use client"

import React from "react"
import { toast } from "sonner"
import ResourcePage from "@/components/resource-page"
import OutletTable from "@/components/tables/outlets-table"
import AddOutletDialog from "@/components/dialogs/add-outlet-dialog"
import ImportDialog from "@/components/dialogs/import-product-dialog"
import type { Outlet } from "@/components/tables/outlets-table"

export default function OutletPageComponent() {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [optimisticItems, setOptimisticItems] = React.useState<Outlet[]>([])
  const [data, setData] = React.useState<Outlet[]>([])
  const [query, setQuery] = React.useState<string>("")
  const [loading, setLoading] = React.useState<boolean>(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        // generate 10,000 deterministic dummy outlets for development testing
        const COUNT = 10000
        function randAlphaNum(seed: number, len: number) {
          let s = seed >>> 0
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
          let out = ''
          for (let i = 0; i < len; i++) {
            s = (1664525 * s + 1013904223) >>> 0
            out += chars[s % chars.length]
          }
          return out
        }
        function randDigits(seed: number, len: number) {
          let s = seed >>> 0
          let out = ''
          for (let i = 0; i < len; i++) {
            s = (1664525 * s + 1013904223) >>> 0
            out += String(s % 10)
          }
          return out
        }

        const items: Outlet[] = Array.from({ length: COUNT }, (_, i) => {
          const idx = i + 1
          return {
            id: `o-${idx}`,
            code: randDigits(idx + 1000, 15),
            name: randAlphaNum(idx + 2000, 25),
            cashier: randAlphaNum(idx + 3000, 8),
            address: `Jl. Example ${idx}`,
            phone: randDigits(idx + 4000, 10),
          }
        })

        if (!mounted) return
        setData(items || [])
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.error('Failed to load outlets', err)
        const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message?: unknown }).message) : 'Failed to load outlets'
        setErrorMessage(msg)
        toast.error(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => { mounted = false }
  }, [])

  const handleOutletAdded = (outlet: Record<string, unknown> & { id: string }) => {
    setOptimisticItems((current) => {
      if (current.some((c) => c.id === outlet.id)) return current
      const withoutTemp = current.filter((c) => !String(c.id).startsWith("temp-"))
      return withoutTemp
    })
    console.log('Outlet added', outlet)
  }
  const handleOptimisticAdd = (payload: Record<string, unknown> & { __tempId?: string }) => {
    const temp: Outlet = {
      id: String(payload.__tempId || `temp-${Date.now()}`),
      code: payload.code ? String(payload.code) : undefined,
      name: payload.name ? String(payload.name) : undefined,
      cashier: payload.cashier ? String(payload.cashier) : undefined,
      address: payload.address ? String(payload.address) : undefined,
      phone: payload.phone ? String(payload.phone) : undefined,
    }
    console.log('[OutletPage] optimistic add', temp)
    setOptimisticItems((s) => [temp, ...s])
  }
  const filtered = React.useMemo(() => {
    if (!query) return data
    const q = query.toLowerCase()
    return data.filter((d) => {
      const name = (d.name || "").toLowerCase()
      const code = (d.code || "").toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }, [data, query])

  return (
    <div>
      <ResourcePage
        searchPlaceholder="Search outlets..."
        onSearch={(q) => setQuery(q)}
        toolbarActions={[
          { label: "Import", node: <ImportDialog /> },
          { label: "Add Outlet", node: <AddOutletDialog open={dialogOpen} onOpenChange={setDialogOpen} onOutletAdded={handleOutletAdded} onAdd={handleOptimisticAdd} /> },
        ]}
      >
        <OutletTable data={filtered} optimisticItems={optimisticItems} loading={loading} />
      </ResourcePage>
    </div>
  )
}
