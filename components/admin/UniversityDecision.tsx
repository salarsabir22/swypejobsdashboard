"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { useToast } from "@/lib/hooks/use-toast"
import { ConfirmAction } from "@/components/admin/ConfirmAction"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Status = "pending" | "active" | "suspended"

export function UniversityDecision({
  orgId,
  initialStatus,
  initialDomain,
  ferpaSigned,
}: {
  orgId: string
  initialStatus: string | null
  initialDomain: string | null
  ferpaSigned: boolean
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [status, setStatus] = useState<Status>(
    initialStatus === "active" ? "active" : initialStatus === "suspended" ? "suspended" : "pending",
  )
  const [domain, setDomain] = useState(initialDomain || "")
  const [ferpa, setFerpa] = useState(ferpaSigned)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    setStatus(initialStatus === "active" ? "active" : initialStatus === "suspended" ? "suspended" : "pending")
    setDomain(initialDomain || "")
    setFerpa(ferpaSigned)
  }, [initialStatus, initialDomain, ferpaSigned])

  const run = async (action: "approve" | "suspend" | "set_domain" | "set_ferpa", extra?: Record<string, unknown>) => {
    setBusy(action)
    try {
      const res = await fetch("/api/admin/universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, action, ...extra }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        org?: { status?: string; domain?: string; ferpa_signed?: boolean }
      }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not update university" })
        return
      }
      if (action === "approve") setStatus("active")
      if (action === "suspend") setStatus("suspended")
      if (action === "set_domain" && data.org?.domain) setDomain(data.org.domain)
      if (action === "set_ferpa" && typeof data.org?.ferpa_signed === "boolean") setFerpa(data.org.ferpa_signed)
      toast({ title: action === "approve" ? "Campus approved" : action === "suspend" ? "Campus suspended" : "Saved" })
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Could not update university",
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {status === "active" ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
            <p className="text-sm font-medium">Active campus</p>
            <Badge variant="secondary">Live</Badge>
          </>
        ) : status === "suspended" ? (
          <>
            <p className="text-sm font-medium">Suspended</p>
            <Badge variant="outline">Offline</Badge>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Awaiting onboard</p>
            <Badge variant="outline">Pending</Badge>
          </>
        )}
        <Badge variant={ferpa ? "secondary" : "outline"}>FERPA {ferpa ? "signed" : "unsigned"}</Badge>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Domain whitelist</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            className="h-10 max-w-xs"
            placeholder="college.edu"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            loading={busy === "set_domain"}
            loadingText="Saving…"
            onClick={() => void run("set_domain", { domain })}
          >
            Save domain
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {status !== "active" ? (
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            loading={busy === "approve"}
            loadingText="Approving…"
            onClick={() => void run("approve")}
          >
            Approve campus
          </Button>
        ) : (
          <ConfirmAction
            size="sm"
            variant="outline"
            className="rounded-full"
            loading={busy === "suspend"}
            loadingText="Suspending…"
            title="Suspend campus?"
            description="Domain whitelist stays, but the org is marked suspended."
            confirmLabel="Suspend"
            onConfirm={() => run("suspend")}
          >
            Suspend
          </ConfirmAction>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          loading={busy === "set_ferpa"}
          loadingText="Saving…"
          onClick={() => void run("set_ferpa", { ferpaSigned: !ferpa })}
        >
          {ferpa ? "Mark FERPA unsigned" : "Mark FERPA signed"}
        </Button>
      </div>
    </div>
  )
}
