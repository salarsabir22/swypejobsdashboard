"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { ConfirmAction } from "@/components/admin/ConfirmAction"

export function BulkJobActions({
  jobIds,
  mode,
}: {
  jobIds: string[]
  mode: "approve" | "offline"
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (!jobIds.length) return null

  const run = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "approve" ? "bulk_approve" : "bulk_offline",
          jobIds,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        updated?: unknown[]
        errors?: unknown[]
      }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Bulk job update failed" })
        return
      }
      toast({
        title: mode === "approve" ? `Approved ${data.updated?.length || 0}` : `Took offline ${data.updated?.length || 0}`,
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
      variant={mode === "approve" ? "default" : "outline"}
      className="rounded-full"
      loading={busy}
      loadingText="Working…"
      title={mode === "approve" ? `Approve ${jobIds.length} jobs?` : `Take ${jobIds.length} jobs offline?`}
      description={
        mode === "approve"
          ? "All jobs on this page go live in Discover."
          : "All jobs on this page leave Discover until re-approved."
      }
      confirmLabel={mode === "approve" ? `Approve ${jobIds.length}` : `Take offline ${jobIds.length}`}
      onConfirm={run}
    >
      {mode === "approve" ? `Approve all on page (${jobIds.length})` : `Offline all on page (${jobIds.length})`}
    </ConfirmAction>
  )
}
