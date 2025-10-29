'use client';

import React from 'react';
import BaseDialog from '@/components/base-dialog';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';

export default function ExportDialog({ onExport }: { onExport?: () => Promise<void> | void }) {
  return (
    <BaseDialog
      title="Export products"
      description="Export all products as CSV."
      trigger={<Button variant="outline">Ekspor</Button>}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={() => onExport?.()}>Export</Button>
        </>
      }>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">You can export all products to a CSV file.</p>
        <div className="text-sm">Select options:</div>
      </div>
    </BaseDialog>
  );
}
