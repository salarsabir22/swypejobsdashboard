"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getInitials, formatDate } from "@/lib/utils"
import { useToast } from "@/lib/hooks/use-toast"
import Link from "next/link"
import { ShowMoreButton, ShowMoreList } from "@/components/ui/show-more-list"
import { CredentialLink } from "@/components/storage/SignedFileLink"
import { ApplicantListSkeleton } from "@/components/skeletons"
import { ApplicationAnswersList } from "@/components/jobs/ApplicationAnswersList"
import { InterviewInviteDialog, type InterviewInviteTarget } from "@/components/hiring/InterviewInviteDialog"
import { undoCandidateSwipe } from "@/lib/swipe/undo"
import { isUniqueViolation } from "@/lib/swipe/errors"
import { Download, Sparkles } from "lucide-react"

interface CandidateItem {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  applied_at: string
  university: string | null
  degree: string | null
  graduation_year: number | null
  skills: string[]
  resume_url: string | null
  linkedin_url: string | null
  github_url: string | null
  portfolio_url: string | null
  decision: "right" | "left" | null
  cgpa: number | null
  tags: string[]
}

interface ApplicationRow {
  student_id: string
  created_at: string
  recruiter_tags?: string[] | null
}

interface ProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
}

interface StudentProfileRow {
  id: string
  university: string | null
  degree: string | null
  graduation_year: number | null
  skills: string[] | null
  resume_url: string | null
  linkedin_url: string | null
  github_url: string | null
  portfolio_url: string | null
  cgpa?: number | null
}

interface DecisionRow {
  student_id: string
  direction: "right" | "left"
}

type ApplicantPick = {
  studentId: string
  score: number
  reason: string
}

