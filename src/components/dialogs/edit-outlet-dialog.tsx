'use client';

import * as React from 'react';
import BaseDialog from '@/components/base-dialog';
import { IconEdit } from '@tabler/icons-react';
import type { Outlet } from '@/components/tables/outlets-table';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle } from 'lucide-react';
import { fetchWithAuthClient } from '@/lib/auth/client';

export default function EditOutletDialog({ outlet, onUpdate, open, onOpenChange, trigger }: { outlet?: Outlet | null; onUpdate?: (out: Outlet) => void; open?: boolean; onOpenChange?: (open: boolean) => void; trigger?: React.ReactNode }) {
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [cashier, setCashier] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showAlert, setShowAlert] = React.useState(false);
  const [alertType, setAlertType] = React.useState<'success' | 'error' | null>(null);
  const [errors, setErrors] = React.useState<{ Name?: string; Code?: string }>({});
  const [touched, setTouched] = React.useState<{
    Name?: boolean;
    Code?: boolean;
  }>({});
  const closeTimerRef = React.useRef<number | null>(null);
  const hideTimerRef = React.useRef<number | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (outlet) {
      setName(String((outlet as any).Name ?? (outlet as any).name ?? ''));
      setCode(String((outlet as any).Code ?? (outlet as any).code ?? ''));
      setCashier(String((outlet as any).cashier ?? (outlet as any).Cashier ?? ''));
      setAddress(String((outlet as any).address ?? (outlet as any).Address ?? ''));
      setPhone(String((outlet as any).phone ?? (outlet as any).Phone ?? ''));
    }
  }, [outlet]);

  const formInvalid = React.useMemo(() => {
    return !name.trim() || !code.trim();
  }, [name, code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: { Name?: string; Code?: string } = {};
    if (!name.trim()) newErrors.Name = 'Required';
    if (!code.trim()) newErrors.Code = 'Required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setTouched({ Name: true, Code: true });
      return;
    }

    if (!outlet?.id) {
      setAlertType('error');
      setShowAlert(true);
      return;
    }

    try {
      setLoading(true);
      const bodyPayload = {
        name: name.trim(),
        code: code.trim(),
        cashier: cashier || null,
        address: address || null,
        phone: phone || null,
      };
      const identifier = (outlet as any)?.uuid ?? outlet.id;
      const res = await fetchWithAuthClient(`/api/outlets/editOutlets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: identifier, ...bodyPayload }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('update outlet failed', errBody);
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      const data = await res.json().catch(() => ({}));
      const updated = data?.outlet ?? null;
      setAlertType('success');
      setShowAlert(true);
      if (updated && onUpdate) onUpdate(updated);

      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      closeTimerRef.current = window.setTimeout(() => {
        onOpenChange?.(false);
      }, 1200);
      hideTimerRef.current = window.setTimeout(() => {
        setShowAlert(false);
        setAlertType(null);
      }, 1600);
    } catch (err) {
      console.error(err);
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <BaseDialog
      title="Edit Outlet"
      description="Update outlet information"
      trigger={
        trigger ?? (
          <Button variant="outline">
            <IconEdit className="size-4" /> Edit
          </Button>
        )
      }
      open={open}
      onOpenChange={onOpenChange}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={() => formRef.current?.requestSubmit()} disabled={loading || formInvalid}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </>
      }>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <div className={`mb-2 transition-opacity duration-300 ${showAlert ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {alertType === 'success' && (
            <Alert className="border-green-200 bg-green-50 text-green-700">
              <CheckCircle className="size-4 text-green-700" />
              <div>
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>Outlet updated.</AlertDescription>
              </div>
            </Alert>
          )}
          {alertType === 'error' && (
            <Alert variant="destructive">
              <XCircle className="size-4 text-destructive" />
              <div>
                <AlertTitle>Failed!</AlertTitle>
                <AlertDescription>Failed to update outlet. Try again.</AlertDescription>
              </div>
            </Alert>
          )}
        </div>

        <div>
          <Label className={`block mb-1 ${errors.Name && touched.Name ? 'text-destructive' : ''}`}>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setTouched((s) => ({ ...s, Name: true }));
              if (!name.trim()) setErrors((s) => ({ ...s, Name: 'Required' }));
              else setErrors((s) => ({ ...s, Name: undefined }));
            }}
            className="w-full"
            aria-invalid={Boolean(errors.Name && touched.Name)}
          />
          {errors.Name && touched.Name ? <p className="mt-1 text-sm text-destructive">This field is required.</p> : null}
        </div>

        <div>
          <Label className={`block mb-1 ${errors.Code && touched.Code ? 'text-destructive' : ''}`}>Code</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={() => {
              setTouched((s) => ({ ...s, Code: true }));
              if (!code.trim()) setErrors((s) => ({ ...s, Code: 'Required' }));
              else setErrors((s) => ({ ...s, Code: undefined }));
            }}
            className="w-full"
            aria-invalid={Boolean(errors.Code && touched.Code)}
          />
          {errors.Code && touched.Code ? <p className="mt-1 text-sm text-destructive">This field is required.</p> : null}
        </div>

        <div>
          <Label className="block mb-1">Cashier</Label>
          <Input value={cashier} onChange={(e) => setCashier(e.target.value)} className="w-full" />
        </div>

        <div>
          <Label className="block mb-1">Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full" />
        </div>

        <div>
          <Label className="block mb-1">Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full" />
        </div>
      </form>
    </BaseDialog>
  );
}
