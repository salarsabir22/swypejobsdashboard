"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { ConfirmAction } from "@/components/admin/ConfirmAction"

export function BulkEmployerApprove({
  pendingIds,
}: {
  pendingIds: string[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (!pendingIds.length) return null

  const run = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/employers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_approve",
          recruiterIds: pendingIds,
          reason: "bulk_verified",
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        approved?: unknown[]
        errors?: unknown[]
      }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Bulk approve failed" })
        return
      }
      toast({
        title: `Approved ${data.approved?.length || 0}`,
        description: data.errors?.length ? `${data.errors.length} failed` : undefined,
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfirmAction
      size="sm"
      className="rounded-full"
      loading={busy}
      loadingText="Approving…"
      title={`Approve ${pendingIds.length} employers?`}
      description="All pending employers on this page are marked approved and can appear in Discover."
      confirmLabel={`Approve ${pendingIds.length}`}
      onConfirm={run}
    >
      Approve all on page ({pendingIds.length})
    </ConfirmAction>
  )
}
