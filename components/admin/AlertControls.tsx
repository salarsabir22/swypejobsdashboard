"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MUTE_KEY = "admin_alerts_muted_until"
const ACK_KEY = "admin_alerts_acked"

function loadAcked(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(ACK_KEY) || "{}") as Record<string, number>
  } catch {
    return {}
  }
}

export function AlertMuteBar({ alerts }: { alerts: string[] }) {
  const [mutedUntil, setMutedUntil] = useState<number | null>(null)
  const [acked, setAcked] = useState<Record<string, number>>({})
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const raw = localStorage.getItem(MUTE_KEY)
    if (raw) setMutedUntil(Number(raw) || null)
    setAcked(loadAcked())
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  const muted = mutedUntil != null && mutedUntil > now
  const visible = useMemo(
    () => alerts.filter((a) => !acked[a] || (acked[a] || 0) < now),
    [alerts, acked, now],
  )

  const mute24h = () => {
    const until = Date.now() + 24 * 60 * 60 * 1000
    localStorage.setItem(MUTE_KEY, String(until))
    setMutedUntil(until)
  }

  const clearMute = () => {
    localStorage.removeItem(MUTE_KEY)
    setMutedUntil(null)
  }

  const ackOne = (alert: string) => {
    const until = Date.now() + 24 * 60 * 60 * 1000
    const next = { ...loadAcked(), [alert]: until }
    localStorage.setItem(ACK_KEY, JSON.stringify(next))
    setAcked(next)
  }

  if (!alerts.length && !muted) {
    return <p className="text-[14px] text-muted-foreground">No active alerts on this snapshot.</p>
  }

  if (muted) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Muted until {new Date(mutedUntil!).toLocaleString()}</Badge>
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={clearMute}>
            Unmute
          </Button>
        </div>
        <p className="text-[13px] text-muted-foreground">{alerts.length} alert(s) hidden for this browser.</p>
      </div>
    )
  }

  if (!visible.length) {
    return (
      <div className="space-y-2">
        <p className="text-[14px] text-muted-foreground">All current alerts acknowledged for 24h.</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => {
            localStorage.removeItem(ACK_KEY)
            setAcked({})
          }}
        >
          Clear acknowledgements
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {visible.map((a) => (
          <li key={a} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-[14px]">
            <span>{a}</span>
            <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => ackOne(a)}>
              Acknowledge 24h
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={mute24h}>
        Mute all 24h
      </Button>
    </div>
  )
}

export function RuleToggle({
  ruleId,
  name,
  trigger,
  action,
  initialActive,
}: {
  ruleId: string
  name: string
  trigger: string
  action: string
  initialActive: boolean
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [active, setActive] = useState(initialActive)
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(name)
  const [triggerVal, setTriggerVal] = useState(trigger)
  const [actionVal, setActionVal] = useState(action)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_rule", ruleId, isActive: !active }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not toggle rule" })
        return
      }
      setActive(!active)
      toast({ title: !active ? "Rule on" : "Rule off" })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_rule",
          ruleId,
          name: nameVal,
          trigger: triggerVal,
          ruleAction: actionVal,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not update rule" })
        return
      }
      setEditing(false)
      toast({ title: "Rule updated" })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="space-y-2 rounded-xl border border-border px-3 py-2 text-[14px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{nameVal}</p>
          <p className="text-[13px] text-muted-foreground">
            {triggerVal} → {actionVal}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={active ? "secondary" : "outline"}>{active ? "on" : "off"}</Badge>
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            loading={busy}
            loadingText="…"
            onClick={() => void toggle()}
          >
            {active ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>
      {editing ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <Input value={nameVal} onChange={(e) => setNameVal(e.target.value)} placeholder="Name" />
          <Input value={triggerVal} onChange={(e) => setTriggerVal(e.target.value)} placeholder="Trigger" />
          <Input value={actionVal} onChange={(e) => setActionVal(e.target.value)} placeholder="Action" />
          <Button type="button" size="sm" className="rounded-full sm:col-span-3" loading={busy} loadingText="Saving…" onClick={() => void save()}>
            Save rule
          </Button>
        </div>
      ) : null}
    </li>
  )
}

export function RuleCreateForm() {
  const { toast } = useToast()
  const router = useRouter()
  const [name, setName] = useState("")
  const [trigger, setTrigger] = useState("")
  const [ruleAction, setRuleAction] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_rule", name, trigger, ruleAction }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not create rule" })
        return
      }
      toast({ title: "Rule created" })
      setName("")
      setTrigger("")
      setRuleAction("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-3">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Scam surge" required />
      </div>
      <div className="space-y-1">
        <Label>Trigger</Label>
        <Input value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="3 scam reports" required />
      </div>
      <div className="space-y-1">
        <Label>Action</Label>
        <Input value={ruleAction} onChange={(e) => setRuleAction(e.target.value)} placeholder="suspend employer" required />
      </div>
      <Button type="submit" size="sm" className="rounded-full sm:col-span-3" loading={busy} loadingText="Creating…">
        Add rule
      </Button>
    </form>
  )
}
