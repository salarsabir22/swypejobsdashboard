"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const TOPICS = ["Resume review", "Career planning", "Interview prep", "Internship search", "Alumni advice"]

export default function AppointmentsPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<Appointment[]>([])
  const [topic, setTopic] = useState(TOPICS[0])
  const [when, setWhen] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from("campus_appointments").select("id, topic, note, starts_at, status").eq("student_id", user.id).order("starts_at", { ascending: true })
    if (error) return
    setRows((data || []) as Appointment[])
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
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }
    const { data: student } = await supabase.from("student_profiles").select("university").eq("id", user.id).maybeSingle()
    const { error } = await supabase.from("campus_appointments").insert({
      student_id: user.id,
      university: student?.university || "",
      topic,
      note: note.trim() || null,
      starts_at: new Date(when).toISOString(),
      status: "requested",
    })
    setSaving(false)
    if (error) {
      const missing = /campus_appointments/i.test(error.message)
      toast({ variant: "destructive", title: "Couldn’t request a slot", description: missing ? "Advising isn’t available on this workspace yet." : error.message })
      return
    }
    setNote("")
    toast({ title: "Request sent", description: "The career office will confirm the time." })
    void load()
  }

  const cancel = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("campus_appointments").update({ status: "cancelled" }).eq("id", id)
    if (error) toast({ variant: "destructive", title: "Couldn’t cancel", description: error.message })
    else void load()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <DashboardPageHeader
        eyebrow="Campus"
        title="Advising"
        description="Request a time with your career office. Staff confirm the slot from their desk."
        action={
          <Button variant="outline" size="icon" className="h-10 w-10" asChild>
            <Link href="/dashboard" aria-label="Back to Home">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <div className="space-y-4 rounded-2xl border border-border p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="appt-topic">Topic</Label>
            <select id="appt-topic" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="appt-when">Preferred time</Label>
            <Input id="appt-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="appt-note">Note</Label>
          <Textarea id="appt-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What do you want to cover?" />
        </div>
        <Button type="button" className="rounded-full" onClick={() => void book()} loading={saving} loadingText="Sending…">Request appointment</Button>
      </div>
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <div className="space-y-1.5">
                <p className="font-medium">{row.topic}</p>
                <p className="text-sm text-muted-foreground">{new Date(row.starts_at).toLocaleString()}</p>
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
      ) : (
        <DashboardEmptyState
          icon={Calendar}
          title="No appointments yet"
          description="Pick a topic and time above. The career office will confirm from their side."
        />
      )}
    </div>
  )
}
