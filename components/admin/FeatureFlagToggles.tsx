"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Flag = { key: string; enabled: boolean; rollout?: number | null }

export function FeatureFlagToggles({ flags }: { flags: Flag[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [rows, setRows] = useState(flags)
  const [busy, setBusy] = useState<string | null>(null)

  const save = async (key: string, enabled: boolean, rollout?: number) => {
    setBusy(key)
    try {
      const res = await fetch("/api/admin/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled, rollout }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; flag?: Flag }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not update flag" })
        return
      }
      if (data.flag) {
        setRows((prev) => prev.map((f) => (f.key === key ? { ...f, ...data.flag } : f)))
      }
      toast({ title: enabled ? `${key} on` : `${key} off` })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  if (!rows.length) {
    return <p className="mt-2 text-[13px] text-muted-foreground">No flags inserted yet.</p>
  }

  return (
    <ul className="mt-3 space-y-2">
      {rows.map((f) => (
        <li key={f.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-medium">{f.key}</span>
            <Badge variant={f.enabled ? "secondary" : "outline"}>{f.enabled ? "on" : "off"}</Badge>
            <span className="text-[12px] text-muted-foreground">rollout</span>
            <Input
              className="h-8 w-16"
              type="number"
              min={0}
              max={100}
              defaultValue={Number(f.rollout ?? 100)}
              onBlur={(e) => {
                const next = Number(e.target.value)
                if (!Number.isFinite(next) || next === Number(f.rollout ?? 100)) return
                void save(f.key, f.enabled, next)
              }}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            loading={busy === f.key}
            loadingText="…"
            onClick={() => void save(f.key, !f.enabled, Number(f.rollout ?? 100))}
          >
            {f.enabled ? "Disable" : "Enable"}
          </Button>
        </li>
      ))}
    </ul>
  )
}
