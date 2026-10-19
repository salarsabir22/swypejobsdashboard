"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { ConfirmAction } from "@/components/admin/ConfirmAction"

export function BulkReportClose({ openIds }: { openIds: string[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (!openIds.length) return null

  const run = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_close", ids: openIds, status: "reviewed" }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; updated?: unknown[] }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Bulk close failed" })
        return
      }
      toast({ title: `Closed ${data.updated?.length || 0} reports` })
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
      loadingText="Closing…"
      title={`Mark ${openIds.length} reports reviewed?`}
      description="Clears the open queue for everything on this page. You can still reopen individually."
      confirmLabel={`Close ${openIds.length}`}
      onConfirm={run}
    >
      Close all open on page ({openIds.length})
    </ConfirmAction>
  )
}
