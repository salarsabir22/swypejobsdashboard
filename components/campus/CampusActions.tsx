"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import type { AttentionStudent } from "@/lib/campus/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function NudgeForm({
  university,
  students,
  defaultTitle,
}: {
  university: string
  students: AttentionStudent[]
  defaultTitle: string
}) {
  const { toast } = useToast()
  const [title, setTitle] = useState(defaultTitle)
  const [body, setBody] = useState("Your career office left a note on swypejobs. Open Discover and apply to a role this week.")
  const [busy, setBusy] = useState(false)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!students.length) {
      toast({ variant: "destructive", title: "No students in this segment" })
      return
    }
    setBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const rows = students.slice(0, 80).map((s) => ({
      user_id: s.id,
      type: "campus_nudge",
      title,
      body,
      data: { university, source: "career_office" },
    }))
    const { error } = await supabase.from("notifications").insert(rows)
    if (!error) {
      await supabase.from("campus_nudges").insert({
        university,
        created_by: user?.id || null,
        segment: defaultTitle,
        title,
        body,
      })
    }
    setBusy(false)
    if (error) {
      toast({ variant: "destructive", title: "Could not send", description: error.message })
      return
    }
    toast({ title: `Sent to ${rows.length} students` })
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <Label>Nudge title</Label>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      <Label>Message</Label>
      <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
      <Button type="submit" disabled={busy} className="rounded-full">
        {busy ? "Sending…" : `Message ${Math.min(students.length, 80)} students`}
      </Button>
    </form>
  )
}

export function EventForm({ university }: { university: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [kind, setKind] = useState("workshop")
  const [starts, setStarts] = useState("")
  const [busy, setBusy] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase.from("campus_events").insert({
      university,
      title: title.trim(),
      kind,
      starts_at: starts || null,
      created_by: user?.id || null,
    })
    setBusy(false)
    if (error) {
      toast({ variant: "destructive", title: "Could not create event", description: error.message })
      return
    }
    setTitle("")
    toast({ title: "Event created" })
    router.refresh()
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <Label>Event title</Label>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Fall career fair" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <select
            className="h-11 w-full rounded-full border border-input bg-white px-4 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="career_fair">Career fair</option>
            <option value="workshop">Workshop</option>
            <option value="info_session">Info session</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Starts</Label>
          <Input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
        </div>
      </div>
      <Button type="submit" disabled={busy || !title.trim()} className="rounded-full">
        {busy ? "Saving…" : "Publish event"}
      </Button>
    </form>
  )
}

export function SavedViewForm({ path }: { path: string }) {
  const { toast } = useToast()
  const [name, setName] = useState("")
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from("campus_saved_views").insert({
      user_id: user.id,
      name: name.trim(),
      path,
      filters: {},
    })
    if (error) toast({ variant: "destructive", title: "Could not save view", description: error.message })
    else toast({ title: "Saved for your role" })
  }
  return (
    <form onSubmit={save} className="flex flex-wrap gap-2">
      <Input
        className="max-w-xs"
        placeholder="e.g. Dean — CS seniors"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button type="submit" variant="outline" className="rounded-full" disabled={!name.trim()}>
        Save this view
      </Button>
    </form>
  )
}

export function JobReviewButtons({ jobId, university }: { jobId: string; university: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const setStatus = async (status: "approved" | "rejected") => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase.from("campus_job_reviews").upsert({
      job_id: jobId,
      university,
      status,
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
    })
    if (error) toast({ variant: "destructive", title: "Could not update", description: error.message })
    else {
      toast({ title: status === "approved" ? "Job approved" : "Job held" })
      router.refresh()
    }
  }
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" className="rounded-full" onClick={() => void setStatus("approved")}>
        Approve
      </Button>
      <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void setStatus("rejected")}>
        Hold
      </Button>
    </div>
  )
}

export function ExportCsvButton({ filename, rows }: { filename: string; rows: Record<string, unknown>[] }) {
  const download = () => {
    if (!rows.length) return
    const keys = Object.keys(rows[0])
    const csv = [
      keys.join(","),
      ...rows.map((row) =>
        keys
          .map((k) => {
            const s = row[k] == null ? "" : String(row[k])
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(",")
      ),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <Button type="button" variant="outline" className="rounded-full" onClick={download} disabled={!rows.length}>
      Export CSV
    </Button>
  )
}
