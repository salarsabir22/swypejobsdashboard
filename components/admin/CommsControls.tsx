"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function TicketDecision({
  ticketId,
  initialStatus,
  subject,
  priority,
}: {
  ticketId: string
  initialStatus: string
  subject: string
  priority: string | null
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus || "open")
  const [busy, setBusy] = useState<string | null>(null)

  const set = async (next: "open" | "pending" | "resolved" | "closed") => {
    setBusy(next)
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: next }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not update ticket" })
        return
      }
      setStatus(next)
      toast({ title: `Ticket ${next}` })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const closed = status === "resolved" || status === "closed"

  return (
    <li className="space-y-2 rounded-2xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{subject}</p>
        <Badge variant="outline">{status}</Badge>
        {priority ? <Badge variant="secondary">{priority}</Badge> : null}
      </div>
      {!closed ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="rounded-full" loading={busy === "pending"} loadingText="…" onClick={() => void set("pending")}>
            Pending
          </Button>
          <Button type="button" size="sm" className="rounded-full" loading={busy === "resolved"} loadingText="…" onClick={() => void set("resolved")}>
            Resolve
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-full" loading={busy === "closed"} loadingText="…" onClick={() => void set("closed")}>
            Close
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" className="rounded-full" loading={busy === "open"} loadingText="…" onClick={() => void set("open")}>
          Reopen
        </Button>
      )}
    </li>
  )
}

export function BannerManager({
  banners,
}: {
  banners: { id: string; message: string }[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [deactivating, setDeactivating] = useState<string | null>(null)
  const [active, setActive] = useState(banners)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", message }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; banner?: { id: string; message: string } }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not create banner" })
        return
      }
      if (data.banner) setActive((prev) => [data.banner!, ...prev])
      setMessage("")
      toast({ title: "Banner live" })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const deactivate = async (bannerId: string) => {
    setDeactivating(bannerId)
    try {
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate", bannerId }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not deactivate" })
        return
      }
      setActive((prev) => prev.filter((b) => b.id !== bannerId))
      toast({ title: "Banner off" })
      router.refresh()
    } finally {
      setDeactivating(null)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="space-y-2">
        <Label>New banner</Label>
        <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Maintenance window tonight…" required />
        <Button type="submit" size="sm" className="rounded-full" loading={busy} loadingText="Publishing…">
          Publish banner
        </Button>
      </form>
      {active.length ? (
        <ul className="space-y-2 text-[14px]">
          {active.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
              <span>{b.message}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                loading={deactivating === b.id}
                loadingText="…"
                onClick={() => void deactivate(b.id)}
              >
                Deactivate
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-muted-foreground">No active banners.</p>
      )}
    </div>
  )
}
