"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { SwipeCard } from "@/components/swipe/SwipeCard"
import { CandidateCard } from "@/components/swipe/CandidateCard"
import { ConfettiBurst } from "@/components/motion/ConfettiBurst"
import {
  DiscoverCandidateRail,
  DiscoverFilters,
  DiscoverFirstHint,
  DiscoverHeader,
  DiscoverHowItWorks,
  DiscoverKeysHint,
  DiscoverLoading,
  DiscoverSessionProgress,
  DiscoverStage,
  useDiscoverKeys,
} from "@/components/discover"
import { MatchModal } from "@/components/match/MatchModal"
import { candidateFitScore, whyThisCandidate } from "@/lib/match/fit"
import { excludeInFilter, isUniqueViolation } from "@/lib/swipe/errors"
import { X, Star, RotateCcw, RefreshCw } from "lucide-react"
import type { Profile, StudentProfile } from "@/types"
import { Button } from "@/components/ui/button"
import { undoCandidateSwipe } from "@/lib/swipe/undo"
import { getBlockedPeerIds } from "@/lib/moderation/blocks"
import { useToast } from "@/lib/hooks/use-toast"
import { InterviewInviteDialog, type InterviewInviteTarget } from "@/components/hiring/InterviewInviteDialog"
import { studentEligibleForJob } from "@/lib/jobs/screening"

interface Candidate {
  profile: Profile
  studentProfile: StudentProfile
  applied: boolean
}

interface Job {
  id: string
  title: string
  required_skills?: string[] | null
  required_semesters?: number[] | null
}

type SwipeRow = { student_id: string }
type ApplyRow = { student_id: string }
type StudentProfileRow = StudentProfile & { profiles: Profile; id: string }
type LastSwipe = { candidate: Candidate; direction: "right" | "left"; jobId: string }

function mapRow(sp: StudentProfileRow, applied: boolean): Candidate {
  return {
    profile: sp.profiles as Profile,
    studentProfile: sp as StudentProfile,
    applied,
  }
}

