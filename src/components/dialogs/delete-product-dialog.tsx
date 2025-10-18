"use client"

import React from "react"
import BaseDialog from "@/components/base-dialog"
import { Button } from "@/components/ui/button"
import { DialogClose } from "@/components/ui/dialog"

export default function DeleteAllDialog({ onConfirm }: { onConfirm?: () => Promise<void> | void }) {
  return (
    <BaseDialog
      title="Delete all products"
      description="All products will be permanently deleted. This action cannot be undone."
      trigger={<Button variant="destructive">Delete</Button>}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={() => onConfirm?.()}>Delete</Button>
        </>
      }
    >
      <p>Are you sure you want to delete all products from inventory?</p>
    </BaseDialog>
  )
}
