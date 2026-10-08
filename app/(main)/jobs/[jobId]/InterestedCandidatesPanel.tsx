"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
}

interface ApplicationRow {
  student_id: string
  created_at: string
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
}

interface DecisionRow {
  student_id: string
  direction: "right" | "left"
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
  const [items, setItems] = useState<CandidateItem[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteTarget, setInviteTarget] = useState<InterviewInviteTarget | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)

      const { data: applications } = await supabase
        .from("job_swipes")
        .select("student_id, created_at")
        .eq("job_id", jobId)
        .eq("direction", "right")
        .order("created_at", { ascending: false })

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
          .select("id, university, degree, graduation_year, skills, resume_url, linkedin_url, github_url, portfolio_url")
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
            decision: decisionMap.get(a.student_id) ?? null,
          } as CandidateItem
        })
      )
      setLoading(false)
    }

    void run()
  }, [jobId, recruiterId, supabase])

  const setDecision = async (studentId: string, direction: "right" | "left") => {
    setBusyId(studentId)
    const { error } = await supabase
      .from("candidate_swipes")
      .upsert(
        { recruiter_id: recruiterId, student_id: studentId, job_id: jobId, direction },
        { onConflict: "recruiter_id,student_id,job_id" }
      )

    if (error) {
      toast({ title: "Could not update candidate", description: error.message })
      setBusyId(null)
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
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Applicants</CardTitle>
        <CardDescription>Students who applied to this listing.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ApplicantListSkeleton />
        ) : items.length === 0 ? (
          <p className="py-2 font-body text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <ul className="m-0 list-none space-y-3 p-0">
            <ShowMoreList
              items={items}
              getKey={(item) => item.id}
              initial={5}
              step={5}
              renderItem={(item) => {
              const schoolLine = [item.university, item.degree, item.graduation_year].filter(Boolean).join(" · ")
              const links = [
                item.resume_url && { href: item.resume_url, label: "Resume" },
                item.linkedin_url && { href: item.linkedin_url, label: "LinkedIn" },
                item.github_url && { href: item.github_url, label: "GitHub" },
                item.portfolio_url && { href: item.portfolio_url, label: "Portfolio" },
              ].filter(Boolean) as { href: string; label: string }[]

              return (
                <li>
                  <Card className="border-border bg-card shadow-none">
                    <CardContent className="p-4 sm:p-5">
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
                            </div>
                            <time className="shrink-0 font-body text-[11px] tabular-nums text-muted-foreground">
                              {formatDate(item.applied_at)}
                            </time>
                          </div>
                          {item.bio ? (
                            <p className="mt-2 line-clamp-2 font-body text-xs leading-relaxed text-muted-foreground">
                              {item.bio}
                            </p>
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

                          <ApplicationAnswersList
                            jobId={jobId}
                            studentId={item.id}
                            screeningQuestions={screeningQuestions}
                          />

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
                        <Button asChild size="sm" variant="secondary" className="rounded-xl">
                          <Link href={`/candidates/${item.id}?job=${jobId}`}>Profile</Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1 rounded-xl"
                          disabled={busyId === item.id}
                          onClick={() => void setDecision(item.id, "right")}
                        >
                          Shortlist
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl"
                          disabled={busyId === item.id}
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
                </li>
              )
              }}
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