export function InterestedCandidatesPanel({
  recruiterId,
  jobId,
  jobTitle,
  screeningQuestions,
  recruiterName,
  companyName,
  calendlyUrl,
}: {
  recruiterId: string
  jobId: string
  jobTitle: string
  screeningQuestions?: unknown
  recruiterName: string
  companyName: string
  calendlyUrl?: string | null
}) {
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [busyDirection, setBusyDirection] = useState<"right" | "left" | null>(null)
  const [items, setItems] = useState<CandidateItem[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteTarget, setInviteTarget] = useState<InterviewInviteTarget | null>(null)
  const [picks, setPicks] = useState<ApplicantPick[]>([])
  const [pickSource, setPickSource] = useState<"ai" | "profile" | null>(null)
  const [ranker, setRanker] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [picksLoading, setPicksLoading] = useState(true)
  const [sortBy, setSortBy] = useState<"recent" | "name" | "cgpa">("recent")
  const tagChoices = ["Strong fit", "Interview", "Hold"]

  useEffect(() => {
    const run = async () => {
      setLoading(true)

      const applicationsQuery = await supabase
        .from("job_swipes")
        .select("student_id, created_at, recruiter_tags")
        .eq("job_id", jobId)
        .eq("direction", "right")
        .order("created_at", { ascending: false })
        .limit(80)
      const applications = applicationsQuery.error
        ? (
            await supabase
              .from("job_swipes")
              .select("student_id, created_at")
              .eq("job_id", jobId)
              .eq("direction", "right")
              .order("created_at", { ascending: false })
              .limit(80)
          ).data
        : applicationsQuery.data

      const appRows = (applications || []) as ApplicationRow[]
      const studentIds = appRows.map((a) => a.student_id)
      if (studentIds.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      const [{ data: profiles }, { data: studentProfiles }, { data: decisions }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, bio").in("id", studentIds),
        supabase
          .from("student_profiles")
          .select("id, university, degree, graduation_year, cgpa, skills, resume_url, linkedin_url, github_url, portfolio_url")
          .in("id", studentIds),
        supabase
          .from("candidate_swipes")
          .select("student_id, direction")
          .eq("recruiter_id", recruiterId)
          .eq("job_id", jobId)
          .in("student_id", studentIds),
      ])

      const profileRows = (profiles || []) as ProfileRow[]
      const studentProfileRows = (studentProfiles || []) as StudentProfileRow[]
      const decisionRows = (decisions || []) as DecisionRow[]

      const profileMap = new Map(profileRows.map((p) => [p.id, p]))
      const spMap = new Map(studentProfileRows.map((sp) => [sp.id, sp]))
      const decisionMap = new Map(decisionRows.map((d) => [d.student_id, d.direction]))

      setItems(
        appRows.map((a) => {
          const p = profileMap.get(a.student_id)
          const sp = spMap.get(a.student_id)
          return {
            id: a.student_id,
            applied_at: a.created_at,
            full_name: p?.full_name ?? null,
            avatar_url: p?.avatar_url ?? null,
            bio: p?.bio ?? null,
            university: sp?.university ?? null,
            degree: sp?.degree ?? null,
            graduation_year: sp?.graduation_year ?? null,
            skills: sp?.skills ?? [],
            resume_url: sp?.resume_url ?? null,
            linkedin_url: sp?.linkedin_url ?? null,
            github_url: sp?.github_url ?? null,
            portfolio_url: sp?.portfolio_url ?? null,
            cgpa: sp?.cgpa ?? null,
            tags: a.recruiter_tags || [],
            decision: decisionMap.get(a.student_id) ?? null,
          } as CandidateItem
        })
      )
      setLoading(false)
    }

    void run()
  }, [jobId, recruiterId, supabase])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setPicksLoading(true)
      try {
        const res = await fetch(`/api/jobs/${jobId}/picks`)
        if (!res.ok) throw new Error("rank failed")
        const data = (await res.json()) as { source?: string; model?: string | null; provider?: string | null; picks?: ApplicantPick[] }
        if (cancelled) return
        setPicks(Array.isArray(data.picks) ? data.picks.filter((row) => row.studentId && row.reason) : [])
        setPickSource(data.source === "ai" ? "ai" : "profile")
        setRanker(typeof data.model === "string" ? data.model : null)
        setProvider(typeof data.provider === "string" ? data.provider : null)
      } catch {
        if (!cancelled) {
          setPicks([])
          setPickSource(null)
          setRanker(null)
          setProvider(null)
        }
      } finally {
        if (!cancelled) setPicksLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [jobId])

  const setDecision = async (studentId: string, direction: "right" | "left") => {
    const current = items.find((i) => i.id === studentId)
    if (current?.decision === direction) {
      toast({
        title: direction === "right" ? "Shortlisted" : "Passed",
        description: "That decision is already saved.",
      })
      return
    }

    setBusyId(studentId)
    setBusyDirection(direction)
    if (current?.decision) {
      const removed = await undoCandidateSwipe(supabase, { studentId, recruiterId, jobId })
      if (!removed.ok) {
        toast({ title: "Could not update candidate", description: removed.message || "Try again." })
        setBusyId(null)
        setBusyDirection(null)
        return
      }
    }

    let { error } = await supabase.from("candidate_swipes").insert({
      recruiter_id: recruiterId,
      student_id: studentId,
      job_id: jobId,
      direction,
    })

    if (error && isUniqueViolation(error)) {
      const removed = await undoCandidateSwipe(supabase, { studentId, recruiterId, jobId })
      if (!removed.ok) {
        toast({ title: "Could not update candidate", description: removed.message || "Try again." })
        setBusyId(null)
        setBusyDirection(null)
        return
      }
      const retry = await supabase.from("candidate_swipes").insert({
        recruiter_id: recruiterId,
        student_id: studentId,
        job_id: jobId,
        direction,
      })
      error = retry.error
    }

    if (error) {
      toast({ title: "Could not update candidate", description: error.message })
      setBusyId(null)
      setBusyDirection(null)
      return
    }

    setItems((prev) => prev.map((i) => (i.id === studentId ? { ...i, decision: direction } : i)))
    toast({
      title: direction === "right" ? "Shortlisted" : "Passed",
      description:
        direction === "right"
          ? "Your interest in this candidate has been saved."
          : "Your decision has been saved.",
    })
    if (direction === "right") {
      const { data: match } = await supabase
        .from("matches")
        .select("id, conversations(id)")
        .eq("recruiter_id", recruiterId)
        .eq("student_id", studentId)
        .eq("job_id", jobId)
        .maybeSingle()
      if (match?.id) {
        const conv = Array.isArray(match.conversations) ? match.conversations[0] : match.conversations
        setInviteTarget({
          matchId: match.id,
          conversationId: conv?.id ?? null,
          peerId: studentId,
          roleTitle: jobTitle,
        })
        setInviteOpen(true)
      }
    }
    setBusyId(null)
    setBusyDirection(null)
  }

  const toggleTag = async (studentId: string, tag: string) => {
    const current = items.find((item) => item.id === studentId)
    if (!current) return
    const tags = current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag]
    const { error } = await supabase.from("job_swipes").update({ recruiter_tags: tags }).eq("job_id", jobId).eq("student_id", studentId).eq("direction", "right")
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t tag", description: /recruiter_tags/i.test(error.message) ? "Tags aren’t available on this workspace yet." : error.message })
      return
    }
    setItems((prev) => prev.map((item) => (item.id === studentId ? { ...item, tags } : item)))
  }

  const byId = new Map(items.map((item) => [item.id, item]))
  const top = picks.flatMap((pick, index) => {
    const item = byId.get(pick.studentId)
    return item ? [{ pick, item, rank: index + 1 }] : []
  })
  const topIds = new Set(top.map((row) => row.item.id))
  const others = (top.length > 0 ? items.filter((item) => !topIds.has(item.id)) : items).slice().sort((a, b) => {
    if (sortBy === "name") return (a.full_name || "").localeCompare(b.full_name || "")
    if (sortBy === "cgpa") return (b.cgpa || 0) - (a.cgpa || 0)
    return 0
  })

  const renderCandidate = (item: CandidateItem, highlight?: { rank: number; score: number; reason: string }) => {
    const schoolLine = [item.university, item.degree, item.graduation_year].filter(Boolean).join(" · ")
    const links = [
      item.resume_url && { href: item.resume_url, label: "Resume" },
      item.linkedin_url && { href: item.linkedin_url, label: "LinkedIn" },
      item.github_url && { href: item.github_url, label: "GitHub" },
      item.portfolio_url && { href: item.portfolio_url, label: "Portfolio" },
    ].filter(Boolean) as { href: string; label: string }[]

    return (
      <Card className="border-border bg-card shadow-none">
        <CardContent className="p-4 sm:p-5">
          {highlight ? (
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="font-body text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">#{highlight.rank}</span>
                {" · "}
                {highlight.reason}
              </p>
              <Badge
                variant={highlight.score >= 75 ? "success" : "secondary"}
                className="shrink-0 font-normal tabular-nums"
              >
                {highlight.score}
              </Badge>
            </div>
          ) : null}
          <div className="flex items-start gap-4">
            <Avatar className="h-11 w-11 shrink-0 ring-1 ring-border">
              <AvatarImage src={item.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                {getInitials(item.full_name || "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm font-semibold text-foreground">
                    <Link href={`/candidates/${item.id}`} className="hover:underline">
                      {item.full_name || "Candidate"}
                    </Link>
                  </p>
                  {schoolLine ? (
                    <p className="mt-0.5 truncate font-body text-[11px] text-muted-foreground">{schoolLine}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tagChoices.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${item.tags.includes(tag) ? "border-primary bg-primary/10" : "border-border text-muted-foreground"}`}
                        onClick={() => void toggleTag(item.id, tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <time className="shrink-0 font-body text-[11px] tabular-nums text-muted-foreground">
                  {formatDate(item.applied_at)}
                </time>
              </div>
              {item.bio ? (
                <p className="mt-2 line-clamp-2 font-body text-xs leading-relaxed text-muted-foreground">{item.bio}</p>
              ) : null}

              {item.skills.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.skills.slice(0, 4).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-[11px] font-normal">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <ApplicationAnswersList jobId={jobId} studentId={item.id} screeningQuestions={screeningQuestions} />

              {links.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {links.map(({ href, label }) => (
                    <CredentialLink
                      key={label}
                      href={href}
                      label={label}
                      className="font-body text-xs font-medium text-primary underline-offset-4 hover:underline"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/candidates/${item.id}?job=${jobId}`}>Profile</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              className="min-w-[7.5rem] flex-1"
              disabled={busyId === item.id}
              loading={busyId === item.id && busyDirection === "right"}
              loadingText="Shortlisting…"
              onClick={() => void setDecision(item.id, "right")}
            >
              Shortlist
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-w-[5.5rem] flex-1"
              disabled={busyId === item.id}
              loading={busyId === item.id && busyDirection === "left"}
              loadingText="Passing…"
              onClick={() => void setDecision(item.id, "left")}
            >
              Pass
            </Button>
          </div>

          {item.decision ? (
            <p className="mt-2 font-body text-[11px] text-muted-foreground">
              {item.decision === "right" ? "Shortlisted" : "Passed"}
            </p>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
        <CardTitle className="font-heading text-lg">Applicants</CardTitle>
        <CardDescription>
          {items.length > 0 && pickSource === "ai"
            ? provider === "groq"
              ? "Groq ranked the top 10 people who applied to this listing."
              : ranker?.startsWith("grok")
                ? "Grok ranked the top 10 people who applied to this listing."
                : "AI ranked the top 10 people who applied to this listing."
            : items.length > 0 && picks.length > 0
              ? "Top 10 are ranked from skills, resume, and application answers."
              : "Students who applied to this listing."}
        </CardDescription>
        </div>
        {items.length > 0 ? (
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <a href={`/api/jobs/${jobId}/resumes`}>
              <Download className="h-3.5 w-3.5" />
              Download resumes
            </a>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <ApplicantListSkeleton />
        ) : items.length === 0 ? (
          <p className="py-2 font-body text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <div className="space-y-8">
            <section id="top-picks" className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} />
                <h3 className="font-heading text-sm font-semibold">Top 10 picks</h3>
              </div>
              {picksLoading ? (
                <p className="font-body text-sm text-muted-foreground">Ranking applicants…</p>
              ) : top.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground">Ranking is unavailable right now. The full list is below.</p>
              ) : (
                <ol className="m-0 list-none space-y-3 p-0">
                  {top.map(({ pick, item, rank }) =>
                    item ? (
                      <li key={pick.studentId}>{renderCandidate(item, { rank, score: pick.score, reason: pick.reason })}</li>
                    ) : null
                  )}
                </ol>
              )}
            </section>

            {others.length > 0 ? (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-heading text-sm font-semibold">{top.length > 0 ? "Other applicants" : "All applicants"}</h3>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as "recent" | "name" | "cgpa")}>
                    <SelectTrigger aria-label="Sort applicants" className="h-8 w-auto min-w-[7.5rem] rounded-full px-3 text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Newest</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="cgpa">CGPA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ul className="m-0 list-none space-y-3 p-0">
                  <ShowMoreList
                    items={others}
                    getKey={(item) => item.id}
                    initial={5}
                    step={5}
                    renderItem={(item) => <li>{renderCandidate(item)}</li>}
                    footer={(remaining, showMore) => (
                      <li>
                        <ShowMoreButton
                          remaining={remaining}
                          onClick={showMore}
                          className="h-10 rounded-full border border-border"
                        />
                      </li>
                    )}
                  />
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </CardContent>
      <InterviewInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        target={inviteTarget}
        recruiterName={recruiterName}
        companyName={companyName}
        calendlyUrl={calendlyUrl}
      />
    </Card>
  )
}
