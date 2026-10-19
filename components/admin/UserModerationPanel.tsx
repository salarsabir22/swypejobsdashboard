"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { ConfirmAction } from "@/components/admin/ConfirmAction"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Status = "active" | "warned" | "suspended" | "banned"

export function UserModerationPanel({
  userId,
  initialStatus = "active",
}: {
  userId: string
  initialStatus?: Status | string | null
}) {
  const { toast } = useToast()
  const router = useRouter()
  const normalized =
    initialStatus === "warned" || initialStatus === "suspended" || initialStatus === "banned"
      ? initialStatus
      : "active"
  const [status, setStatus] = useState<Status>(normalized)
  const [busy, setBusy] = useState<Status | null>(null)

  useEffect(() => {
    setStatus(normalized)
  }, [normalized])

  const run = async (next: Status) => {
    setBusy(next)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: next }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not update user" })
        return
      }
      setStatus(next)
      toast({ title: `User ${next}` })
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Could not update user",
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-2">
      <Badge variant={status === "active" ? "secondary" : "outline"}>{status}</Badge>
      <div className="flex flex-wrap gap-1">
        {status !== "warned" ? (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={busy !== null}
            loading={busy === "warned"}
            loadingText="Warning…"
            onClick={() => void run("warned")}
          >
            Warn
          </Button>
        ) : null}
        {status !== "suspended" ? (
          <ConfirmAction
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={busy !== null}
            loading={busy === "suspended"}
            loadingText="Suspending…"
            title="Suspend user?"
            description="They lose access until restored."
            confirmLabel="Suspend"
            onConfirm={() => run("suspended")}
          >
            Suspend
          </ConfirmAction>
        ) : null}
        {status !== "banned" ? (
          <ConfirmAction
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={busy !== null}
            loading={busy === "banned"}
            loadingText="Banning…"
            title="Ban user?"
            description="Hard block. Restore only if this was a mistake."
            confirmLabel="Ban"
            onConfirm={() => run("banned")}
          >
            Ban
          </ConfirmAction>
        ) : null}
        {status !== "active" ? (
          <Button
            size="sm"
            className="rounded-full"
            disabled={busy !== null}
            loading={busy === "active"}
            loadingText="Restoring…"
            onClick={() => void run("active")}
          >
            Restore
          </Button>
        ) : null}
      </div>
    </div>
  )
}
