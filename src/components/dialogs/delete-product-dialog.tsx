'use client';

import * as React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { fetchWithAuthClient } from '@/lib/auth/client';
import { toast } from 'sonner';

export default function DeleteProductDialog({ id, onDeleted, trigger, open: openProp, onOpenChange, productName }: { id: string; onDeleted?: (deletedId: string) => void; trigger?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; productName?: string }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  function handleOpenChange(v: boolean) {
    if (typeof onOpenChange === 'function') onOpenChange(v);
    if (typeof openProp !== 'boolean') setOpen(v);
  }

  async function confirmDelete() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetchWithAuthClient('/api/products/deleteProducts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('delete failed', body);
        toast.error('Failed to delete product');
        return;
      }
      const resp = await res.json().catch(() => ({}));
      const deletedId = resp?.id ?? id;
      toast.success('Product deleted');
      onDeleted?.(deletedId);
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
    } finally {
      setLoading(false);
      // close dialog (respect controlled mode)
      handleOpenChange(false);
    }
  }

  // helper to attach safe open handler to arbitrary trigger elements
  function renderTrigger() {
    if (!trigger) {
      return (
        <button className="text-destructive" onClick={() => handleOpenChange(true)}>
          Delete
        </button>
      );
    }
    if (React.isValidElement(trigger)) {
      return React.cloneElement(
        trigger as React.ReactElement,
        {
          // capture pointer down early to prevent the dropdown from closing before we open the dialog
          onPointerDownCapture: (e: any) => {
            try {
              e.preventDefault();
              e.stopPropagation();
            } catch (_) {}
          },
          onPointerDown: (e: any) => {
            try {
              e.preventDefault();
              e.stopPropagation();
            } catch (_) {}
            // open next tick to avoid menu close/focus race
            setTimeout(() => handleOpenChange(true), 0);
          },
          onClick: (e: any) => {
            try {
              e.stopPropagation();
            } catch (_) {}
            // fallback: open on click if pointer events didn't run
            setTimeout(() => handleOpenChange(true), 0);
          },
        } as any
      );
    }
    return <span onClick={() => setOpen(true)}>{trigger}</span>;
  }

  const controlledOpen = typeof openProp === 'boolean' ? openProp : open;
  // NOTE: handleOpenChange is defined above so it can be used by trigger renderers

  return (
    <AlertDialog open={controlledOpen} onOpenChange={handleOpenChange}>
      {renderTrigger()}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete product</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
            {productName ? ` Are you sure you want to delete "${productName}"?` : ' Are you sure want to delete this product?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => handleOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
