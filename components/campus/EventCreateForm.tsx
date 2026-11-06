"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import {
  ANNOUNCEMENT_AUDIENCE_GROUPS,
  ANNOUNCEMENT_AUDIENCE_OPTIONS,
  type AnnouncementAudienceGroup,
} from "@/lib/campus/announcement-audience"
import { encodeEventSummary, type EventAudienceTarget, type EventFormat } from "@/lib/campus/event-meta"
import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type CalendarStatus = { configured: boolean; connected: boolean; email: string | null }
type GroupOption = { id: string; name: string; kind: string; memberCount: number }
type SearchHit = { id: string; title: string; subtitle?: string | null; kind: "person" | "company" }

export function EventCreateForm({ university }: { university: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [kind, setKind] = useState("workshop")
  const [starts, setStarts] = useState("")
  const [format, setFormat] = useState<EventFormat>("onsite")
  const [venue, setVenue] = useState("")
  const [description, setDescription] = useState("")
  const [audiences, setAudiences] = useState<AnnouncementAudienceGroup[]>(["students"])
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [targets, setTargets] = useState<EventAudienceTarget[]>([])
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null)
  const [addToCalendar, setAddToCalendar] = useState(true)
  const [busy, setBusy] = useState(false)

  const allSelected = audiences.length === ANNOUNCEMENT_AUDIENCE_GROUPS.length

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetch("/api/campus/groups").then(async (res) => {
        const body = (await res.json().catch(() => null)) as { groups?: GroupOption[] } | null
        return res.ok ? body?.groups || [] : []
      }),
      fetch("/api/calendar/google/status").then(async (res) => {
        if (!res.ok) return null
        return (await res.json()) as CalendarStatus
      }),
    ]).then(([groupRows, status]) => {
      if (cancelled) return
      setGroups(groupRows)
      if (status) setCalendar(status)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      return
    }
    const timer = setTimeout(() => {
      void fetch(`/api/campus/search?q=${encodeURIComponent(q)}`)
        .then(async (res) => {
          const body = (await res.json().catch(() => null)) as {
            students?: Array<{ id: string; title: string; subtitle?: string | null }>
            alumni?: Array<{ id: string; title: string; subtitle?: string | null }>
            employers?: Array<{ id: string; title: string; subtitle?: string | null }>
          } | null
          if (!res.ok || !body) return [] as SearchHit[]
          return [
            ...(body.students || []).map((row) => ({ ...row, kind: "person" as const })),
            ...(body.alumni || []).map((row) => ({ ...row, kind: "person" as const })),
            ...(body.employers || []).map((row) => ({
              id: row.id,
              title: row.title,
              subtitle: row.subtitle,
              kind: "company" as const,
            })),
          ]
        })
        .then(setHits)
        .catch(() => setHits([]))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const selectedGroupSet = useMemo(() => new Set(selectedGroupIds), [selectedGroupIds])

  const toggleAudience = (id: AnnouncementAudienceGroup) => {
    setAudiences((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((g) => g !== id)
        return next.length ? next : prev
      }
      return ANNOUNCEMENT_AUDIENCE_GROUPS.filter((g) => prev.includes(g) || g === id)
    })
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !starts) {
      toast({ variant: "destructive", title: "Add a title and date/time" })
      return
    }
    if (format === "onsite" && !venue.trim()) {
      toast({ variant: "destructive", title: "Add a venue for on-site events" })
      return
    }
    if (!audiences.length && !selectedGroupIds.length && !targets.length) {
      toast({ variant: "destructive", title: "Pick who can see this event" })
      return
    }

    setBusy(true)
    let location = format === "onsite" ? venue.trim() : null
    let meetLink: string | null = null
    let calendarHtmlLink: string | null = null

    if (format === "virtual" && addToCalendar && calendar?.connected) {
      const calRes = await fetch("/api/calendar/google/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          start: new Date(starts).toISOString(),
          description: description.trim() || undefined,
          virtual: true,
        }),
      })
      const calBody = (await calRes.json().catch(() => null)) as {
        hangoutLink?: string | null
        htmlLink?: string | null
        error?: string
      } | null
      if (!calRes.ok) {
        setBusy(false)
        toast({
          variant: "destructive",
          title: "Could not schedule on Google Calendar",
          description: calBody?.error || "Connect Google Calendar and try again.",
        })
        return
      }
      meetLink = calBody?.hangoutLink || null
      calendarHtmlLink = calBody?.htmlLink || null
      location = meetLink
    }

    const summary = encodeEventSummary(description, {
      format,
      audiences: audiences.length ? audiences : ["students"],
      groupIds: selectedGroupIds,
      targets,
      meetLink,
      calendarHtmlLink,
    })

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase.from("campus_events").insert({
      university,
      title: title.trim(),
      kind,
      starts_at: new Date(starts).toISOString(),
      location,
      summary,
      created_by: user?.id || null,
    })
    setBusy(false)
    if (error) {
      toast({ variant: "destructive", title: "Could not create event", description: error.message })
      return
    }
    setTitle("")
    setStarts("")
    setVenue("")
    setDescription("")
    setAudiences(["students"])
    setSelectedGroupIds([])
    setTargets([])
    setQuery("")
    toast({
      title: "Event created",
      description: meetLink ? "Added to Google Calendar with a Meet link." : undefined,
    })
    router.refresh()
  }

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="event-title">Event title</Label>
        <Input
          id="event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Fall career fair, resume clinic…"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="career_fair">Career fair</SelectItem>
              <SelectItem value="workshop">Workshop</SelectItem>
              <SelectItem value="info_session">Info session</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="event-starts">Date & time</Label>
          <DateTimePicker id="event-starts" value={starts} onChange={setStarts} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Format</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={format === "virtual" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setFormat("virtual")}
          >
            Virtual
          </Button>
          <Button
            type="button"
            variant={format === "onsite" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setFormat("onsite")}
          >
            On-site
          </Button>
        </div>
      </div>

      {format === "onsite" ? (
        <div className="space-y-1.5">
          <Label htmlFor="event-venue">Venue</Label>
          <Input
            id="event-venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Auditorium, Building A · Room 204"
            required
          />
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl border border-border p-3">
          {calendar?.connected ? (
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[var(--primary)]"
                checked={addToCalendar}
                onChange={(e) => setAddToCalendar(e.target.checked)}
              />
              <span>
                Schedule on Google Calendar with a Meet link (stays on SwypeJobs)
                {calendar.email ? <span className="mt-0.5 block text-muted-foreground">Connected as {calendar.email}</span> : null}
              </span>
            </label>
          ) : calendar?.configured ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Connect Google Calendar once to create Meet events without leaving SwypeJobs.
              </p>
              <Button type="button" variant="outline" className="rounded-full" asChild>
                <a href="/api/calendar/google/start?next=/campus/events">Connect Google Calendar</a>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Google Calendar isn’t configured yet. You can still publish the event and add a link later.
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="event-description">Description</Label>
        <Textarea
          id="event-description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What students/employers should know, agenda, dress code…"
        />
      </div>

      <div className="space-y-2">
        <Label>Visibility</Label>
        <p className="text-[13px] text-muted-foreground">Choose audiences, directory groups, and/or specific people or companies.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--primary)]"
              checked={allSelected}
              onChange={() => setAudiences(allSelected ? ["students"] : [...ANNOUNCEMENT_AUDIENCE_GROUPS])}
            />
            <span>
              <span className="font-medium">Everyone</span>
              <span className="block text-[13px] text-muted-foreground">Students, alumni, and employers</span>
            </span>
          </label>
          {ANNOUNCEMENT_AUDIENCE_OPTIONS.map((option) => (
            <label key={option.id} className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--primary)]"
                checked={audiences.includes(option.id)}
                onChange={() => toggleAudience(option.id)}
              />
              <span>
                <span className="font-medium">{option.label}</span>
                <span className="block text-[13px] text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {groups.length ? (
        <div className="space-y-2">
          <Label>Directory groups</Label>
          <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
            {groups.map((group) => (
              <label key={group.id} className="flex items-start gap-3 rounded-2xl border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                  checked={selectedGroupSet.has(group.id)}
                  onChange={() =>
                    setSelectedGroupIds((prev) =>
                      prev.includes(group.id) ? prev.filter((id) => id !== group.id) : [...prev, group.id]
                    )
                  }
                />
                <span>
                  <span className="font-medium">{group.name}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {group.kind} · {group.memberCount} members
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="event-entity-search">Specific people or companies</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="event-entity-search"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by full name or company name"
          />
        </div>
        {hits.length ? (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-2xl border border-border p-2">
            {hits.map((hit) => (
              <li key={`${hit.kind}-${hit.id}`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/50"
                  onClick={() => {
                    setTargets((prev) =>
                      prev.some((row) => row.id === hit.id)
                        ? prev
                        : [...prev, { id: hit.id, name: hit.title, kind: hit.kind }]
                    )
                    setQuery("")
                    setHits([])
                  }}
                >
                  <span>
                    <span className="font-medium">{hit.title}</span>
                    {hit.subtitle ? <span className="block text-[12px] text-muted-foreground">{hit.subtitle}</span> : null}
                  </span>
                  <span className="text-[12px] text-muted-foreground">{hit.kind === "company" ? "Company" : "Person"}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {targets.length ? (
          <div className="flex flex-wrap gap-2">
            {targets.map((target) => (
              <span
                key={target.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-[13px]"
              >
                {target.name}
                <button
                  type="button"
                  aria-label={`Remove ${target.name}`}
                  onClick={() => setTargets((prev) => prev.filter((row) => row.id !== target.id))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <Button type="submit" loading={busy} loadingText="Publishing…" disabled={!title.trim() || !starts} className="rounded-full">
        Publish event
      </Button>
    </form>
  )
}
