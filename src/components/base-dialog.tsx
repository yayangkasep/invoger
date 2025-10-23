"use client"

import * as React from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type BaseDialogProps = {
  title: React.ReactNode
  description?: React.ReactNode
  trigger?: React.ReactNode // element to render as the trigger (button, icon, etc.)
  children?: React.ReactNode
  footer?: React.ReactNode
  triggerClassName?: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function BaseDialog({ title, description, trigger, children, footer, defaultOpen = false, open, onOpenChange }: BaseDialogProps) {
  return (
    <Dialog defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="default">Open</Button>
        </DialogTrigger>
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="pt-2">{children}</div>

        <DialogFooter>
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
  )
}

export default BaseDialog
