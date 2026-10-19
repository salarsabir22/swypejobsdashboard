"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { useToast } from "@/lib/hooks/use-toast"
import { ConfirmAction } from "@/components/admin/ConfirmAction"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

type Status = "pending" | "approved" | "rejected" | "suspended"

function deriveStatus(isApproved: boolean, lastAction?: string | null): Status {
  if (isApproved) return "approved"
  if (lastAction === "reject" || lastAction === "rejected") return "rejected"
  if (lastAction === "suspend" || lastAction === "suspended") return "suspended"
  return "pending"
}

export function EmployerDecision({
  recruiterId,
  isApproved,
  lastAction,
}: {
  recruiterId: string
  isApproved: boolean
  lastAction?: string | null
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [reason, setReason] = useState(isApproved ? "verified" : "incomplete_verification")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState<"approve" | "reject" | "suspend" | null>(null)
  const [status, setStatus] = useState<Status>(deriveStatus(isApproved, lastAction))

  useEffect(() => {
    setStatus(deriveStatus(isApproved, lastAction))
  }, [isApproved, lastAction])

  const run = async (action: "approve" | "reject" | "suspend") => {
    setBusy(action)
    try {
      const res = await fetch("/api/admin/employers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruiterId, action, reason, notes }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not update employer" })
        return
      }
      setStatus(action === "approve" ? "approved" : action === "reject" ? "rejected" : "suspended")
      toast({ title: action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Suspended" })
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Could not update employer",
      })
    } finally {
      setBusy(null)
    }
  }

  if (status === "approved") {
    return (
      <div className="space-y-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="flex flex-wrap items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Employer approved</p>
          <Badge variant="secondary">Live</Badge>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Listings can appear to students. Suspend if you need to take this account offline.
        </p>
        <ConfirmAction
          size="sm"
          variant="outline"
          className="rounded-full"
          title="Suspend employer?"
          description="Their listings leave Discover until you approve again."
          confirmLabel="Suspend"
          loading={busy === "suspend"}
          loadingText="Suspending…"
          onConfirm={() => run("suspend")}
        >
          Suspend access
        </ConfirmAction>
      </div>
    )
  }

  if (status === "rejected" || status === "suspended") {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{status === "rejected" ? "Rejected" : "Suspended"}</p>
          <Badge variant="outline">{status === "rejected" ? "Not approved" : "Offline"}</Badge>
        </div>
        <p className="text-[13px] text-muted-foreground">
          {status === "rejected"
            ? "This employer was rejected. Approve again if their verification is complete."
            : "Access is suspended. Approve again to restore listings."}
        </p>
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          loading={busy === "approve"}
          loadingText="Approving…"
          onClick={() => void run("approve")}
        >
          Approve again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Awaiting decision</p>
        <Badge variant="outline">Pending</Badge>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Reason code</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="verified">Verified domain / site</SelectItem>
            <SelectItem value="incomplete_verification">Incomplete verification</SelectItem>
            <SelectItem value="free_email">Free email / risk</SelectItem>
            <SelectItem value="scam_reports">Scam reports</SelectItem>
            <SelectItem value="mismatch">Mismatched details</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Textarea
        rows={2}
        placeholder="Internal notes (and rejection email body)"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
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
          Approve
        </Button>
        <ConfirmAction
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={busy !== null}
          loading={busy === "reject"}
          loadingText="Rejecting…"
          title="Reject employer?"
          description="They stay off Discover. You can approve them later if verification improves."
          confirmLabel="Reject"
          onConfirm={() => run("reject")}
        >
          Reject
        </ConfirmAction>
        <ConfirmAction
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={busy !== null}
          loading={busy === "suspend"}
          loadingText="Suspending…"
          title="Suspend employer?"
          description="Blocks listings until re-approved."
          confirmLabel="Suspend"
          onConfirm={() => run("suspend")}
        >
          Suspend
        </ConfirmAction>
      </div>
    </div>
  )
}
