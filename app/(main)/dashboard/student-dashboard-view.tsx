import Link from "next/link"
import { Bookmark, Eye, Send, Sparkles, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardFocusBanner } from "@/components/dashboard/DashboardFocusBanner"
import { DashboardFunnel } from "@/components/dashboard/DashboardFunnel"
import { DashboardFeedRow } from "@/components/dashboard/DashboardFeedRow"
import { StudentDashboardCharts } from "@/components/dashboard/StudentDashboardCharts"
import { CompletenessCard } from "@/components/profile/CompletenessCard"
import { studentCompleteness } from "@/lib/profile/completeness"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { daysLastN, shortDayLabel } from "@/lib/dashboard/time-series"
import { matchRatePercent, weekOverWeekHint } from "@/lib/dashboard/period-metrics"
import { conversationChatHref } from "@/lib/dashboard/chat-links"
import { coalesceRelation } from "@/lib/dashboard/relations"

type SavedJobRow = {
  id: string
  created_at: string
  jobs: {
    id: string
    title: string
    job_type: string | null
    recruiter_profiles: { company_name: string | null; logo_url?: string | null }[] | null
  }[] | null
}

type MatchRow = {
  id: string
  job_id?: string
  created_at: string
  pipeline_status?: string | null
  is_archived?: boolean
  profiles: { full_name: string | null; avatar_url?: string | null }[] | null
  jobs: {
    title: string | null
    recruiter_id?: string
    recruiter_profiles: { company_name: string | null; logo_url?: string | null }[] | null
  }[] | null
  conversations: { id: string }[] | null
}

type SwipeTimelineRow = { created_at: string; direction: string }
type MatchTimelineRow = { created_at: string }
type ProfileViewRow = { id: string; created_at: string; viewer_id: string }
type ViewerProfile = { id: string; full_name: string | null; avatar_url: string | null; role: string | null }
type CompanyLite = { id: string; company_name: string | null; logo_url: string | null }

