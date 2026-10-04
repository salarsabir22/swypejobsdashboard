"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { SwipeCard } from "@/components/swipe/SwipeCard"
import { JobCard } from "@/components/swipe/JobCard"
import { ConfettiBurst } from "@/components/motion/ConfettiBurst"
import {
  DiscoverFilters,
  DiscoverFirstHint,
  DiscoverHeader,
  DiscoverHowItWorks,
  DiscoverJobRail,
  DiscoverKeysHint,
  DiscoverLoading,
  DiscoverSessionProgress,
  DiscoverStage,
  useDiscoverKeys,
} from "@/components/discover"
import { MatchModal } from "@/components/match/MatchModal"
import { recordJobView, notifyApplicationMilestone } from "@/lib/engagement"
import { jobFitScore, whyThisJob } from "@/lib/match/fit"
import { JOB_CATEGORIES } from "@/lib/company-options"
import { excludeInFilter, isUniqueViolation } from "@/lib/swipe/errors"
import { X, Check, RotateCcw, Bookmark, RefreshCw } from "lucide-react"
import type { Job, SwipeDirection } from "@/types"
import { Button } from "@/components/ui/button"
import { undoJobSwipe } from "@/lib/swipe/undo"
import { getBlockedPeerIds } from "@/lib/moderation/blocks"
import { useToast } from "@/lib/hooks/use-toast"

type JobSwipeRow = { job_id: string; direction: string }
type LastSwipe = { job: Job; direction: SwipeDirection }

const DECK_PAGE = 80

function conversationHref(match: { id: string; conversations?: { id: string }[] | { id: string } | null }) {
  const conv = Array.isArray(match.conversations) ? match.conversations[0] : match.conversations
  return conv?.id ? `/chat/${conv.id}` : `/chat/${match.id}`
}

