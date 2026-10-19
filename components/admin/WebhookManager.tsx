"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Hook = { id: string; name: string; url?: string | null; is_active: boolean; last_error?: string | null }

export function WebhookManager({ hooks }: { hooks: Hook[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [rows, setRows] = useState(hooks)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name, url }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; webhook?: Hook }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not create webhook" })
        return
      }
      if (data.webhook) setRows((prev) => [data.webhook!, ...prev])
      setName("")
      setUrl("")
      toast({ title: "Webhook added" })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (hook: Hook) => {
    setToggling(hook.id)
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", webhookId: hook.id, isActive: !hook.is_active }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; webhook?: Hook }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not toggle webhook" })
        return
      }
      if (data.webhook) {
        setRows((prev) => prev.map((r) => (r.id === hook.id ? { ...r, ...data.webhook! } : r)))
      }
      toast({ title: !hook.is_active ? "Webhook live" : "Webhook off" })
      router.refresh()
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Greenhouse" required />
        </div>
        <div className="space-y-1.5">
          <Label>Callback URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" required />
        </div>
        <Button type="submit" size="sm" className="rounded-full sm:col-span-2" loading={busy} loadingText="Saving…">
          Add webhook
        </Button>
      </form>

      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-[14px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{h.name}</span>
                  <Badge variant={h.is_active ? "secondary" : "outline"}>{h.is_active ? "live" : "off"}</Badge>
                </div>
                <p className="truncate text-[12px] text-muted-foreground">{h.url || "no url"}</p>
                <p className="text-[12px] text-muted-foreground">{h.last_error || "no errors"}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                loading={toggling === h.id}
                loadingText="…"
                onClick={() => void toggle(h)}
              >
                {h.is_active ? "Disable" : "Enable"}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-muted-foreground">No webhooks yet. Add a callback URL to track connector health.</p>
      )}
    </div>
  )
}
