"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Handshake } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { StatusBadge } from "@/components/ui/status-badge"

type Mentor = {
  user_id: string
  name: string
  expertise?: string | null
  industries?: string | null
  topics?: string | null
  format?: string | null
}

type RequestRow = {
  id: string
  student_id: string
  mentor_id: string
  topic: string | null
  note: string | null
  status: string
}

export function MentorshipStudentView({ userId, mentors, requests }: { userId: string; mentors: Mentor[]; requests: RequestRow[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [topic, setTopic] = useState("Career path")

  const request = async (mentorId: string) => {
    setBusy(mentorId)
    const supabase = createClient()
    const { error } = await supabase.from("mentorship_requests").insert({
      student_id: userId,
      mentor_id: mentorId,
      topic,
      status: "pending",
    })
    setBusy(null)
    if (error) toast({ variant: "destructive", title: "Couldn’t send request", description: error.message })
    else {
      toast({ title: "Request sent" })
      router.refresh()
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <DashboardPageHeader
        eyebrow="Alumni"
        title="Mentorship"
        description="Ask an opted-in graduate for advice. Notes stay between you and the mentor."
      />
      <div className="space-y-1.5">
        <Label htmlFor="mentor-topic">What do you want to talk about?</Label>
        <Input id="mentor-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Career path, internships, switching majors…" />
      </div>
      {mentors.length ? (
        <ul className="space-y-3">
          {mentors.map((mentor) => (
            <li key={mentor.user_id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <div>
                <p className="font-medium">{mentor.name}</p>
                <p className="text-sm text-muted-foreground">{[mentor.expertise, mentor.industries, mentor.format].filter(Boolean).join(" · ") || "Open to mentoring"}</p>
              </div>
              <Button type="button" size="sm" loading={busy === mentor.user_id} onClick={() => void request(mentor.user_id)}>
                Request
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <DashboardEmptyState
          icon={Handshake}
          title="No mentors yet"
          description="Your career office can invite alumni to opt in. Check back after graduation season, or ask advising."
          primaryAction={{ href: "/appointments", label: "Book advising" }}
        />
      )}
      {requests.filter((r) => r.student_id === userId).length ? (
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Your requests</h2>
          <ul className="space-y-2">
            {requests
              .filter((r) => r.student_id === userId)
              .map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border px-4 py-3">
                  <p className="text-sm">{r.topic || "Mentorship"}</p>
                  <StatusBadge value={r.status} />
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

export function MentorshipAlumniView({
  userId,
  optedIn,
  profile,
  requests,
}: {
  userId: string
  optedIn: boolean
  profile: { expertise?: string | null; industries?: string | null; topics?: string | null; format?: string | null; is_discoverable?: boolean | null } | null
  mentors: Mentor[]
  requests: RequestRow[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [expertise, setExpertise] = useState(profile?.expertise || "")
  const [industries, setIndustries] = useState(profile?.industries || "")
  const [topics, setTopics] = useState(profile?.topics || "")
  const [format, setFormat] = useState(profile?.format || "Online")
  const [busy, setBusy] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const supabase = createClient()
    await supabase.from("student_profiles").update({ mentorship_opt_in: true }).eq("id", userId)
    const { error } = await supabase.from("mentorship_profiles").upsert({
      user_id: userId,
      expertise: expertise.trim() || null,
      industries: industries.trim() || null,
      topics: topics.trim() || null,
      format: format.trim() || null,
      is_discoverable: true,
      updated_at: new Date().toISOString(),
    })
    setBusy(false)
    if (error) toast({ variant: "destructive", title: "Couldn’t save", description: error.message })
    else toast({ title: "You’re discoverable to students" })
    router.refresh()
  }

  const decide = async (id: string, status: "accepted" | "declined") => {
    const supabase = createClient()
    const { error } = await supabase.from("mentorship_requests").update({ status, decided_at: new Date().toISOString() }).eq("id", id)
    if (error) toast({ variant: "destructive", title: "Couldn’t update", description: error.message })
    else router.refresh()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <DashboardPageHeader
        eyebrow="Alumni"
        title="Mentorship"
        description={
          optedIn
            ? "Students can request time with you. Accept or decline each request."
            : "Opt in so current students in your programmes can find you."
        }
      />
      <form onSubmit={save} className="space-y-3 rounded-2xl border border-border p-4">
        <Label>Expertise</Label>
        <Input value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="Finance, product, consulting…" />
        <Label>Industries</Label>
        <Input value={industries} onChange={(e) => setIndustries(e.target.value)} />
        <Label>Topics</Label>
        <Input value={topics} onChange={(e) => setTopics(e.target.value)} />
        <Label>Format</Label>
        <Input value={format} onChange={(e) => setFormat(e.target.value)} />
        <Button type="submit" className="rounded-full" loading={busy}>
          Save mentor profile
        </Button>
      </form>
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Requests</h2>
        {requests.filter((r) => r.mentor_id === userId).map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border p-4">
            <div>
              <p className="font-medium">{r.topic || "Mentorship"}</p>
              {r.note ? <p className="text-sm text-muted-foreground">{r.note}</p> : null}
              <StatusBadge value={r.status} />
            </div>
            {r.status === "pending" ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="rounded-full" onClick={() => void decide(r.id, "accepted")}>Accept</Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => void decide(r.id, "declined")}>Decline</Button>
              </div>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  )
}
