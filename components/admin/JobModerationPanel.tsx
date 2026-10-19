"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { useToast } from "@/lib/hooks/use-toast"
import { ConfirmAction } from "@/components/admin/ConfirmAction"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Status = "live" | "off" | "featured"

export function JobModerationPanel({
  jobId,
  flags,
  isActive = false,
}: {
  jobId: string
  flags?: string[]
  isActive?: boolean
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState<"approve" | "reject" | "removed" | "featured" | null>(null)
  const [status, setStatus] = useState<Status>(isActive ? "live" : "off")

  useEffect(() => {
    setStatus(isActive ? "live" : "off")
  }, [isActive])

  const run = async (action: "approve" | "reject" | "removed" | "featured") => {
    setBusy(action)
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action, flags: flags || [] }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not update job" })
        return
      }
      setStatus(action === "featured" ? "featured" : action === "approve" ? "live" : "off")
      toast({ title: `Job ${action}` })
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Could not update job",
      })
    } finally {
      setBusy(null)
    }
  }

  if (status === "live" || status === "featured") {
    return (
      <div className="space-y-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="flex flex-wrap items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            {status === "featured" ? "Featured listing" : "Listing is live"}
          </p>
          <Badge variant="secondary">{status === "featured" ? "Featured" : "Live"}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {status !== "featured" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              loading={busy === "featured"}
              loadingText="Featuring…"
              onClick={() => void run("featured")}
            >
              Feature
            </Button>
          ) : null}
          <ConfirmAction
            size="sm"
            variant="outline"
            className="rounded-full"
            loading={busy === "removed"}
            loadingText="Removing…"
            title="Take listing offline?"
            description="Students stop seeing this role in Discover until you approve it again."
            confirmLabel="Take offline"
            onConfirm={() => run("removed")}
          >
            Take offline
          </ConfirmAction>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Needs moderation</p>
        <Badge variant="outline">Offline</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          disabled={busy !== null}
          loading={busy === "approve"}
          loadingText="Approving…"
          onClick={() => void run("approve")}
        >
          Approve / go live
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={busy !== null}
          loading={busy === "featured"}
          loadingText="Featuring…"
          onClick={() => void run("featured")}
        >
          Feature
        </Button>
        <ConfirmAction
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={busy !== null}
          loading={busy === "reject"}
          loadingText="Rejecting…"
          title="Reject listing?"
          description="Keeps the role offline. You can approve later if the copy is fixed."
          confirmLabel="Reject"
          onConfirm={() => run("reject")}
        >
          Reject
        </ConfirmAction>
      </div>
    </div>
  )
}
