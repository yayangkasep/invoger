"use client"

import React from "react"
import { IconCloudDownload } from "@tabler/icons-react"
import BaseDialog from "@/components/base-dialog"
import { Button } from "@/components/ui/button"
import { DialogClose } from "@/components/ui/dialog"
import { toast } from "sonner"

export default function ImportDialog({ onImport }: { onImport?: (file?: File) => Promise<void> | void }) {
  const [file, setFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [result, setResult] = React.useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('No file selected')
      return
    }
    setUploading(true)
    setResult(null)
    try {
      // Frontend-only: simulate import success and show sample result
      setResult(JSON.stringify({ imported: 10, warnings: [] }, null, 2))
      toast.success('Import completed (simulated)')
      onImport?.(file)
    } catch (err) {
      console.error(err)
      toast.error('Upload failed')
      setResult(String(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <BaseDialog
      title="Import products"
      description="Upload a CSV file to import products."
  trigger={<Button variant="outline"><IconCloudDownload className="mr-1.5 size-4" />Impor</Button>}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="outline" disabled={uploading}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={uploading || !file}>{uploading ? 'Uploading...' : 'Upload'}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <input type="file" accept=".csv" className="w-full" onChange={handleFileChange} />
        <p className="text-sm text-muted-foreground">CSV format: name,sku,price,category,status (header optional)</p>
        {file ? <div className="text-sm">Selected: {file.name} ({Math.round(file.size / 1024)} KB)</div> : null}
        {result ? (
          <pre className="mt-2 p-2 text-xs bg-surface rounded-md overflow-auto">{result}</pre>
        ) : null}
      </div>
    </BaseDialog>
  )
}