export function RecruiterDiscoverView({
  userId,
  selfImageUrl,
  selfName = "You",
  recruiterName = "A recruiter",
  companyName = "their company",
  calendlyUrl,
}: {
  userId: string
  selfImageUrl?: string | null
  selfName?: string
  recruiterName?: string
  companyName?: string
  calendlyUrl?: string | null
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [swiping, setSwiping] = useState(false)
  const [cardEpoch, setCardEpoch] = useState(0)
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState("")
  const [celebrate, setCelebrate] = useState(false)
  const [lastSwipe, setLastSwipe] = useState<LastSwipe | null>(null)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [sessionShortlisted, setSessionShortlisted] = useState(0)
  const [sessionPassed, setSessionPassed] = useState(0)
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([])
  const [university, setUniversity] = useState("")
  const [gradYear, setGradYear] = useState("")
  const [skillQuery, setSkillQuery] = useState("")
  const [matchOpen, setMatchOpen] = useState(false)
  const [matchName, setMatchName] = useState("")
  const [matchHref, setMatchHref] = useState<string | null>(null)
  const [matchImage, setMatchImage] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteTarget, setInviteTarget] = useState<InterviewInviteTarget | null>(null)

  const loadCandidates = useCallback(
    async (jobId: string, jobList?: Job[]) => {
      setLoading(true)
      const supabase = createClient()
      const [{ data: swipedIds }, { data: applyRows }, blocked] = await Promise.all([
        supabase
          .from("candidate_swipes")
          .select("student_id")
          .eq("recruiter_id", userId)
          .eq("job_id", jobId),
        supabase.from("job_swipes").select("student_id").eq("job_id", jobId).eq("direction", "right"),
        getBlockedPeerIds(supabase, userId),
      ])

      const swiped = new Set(((swipedIds || []) as SwipeRow[]).map((s) => s.student_id))
      const appliedIds = [...new Set(((applyRows || []) as ApplyRow[]).map((r) => r.student_id))].filter(
        (id) => !swiped.has(id) && !blocked.has(id) && id !== userId
      )

      let applicants: Candidate[] = []
      if (appliedIds.length > 0) {
        const { data } = await supabase
          .from("student_profiles")
          .select("*, profiles!inner(*)")
          .in("id", appliedIds.slice(0, 80))
        applicants = ((data || []) as StudentProfileRow[]).map((sp) => mapRow(sp, true))
      }

      const exclude = excludeInFilter([
        ...swiped,
        ...blocked,
        userId,
        ...applicants.map((c) => c.profile.id),
      ])
      let othersQuery = supabase.from("student_profiles").select("*, profiles!inner(*)").limit(40)
      if (exclude) othersQuery = othersQuery.not("id", "in", exclude)
      const { data: otherRows, error } = await othersQuery
      if (error) {
        toast({ variant: "destructive", title: "Couldn’t load candidates", description: error.message })
        setLoading(false)
        return
      }

      const others = ((otherRows || []) as StudentProfileRow[])
        .filter((sp) => !swiped.has(sp.id) && !blocked.has(sp.id))
        .map((sp) => mapRow(sp, false))

      const jobSkills = (jobList || jobs).find((j) => j.id === jobId)?.required_skills
      const mapped = [...applicants, ...others].sort((a, b) => {
        const tier = Number(b.applied) - Number(a.applied)
        if (tier !== 0) return tier
        return (
          candidateFitScore({
            jobSkills,
            candidateSkills: b.studentProfile.skills,
            applied: b.applied,
          }) -
          candidateFitScore({
            jobSkills,
            candidateSkills: a.studentProfile.skills,
            applied: a.applied,
          })
        )
      })

      setAllCandidates(mapped)
      setCurrentIndex(0)
      setLastSwipe(null)
      setSessionShortlisted(0)
      setSessionPassed(0)
      setLoadedAt(new Date())
      setLoading(false)
    },
    [userId, jobs, toast]
  )

  async function loadInitialData() {
    const supabase = createClient()
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id, title, required_skills, required_semesters")
      .eq("recruiter_id", userId)
      .eq("is_active", true)
    const list = (jobsData as Job[]) || []
    setJobs(list)
    if (list[0]) {
      setSelectedJobId(list[0].id)
      await loadCandidates(list[0].id, list)
    } else {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadInitialData()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedJob = jobs.find((j) => j.id === selectedJobId)

  const candidates = useMemo(() => {
    const uni = university.trim().toLowerCase()
    const year = gradYear.trim()
    const skill = skillQuery.trim().toLowerCase()
    return allCandidates.filter((c) => {
      if (uni && !(c.studentProfile.university || "").toLowerCase().includes(uni)) return false
      if (year && String(c.studentProfile.graduation_year || "") !== year) return false
      if (skill && !(c.studentProfile.skills || []).some((s) => s.toLowerCase().includes(skill))) return false
      if (
        !c.applied &&
        !studentEligibleForJob({
          requiredSemesters: selectedJob?.required_semesters,
          stillEnrolled: c.studentProfile.still_enrolled,
          currentSemester: c.studentProfile.current_semester,
        })
      ) {
        return false
      }
      return true
    })
  }, [allCandidates, university, gradYear, skillQuery, selectedJob?.required_semesters])

  useEffect(() => {
    setCurrentIndex(0)
  }, [university, gradYear, skillQuery])

  const currentCandidate = candidates[currentIndex]
  const nextCandidate = candidates[currentIndex + 1]
  const remaining = Math.max(candidates.length - currentIndex, 0)
  const selectedTitle = selectedJob?.title
  const sessionSeen = sessionShortlisted + sessionPassed

  const handleSwipe = useCallback(
    async (direction: "right" | "left") => {
      if (!selectedJobId || swiping || !currentCandidate) return
      const candidate = currentCandidate
      setSwiping(true)
      const supabase = createClient()
      const { error } = await supabase.from("candidate_swipes").insert({
        recruiter_id: userId,
        student_id: candidate.profile.id,
        job_id: selectedJobId,
        direction,
      })
      if (error && !isUniqueViolation(error)) {
        toast({
          variant: "destructive",
          title: direction === "right" ? "Couldn’t shortlist" : "Couldn’t pass",
          description: error.message,
        })
        setCardEpoch((n) => n + 1)
        setSwiping(false)
        return
      }

      setAllCandidates((prev) => prev.filter((row) => row.profile.id !== candidate.profile.id))
      setLastSwipe({ candidate, direction, jobId: selectedJobId })

      if (direction === "right") {
        setSessionShortlisted((n) => n + 1)
        toast({
          title: "Shortlisted",
          description: candidate.profile.full_name || "Candidate saved to this role.",
        })
        const { data: match } = await supabase
          .from("matches")
          .select("id, conversations(id)")
          .eq("recruiter_id", userId)
          .eq("student_id", candidate.profile.id)
          .eq("job_id", selectedJobId)
          .maybeSingle()
        if (match?.id) {
          const conv = Array.isArray(match.conversations) ? match.conversations[0] : match.conversations
          setMatchName(candidate.profile.full_name || "this candidate")
          setMatchHref(conv?.id ? `/chat/${conv.id}` : `/chat/${match.id}`)
          setMatchImage(candidate.profile.avatar_url ?? null)
          setMatchOpen(true)
          setCelebrate(true)
          setTimeout(() => setCelebrate(false), 1200)
          setInviteTarget({
            matchId: match.id,
            conversationId: conv?.id ?? null,
            peerId: candidate.profile.id,
            roleTitle: selectedTitle || "this role",
          })
        }
      } else {
        setSessionPassed((n) => n + 1)
      }
      setTimeout(() => setSwiping(false), 100)
    },
    [userId, selectedJobId, selectedTitle, swiping, currentCandidate, toast]
  )

  const handleUndo = useCallback(async () => {
    if (swiping || !lastSwipe) return
    setSwiping(true)
    const supabase = createClient()
    const result = await undoCandidateSwipe(supabase, {
      recruiterId: userId,
      studentId: lastSwipe.candidate.profile.id,
      jobId: lastSwipe.jobId,
    })
    if (!result.ok) {
      toast({
        variant: "destructive",
        title: "Couldn’t undo",
        description: result.message ?? "Try again.",
      })
      setSwiping(false)
      return
    }
    if (lastSwipe.direction === "right") setSessionShortlisted((n) => Math.max(0, n - 1))
    if (lastSwipe.direction === "left") setSessionPassed((n) => Math.max(0, n - 1))
    const restored = lastSwipe.candidate
    setLastSwipe(null)
    setAllCandidates((prev) => {
      const next = prev.filter((row) => row.profile.id !== restored.profile.id)
      next.splice(Math.min(currentIndex, next.length), 0, restored)
      return next
    })
    setTimeout(() => setSwiping(false), 100)
  }, [swiping, lastSwipe, userId, toast, currentIndex])

  const currentReasons = currentCandidate
    ? whyThisCandidate({
        jobSkills: selectedJob?.required_skills,
        candidateSkills: currentCandidate.studentProfile.skills,
        applied: currentCandidate.applied,
      })
    : []

  const keysEnabled = !loading && !swiping && !matchOpen && Boolean(currentCandidate)
  useDiscoverKeys({
    enabled: keysEnabled,
    onPass: () => void handleSwipe("left"),
    onApply: () => void handleSwipe("right"),
    onUndo: () => void handleUndo(),
  })

  if (loading) {
    return <DiscoverLoading label="Finding candidates…" />
  }

  if (jobs.length === 0) {
    return (
      <div className="mx-auto h-full min-h-0 w-full max-w-[1180px] space-y-8 overflow-y-auto lg:h-auto lg:overflow-visible">
        <DiscoverHeader
          eyebrow="Discover"
          title="Shortlist candidates"
          description="Discover is tied to an open job so a shortlist actually maps to a role."
        />
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 px-4 py-16 text-center">
          <p className="font-heading text-xl font-semibold">Post a role first</p>
          <p className="mt-2 max-w-sm font-body text-sm text-muted-foreground">
            Once a listing is live, candidates show up here for that job.
          </p>
          <Button asChild className="mt-6">
            <Link href="/jobs/new">Post a job</Link>
          </Button>
        </div>
        <DiscoverHowItWorks audience="recruiter" />
      </div>
    )
  }

  const filters = (
    <DiscoverFilters
      fields={[
        {
          id: "role",
          label: "Role",
          kind: "select",
          value: selectedJobId || jobs[0].id,
          chip: false,
          pin: true,
          options: jobs.map((j) => ({ value: j.id, label: j.title })),
          onChange: (value) => {
            setSelectedJobId(value)
            void loadCandidates(value)
          },
        },
        {
          id: "university",
          label: "University",
          kind: "text",
          value: university,
          placeholder: "LUMS, NUST…",
          onChange: setUniversity,
        },
        {
          id: "year",
          label: "Grad year",
          kind: "text",
          value: gradYear,
          placeholder: "2026",
          inputMode: "numeric",
          onChange: (value) => setGradYear(value.replace(/[^\d]/g, "").slice(0, 4)),
        },
        {
          id: "skill",
          label: "Skill",
          kind: "text",
          value: skillQuery,
          placeholder: "React, Python…",
          onChange: setSkillQuery,
        },
      ]}
      title="Refine candidates"
      onClear={() => {
        setUniversity("")
        setGradYear("")
        setSkillQuery("")
      }}
    />
  )

  const sessionLine = [
    remaining ? `${remaining} left` : null,
    sessionShortlisted ? `${sessionShortlisted} shortlisted` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  const swipeChrome = (
    <div className="space-y-1.5 lg:space-y-3">
      <DiscoverHeader
        className="hidden lg:flex"
        eyebrow="Discover"
        title="Shortlist candidates"
        description={
          selectedTitle
            ? `Review people for ${selectedTitle}. Applicants appear first. Shortlist can open chat.`
            : sessionLine || "Applicants for this role show first"
        }
        action={
          <Button type="button" variant="outline" className="rounded-full" onClick={() => void loadCandidates(selectedJobId)}>
            Refresh
          </Button>
        }
      />
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <h1 className="min-w-0 truncate font-heading text-xl font-semibold tracking-tight">Shortlist</h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => void loadCandidates(selectedJobId)}
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {filters}
      <DiscoverSessionProgress
        compact
        position={sessionSeen + (currentCandidate ? 1 : 0)}
        total={sessionSeen + remaining}
        loadedAt={loadedAt}
        noun="candidates"
      />
    </div>
  )

  const emptyChrome = (
    <div className="space-y-3">
      <DiscoverHeader
        eyebrow="Discover"
        title="Shortlist candidates"
        description={
          selectedTitle
            ? `Review people for ${selectedTitle}. Applicants appear first. Shortlist opens chat; pass hides them from this role.`
            : "Pick a live role, then swipe."
        }
        action={
          <Button type="button" variant="outline" className="rounded-full" onClick={() => void loadCandidates(selectedJobId)}>
            Refresh
          </Button>
        }
      />
      {filters}
    </div>
  )

  if (!currentCandidate) {
    return (
      <div className="mx-auto h-full min-h-0 w-full max-w-[1180px] space-y-8 overflow-y-auto lg:h-auto lg:overflow-visible">
        {emptyChrome}
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 px-4 py-16 text-center">
          <p className="font-heading text-xl font-semibold">
            {allCandidates.length === 0 ? "That’s everyone for this role" : "Nothing matches these filters"}
          </p>
          <p className="mt-2 max-w-sm font-body text-sm text-muted-foreground">
            {candidates.length === 0 && allCandidates.length > 0
              ? "Clear university, year, or skill filters to see more of this stack."
              : "Switch jobs from the menu, refresh, or undo the last swipe."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => void loadCandidates(selectedJobId)}>
              Refresh
            </Button>
            {lastSwipe && lastSwipe.jobId === selectedJobId ? (
              <Button type="button" variant="outline" onClick={() => void handleUndo()} disabled={swiping}>
                <RotateCcw className="h-4 w-4" />
                Undo last swipe
              </Button>
            ) : null}
          </div>
        </div>
        <DiscoverHowItWorks audience="recruiter" />
        <MatchModal
          open={matchOpen}
          onOpenChange={(open) => {
            setMatchOpen(open)
            if (!open && inviteTarget) setInviteOpen(true)
          }}
          audience="recruiter"
          name={matchName}
          chatHref={matchHref}
          imageUrl={matchImage}
          selfImageUrl={selfImageUrl}
          selfName={selfName}
          selfContain
        />
        <InterviewInviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          target={inviteTarget}
          recruiterName={recruiterName}
          companyName={companyName}
          calendlyUrl={calendlyUrl}
        />
      </div>
    )
  }

  return (
    <>
      <DiscoverStage
        chrome={swipeChrome}
        hint={<DiscoverFirstHint audience="recruiter" />}
        board={
          <>
            <ConfettiBurst show={celebrate} />
            <div className="relative min-h-0 w-full flex-1 overflow-hidden max-lg:max-w-none max-w-[26rem] lg:max-w-none">
              {nextCandidate ? (
                <div className="pointer-events-none absolute inset-0 -translate-y-3 scale-[0.96] overflow-hidden rounded-3xl opacity-50">
                  <CandidateCard
                    profile={nextCandidate.profile}
                    studentProfile={nextCandidate.studentProfile}
                    jobSkills={selectedJob?.required_skills}
                    applied={nextCandidate.applied}
                  />
                </div>
              ) : null}
              <SwipeCard
                key={`${currentCandidate.profile.id}-${cardEpoch}`}
                onSwipeLeft={() => void handleSwipe("left")}
                onSwipeRight={() => void handleSwipe("right")}
                disabled={swiping}
                rightStampLabel="Shortlist"
                leftStampLabel="Pass"
              >
                <CandidateCard
                  profile={currentCandidate.profile}
                  studentProfile={currentCandidate.studentProfile}
                  reasons={currentReasons}
                  jobSkills={selectedJob?.required_skills}
                  applied={currentCandidate.applied}
                  onOpenProfile={() => router.push(`/candidates/${currentCandidate.profile.id}?job=${selectedJobId}`)}
                />
              </SwipeCard>
            </div>

            <DiscoverKeysHint>← Pass · → Shortlist · Z Undo</DiscoverKeysHint>

            <div className="flex shrink-0 items-end justify-center gap-5 pb-1 sm:gap-6">
              <div className="flex flex-col items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleUndo()}
                  disabled={swiping || !lastSwipe || lastSwipe.jobId !== selectedJobId}
                  className="h-10 w-10 rounded-full sm:h-12 sm:w-12"
                  aria-label="Undo last swipe"
                >
                  <RotateCcw className="h-5 w-5" strokeWidth={1.75} />
                </Button>
                <span className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">Undo</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleSwipe("left")}
                  disabled={swiping}
                  className="h-10 w-10 rounded-full sm:h-12 sm:w-12"
                  aria-label="Pass"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </Button>
                <span className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">Pass</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  onClick={() => void handleSwipe("right")}
                  disabled={swiping}
                  className="h-10 w-10 rounded-full sm:h-12 sm:w-12"
                  aria-label="Shortlist"
                >
                  <Star className="h-5 w-5" fill="currentColor" strokeWidth={1.5} />
                </Button>
                <span className="font-body text-[10px] font-semibold uppercase tracking-wide text-primary sm:text-[11px]">Shortlist</span>
              </div>
            </div>
          </>
        }
        rail={
          <DiscoverCandidateRail
            profile={currentCandidate.profile}
            studentProfile={currentCandidate.studentProfile}
            reasons={currentReasons}
            jobSkills={selectedJob?.required_skills}
            applied={currentCandidate.applied}
            jobId={selectedJobId}
            remaining={remaining}
          />
        }
      />
      <MatchModal
        open={matchOpen}
        onOpenChange={(open) => {
          setMatchOpen(open)
          if (!open && inviteTarget) setInviteOpen(true)
        }}
        audience="recruiter"
        name={matchName}
        chatHref={matchHref}
        imageUrl={matchImage}
        selfImageUrl={selfImageUrl}
        selfName={selfName}
        selfContain
      />
      <InterviewInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        target={inviteTarget}
        recruiterName={recruiterName}
        companyName={companyName}
        calendlyUrl={calendlyUrl}
      />
    </>
  )
}
