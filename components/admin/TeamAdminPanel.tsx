"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ROLES = [
  { value: "super_admin", label: "Super admin" },
  { value: "moderator", label: "Moderator" },
  { value: "support", label: "Support" },
  { value: "analyst", label: "Analyst" },
  { value: "finance", label: "Finance" },
  { value: "readonly", label: "Read-only" },
] as const

export function TeamInviteForm() {
  const { toast } = useToast()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [staffRole, setStaffRole] = useState<string>("moderator")
  const [busy, setBusy] = useState(false)

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", email, staffRole }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; invited?: boolean; promoted?: boolean }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Invite failed" })
        return
      }
      toast({ title: data.promoted ? "Existing user promoted to admin" : "Invite sent" })
      setEmail("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={invite} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ops@swypejobs.app" />
      </div>
      <div className="space-y-1.5">
        <Label>Role</Label>
        <Select value={staffRole} onValueChange={setStaffRole}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="rounded-full" loading={busy} loadingText="Inviting…">
        Invite admin
      </Button>
    </form>
  )
}

export function TeamRoleSelect({
  userId,
  currentRole,
}: {
  userId: string
  currentRole: string
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [staffRole, setStaffRole] = useState(currentRole || "moderator")
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_role", userId, staffRole }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not update role" })
        return
      }
      toast({ title: "Role updated" })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={staffRole} onValueChange={setStaffRole}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" size="sm" variant="outline" className="rounded-full" loading={busy} loadingText="Saving…" onClick={() => void save()}>
        Save
      </Button>
    </div>
  )
}

export function AuditLogFilter({
  rows,
}: {
  rows: { id: string; created_at: string; action: string; entity: string | null; entity_id: string | null }[]
}) {
  const [q, setQ] = useState("")
  const [action, setAction] = useState("all")
  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (action !== "all" && row.action !== action) return false
      if (!q.trim()) return true
      const hay = `${row.action} ${row.entity || ""} ${row.entity_id || ""}`.toLowerCase()
      return hay.includes(q.trim().toLowerCase())
    })
  }, [rows, q, action])

  const actions = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Filter entity / action" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {filtered.length ? (
        <ul className="max-h-80 space-y-2 overflow-auto text-[13px]">
          {filtered.map((row) => (
            <li key={row.id}>
              {row.created_at}: {row.action} {row.entity} {row.entity_id}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-muted-foreground">No audit rows match.</p>
      )}
    </div>
  )
}
