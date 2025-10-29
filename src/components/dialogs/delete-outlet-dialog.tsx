'use client';

import * as React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { fetchWithAuthClient } from '@/lib/auth/client';
import { toast } from 'sonner';

export default function DeleteOutletDialog({ id, onDeleted, trigger, open: openProp, onOpenChange, outletName }: { id: string; onDeleted?: (deletedId: string) => void; trigger?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; outletName?: string }) {
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
      const res = await fetchWithAuthClient('/api/outlets/deleteOutlets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('delete failed', body);
        toast.error('Failed to delete outlet');
        return;
      }
      const resp = await res.json().catch(() => ({}));
      const deletedId = resp?.id ?? id;
      toast.success('Outlet deleted');
      onDeleted?.(deletedId);
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
    } finally {
      setLoading(false);
      handleOpenChange(false);
    }
  }

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
            setTimeout(() => handleOpenChange(true), 0);
          },
          onClick: (e: any) => {
            try {
              e.stopPropagation();
            } catch (_) {}
            setTimeout(() => handleOpenChange(true), 0);
          },
        } as any
      );
    }
    return <span onClick={() => setOpen(true)}>{trigger}</span>;
  }

  const controlledOpen = typeof openProp === 'boolean' ? openProp : open;

  return (
    <AlertDialog open={controlledOpen} onOpenChange={handleOpenChange}>
      {renderTrigger()}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete outlet</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
            {outletName ? ` Are you sure you want to delete "${outletName}"?` : ' Are you sure want to delete this outlet?'}
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
