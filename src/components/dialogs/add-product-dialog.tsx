'use client';

import React from 'react';
import BaseDialog from '@/components/base-dialog';
import { IconFilePlus } from '@tabler/icons-react';
import type { Product } from '@/components/tables/products-table';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle } from 'lucide-react';
import authClient from '@/lib/auth/client';

type ProductPayload = {
  Name: string;
  Code: string;
  Price: number;
  Promotion: string;
};

export default function AddProductDialog({ onAdd, open, onOpenChange, onAddSuccessReplace, onProductAdded }: { onAdd?: (payload: (ProductPayload | Partial<Product>) & { __tempId?: string }) => Promise<void> | void; open?: boolean; onOpenChange?: (open: boolean) => void; onAddSuccessReplace?: (tempId: string, realProduct: ProductPayload & { id: string }) => void; onProductAdded?: (prod: ProductPayload & { id: string }) => void }) {
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [promotion, setPromotion] = React.useState('None');
  const [loading, setLoading] = React.useState(false);
  const [showAlert, setShowAlert] = React.useState(false);
  const [alertType, setAlertType] = React.useState<'success' | 'error' | null>(null);
  const [errors, setErrors] = React.useState<{
    Name?: string;
    Code?: string;
    Price?: string;
  }>({});
  const [touched, setTouched] = React.useState<{
    Name?: boolean;
    Code?: boolean;
    Price?: boolean;
  }>({});
  const closeTimerRef = React.useRef<number | null>(null);
  const hideTimerRef = React.useRef<number | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const formInvalid = React.useMemo(() => {
    // required: Name, Code, Price
    const cleaned = cleanNumericInput(price);
    return !name.trim() || !code.trim() || !cleaned;
  }, [name, code, price]);

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

  function cleanNumericInput(value: string) {
    // allow digits and single dot for decimals
    const cleaned = value.replace(/[^0-9.]/g, '');
    // remove extra dots
    return cleaned.replace(/\.(?=.*\.)/, '');
  }

  function formatWithCommas(raw: string) {
    if (!raw) return '';
    const parts = raw.split('.');
    const intPart = parts[0];
    const fracPart = parts[1];
    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fracPart ? `${intFormatted}.${fracPart}` : intFormatted;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = cleanNumericInput(price);
    // validation: required fields
    const newErrors: { Name?: string; Code?: string; Price?: string } = {};
    if (!name.trim()) newErrors.Name = 'Required';
    if (!code.trim()) newErrors.Code = 'Required';
    if (!cleaned) newErrors.Price = 'Required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      // mark all as touched so labels update
      setTouched({ Name: true, Code: true, Price: true });
      return;
    }
    // generate a temporary id for optimistic UI and inform parent
    const tempId = `temp-${Date.now()}`;
    const payload = {
      Name: name || '',
      Code: code || '',
      Price: Number(cleaned || 0),
      Promotion: promotion || 'None',
      __tempId: tempId,
    };
    onAdd?.(payload);
    // persist to Firestore via API
    (async () => {
      try {
        setLoading(true);
        const bodyPayload = {
          name: name.trim(),
          code: code.trim(),
          price: Number(cleaned || 0),
        };

        // use project's auth helper which will include Authorization header if token present
        const res = await authClient.fetchWithAuthClient('/api/products/addProducts', {
          method: 'POST',
          body: JSON.stringify(bodyPayload),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.error('save product failed', errBody);
          setAlertType('error');
          setShowAlert(true);
          return;
        }

        const data = await res.json().catch(() => ({}));
        const id = data?.id ?? `prod-${Date.now()}`;
        const uuid = data?.product?.uuid ?? data?.product?.uuid ?? undefined;

        // show success alert
        setAlertType('success');
        setShowAlert(true);

        // if parent supplied optimistic temp id, replace
        if (onAddSuccessReplace) {
          const maybeTemp = (payload as { __tempId?: string }).__tempId;
          if (maybeTemp) onAddSuccessReplace(maybeTemp, { ...payload, id });
        }

        // inform parent directly (optional) so it can refresh/merge if needed
        // parent expects a Product-like object; cast to any to include optional uuid
        onProductAdded?.({ ...(payload as any), id, uuid } as any);

        // keep existing timers for clearing form/alerts (dialog effect already closed)
        if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
        if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
        closeTimerRef.current = window.setTimeout(() => {
          setName('');
          setCode('');
          setPrice('');
          setPromotion('None');
        }, 2000);
        hideTimerRef.current = window.setTimeout(() => {
          setShowAlert(false);
          setAlertType(null);
        }, 2500);
      } catch (err) {
        console.error(err);
        setAlertType('error');
        setShowAlert(true);
        // close dialog immediately on unexpected error
        onOpenChange?.(false);
      } finally {
        setLoading(false);
      }
    })();
  }

  return (
    <BaseDialog
      title="Add New Product"
      description="Insert new product information"
      trigger={
        <Button>
          <IconFilePlus className="size-4" />
          Add Products
        </Button>
      }
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
        {/* Alert area (visible above the form fields) */}
        {/* Alert with fade transition */}
        <div className={`mb-2 transition-opacity duration-300 ${showAlert ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {alertType === 'success' && (
            <Alert className="border-green-200 bg-green-50 text-green-700">
              <CheckCircle className="size-4 text-green-700" />
              <div>
                <AlertTitle>Success!.</AlertTitle>
                <AlertDescription>Your products has been saved.</AlertDescription>
              </div>
            </Alert>
          )}
          {alertType === 'error' && (
            <Alert variant="destructive">
              <XCircle className="size-4 text-destructive" />
              <div>
                <AlertTitle>Failed!</AlertTitle>
                <AlertDescription>Your products failed to save, please try again.</AlertDescription>
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
          <Label className={`block mb-1 ${errors.Price && touched.Price ? 'text-destructive' : ''}`}>Price</Label>
          <Input
            type="text"
            value={formatWithCommas(price)}
            onChange={(e) => setPrice(cleanNumericInput(e.target.value))}
            onBlur={() => {
              setTouched((s) => ({ ...s, Price: true }));
              if (!cleanNumericInput(price)) setErrors((s) => ({ ...s, Price: 'Required' }));
              else setErrors((s) => ({ ...s, Price: undefined }));
            }}
            className="w-full"
            aria-invalid={Boolean(errors.Price && touched.Price)}
          />
          {errors.Price && touched.Price ? <p className="mt-1 text-sm text-destructive">This field is required.</p> : null}
        </div>
        <div>
          <Label className="block mb-1">Promotion</Label>
          <div className="relative">
            <select value={promotion} onChange={(e) => setPromotion(e.target.value)} className="appearance-none w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10" aria-label="Promotion">
              <option value="None">None</option>
              <option value="Buy One Get One">Buy One Get One</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" className="text-muted-foreground">
                <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
          </div>
        </div>
      </form>
    </BaseDialog>
  );
}
