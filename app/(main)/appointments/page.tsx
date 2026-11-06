"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, Handshake } from "lucide-react"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { StatusBadge } from "@/components/ui/status-badge"

type Appointment = {
  id: string
  topic: string
  note: string | null
  starts_at: string
  status: string
}

const TOPICS = [
  "Resume review",
  "1:1 coaching",
  "Career advice",
  "Interview prep",
  "Internship search",
  "Career planning",
  "Alumni advice",
]

export default function AppointmentsPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<Appointment[]>([])
  const [topic, setTopic] = useState(TOPICS[0])
  const [when, setWhen] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [campusConnected, setCampusConnected] = useState(true)
  const [careerOffice, setCareerOffice] = useState("Your career office")
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    const res = await fetch("/api/appointments")
    const body = (await res.json().catch(() => null)) as {
      appointments?: Appointment[]
      campusConnected?: boolean
      careerOffice?: string
      error?: string
    } | null
    if (!res.ok) {
      toast({ variant: "destructive", title: "Couldn’t load appointments", description: body?.error })
      setLoaded(true)
      return
    }
    setRows(body?.appointments || [])
    setCampusConnected(body?.campusConnected !== false)
    if (body?.careerOffice) setCareerOffice(body.careerOffice)
    setLoaded(true)
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0)
    return () => clearTimeout(timer)
  }, [])

  const book = async () => {
    if (!when) {
      toast({ variant: "destructive", title: "Pick a time" })
      return
    }
    setSaving(true)
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, note: note.trim() || null, starts_at: new Date(when).toISOString() }),
    })
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    setSaving(false)
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Couldn’t request a slot",
        description: body?.error || "Advising isn’t available on this workspace yet.",
      })
      return
    }
    setNote("")
    toast({ title: "Request sent", description: `${careerOffice} will confirm the time.` })
    void load()
  }

  const cancel = async (id: string) => {
    const res = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "cancelled" }),
    })
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    if (!res.ok) toast({ variant: "destructive", title: "Couldn’t cancel", description: body?.error })
    else void load()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <DashboardPageHeader
        eyebrow="Campus"
        title="CDC advising"
        description={`Book resume review, 1:1 coaching, career advice, and interview prep with ${careerOffice}.`}
        action={
          <Button variant="outline" size="icon" className="h-10 w-10" asChild>
            <Link href="/dashboard" aria-label="Back to Home">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {loaded && !campusConnected ? (
        <DashboardEmptyState
          icon={Handshake}
          title="Not connected to this career center"
          description={`Advising is unavailable while your partnership with ${careerOffice} is paused. You can still browse and apply to jobs on Discover.`}
          primaryAction={{ href: "/discover", label: "Open Discover" }}
        />
      ) : (
        <div className="space-y-4 rounded-2xl border border-border p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="appt-topic">Session type</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger id="appt-topic">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt-when">Preferred time</Label>
              <DateTimePicker id="appt-when" value={when} onChange={setWhen} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="appt-note">What do you want to cover?</Label>
            <Textarea
              id="appt-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Resume draft ready, role targets, interview coming up…"
            />
          </div>
          <Button type="button" className="rounded-full" onClick={() => void book()} loading={saving} loadingText="Sending…">
            Request session
          </Button>
        </div>
      )}

      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <div className="space-y-1.5">
                <p className="font-medium">{row.topic}</p>
                <p className="text-sm text-muted-foreground">{new Date(row.starts_at).toLocaleString()}</p>
                {row.note ? <p className="text-sm text-muted-foreground">{row.note}</p> : null}
                <StatusBadge value={row.status} />
              </div>
              {row.status === "requested" ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => void cancel(row.id)}>
                  Cancel
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : loaded && campusConnected ? (
        <DashboardEmptyState
          icon={Calendar}
          title="No sessions yet"
          description="Pick a session type and time above. The career office will confirm from their desk."
        />
      ) : null}
    </div>
  )
}
