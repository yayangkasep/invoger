'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type BaseDialogProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  trigger?: React.ReactNode; // element to render as the trigger (button, icon, etc.)
  children?: React.ReactNode;
  footer?: React.ReactNode;
  triggerClassName?: string;
  /** Apply classes to the DialogContent element */
  contentClassName?: string;
  /** When true, dialog will size to its content up to viewport bounds */
  autoSize?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  fullScreenOnMobile?: boolean;
};
export function BaseDialog({ title, description, trigger, children, footer, triggerClassName, contentClassName, autoSize = false, defaultOpen = false, open, onOpenChange, fullScreenOnMobile = true }: BaseDialogProps) {
  const isMobile = useIsMobile();
  const mobile = isMobile && fullScreenOnMobile;

  return (
    <Dialog defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="default">Open</Button>
        </DialogTrigger>
      )}

      {/* DialogContent layout: on mobile use full-screen flex layout so header, scrollable body, and sticky footer behave correctly */}
      <DialogContent
        className={cn(
          // mobile full-screen
          mobile ? 'w-full h-full max-w-none p-0' : '',
          // autosize mode: let content determine width but cap to viewport
          !mobile && autoSize ? 'w-auto max-w-[calc(100vw-2rem)]' : !mobile ? 'w-full max-w-[calc(100vw-2rem)]' : '',
          contentClassName
        )}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {/* make the body scrollable and grow to fill available space */}
        <div className={mobile ? 'pt-2 flex-1 overflow-auto p-4' : 'pt-2'}>{children}</div>

        {/* footer: sticky on mobile so keyboard won't push buttons out of view */}
        <DialogFooter className={mobile ? 'sticky bottom-0 bg-background/80 backdrop-blur-sm p-3' : ''}>
          {footer ? (
            footer
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button>Confirm</Button>
            </>
          )}
        </DialogFooter>
        <DialogClose className="sr-only" />
      </DialogContent>
    </Dialog>
  );
}

export default BaseDialog;
