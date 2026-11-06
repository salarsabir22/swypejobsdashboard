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
    const res = await fetch("/api/campus/nudges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        university,
        title,
        message: body,
        segment: defaultTitle,
        studentIds: students.slice(0, 80).map((s) => s.id),
      }),
    })
    const payload = (await res.json().catch(() => null)) as { error?: string; sent?: number } | null
    setBusy(false)
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Could not send",
        description: payload?.error || "Try again.",
      })
      return
    }
    toast({ title: `Sent to ${payload?.sent || Math.min(students.length, 80)} students` })
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <Label>Nudge title</Label>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      <Label>Message</Label>
      <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
      <Button type="submit" loading={busy} loadingText="Sending…" className="rounded-full">
        {`Message ${Math.min(students.length, 80)} students`}
      </Button>
    </form>
  )
}

export { EventCreateForm as EventForm } from "@/components/campus/EventCreateForm"

export function SavedViewForm({ path }: { path: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      return
    }
    const href =
      typeof window !== "undefined" && window.location.search ? `${path}${window.location.search}` : path
    const { error } = await supabase.from("campus_saved_views").insert({
      user_id: user.id,
      name: name.trim(),
      path: href,
      filters: {},
    })
    setBusy(false)
    if (error) toast({ variant: "destructive", title: "Could not save view", description: error.message })
    else {
      setName("")
      toast({ title: "Saved for your role" })
      router.refresh()
    }
  }
  return (
    <form onSubmit={save} className="flex flex-wrap gap-2">
      <Input
        className="max-w-xs"
        placeholder="e.g. Dean — CS seniors"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button
        type="submit"
        variant="outline"
        className="rounded-full"
        disabled={!name.trim()}
        loading={busy}
        loadingText="Saving…"
      >
        Save this view
      </Button>
    </form>
  )
}

export function JobReviewButtons({ jobId, university }: { jobId: string; university: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null)
  const setStatus = async (status: "approved" | "rejected") => {
    setBusy(status)
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
    setBusy(null)
    if (error) toast({ variant: "destructive", title: "Could not update", description: error.message })
    else {
      toast({ title: status === "approved" ? "Job approved" : "Job held" })
      router.refresh()
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        className="rounded-full"
        disabled={busy !== null}
        loading={busy === "approved"}
        loadingText="Approving…"
        onClick={() => void setStatus("approved")}
      >
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-full"
        disabled={busy !== null}
        loading={busy === "rejected"}
        loadingText="Holding…"
        onClick={() => void setStatus("rejected")}
      >
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