export function StudentDiscoverView({
  userId,
  skills,
  preferredCategories,
  selfImageUrl,
  selfName = "You",
}: {
  userId: string
  skills?: string[] | null
  preferredCategories?: string[] | null
  selfImageUrl?: string | null
  selfName?: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [swiping, setSwiping] = useState(false)
  const [cardEpoch, setCardEpoch] = useState(0)
  const [celebrate, setCelebrate] = useState(false)
  const [lastSwipe, setLastSwipe] = useState<LastSwipe | null>(null)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [sessionApplied, setSessionApplied] = useState(0)
  const [sessionSaved, setSessionSaved] = useState(0)
  const [sessionPassed, setSessionPassed] = useState(0)
  const [jobType, setJobType] = useState("all")
  const [remote, setRemote] = useState("all")
  const [category, setCategory] = useState("all")
  const [location, setLocation] = useState("")
  const [matchOpen, setMatchOpen] = useState(false)
  const [matchName, setMatchName] = useState("")
  const [matchHref, setMatchHref] = useState<string | null>(null)
  const [matchImage, setMatchImage] = useState<string | null>(null)
  const jobsRef = useRef<Job[]>([])
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(false)

  const jobs = useMemo(() => {
    const loc = location.trim().toLowerCase()
    return allJobs.filter((job) => {
      if (jobType !== "all" && job.job_type !== jobType) return false
      if (remote === "remote" && !job.is_remote) return false
      if (remote === "onsite" && job.is_remote) return false
      if (category !== "all" && (job.category || "") !== category) return false
      if (loc && !(job.location || "").toLowerCase().includes(loc) && !job.is_remote) return false
      return true
    })
  }, [allJobs, jobType, remote, category, location])

  const rankJobs = useCallback(
    (rows: Job[]) =>
      [...rows].sort((a, b) => {
        const diff =
          jobFitScore({
            studentSkills: skills,
            preferredCategories,
            jobSkills: b.required_skills,
            jobCategory: b.category,
            remote: b.is_remote,
            createdAt: b.created_at,
          }) -
          jobFitScore({
            studentSkills: skills,
            preferredCategories,
            jobSkills: a.required_skills,
            jobCategory: a.category,
            remote: a.is_remote,
            createdAt: a.created_at,
          })
        if (diff !== 0) return diff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }),
    [skills, preferredCategories]
  )

  const loadJobs = useCallback(
    async (mode: "replace" | "append" = "replace") => {
      if (mode === "append") {
        if (!hasMoreRef.current || loadingMoreRef.current) return
        loadingMoreRef.current = true
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const supabase = createClient()
      const [{ data: swipeRows }, blocked] = await Promise.all([
        supabase.from("job_swipes").select("job_id, direction").eq("student_id", userId),
        getBlockedPeerIds(supabase, userId),
      ])
      const swipedJobIds = ((swipeRows || []) as JobSwipeRow[]).map((s) => s.job_id)
      const loadedIds = mode === "append" ? jobsRef.current.map((j) => j.id) : []
      const exclude = excludeInFilter([...new Set([...swipedJobIds, ...loadedIds])])

      let query = supabase
        .from("jobs")
        .select("*, recruiter_profiles(id, company_name, logo_url, website_url, description, is_approved)")
        .eq("is_active", true)

      if (exclude) query = query.not("id", "in", exclude)

      const { data, error } = await query.order("created_at", { ascending: false }).limit(DECK_PAGE)
      if (error) {
        toast({ variant: "destructive", title: "Couldn’t load roles", description: error.message })
        setLoading(false)
        setLoadingMore(false)
        loadingMoreRef.current = false
        return
      }

      const fetched = (data || []) as Job[]
      const rows = rankJobs(
        fetched.filter((j) => j.recruiter_profiles?.is_approved === true && !blocked.has(j.recruiter_id))
      )
      setHasMore(fetched.length >= DECK_PAGE && rows.length > 0)
      hasMoreRef.current = fetched.length >= DECK_PAGE && rows.length > 0

      if (mode === "append") {
        setAllJobs((prev) => {
          const seen = new Set(prev.map((j) => j.id))
          return [...prev, ...rows.filter((j) => !seen.has(j.id))]
        })
      } else {
        setAllJobs(rows)
        setCurrentIndex(0)
        setLastSwipe(null)
        setSessionApplied(0)
        setSessionSaved(0)
        setSessionPassed(0)
        setLoadedAt(new Date())
      }

      setLoading(false)
      setLoadingMore(false)
      loadingMoreRef.current = false
    },
    [userId, rankJobs, toast]
  )

  useEffect(() => {
    jobsRef.current = allJobs
  }, [allJobs])

  useEffect(() => {
    queueMicrotask(() => {
      void loadJobs("replace")
    })
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setCurrentIndex(0)
  }, [jobType, remote, category, location])

  const currentJob = jobs[currentIndex]
  const nextJob = jobs[currentIndex + 1]
  const remaining = Math.max(jobs.length - currentIndex, 0)
  const sessionSeen = sessionApplied + sessionSaved + sessionPassed

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return
    if (jobs.length - currentIndex > 3) return
    void loadJobs("append")
  }, [loading, loadingMore, hasMore, jobs.length, currentIndex, loadJobs])

  useEffect(() => {
    if (!currentJob?.id) return
    const recruiterId = currentJob.recruiter_id
    if (!recruiterId) return
    const supabase = createClient()
    void recordJobView(supabase, {
      studentId: userId,
      jobId: currentJob.id,
      recruiterId,
      jobTitle: currentJob.title,
    })
  }, [currentJob?.id, currentJob?.recruiter_id, currentJob?.title, userId])

  const handleSwipe = useCallback(
    async (direction: SwipeDirection) => {
      if (swiping || !currentJob) return
      const job = currentJob
      setSwiping(true)
      const supabase = createClient()
      const { error } = await supabase.from("job_swipes").insert({ student_id: userId, job_id: job.id, direction })
      if (error && !isUniqueViolation(error)) {
        toast({
          variant: "destructive",
          title: direction === "right" ? "Couldn’t apply" : direction === "saved" ? "Couldn’t save" : "Couldn’t pass",
          description: error.message,
        })
        setCardEpoch((n) => n + 1)
        setSwiping(false)
        return
      }

      setAllJobs((prev) => prev.filter((row) => row.id !== job.id))
      setLastSwipe({ job, direction })

      if (direction === "right") {
        setSessionApplied((n) => n + 1)
        toast({ title: "Applied", description: `${job.title} — they can see your profile.` })
        void notifyApplicationMilestone(supabase, {
          jobId: job.id,
          recruiterId: job.recruiter_id,
          jobTitle: job.title,
        })
        const { data: match } = await supabase
          .from("matches")
          .select("id, conversations(id)")
          .eq("student_id", userId)
          .eq("job_id", job.id)
          .maybeSingle()
        if (match?.id) {
          setMatchName(job.recruiter_profiles?.company_name || "the team")
          setMatchHref(conversationHref(match))
          setMatchImage(job.recruiter_profiles?.logo_url ?? null)
          setMatchOpen(true)
          setCelebrate(true)
          setTimeout(() => setCelebrate(false), 1200)
        }
      } else if (direction === "saved") {
        setSessionSaved((n) => n + 1)
        toast({ title: "Saved", description: "Find it later on your profile." })
      } else {
        setSessionPassed((n) => n + 1)
      }

      setTimeout(() => setSwiping(false), 100)
    },
    [userId, swiping, currentJob, toast]
  )

  const handleUndo = useCallback(async () => {
    if (swiping || !lastSwipe) return
    setSwiping(true)
    const supabase = createClient()
    const result = await undoJobSwipe(supabase, {
      studentId: userId,
      recruiterId: lastSwipe.job.recruiter_id,
      jobId: lastSwipe.job.id,
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
    if (lastSwipe.direction === "right") setSessionApplied((n) => Math.max(0, n - 1))
    if (lastSwipe.direction === "saved") setSessionSaved((n) => Math.max(0, n - 1))
    if (lastSwipe.direction === "left") setSessionPassed((n) => Math.max(0, n - 1))
    const restored = lastSwipe.job
    setLastSwipe(null)
    setAllJobs((prev) => {
      const next = prev.filter((row) => row.id !== restored.id)
      next.splice(Math.min(currentIndex, next.length), 0, restored)
      return next
    })
    setTimeout(() => setSwiping(false), 100)
  }, [swiping, lastSwipe, userId, toast, currentIndex])

  const currentReasons = currentJob
    ? whyThisJob({
        studentSkills: skills,
        preferredCategories,
        jobSkills: currentJob.required_skills,
        jobCategory: currentJob.category,
        remote: currentJob.is_remote,
        createdAt: currentJob.created_at,
      })
    : []

  const filterFields = [
    {
      id: "type",
      label: "Type",
      kind: "select" as const,
      value: jobType,
      onChange: setJobType,
      options: [
        { value: "all", label: "All types" },
        { value: "internship", label: "Internship" },
        { value: "full_time", label: "Full-time" },
        { value: "part_time", label: "Part-time" },
        { value: "contract", label: "Contract" },
      ],
    },
    {
      id: "remote",
      label: "Location",
      kind: "select" as const,
      value: remote,
      onChange: setRemote,
      options: [
        { value: "all", label: "Remote or on-site" },
        { value: "remote", label: "Remote" },
        { value: "onsite", label: "On-site" },
      ],
    },
    {
      id: "category",
      label: "Category",
      kind: "select" as const,
      value: category,
      onChange: setCategory,
      options: [
        { value: "all", label: "All categories" },
        ...JOB_CATEGORIES.map((c) => ({ value: c, label: c })),
      ],
    },
    {
      id: "city",
      label: "City",
      kind: "text" as const,
      value: location,
      placeholder: "Lahore, Karachi…",
      onChange: setLocation,
    },
  ]

  const filters = (
    <DiscoverFilters
      fields={filterFields}
      title="Refine roles"
      onClear={() => {
        setJobType("all")
        setRemote("all")
        setCategory("all")
        setLocation("")
      }}
    />
  )

  const keysEnabled = !loading && !swiping && !matchOpen && Boolean(currentJob)
  useDiscoverKeys({
    enabled: keysEnabled,
    onPass: () => void handleSwipe("left"),
    onApply: () => void handleSwipe("right"),
    onSave: () => void handleSwipe("saved"),
    onUndo: () => void handleUndo(),
  })

  const sessionLine = [
    remaining ? `${remaining} left` : null,
    sessionApplied ? `${sessionApplied} applied` : null,
    sessionSaved ? `${sessionSaved} saved` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  const swipeChrome = (
    <div className="space-y-1.5 lg:space-y-3">
      <DiscoverHeader
        className="hidden lg:flex"
        eyebrow="Discover"
        title="Roles for you"
        description={sessionLine || "Swipe through live listings ranked by skill and category fit. Apply sends your profile; chat waits for a match."}
        action={
          <Button type="button" variant="outline" className="rounded-full" onClick={() => void loadJobs("replace")}>
            Refresh feed
          </Button>
        }
      />
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <h1 className="min-w-0 truncate font-heading text-xl font-semibold tracking-tight">Roles for you</h1>
        <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => void loadJobs("replace")} aria-label="Refresh feed">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {filters}
      <DiscoverSessionProgress
        compact
        position={sessionSeen + (currentJob ? 1 : 0)}
        total={sessionSeen + remaining}
        loadedAt={loadedAt}
        noun="roles"
        description={loadingMore ? "Loading more" : undefined}
      />
    </div>
  )

  const emptyChrome = (
    <div className="space-y-3">
      <DiscoverHeader
        eyebrow="Discover"
        title="Roles for you"
        description="Swipe through live listings from verified teams. Apply, save, or pass — you can undo the last card."
        action={
          <Button type="button" variant="outline" className="rounded-full" onClick={() => void loadJobs("replace")}>
            Refresh feed
          </Button>
        }
      />
      {filters}
    </div>
  )

  if (loading) {
    return <DiscoverLoading label="Finding roles…" />
  }

  if (!currentJob) {
    return (
      <div className="mx-auto h-full min-h-0 w-full max-w-[1180px] space-y-8 overflow-y-auto lg:h-auto lg:overflow-visible">
        {emptyChrome}
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 px-4 py-16 text-center">
          <p className="font-heading text-xl font-semibold tracking-tight">
            {allJobs.length === 0 ? "No new roles right now" : "Nothing matches these filters"}
          </p>
          <p className="mt-2 max-w-sm font-body text-sm text-muted-foreground">
            {allJobs.length === 0
              ? hasMore
                ? "Loading more listings…"
                : "Verified teams haven’t posted anything you haven’t already seen. Refresh in a bit."
              : "Widen type, category, or city to see more of this stack."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => void loadJobs(allJobs.length === 0 && hasMore ? "append" : "replace")}>
              {allJobs.length === 0 && hasMore ? "Load more" : "Refresh feed"}
            </Button>
            {lastSwipe ? (
              <Button type="button" variant="outline" onClick={() => void handleUndo()} disabled={swiping}>
                <RotateCcw className="h-4 w-4" />
                Undo last swipe
              </Button>
            ) : null}
          </div>
        </div>
        <DiscoverHowItWorks audience="student" />
        <MatchModal
          open={matchOpen}
          onOpenChange={setMatchOpen}
          audience="student"
          name={matchName}
          chatHref={matchHref}
          imageUrl={matchImage}
          imageContain
          selfImageUrl={selfImageUrl}
          selfName={selfName}
        />
      </div>
    )
  }

  return (
    <>
      <DiscoverStage
        chrome={swipeChrome}
        hint={<DiscoverFirstHint audience="student" />}
        board={
          <>
            <ConfettiBurst show={celebrate} />
            <div className="relative min-h-0 w-full max-w-[26rem] flex-1 overflow-hidden max-lg:max-w-none lg:max-w-none">
              {nextJob ? (
                <div className="pointer-events-none absolute inset-0 -translate-y-3 scale-[0.96] overflow-hidden rounded-3xl opacity-50">
                  <JobCard job={nextJob} studentSkills={skills} />
                </div>
              ) : null}
              <SwipeCard
                key={`${currentJob.id}-${cardEpoch}`}
                onSwipeLeft={() => void handleSwipe("left")}
                onSwipeRight={() => void handleSwipe("right")}
                disabled={swiping}
                rightStampLabel="Apply"
                leftStampLabel="Pass"
              >
                <JobCard
                  job={currentJob}
                  reasons={currentReasons}
                  studentSkills={skills}
                  onOpenCompany={() => router.push(`/company/${currentJob.recruiter_id}`)}
                  onOpenListing={() => router.push(`/jobs/${currentJob.id}`)}
                />
              </SwipeCard>
            </div>

            <DiscoverKeysHint>← Pass · → Apply · ↑ Save · Z Undo</DiscoverKeysHint>

            <div className="flex shrink-0 items-end justify-center gap-4 pb-1 sm:gap-6">
              <div className="flex flex-col items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleUndo()}
                  disabled={swiping || !lastSwipe}
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
                  variant="secondary"
                  size="icon"
                  onClick={() => void handleSwipe("saved")}
                  disabled={swiping}
                  className="h-10 w-10 rounded-full sm:h-12 sm:w-12"
                  aria-label="Save for later"
                >
                  <Bookmark className="h-5 w-5" strokeWidth={1.75} />
                </Button>
                <span className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">Save</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  onClick={() => void handleSwipe("right")}
                  disabled={swiping}
                  className="h-10 w-10 rounded-full sm:h-12 sm:w-12"
                  aria-label="Apply"
                >
                  <Check className="h-5 w-5" strokeWidth={2.25} />
                </Button>
                <span className="font-body text-[10px] font-semibold uppercase tracking-wide text-primary sm:text-[11px]">Apply</span>
              </div>
            </div>
          </>
        }
        rail={<DiscoverJobRail job={currentJob} reasons={currentReasons} studentSkills={skills} remaining={remaining} />}
      />
      <MatchModal
        open={matchOpen}
        onOpenChange={setMatchOpen}
        audience="student"
        name={matchName}
        chatHref={matchHref}
        imageUrl={matchImage}
        imageContain
        selfImageUrl={selfImageUrl}
        selfName={selfName}
      />
    </>
  )
}