export async function StudentDashboardView({ userId, fullName }: { userId: string; fullName: string | null }) {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)
  const since = thirtyDaysAgo.toISOString()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14)
  const since7 = sevenDaysAgo.toISOString()
  const since14 = fourteenDaysAgo.toISOString()

  const [
    appliedRes,
    savedRes,
    matchesRes,
    savedJobsRes,
    recentMatchesRes,
    swipesTimelineRes,
    matchesTimelineRes,
    appliedLast7Res,
    appliedPrev7Res,
    profileViewsCountRes,
    profileViewsRes,
    profileRes,
    studentRes,
    matchStatusRes,
  ] = await Promise.all([
    supabase.from("job_swipes").select("id", { count: "exact", head: true }).eq("student_id", userId).eq("direction", "right"),
    supabase.from("job_swipes").select("id", { count: "exact", head: true }).eq("student_id", userId).eq("direction", "saved"),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("student_id", userId),
    supabase
      .from("job_swipes")
      .select("id, created_at, jobs(id, title, job_type, recruiter_profiles(company_name, logo_url))")
      .eq("student_id", userId)
      .eq("direction", "saved")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("matches")
      .select(
        "id, created_at, pipeline_status, is_archived, profiles!matches_recruiter_id_fkey(full_name, avatar_url), jobs(title, recruiter_id, recruiter_profiles(company_name, logo_url)), conversations(id)"
      )
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("job_swipes").select("created_at, direction").eq("student_id", userId).gte("created_at", since),
    supabase.from("matches").select("created_at").eq("student_id", userId).gte("created_at", since),
    supabase
      .from("job_swipes")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("direction", "right")
      .gte("created_at", since7),
    supabase
      .from("job_swipes")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("direction", "right")
      .gte("created_at", since14)
      .lt("created_at", since7),
    supabase.from("profile_views").select("id", { count: "exact", head: true }).eq("student_id", userId),
    supabase
      .from("profile_views")
      .select("id, created_at, viewer_id")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("profiles").select("avatar_url, bio, profile_video_url").eq("id", userId).maybeSingle(),
    supabase
      .from("student_profiles")
      .select("university, skills, resume_url, linkedin_url")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("matches").select("job_id, pipeline_status, is_archived").eq("student_id", userId),
  ])

  const applied = appliedRes.count || 0
  const saved = savedRes.count || 0
  const matches = matchesRes.count || 0
  const savedJobs = (savedJobsRes.data || []) as SavedJobRow[]
  const recentMatches = (recentMatchesRes.data || []) as MatchRow[]

  const appliedLast7 = appliedLast7Res.count || 0
  const appliedPrev7 = appliedPrev7Res.count || 0
  const wowApplications = weekOverWeekHint(appliedLast7, appliedPrev7)
  const matchRate = matchRatePercent(matches, applied)
  const profileViewCount = profileViewsCountRes.count || 0
  const profileViewRows = (profileViewsRes.data || []) as ProfileViewRow[]
  const viewerIds = [...new Set(profileViewRows.map((row) => row.viewer_id))]
  const { data: viewerRows } = viewerIds.length
    ? await supabase.from("profiles").select("id, full_name, avatar_url, role").in("id", viewerIds)
    : { data: [] as ViewerProfile[] }
  const viewers = (viewerRows || []) as ViewerProfile[]
  const viewerById = new Map(viewers.map((p) => [p.id, p]))
  const recruiterIds = viewers.filter((p) => p.role === "recruiter").map((p) => p.id)
  const { data: companyRows } = recruiterIds.length
    ? await supabase.from("recruiter_profiles").select("id, company_name, logo_url").in("id", recruiterIds)
    : { data: [] as CompanyLite[] }
  const companyById = new Map(((companyRows || []) as CompanyLite[]).map((c) => [c.id, c]))

  const days = daysLastN(30)
  const swipes = (swipesTimelineRes.data || []) as SwipeTimelineRow[]
  const matchTimeline = (matchesTimelineRes.data || []) as MatchTimelineRow[]

  const activity = days.map((day) => {
    let a = 0
    let s = 0
    for (const row of swipes) {
      if (row.created_at?.slice(0, 10) !== day) continue
      if (row.direction === "right") a++
      else if (row.direction === "saved") s++
    }
    return { label: shortDayLabel(day), applied: a, saved: s }
  })

  const matchesSeries = days.map((day) => ({
    label: shortDayLabel(day),
    matches: matchTimeline.filter((m) => m.created_at?.slice(0, 10) === day).length,
  }))

  const sumApplied30 = activity.reduce((acc, d) => acc + d.applied, 0)
  const sumSaved30 = activity.reduce((acc, d) => acc + d.saved, 0)
  const sumMatches30 = matchesSeries.reduce((acc, d) => acc + d.matches, 0)
  const chartFootnote = `Last 30 days: ${sumApplied30} applications · ${sumSaved30} saves · ${sumMatches30} new matches.`

  const completeness = studentCompleteness({
    avatar: profileRes.data?.avatar_url,
    bio: profileRes.data?.bio,
    university: studentRes.data?.university,
    skills: studentRes.data?.skills,
    resume: studentRes.data?.resume_url,
    video: profileRes.data?.profile_video_url,
    linkedin: studentRes.data?.linkedin_url,
  })

  const matchStatus = (matchStatusRes.data || []) as { job_id: string; pipeline_status?: string | null; is_archived?: boolean }[]
  const interviewPlus = matchStatus.filter((m) =>
    ["interview", "offer", "hired"].includes(m.pipeline_status || "")
  ).length
  const chattingStage = matchStatus.filter(
    (m) => !m.is_archived && !["interview", "offer", "hired", "passed"].includes(m.pipeline_status || "")
  ).length

  const chattingCount = recentMatches.filter((m) => conversationChatHref(m.conversations)).length
  const firstName = fullName?.split(" ")[0]

  const focus =
    completeness.percent < 80
      ? {
          kicker: "Next step",
          title: `Your profile is ${completeness.percent}% complete`,
          description: "Handshake-style hiring teams filter on a photo, education, and a resume before they swipe.",
          href: "/onboarding",
          cta: "Finish profile",
        }
      : applied === 0
        ? {
            kicker: "Next step",
            title: "Apply to a role",
            description: "Discover is live. A right swipe is your application — matches show up here after both sides opt in.",
            href: "/discover",
            cta: "Open Discover",
          }
        : matches === 0
          ? {
              kicker: "Keep going",
              title: `${applied} application${applied === 1 ? "" : "s"} in motion`,
              description: "No mutual matches yet. Recruiters who view you appear below — follow up by staying active on Discover.",
              href: "/discover",
              cta: "Find more roles",
            }
          : chattingCount > 0
            ? {
                kicker: "Your move",
                title: `${chattingCount} conversation${chattingCount === 1 ? "" : "s"} ready`,
                description: "Reply while the match is fresh. Most campus hires start in the first messages.",
                href: "/chat",
                cta: "Open inbox",
              }
            : {
                kicker: "You’re in",
                title: `${matches} mutual match${matches === 1 ? "" : "es"}`,
                description: "Open Applications to track stage, or keep Discover moving.",
                href: "/matches",
                cta: "View applications",
              }

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        eyebrow="Insights"
        title={firstName ? `Welcome back, ${firstName}` : "Your overview"}
        description="Applications, who viewed you, and what to do next — from your live activity."
        action={
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/discover">
              Discover
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        }
      />

      <DashboardFocusBanner {...focus} />

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Key metrics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpiCard
            tone="blue"
            icon={Send}
            label="Applications"
            value={applied}
            trend={activity.map((d) => d.applied)}
            hint={
              wowApplications
                ? `${wowApplications} · ${appliedLast7} this week`
                : `${appliedLast7} in the last 7 days`
            }
          />
          <DashboardKpiCard
            tone="violet"
            icon={Eye}
            label="Profile views"
            value={profileViewCount}
            hint="Recruiters who opened your public profile"
          />
          <DashboardKpiCard
            tone="teal"
            icon={Sparkles}
            label="Mutual matches"
            value={matches}
            trend={matchesSeries.map((d) => d.matches)}
            hint={applied > 0 ? `${matchRate}% of applications matched` : "Apply to see a match rate"}
          />
          <DashboardKpiCard
            tone="amber"
            icon={Bookmark}
            label="Saved roles"
            value={saved}
            trend={activity.map((d) => d.saved)}
            hint="Bookmarked from Discover"
          />
        </div>
      </section>

      <DashboardFunnel
        title="Application pipeline"
        stages={[
          { label: "Applied", value: applied },
          { label: "Profile views", value: profileViewCount },
          { label: "Chatting", value: chattingStage },
          { label: "Interview+", value: interviewPlus },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StudentDashboardCharts
            activity={activity}
            matchesSeries={matchesSeries}
            matchRate={applied > 0 ? matchRate : 0}
            footnote={chartFootnote}
          />
        </div>
        <CompletenessCard percent={completeness.percent} items={completeness.items} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="Who viewed you" description="Most recent recruiters on your profile." badge={`${profileViewCount} total`}>
          {profileViewRows.length === 0 ? (
            <DashboardEmptyState
              icon={Eye}
              title="No profile views yet"
              description="When a recruiter opens your candidate page, they show up here."
              primaryAction={{ href: "/profile", label: "Share profile" }}
            />
          ) : (
            <div className="divide-y divide-border">
              {profileViewRows.map((row) => {
                const viewer = viewerById.get(row.viewer_id)
                const company = companyById.get(row.viewer_id)
                const href = viewer?.role === "recruiter" ? `/company/${row.viewer_id}` : `/candidates/${row.viewer_id}`
                return (
                  <DashboardFeedRow
                    key={row.id}
                    href={href}
                    image={company?.logo_url || viewer?.avatar_url}
                    title={viewer?.full_name || "Recruiter"}
                    subtitle={company?.company_name || "Opened your profile"}
                    meta={formatDate(row.created_at)}
                    action="View"
                  />
                )
              })}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title="Recent matches" description="Mutual interest — jump into chat." badge={`${recentMatches.length}`}>
          {recentMatches.length === 0 ? (
            <DashboardEmptyState
              icon={Sparkles}
              title="No matches yet"
              description="When you apply and a recruiter returns interest, they appear here."
              primaryAction={{ href: "/discover", label: "Go to Discover" }}
              secondaryAction={{ href: "/matches", label: "Applications" }}
            />
          ) : (
            <div className="divide-y divide-border">
              {recentMatches.map((m) => {
                const job = coalesceRelation(m.jobs)
                const chat = conversationChatHref(m.conversations)
                const company = job?.recruiter_profiles?.[0]
                return (
                  <DashboardFeedRow
                    key={m.id}
                    href={chat || "/matches"}
                    image={company?.logo_url || m.profiles?.[0]?.avatar_url}
                    title={job?.title || "Match"}
                    subtitle={company?.company_name || m.profiles?.[0]?.full_name || "Recruiter"}
                    meta={formatDate(m.created_at)}
                    action={chat ? "Chat" : "Open"}
                  />
                )
              })}
            </div>
          )}
        </DashboardPanel>
      </div>

      <DashboardPanel title="Saved roles" description="Come back to these when you’re ready to apply." badge={`${savedJobs.length}`}>
        {savedJobs.length === 0 ? (
          <DashboardEmptyState
            icon={Bookmark}
            title="No saved roles yet"
            description="Save roles on Discover to compare employers later."
            primaryAction={{ href: "/discover", label: "Browse Discover" }}
          />
        ) : (
          <div className="divide-y divide-border">
            {savedJobs.map((row) => {
              const job = coalesceRelation(row.jobs)
              const company = job?.recruiter_profiles?.[0]
              return (
                <DashboardFeedRow
                  key={row.id}
                  href={job?.id ? `/jobs/${job.id}` : "/saved"}
                  image={company?.logo_url}
                  title={job?.title || "Untitled role"}
                  subtitle={company?.company_name || job?.job_type?.replace(/_/g, " ") || ""}
                  meta={formatDate(row.created_at)}
                  action="Open"
                />
              )
            })}
          </div>
        )}
      </DashboardPanel>
    </div>
  )
}
