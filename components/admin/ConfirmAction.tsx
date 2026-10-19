"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ButtonProps = React.ComponentProps<typeof Button>

export function ConfirmAction({
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  loading,
  loadingText,
  children,
  ...buttonProps
}: {
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
} & Omit<ButtonProps, "onClick" | "loading" | "loadingText">) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        {...buttonProps}
        loading={loading}
        loadingText={loadingText}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-full" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full"
              loading={busy || loading}
              loadingText={loadingText || "Working…"}
              onClick={() => void confirm()}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
