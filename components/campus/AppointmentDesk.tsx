"use client"

import { useEffect, useState } from "react"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { StatusBadge } from "@/components/ui/status-badge"

type Row = {
  id: string
  student_name: string
  university: string
  topic: string
  note: string | null
  starts_at: string
  status: string
}

const ACTIONS = [
  { status: "confirmed", label: "Confirm" },
  { status: "completed", label: "Complete" },
  { status: "no_show", label: "No-show" },
  { status: "cancelled", label: "Cancel" },
] as const

export function AppointmentDesk({ canMutate = true }: { canMutate?: boolean }) {
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState("")

  const load = async () => {
    const res = await fetch("/api/campus/appointments")
    const body = (await res.json().catch(() => null)) as { appointments?: Row[]; error?: string } | null
    if (!res.ok) {
      setError(body?.error || "Couldn’t load appointments")
      return
    }
    setError("")
    setRows(body?.appointments || [])
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0)
    return () => clearTimeout(timer)
  }, [])

  const setStatus = async (id: string, status: string) => {
    const res = await fetch("/api/campus/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      setError(body?.error || "Couldn’t update")
      return
    }
    void load()
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="space-y-2 rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1.5">
                <p className="font-medium">{row.student_name} · {row.topic}</p>
                <p className="text-sm text-muted-foreground">{new Date(row.starts_at).toLocaleString()}</p>
              </div>
              <StatusBadge value={row.status} />
            </div>
            {row.note ? <p className="text-sm text-muted-foreground">{row.note}</p> : null}
            <p className="text-[12px] text-muted-foreground">{row.university || "University not set"}</p>
            {canMutate ? (
              <div className="flex flex-wrap gap-2">
                {ACTIONS.map((action) => (
                  <Button key={action.status} type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void setStatus(row.id, action.status)}>
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </li>
        ))}
        {!rows.length && !error ? (
          <li>
            <DashboardEmptyState
              icon={Calendar}
              title="No requests yet"
              description="When a student books advising, the request appears here for you to confirm."
            />
          </li>
        ) : null}
      </ul>
    </div>
  )
}
