'use client';

import React from 'react';
import { IconCloudDownload } from '@tabler/icons-react';
import BaseDialog from '@/components/base-dialog';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth/client';

export default function ImportDialog({ onImport }: { onImport?: (file?: File) => Promise<void> | void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('No file selected');
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      // upload file to server API
      const form = new FormData();
      form.append('file', file);

      const headers: Record<string, string> = {};
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/products/importProducts', {
        method: 'POST',
        body: form,
        headers,
        credentials: 'same-origin',
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // show validation or server errors
        const message = body?.message || body?.error || `Import failed: ${res.status}`;
        setResult(JSON.stringify(body, null, 2));
        toast.error(String(message));
        onImport?.(file);
        return;
      }

      // success
      setResult(JSON.stringify(body, null, 2));
      toast.success('Import completed');
      onImport?.(file);
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
      setResult(String(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <BaseDialog
      title="Import products"
      description="Upload a CSV file to import products."
      trigger={
        <Button variant="outline">
          <IconCloudDownload className="mr-1.5 size-4" />
          Impor
        </Button>
      }
      footer={
        <>
          <DialogClose asChild>
            <Button variant="outline" disabled={uploading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </>
      }>
      <div className="space-y-3">
        <input type="file" accept=".csv" className="w-full" onChange={handleFileChange} />
        <p className="text-sm text-muted-foreground">CSV format: Name,Code,Price (header required, order: Name,Code,Price)</p>
        {file ? (
          <div className="text-sm">
            Selected: {file.name} ({Math.round(file.size / 1024)} KB)
          </div>
        ) : null}
        {result ? <pre className="mt-2 p-2 text-xs bg-surface rounded-md overflow-auto">{result}</pre> : null}
      </div>
    </BaseDialog>
  );
}
