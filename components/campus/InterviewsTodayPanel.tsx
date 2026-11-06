"use client"

import { useEffect, useState } from "react"
import { BriefcaseBusiness, CalendarDays, MapPin, Video } from "lucide-react"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { StatusBadge } from "@/components/ui/status-badge"

type InterviewRow = {
  id: string
  proposed_at: string
  status: string
  format: "virtual" | "onsite" | null
  format_label: string | null
  location_or_link: string | null
  student_name: string
  university: string
  job_title: string
  company: string
  recruiter_name: string
}

export function InterviewsTodayPanel() {
  const [rows, setRows] = useState<InterviewRow[]>([])
  const [day, setDay] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const res = await fetch("/api/campus/interviews")
      const body = (await res.json().catch(() => null)) as {
        interviews?: InterviewRow[]
        day?: string
        error?: string
      } | null
      if (cancelled) return
      if (!res.ok) {
        setError(body?.error || "Couldn’t load today’s interviews")
        setRows([])
        setLoading(false)
        return
      }
      setError("")
      setDay(body?.day || "")
      setRows(body?.interviews || [])
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const dayLabel = day
    ? new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "Today"

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Students from your campus with employer interviews scheduled for {dayLabel}.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading interviews…</p> : null}
      {!loading && !error && !rows.length ? (
        <DashboardEmptyState
          icon={CalendarDays}
          title="No interviews today"
          description="When employers schedule interviews with your students, they appear here for the day."
        />
      ) : null}
      <ul className="space-y-3">
        {rows.map((row) => {
          const FormatIcon = row.format === "onsite" ? MapPin : Video
          return (
            <li key={row.id} className="space-y-2 rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{row.student_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(row.proposed_at).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {row.company} · {row.job_title}
                  </p>
                </div>
                <StatusBadge value={row.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <FormatIcon className="h-3.5 w-3.5" aria-hidden />
                  {row.format_label || "Format TBD"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden />
                  {row.recruiter_name}
                </span>
              </div>
              {row.location_or_link ? (
                <p className="truncate text-sm text-muted-foreground">{row.location_or_link}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
