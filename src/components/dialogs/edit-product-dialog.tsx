'use client';

import * as React from 'react';
import BaseDialog from '@/components/base-dialog';
import { IconEdit } from '@tabler/icons-react';
import type { Product } from '@/components/tables/products-table';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle } from 'lucide-react';
import { fetchWithAuthClient } from '@/lib/auth/client';

export default function EditProductDialog({ product, onUpdate, open, onOpenChange, trigger }: { product?: Product | null; onUpdate?: (prod: Product) => void; open?: boolean; onOpenChange?: (open: boolean) => void; trigger?: React.ReactNode }) {
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [promotion, setPromotion] = React.useState<string | null>(null);
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

  // When product prop changes populate the form
  React.useEffect(() => {
    if (product) {
      // product may contain TitleCase (Name/Code) or lowercase (name/code) depending on API
      setName(String((product as any).Name ?? (product as any).name ?? ''));
      setCode(String((product as any).Code ?? (product as any).code ?? ''));
      const p = (product as any).Price ?? (product as any).price ?? '';
      setPrice(p === undefined || p === null ? '' : String(p));
      setPromotion(String(product.Promotion ?? ''));
    }
  }, [product]);

  function cleanNumericInput(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, '');
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

  const formInvalid = React.useMemo(() => {
    const cleaned = cleanNumericInput(price);
    return !name.trim() || !code.trim() || !cleaned;
  }, [name, code, price]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = cleanNumericInput(price);
    const newErrors: { Name?: string; Code?: string; Price?: string } = {};
    if (!name.trim()) newErrors.Name = 'Required';
    if (!code.trim()) newErrors.Code = 'Required';
    if (!cleaned) newErrors.Price = 'Required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setTouched({ Name: true, Code: true, Price: true });
      return;
    }

    if (!product?.id) {
      setAlertType('error');
      setShowAlert(true);
      return;
    }

    try {
      setLoading(true);
      const bodyPayload = {
        name: name.trim(),
        code: code.trim(),
        price: Number(cleaned || 0),
        Promotion: promotion ?? null,
      };
      const identifier = (product as any)?.uuid ?? product.id;
      const res = await fetchWithAuthClient(`/api/products/editProducts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: identifier, ...bodyPayload }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('update product failed', errBody);
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      const data = await res.json().catch(() => ({}));
      const updated = data?.product ?? null;
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
      title="Edit Product"
      description="Update product information"
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
                <AlertDescription>Product updated.</AlertDescription>
              </div>
            </Alert>
          )}
          {alertType === 'error' && (
            <Alert variant="destructive">
              <XCircle className="size-4 text-destructive" />
              <div>
                <AlertTitle>Failed!</AlertTitle>
                <AlertDescription>Failed to update product. Try again.</AlertDescription>
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
            <select value={promotion ?? 'None'} onChange={(e) => setPromotion(e.target.value)} className="appearance-none w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10" aria-label="Promotion">
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
