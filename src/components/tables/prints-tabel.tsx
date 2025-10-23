"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { IconTrash } from "@tabler/icons-react"
import { fetchWithAuthClient } from "@/lib/auth/client"

type OutletItem = { id: string; name?: string; code?: string }

export default function PrintsTable() {
  const [query, setQuery] = React.useState("")

  // Local OutletSelect-like behavior
  const [outlets, setOutlets] = React.useState<Array<{ id: string; name?: string; Name?: string; Code?: string }>>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [filtered, setFiltered] = React.useState<typeof outlets>([])
  const [open, setOpen] = React.useState(false)
  const [highlight, setHighlight] = React.useState<number>(-1)
  const [selected, setSelected] = React.useState<{ id: string; label: string } | null>(null)

  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetchWithAuthClient('/api/outlets')
        if (!res.ok) throw new Error(`Failed to load outlets: ${res.status}`)
        const body = await res.json().catch(() => ({}))
        const items = Array.isArray(body?.outlets) ? body.outlets : Array.isArray(body) ? body : []
        if (!mounted) return
        const mapped = items.map((o: any) => ({ id: String(o.id ?? o._id ?? o.uid ?? o.id), name: o.name ?? o.Name, Code: o.code ?? o.Code }))
        setOutlets(mapped)
        setFiltered(mapped)
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.error('load outlets failed', err)
        if (!mounted) return
        setError(String(err instanceof Error ? err.message : String(err)))
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // debounce filter
  React.useEffect(() => {
    const id = setTimeout(() => {
      const q = (query || '').toLowerCase().trim()
      if (!q) {
        setFiltered(outlets)
        setHighlight(-1)
        return
      }
      const f = outlets.filter((o) => (o.name ?? o.Name ?? o.Code ?? o.id).toLowerCase().includes(q))
      setFiltered(f)
      setHighlight(f.length ? 0 : -1)
    }, 150)
    return () => clearTimeout(id)
  }, [query, outlets])

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && query.length > 0) setOpen(true)
    if (e.key === 'ArrowDown') setHighlight((h) => Math.min((filtered.length || 0) - 1, h + 1))
    if (e.key === 'ArrowUp') setHighlight((h) => Math.max(0, h - 1))
    if (e.key === 'Enter' && highlight >= 0 && filtered[highlight]) {
      const o = filtered[highlight]
      selectOutlet(o.id, o.name ?? o.Name ?? o.Code ?? o.id)
    }
    if (e.key === 'Escape') setOpen(false)
  }

  function selectOutlet(id: string, label: string) {
    setSelected({ id, label })
    setQuery(label)
    setOpen(false)
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <div className="relative">
            <input
              id="outlet"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={
                loading
                  ? 'Loading outlets...'
                  : error
                  ? 'Failed to load outlets'
                  : 'Search outlets...'
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onKeyDown={onKey}
              onFocus={() => {
                if (query.length > 0) setOpen(true)
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
                  e.preventDefault()
                  setSelected(null)
                  setQuery('')
                  setFiltered(outlets)
                  setOpen(false)
                  const el = document.getElementById('outlet') as HTMLInputElement | null
                  el?.focus()
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
                    const label = o.name ?? o.Name ?? o.Code ?? o.id
                    const isHighlighted = idx === highlight
                    return (
                      <div
                        role="option"
                        aria-selected={isHighlighted}
                        key={o.id}
                        onMouseDown={(ev) => {
                          ev.preventDefault()
                          selectOutlet(o.id, label)
                        }}
                        onMouseEnter={() => setHighlight(idx)}
                        className={`cursor-pointer rounded px-2 py-1 text-sm ${
                          isHighlighted ? 'bg-accent text-accent-foreground' : 'text-foreground'
                        }`}
                      >
                        {label}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button>Test Print</Button>
          <Button>Save</Button>
        </div>
      </div>
      {selected ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          <Card>
            <CardHeader>
              <CardTitle>Editor Header</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea className="w-full resize-none rounded border p-2 text-sm" rows={4} defaultValue="[NAMA_OUTLET]" />
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground">Header editor</div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Editor Footer</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea className="w-full resize-none rounded border p-2 text-sm" rows={6} defaultValue="Harga sudah termasuk PPN 11%" />
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground">Footer editor</div>
            </CardFooter>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

export { PrintsTable }
