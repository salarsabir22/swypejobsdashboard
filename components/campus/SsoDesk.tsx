"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"

type Identity = {
  id: string
  user_id: string
  provider: string
  subject: string
  email: string | null
  status: string
  affiliation: string | null
}

type Conflict = {
  id: string
  user_id: string
  email: string | null
  existing_role: string | null
  requested_portal: string | null
  requested_role: string | null
  status: string
}

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/campus/sso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error || "Could not update SSO.")
  return data
}

export function SsoDesk({
  identities,
  conflicts,
  missingTable,
}: {
  identities: Identity[]
  conflicts: Conflict[]
  missingTable: boolean
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [roster, setRoster] = useState("")
  const [strict, setStrict] = useState(false)
  const [keepUserId, setKeepUserId] = useState("")
  const [absorbUserId, setAbsorbUserId] = useState("")
  const [busy, setBusy] = useState(false)

  const run = async (body: Record<string, unknown>) => {
    setBusy(true)
    try {
      await post(body)
      toast({ title: "SSO updated" })
      router.refresh()
    } catch (error) {
      toast({ variant: "destructive", title: error instanceof Error ? error.message : "Could not update SSO" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      {missingTable ? (
        <p className="text-sm text-muted-foreground">
          Run <code>supabase/migrations/20261103_sso_identity.sql</code> in the Supabase SQL editor to store NameID/sub
          mappings, then refresh.
        </p>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Open role conflicts</h3>
        {!conflicts.length ? (
          <p className="text-sm text-muted-foreground">No open student / faculty / employer conflicts.</p>
        ) : (
          <ul className="space-y-3">
            {conflicts.map((row) => (
              <li key={row.id} className="space-y-2 rounded-2xl border border-border p-4">
                <p className="text-sm">
                  {row.email || row.user_id} · current {row.existing_role} · requested {row.requested_portal}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-full" disabled={busy} onClick={() => void run({ action: "override", userId: row.user_id, portal: row.requested_portal, conflictId: row.id })}>
                    Override to {row.requested_portal}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Merge duplicate accounts</h3>
        <p className="text-sm text-muted-foreground">Keep one user, move the IoBM NameID/sub onto it, and disable the other.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={keepUserId} onChange={(e) => setKeepUserId(e.target.value)} placeholder="Keep user id" />
          <Input value={absorbUserId} onChange={(e) => setAbsorbUserId(e.target.value)} placeholder="Disable user id" />
        </div>
        <Button
          size="sm"
          className="rounded-full"
          disabled={busy || !keepUserId || !absorbUserId}
          onClick={() => void run({ action: "merge", keepUserId, absorbUserId })}
        >
          Merge
        </Button>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Roster sync</h3>
        <p className="text-sm text-muted-foreground">
          One person per line: email, optional subject, affiliation (student, alumni, faculty, departed).
        </p>
        <textarea
          className="min-h-32 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          value={roster}
          onChange={(e) => setRoster(e.target.value)}
          placeholder={"sara@iobm.edu.pk, SAML123, student\ngrad@gmail.com, , alumni\nleft@iobm.edu.pk, , departed"}
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} />
          Deprovision anyone on IoBM SSO who is missing from this roster
        </label>
        <Button
          size="sm"
          className="rounded-full"
          disabled={busy || !roster.trim()}
          onClick={() => {
            const entries = roster
              .split(/\n+/)
              .map((line) => line.split(",").map((part) => part.trim()))
              .filter((parts) => parts[0])
              .map(([email, subject, affiliation]) => ({
                email,
                subject: subject || undefined,
                affiliation: (affiliation || "student") as "student" | "alumni" | "faculty" | "departed",
              }))
            void run({ action: "roster", entries, strict })
          }}
        >
          Sync roster
        </Button>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Campus identities</h3>
        {!identities.length ? (
          <p className="text-sm text-muted-foreground">No linked NameID/sub records yet.</p>
        ) : (
          <ul className="space-y-2">
            {identities.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-secondary/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.email || row.user_id}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.provider} · {row.subject} · {row.user_id}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={row.status} />
                  {row.status === "deprovisioned" ? (
                    <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => void run({ action: "restore", userId: row.user_id })}>
                      Restore
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => void run({ action: "deprovision", userId: row.user_id })}>
                      Deprovision
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
