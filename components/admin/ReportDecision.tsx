"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { useToast } from "@/lib/hooks/use-toast"
import { ConfirmAction } from "@/components/admin/ConfirmAction"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserModerationPanel } from "@/components/admin/UserModerationPanel"
import { ToastAction } from "@/components/ui/toast"

export function ReportDecision({
  id,
  reportedId,
  initialStatus,
}: {
  id: string
  reportedId: string
  initialStatus?: string | null
}) {
  const { toast } = useToast()
  const router = useRouter()
  const open = !initialStatus || initialStatus === "open" || initialStatus === "pending"
  const [status, setStatus] = useState(open ? "open" : initialStatus || "open")
  const [busy, setBusy] = useState<"reviewed" | "dismissed" | "open" | null>(null)

  useEffect(() => {
    const nextOpen = !initialStatus || initialStatus === "open" || initialStatus === "pending"
    setStatus(nextOpen ? "open" : initialStatus || "open")
  }, [initialStatus])

  const run = async (next: "reviewed" | "dismissed" | "open", withUndo = false) => {
    setBusy(next)
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not update report" })
        return
      }
      setStatus(next)
      if (withUndo && next !== "open") {
        toast({
          title: next === "reviewed" ? "Marked reviewed" : "Dismissed",
          action: (
            <ToastAction
              altText="Undo"
              onClick={() => {
                void run("open")
              }}
            >
              Undo
            </ToastAction>
          ),
        })
      } else {
        toast({ title: next === "open" ? "Reopened" : next === "reviewed" ? "Marked reviewed" : "Dismissed" })
      }
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Could not update report",
      })
    } finally {
      setBusy(null)
    }
  }

  if (status !== "open") {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Report closed</p>
          <Badge variant="outline">{status}</Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          loading={busy === "open"}
          loadingText="Reopening…"
          onClick={() => void run("open")}
        >
          Reopen
        </Button>
        <UserModerationPanel userId={reportedId} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          disabled={busy !== null}
          loading={busy === "reviewed"}
          loadingText="Saving…"
          onClick={() => void run("reviewed", true)}
        >
          Mark reviewed
        </Button>
        <ConfirmAction
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={busy !== null}
          loading={busy === "dismissed"}
          loadingText="Dismissing…"
          title="Dismiss report?"
          description="Removes it from the open safety queue. You can reopen from Closed."
          confirmLabel="Dismiss"
          onConfirm={() => run("dismissed", true)}
        >
          Dismiss
        </ConfirmAction>
      </div>
      <UserModerationPanel userId={reportedId} />
    </div>
  )
}
