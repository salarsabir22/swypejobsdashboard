"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

async function audit(action: string, entity: string, entityId: string, meta?: Record<string, unknown>) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  await supabase.from("platform_audit_log").insert({
    actor_id: user?.id || null,
    action,
    entity,
    entity_id: entityId,
    meta: meta || null,
  })
}

export function EmployerDecision({ recruiterId }: { recruiterId: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [reason, setReason] = useState("incomplete_verification")
  const [notes, setNotes] = useState("")
  const run = async (action: "approve" | "reject" | "suspend") => {
    const supabase = createClient()
    const approved = action === "approve"
    const { error } = await supabase.from("recruiter_profiles").update({ is_approved: approved }).eq("id", recruiterId)
    if (error) {
      toast({ variant: "destructive", title: error.message })
      return
    }
    await supabase.from("employer_reviews").insert({ recruiter_id: recruiterId, action, reason_code: reason, notes })
    await audit(action, "employer", recruiterId, { reason, notes })
    toast({ title: action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Suspended" })
    router.refresh()
  }
  return (
    <div className="space-y-2">
      <select
        className="h-10 w-full rounded-full border border-input bg-white px-3 text-sm"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      >
        <option value="verified">Verified domain / site</option>
        <option value="incomplete_verification">Incomplete verification</option>
        <option value="free_email">Free email / risk</option>
        <option value="scam_reports">Scam reports</option>
        <option value="mismatch">Mismatched details</option>
      </select>
      <Textarea rows={2} placeholder="Internal notes (and rejection email body)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="rounded-full" onClick={() => void run("approve")}>
          Approve
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void run("reject")}>
          Reject
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void run("suspend")}>
          Suspend
        </Button>
      </div>
    </div>
  )
}

export function JobModerationButtons({ jobId, flags }: { jobId: string; flags: string[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const setStatus = async (status: "approved" | "rejected" | "removed" | "featured") => {
    const supabase = createClient()
    if (status === "removed" || status === "rejected") {
      await supabase.from("jobs").update({ is_active: false }).eq("id", jobId)
    }
    if (status === "approved" || status === "featured") {
      await supabase.from("jobs").update({ is_active: true }).eq("id", jobId)
    }
    const { error } = await supabase.from("job_moderation").upsert({
      job_id: jobId,
      status,
      flags,
      reviewed_at: new Date().toISOString(),
    })
    await audit(`job_${status}`, "job", jobId, { flags })
    if (error && !/job_moderation/.test(error.message)) toast({ variant: "destructive", title: error.message })
    else toast({ title: `Job ${status}` })
    router.refresh()
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" className="rounded-full" onClick={() => void setStatus("approved")}>
        Approve
      </Button>
      <Button size="sm" variant="outline" className="rounded-full" onClick={() => void setStatus("featured")}>
        Feature
      </Button>
      <Button size="sm" variant="outline" className="rounded-full" onClick={() => void setStatus("rejected")}>
        Reject
      </Button>
      <Button size="sm" variant="outline" className="rounded-full" onClick={() => void setStatus("removed")}>
        Remove
      </Button>
    </div>
  )
}

export function UserModerationButtons({ userId }: { userId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const setStatus = async (status: "warned" | "suspended" | "banned" | "active") => {
    const supabase = createClient()
    const { error } = await supabase.from("user_moderation").upsert({
      user_id: userId,
      status,
      updated_at: new Date().toISOString(),
    })
    await audit(`user_${status}`, "user", userId)
    if (error) toast({ variant: "destructive", title: error.message })
    else toast({ title: `User ${status}` })
    router.refresh()
  }
  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="outline" className="rounded-full" onClick={() => void setStatus("warned")}>
        Warn
      </Button>
      <Button size="sm" variant="outline" className="rounded-full" onClick={() => void setStatus("suspended")}>
        Suspend
      </Button>
      <Button size="sm" variant="outline" className="rounded-full" onClick={() => void setStatus("banned")}>
        Ban
      </Button>
    </div>
  )
}

export function BroadcastForm() {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [segment, setSegment] = useState("all_students")
  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase.from("platform_broadcasts").insert({
      channel: "in_app",
      segment,
      title,
      body,
      created_by: user?.id,
    })
    if (error) {
      toast({ variant: "destructive", title: error.message })
      return
    }
    if (segment === "all_students") {
      const { data: students } = await supabase.from("profiles").select("id").eq("role", "student").limit(80)
      if (students?.length) {
        await supabase.from("notifications").insert(
          students.map((s) => ({
            user_id: s.id,
            type: "broadcast",
            title,
            body,
            data: { segment },
          }))
        )
      }
    }
    toast({ title: "Broadcast queued" })
    setTitle("")
    setBody("")
  }
  return (
    <form onSubmit={send} className="space-y-3">
      <Label>Segment</Label>
      <select className="h-11 w-full rounded-full border border-input bg-white px-4 text-sm" value={segment} onChange={(e) => setSegment(e.target.value)}>
        <option value="all_students">All students</option>
        <option value="all_recruiters">All employers</option>
        <option value="inactive">Inactive 14d</option>
      </select>
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea rows={4} placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} required />
      <Button type="submit" className="rounded-full">
        Send in-app
      </Button>
    </form>
  )
}

export function RankingForm({
  initial,
}: {
  initial: { skills: number; location: number; recency: number; employer_tier: number }
}) {
  const { toast } = useToast()
  const [weights, setWeights] = useState(initial)
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    const { error } = await supabase.from("ranking_weights").upsert({ id: 1, ...weights, updated_at: new Date().toISOString() })
    if (error) toast({ variant: "destructive", title: error.message })
    else toast({ title: "Ranking weights saved (staged — Discover still uses current match logic until wired)" })
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
      <Button type="submit" className="rounded-full sm:col-span-2">
        Save weights
      </Button>
    </form>
  )
}
