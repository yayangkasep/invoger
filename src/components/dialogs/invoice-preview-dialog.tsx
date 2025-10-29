'use client';

import React, { useEffect, useRef } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog-invoice-preview';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function InvoicePreviewDialog({ open, onOpenChange, trigger, template, templates }: { open?: boolean; onOpenChange?: (open: boolean) => void; trigger?: React.ReactNode; template?: string | null; templates?: Array<string | null> | null }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      const el = scrollRef.current;
      // biar smooth dikit
      el.scrollTo({
        left: el.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [open]);

  const templatesArray = templates && templates.length ? templates : template ? [template] : [];

  function handleConfirm() {
    try {
      // emit an event so parent can listen if desired
      window.dispatchEvent(new CustomEvent('invoice-preview-confirm', { detail: { templates: templatesArray } }));
    } catch (e) {
      // ignore
    }
    onOpenChange?.(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent className="max-w-[calc(100vw-2rem)] w-[calc(70vw)] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-center">Invoice Preview</DialogTitle>
          <DialogDescription className="text-center">
            {templatesArray && templatesArray.length > 0 ? (
              <span className="block mt-2">Will print {templatesArray.length} invoice{templatesArray.length > 1 ? 's' : ''}.</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {/* Scroll container - properly fills remaining space */}
  <div ref={scrollRef} className="flex-1 w-full px-6 mt-4 overflow-x-auto overflow-y-hidden scrollbar-thin min-h-0">
          <div className="flex gap-4 pb-4 h-full">
            {templatesArray.length === 0
              ? [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex-shrink-0 w-[8cm]">
                    <Card className="w-full h-[68vh] min-h-[500px]">
                      <CardContent className="p-6 h-full flex flex-col overflow-y-auto">
                        <div className="h-40 bg-muted rounded-md mb-4 flex-shrink-0" />
                        <div className="space-y-2 flex-shrink-0">
                          <div className="h-4 bg-muted/60 rounded w-3/4" />
                          <div className="h-3 bg-muted/50 rounded w-1/2" />
                          <div className="h-3 bg-muted/50 rounded w-2/3" />
                        </div>
                        <div className="flex-1" />
                      </CardContent>
                    </Card>
                  </div>
                ))
              : templatesArray.map((tpl, idx) => (
                  <div key={idx} className="flex-shrink-0 w-[8cm]">
                    <Card className="w-full h-[68vh] min-h-[500px]">
                      <CardContent className="p-0 h-full">
                        {tpl ? (
                          <div className="w-full h-full rounded-md overflow-hidden">
                            <iframe title={`invoice-preview-${idx}`} srcDoc={tpl} className="w-full h-full border-0 bg-white" sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals" />
                          </div>
                        ) : (
                          <div className="p-6 h-full flex flex-col overflow-y-auto">
                            <div className="h-40 bg-muted rounded-md mb-4 flex-shrink-0" />
                            <div className="space-y-2 flex-shrink-0">
                              <div className="h-4 bg-muted/60 rounded w-3/4" />
                              <div className="h-3 bg-muted/50 rounded w-1/2" />
                              <div className="h-3 bg-muted/50 rounded w-2/3" />
                            </div>
                            <div className="flex-1" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
          </div>
        </div>

        {/* action buttons */}
        <div className="flex-shrink-0 px-6 py-4 flex justify-end gap-2">
          <Button onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </div>

        <DialogClose className="sr-only" />
      </DialogContent>
    </Dialog>
  );
}
