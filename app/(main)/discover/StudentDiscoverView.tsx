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
import {
  DEFAULT_RANKING_WEIGHTS,
  jobFitScore,
  normalizeRankingWeights,
  whyThisJob,
  type RankingWeights,
} from "@/lib/match/fit"
import { applyHref, jobHasMandatoryQuestions } from "@/lib/jobs/screening"
import { studentEligibility } from "@/lib/jobs/targeting"
import { openDeadlineFilter } from "@/lib/jobs/deadline"
import { jobMatchesKeyword, jobMeetsMinSalary } from "@/lib/jobs/search"
import { JOB_CATEGORIES } from "@/lib/company-options"
import { excludeInFilter, isUniqueViolation } from "@/lib/swipe/errors"
import { X, Check, RotateCcw, Bookmark, RefreshCw } from "lucide-react"
import type { Job, SwipeDirection } from "@/types"
import { Button } from "@/components/ui/button"
import { undoJobSwipe } from "@/lib/swipe/undo"
import { getBlockedPeerIds } from "@/lib/moderation/blocks"
import { useToast } from "@/lib/hooks/use-toast"
import {
  CURATED_BADGE,
  FEED_ALL,
  FEED_CURATED,
  FEED_STORAGE_KEY,
  jobCuratedForCampus,
  jobVisibleOnCampus,
  parseFeedMode,
  reviewKey,
  sameCampus,
  type DiscoverFeedMode,
} from "@/lib/jobs/curation"

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
  stillEnrolled,
  currentSemester,
  degree,
  graduationYear,
  cgpa,
  isAlumni,
  gender,
  department,
  preferredLocations,
  university,
  campusConnected = true,
  selfImageUrl,
  selfName = "You",
}: {
  userId: string
  skills?: string[] | null
  preferredCategories?: string[] | null
  stillEnrolled?: boolean | null
  currentSemester?: number | null
  degree?: string | null
  graduationYear?: number | null
  cgpa?: number | null
  isAlumni?: boolean | null
  gender?: string | null
  department?: string | null
  preferredLocations?: string[] | null
  university?: string | null
  /** False when CDC disconnected this student from the career center (SwypeJobs account stays active). */
  campusConnected?: boolean
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
  const [pendingAction, setPendingAction] = useState<"left" | "right" | "saved" | "undo" | null>(null)
  const [cardEpoch, setCardEpoch] = useState(0)
  const [celebrate, setCelebrate] = useState(false)
  const [lastSwipe, setLastSwipe] = useState<LastSwipe | null>(null)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [sessionApplied, setSessionApplied] = useState(0)
  const [sessionSaved, setSessionSaved] = useState(0)
  const [sessionPassed, setSessionPassed] = useState(0)
  const [jobTypes, setJobTypes] = useState<string[]>([])
  const [workModes, setWorkModes] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [location, setLocation] = useState("")
  const [keyword, setKeyword] = useState("")
  const [minSalary, setMinSalary] = useState("")
  const [company, setCompany] = useState("")
  const [industry, setIndustry] = useState("")
  const [markets, setMarkets] = useState<string[]>([])
  const [feedMode, setFeedMode] = useState<DiscoverFeedMode>(campusConnected ? FEED_CURATED : FEED_ALL)
  const [matchOpen, setMatchOpen] = useState(false)
  const [matchName, setMatchName] = useState("")
  const [matchHref, setMatchHref] = useState<string | null>(null)
  const [matchImage, setMatchImage] = useState<string | null>(null)
  const [rankingWeights, setRankingWeights] = useState<RankingWeights>(DEFAULT_RANKING_WEIGHTS)
  const jobsRef = useRef<Job[]>([])
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(false)

  const jobs = useMemo(() => {
    const loc = location.trim().toLowerCase()
    const minPay = minSalary ? Number(minSalary) : null
    const wantRemote = workModes.includes("remote")
    const wantOnsite = workModes.includes("onsite")
    const wantLocal = markets.includes("local")
    const wantInternational = markets.includes("international")
    return allJobs.filter((job) => {
      if (jobTypes.length && !jobTypes.includes(job.job_type)) return false
      if (wantRemote || wantOnsite) {
        if (job.is_remote && !wantRemote) return false
        if (!job.is_remote && !wantOnsite) return false
      }
      if (categories.length && !categories.includes(job.category || "")) return false
      // City applies to on-site roles; remote still matches when remote is included (or unrestricted).
      if (loc && !job.is_remote && !(job.location || "").toLowerCase().includes(loc)) return false
      if (!jobMatchesKeyword(job, keyword)) return false
      if (!jobMeetsMinSalary(job, minPay)) return false
      const employer = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
      if (company.trim() && !(employer?.company_name || "").toLowerCase().includes(company.trim().toLowerCase())) return false
      if (industry.trim() && !(employer?.industry || "").toLowerCase().includes(industry.trim().toLowerCase())) return false
      if (wantLocal || wantInternational) {
        const isIntl = job.is_international === true
        if (isIntl && !wantInternational) return false
        if (!isIntl && !wantLocal) return false
      }
      if (feedMode === FEED_CURATED && job.cdc_curated !== true) return false
      if (
        !studentEligibility(job, {
          still_enrolled: stillEnrolled,
          current_semester: currentSemester,
          degree,
          graduation_year: graduationYear,
          cgpa,
          is_alumni: isAlumni,
          gender,
          department,
          preferred_locations: preferredLocations,
        }).eligible
      ) {
        return false
      }
      return true
    })
  }, [
    allJobs,
    jobTypes,
    workModes,
    categories,
    location,
    keyword,
    minSalary,
    company,
    industry,
    markets,
    feedMode,
    stillEnrolled,
    currentSemester,
    degree,
    graduationYear,
    cgpa,
    isAlumni,
    gender,
    department,
    preferredLocations,
  ])

  const rankJobs = useCallback(
    (rows: Job[], weights: RankingWeights = rankingWeights) =>
      [...rows].sort((a, b) => {
        const score = (job: Job) =>
          jobFitScore({
            studentSkills: skills,
            preferredCategories,
            jobSkills: job.required_skills,
            jobCategory: job.category,
            jobLocation: job.location,
            studentLocationHint: location.trim() || null,
            remote: job.is_remote,
            createdAt: job.created_at,
            employerApproved: job.recruiter_profiles?.is_approved,
            employerHasWebsite: Boolean(job.recruiter_profiles?.website_url),
            weights,
          })
        const diff = score(b) - score(a)
        if (diff !== 0) return diff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }),
    [skills, preferredCategories, rankingWeights, location]
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
      const [{ data: swipeRows }, blocked, { data: weightRow }] = await Promise.all([
        supabase.from("job_swipes").select("job_id, direction").eq("student_id", userId).limit(500),
        getBlockedPeerIds(supabase, userId),
        mode === "replace"
          ? supabase.from("ranking_weights").select("skills, location, recency, employer_tier").eq("id", 1).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      const activeWeights =
        mode === "replace" && weightRow ? normalizeRankingWeights(weightRow) : rankingWeights
      if (mode === "replace" && weightRow) setRankingWeights(activeWeights)
      const swipedJobIds = ((swipeRows || []) as JobSwipeRow[]).map((s) => s.job_id)
      const loadedIds = mode === "append" ? jobsRef.current.map((j) => j.id) : []
      const exclude = excludeInFilter([...new Set([...swipedJobIds, ...loadedIds])])

      let query = supabase
        .from("jobs")
        .select("*, recruiter_profiles(id, company_name, industry, logo_url, website_url, description, is_approved, employee_count)")
        .eq("is_active", true)
        .or(openDeadlineFilter())

      if (exclude) query = query.not("id", "in", exclude)

      let { data, error } = await query.order("created_at", { ascending: false }).limit(DECK_PAGE)
      if (error && /application_deadline/i.test(error.message)) {
        // Migration not applied yet: fall back to the pre-deadline query.
        let fallback = supabase
          .from("jobs")
          .select("*, recruiter_profiles(id, company_name, industry, logo_url, website_url, description, is_approved, employee_count)")
          .eq("is_active", true)
        if (exclude) fallback = fallback.not("id", "in", exclude)
        ;({ data, error } = await fallback.order("created_at", { ascending: false }).limit(DECK_PAGE))
      }
      if (error) {
        toast({ variant: "destructive", title: "Couldn’t load roles", description: error.message })
        setLoading(false)
        setLoadingMore(false)
        loadingMoreRef.current = false
        return
      }

      let fetched = (data || []) as Job[]
      const curated = new Map<string, string>()
      const reviews = new Map<string, string>()

      if (campusConnected && university) {
        const [collectionRes, reviewRes] = await Promise.all([
          supabase
            .from("job_collection_items")
            .select("job_id, job_collections!inner(name, university, is_active)")
            .eq("job_collections.is_active", true)
            .eq("job_collections.university", university)
            .limit(120),
          supabase
            .from("campus_job_reviews")
            .select("job_id, university, status")
            .eq("university", university)
            .limit(200),
        ])
        for (const row of collectionRes.data || []) {
          const col = Array.isArray(row.job_collections) ? row.job_collections[0] : row.job_collections
          if (!col || col.is_active === false) continue
          if (col.university && !sameCampus(col.university, university)) continue
          if (!curated.has(row.job_id)) curated.set(row.job_id, col.name)
        }
        for (const row of reviewRes.data || []) {
          if (row.job_id && row.university) reviews.set(reviewKey(row.job_id, row.university), row.status)
        }

        const extraIds = [...curated.keys()].filter((id) => !fetched.some((job) => job.id === id))
        const campusJobs = await supabase
          .from("jobs")
          .select("*, recruiter_profiles(id, company_name, industry, logo_url, website_url, description, is_approved, employee_count)")
          .eq("is_active", true)
          .contains("target_universities", [university])
          .limit(40)
        const missing = extraIds.length
          ? await supabase
              .from("jobs")
              .select("*, recruiter_profiles(id, company_name, industry, logo_url, website_url, description, is_approved, employee_count)")
              .in("id", extraIds)
              .eq("is_active", true)
          : { data: [] as Job[], error: null }
        const extras = [...(campusJobs.error ? [] : campusJobs.data || []), ...(missing.error ? [] : missing.data || [])] as Job[]
        if (extras.length) {
          const seen = new Set(fetched.map((job) => job.id))
          fetched = [...extras.filter((job) => !seen.has(job.id)), ...fetched]
        }
      }

      const tagged = fetched.map((job) => {
        const label = campusConnected ? jobCuratedForCampus(job, university, curated) : null
        return { ...job, cdc_curated: Boolean(label), collection_label: label }
      })
      let rows = rankJobs(
        tagged.filter(
          (j) =>
            j.recruiter_profiles?.is_approved === true &&
            !blocked.has(j.recruiter_id) &&
            // Disconnected students still see network jobs; partner-only campus posts stay gated.
            jobVisibleOnCampus(j, campusConnected ? university : null, reviews)
        ),
        activeWeights,
      )

      const appCountIds = rows.map((job) => job.id)
      if (appCountIds.length) {
        const { data: appRows } = await supabase
          .from("job_swipes")
          .select("job_id")
          .eq("direction", "right")
          .in("job_id", appCountIds)
        const counts = new Map<string, number>()
        for (const row of appRows || []) {
          counts.set(row.job_id, (counts.get(row.job_id) || 0) + 1)
        }
        rows = rows.map((job) => ({ ...job, application_count: counts.get(job.id) ?? 0 }))
      }

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
    [userId, rankJobs, toast, rankingWeights, university, campusConnected]
  )

  useEffect(() => {
    jobsRef.current = allJobs
  }, [allJobs])

  useEffect(() => {
    if (!campusConnected) {
      setFeedMode(FEED_ALL)
    } else {
      try {
        setFeedMode(parseFeedMode(window.localStorage.getItem(FEED_STORAGE_KEY)))
      } catch {
        setFeedMode(FEED_CURATED)
      }
    }
    queueMicrotask(() => {
      void loadJobs("replace")
    })
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(FEED_STORAGE_KEY, feedMode)
    } catch {
      /* ignore */
    }
  }, [feedMode])

  useEffect(() => {
    setCurrentIndex(0)
  }, [jobTypes, workModes, categories, location, keyword, minSalary, company, industry, markets, feedMode])

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
      if (direction === "right" && jobHasMandatoryQuestions(job)) {
        router.push(applyHref(job.id))
        return
      }
      setSwiping(true)
      setPendingAction(direction)
      const supabase = createClient()
      const { error } = await supabase.from("job_swipes").insert({ student_id: userId, job_id: job.id, direction })
      if (error && !isUniqueViolation(error)) {
        toast({
          variant: "destructive",
          title: direction === "right" ? "Couldn’t apply" : direction === "saved" ? "Couldn’t save" : "Couldn’t pass",
          description: error.message,
        })
        setCardEpoch((n) => n + 1)
        setPendingAction(null)
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
        toast({ title: "Saved", description: "Open Saved roles anytime to apply." })
      } else {
        setSessionPassed((n) => n + 1)
      }

      setTimeout(() => {
        setPendingAction(null)
        setSwiping(false)
      }, 100)
    },
    [userId, swiping, currentJob, toast, router]
  )

  const handleUndo = useCallback(async () => {
    if (swiping || !lastSwipe) return
    setSwiping(true)
    setPendingAction("undo")
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
      setPendingAction(null)
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
    setTimeout(() => {
      setPendingAction(null)
      setSwiping(false)
    }, 100)
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
    ...(campusConnected
      ? [
          {
            id: "feed",
            label: "Feed",
            kind: "select" as const,
            pin: true,
            chip: false,
            value: feedMode,
            emptyValue: FEED_CURATED,
            onChange: (value: string) => setFeedMode(parseFeedMode(value)),
            options: [
              { value: FEED_CURATED, label: "Campus curated" },
              { value: FEED_ALL, label: "All jobs" },
            ],
          },
        ]
      : []),
    {
      id: "keyword",
      label: "Search",
      kind: "text" as const,
      pin: true,
      value: keyword,
      placeholder: "Role, company, or skill…",
      inputMode: "search" as const,
      onChange: setKeyword,
    },
    {
      id: "type",
      label: "Type",
      kind: "multi" as const,
      pin: true,
      value: jobTypes,
      onChange: setJobTypes,
      emptyLabel: "Any type",
      options: [
        { value: "internship", label: "Internship" },
        { value: "full_time", label: "Full-time" },
        { value: "part_time", label: "Part-time" },
        { value: "contract", label: "Contract" },
        { value: "fellowship", label: "Fellowship" },
        { value: "freelance", label: "Freelance" },
        { value: "project", label: "Project" },
      ],
    },
    {
      id: "remote",
      label: "Work mode",
      kind: "multi" as const,
      pin: true,
      value: workModes,
      onChange: setWorkModes,
      emptyLabel: "Remote or on-site",
      options: [
        { value: "remote", label: "Remote" },
        { value: "onsite", label: "On-site" },
      ],
    },
    {
      id: "category",
      label: "Category",
      kind: "multi" as const,
      value: categories,
      onChange: setCategories,
      emptyLabel: "Any category",
      options: JOB_CATEGORIES.map((c) => ({ value: c, label: c })),
    },
    {
      id: "city",
      label: "City",
      kind: "text" as const,
      pin: true,
      value: location,
      placeholder: "Lahore, Karachi…",
      onChange: setLocation,
    },
    {
      id: "salary",
      label: "Min salary (PKR)",
      kind: "text" as const,
      value: minSalary,
      placeholder: "e.g. 80000",
      inputMode: "numeric" as const,
      onChange: (v: string) => setMinSalary(v.replace(/[^\d]/g, "")),
    },
    {
      id: "company",
      label: "Company",
      kind: "text" as const,
      value: company,
      placeholder: "Employer name",
      onChange: setCompany,
    },
    {
      id: "industry",
      label: "Industry",
      kind: "text" as const,
      value: industry,
      placeholder: "Banking, software…",
      onChange: setIndustry,
    },
    {
      id: "market",
      label: "Market",
      kind: "multi" as const,
      value: markets,
      onChange: setMarkets,
      emptyLabel: "Local and international",
      options: [
        { value: "local", label: "Local" },
        { value: "international", label: "International" },
      ],
    },
  ]

  const filters = (
    <DiscoverFilters
      fields={filterFields}
      title="Refine roles"
      searchHints={[
        "Search internships…",
        "Junior software engineer…",
        "Remote in Karachi…",
        "Unilever or Folio3…",
      ]}
      onClear={() => {
        setJobTypes([])
        setWorkModes([])
        setCategories([])
        setLocation("")
        setKeyword("")
        setMinSalary("")
        setCompany("")
        setIndustry("")
        setMarkets([])
        setFeedMode(campusConnected ? FEED_CURATED : FEED_ALL)
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
        description={
          sessionLine ||
          (feedMode === FEED_CURATED
            ? `Default feed is ${CURATED_BADGE}. Switch to All jobs for every listing you’re allowed to see.`
            : "All jobs permitted for your campus. Swipe right to apply; chat waits for a match.")
        }
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
            {allJobs.length === 0
              ? "No new roles right now"
              : feedMode === FEED_CURATED && !allJobs.some((j) => j.cdc_curated)
                ? "No campus-curated roles yet"
                : "Nothing matches these filters"}
          </p>
          <p className="mt-2 max-w-sm font-body text-sm text-muted-foreground">
            {allJobs.length === 0
              ? hasMore
                ? "Loading more listings…"
                : "Verified teams haven’t posted anything you haven’t already seen. Refresh in a bit."
              : feedMode === FEED_CURATED && !allJobs.some((j) => j.cdc_curated)
                ? "Your career office hasn’t added roles to a curated collection yet. Switch the feed to All jobs."
                : "Widen type, category, or city to see more of this stack."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => void loadJobs(allJobs.length === 0 && hasMore ? "append" : "replace")}>
              {allJobs.length === 0 && hasMore ? "Load more" : "Refresh feed"}
            </Button>
            {feedMode === FEED_CURATED && allJobs.some((j) => j.cdc_curated !== true) ? (
              <Button type="button" variant="outline" onClick={() => setFeedMode(FEED_ALL)}>
                Switch to All jobs
              </Button>
            ) : null}
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
                  <JobCard
                    job={nextJob}
                    studentSkills={skills}
                    preferredCategories={preferredCategories}
                    studentLocationHint={location.trim() || null}
                  />
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
                  preferredCategories={preferredCategories}
                  studentLocationHint={location.trim() || null}
                  onOpenCompany={() => router.push(`/company/${currentJob.recruiter_id}`)}
                  onOpenListing={() => router.push(`/jobs/${currentJob.id}`)}
                />
              </SwipeCard>
            </div>

            <DiscoverKeysHint>← Pass · → Apply · ↑ Save · Z Undo</DiscoverKeysHint>

            <div className="flex shrink-0 flex-wrap items-end justify-center gap-4 pb-1 max-lg:mb-[var(--discover-filters-fab)] sm:gap-6">
              <div className="flex flex-col items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleUndo()}
                  disabled={swiping || !lastSwipe}
                  loading={pendingAction === "undo"}
                  className="h-10 w-10 rounded-full sm:h-12 sm:w-12 [&_svg]:size-5 sm:[&_svg]:size-6"
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
                  loading={pendingAction === "left"}
                  className="h-10 w-10 rounded-full sm:h-12 sm:w-12 [&_svg]:size-5 sm:[&_svg]:size-6"
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
                  loading={pendingAction === "saved"}
                  className="h-10 w-10 rounded-full sm:h-12 sm:w-12 [&_svg]:size-5 sm:[&_svg]:size-6"
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
                  loading={pendingAction === "right"}
                  className="h-10 w-10 rounded-full sm:h-12 sm:w-12 [&_svg]:size-5 sm:[&_svg]:size-6"
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
