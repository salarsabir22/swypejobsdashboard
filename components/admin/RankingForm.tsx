"use client"

import { useState } from "react"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function RankingForm({
  initial,
}: {
  initial: { skills: number; location: number; recency: number; employer_tier: number }
}) {
  const { toast } = useToast()
  const [weights, setWeights] = useState(initial)
  const [busy, setBusy] = useState(false)
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch("/api/admin/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weights),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) toast({ variant: "destructive", title: data.error || "Could not save weights" })
      else toast({ title: "Ranking weights live in Discover" })
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
      {(["skills", "location", "recency", "employer_tier"] as const).map((key) => (
        <div key={key} className="space-y-1.5">
          <Label>{key.replace("_", " ")}</Label>
          <Input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={weights[key]}
            onChange={(e) => setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))}
          />
        </div>
      ))}
      <Button type="submit" className="rounded-full sm:col-span-2" loading={busy} loadingText="Saving…">
        Save weights
      </Button>
    </form>
  )
}
