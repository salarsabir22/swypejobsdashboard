import Link from "next/link"
import { ArrowRight, Briefcase, Inbox, Star, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardFocusBanner } from "@/components/dashboard/DashboardFocusBanner"
import { DashboardFunnel } from "@/components/dashboard/DashboardFunnel"
import { DashboardFeedRow } from "@/components/dashboard/DashboardFeedRow"
import { RecruiterDashboardCharts } from "@/components/dashboard/RecruiterDashboardCharts"
import { CompletenessCard } from "@/components/profile/CompletenessCard"
import { recruiterCompleteness } from "@/lib/profile/completeness"
import { formatDate } from "@/lib/utils"
import { daysLastN, shortDayLabel } from "@/lib/dashboard/time-series"
import { Button } from "@/components/ui/button"
import { weekOverWeekHint } from "@/lib/dashboard/period-metrics"
import { conversationChatHref } from "@/lib/dashboard/chat-links"
import { coalesceRelation } from "@/lib/dashboard/relations"

type JobRow = {
  id: string
  title: string
  is_active: boolean
  created_at: string
}

type MatchRow = {
  id: string
  created_at: string
  profiles: { full_name: string | null; avatar_url?: string | null }[] | null
  jobs: { title: string | null }[] | null
  conversations: { id: string }[] | null
}

type JobSwipeRow = { job_id: string }
type CreatedRow = { created_at: string }
type JobViewRow = { job_id: string }
type PipelineRow = { pipeline_status?: string | null; is_archived?: boolean }

export async function RecruiterDashboardView({ userId, fullName }: { userId: string; fullName: string | null }) {
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

  const [jobsRes, matchesRes, shortlistedRes, companyRes, profileRes, pipelineRes] = await Promise.all([
    supabase.from("jobs").select("id, title, is_active, created_at").eq("recruiter_id", userId).order("created_at", { ascending: false }),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("recruiter_id", userId),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("recruiter_id", userId).eq("is_shortlisted", true),
    supabase
      .from("recruiter_profiles")
      .select("logo_url, description, website_url, industry")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("profile_video_url").eq("id", userId).maybeSingle(),
    supabase.from("matches").select("pipeline_status, is_archived").eq("recruiter_id", userId),
  ])

  const jobs = (jobsRes.data || []) as JobRow[]
  const jobIds = jobs.map((j) => j.id)

  const [applicationsRes, recentMatchesRes, appTimelineRes, matchTimelineRes, inbLast7Res, inbPrev7Res, jobViewsRes] =
    await Promise.all([
      jobIds.length > 0
        ? supabase.from("job_swipes").select("job_id").in("job_id", jobIds).eq("direction", "right")
        : Promise.resolve({ data: [] as JobSwipeRow[] }),
      supabase
        .from("matches")
        .select("id, created_at, profiles!matches_student_id_fkey(full_name, avatar_url), jobs(title), conversations(id)")
        .eq("recruiter_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      jobIds.length > 0
        ? supabase
            .from("job_swipes")
            .select("created_at")
            .in("job_id", jobIds)
            .eq("direction", "right")
            .gte("created_at", since)
        : Promise.resolve({ data: [] as CreatedRow[] }),
      supabase.from("matches").select("created_at").eq("recruiter_id", userId).gte("created_at", since),
      jobIds.length > 0
        ? supabase
            .from("job_swipes")
            .select("id", { count: "exact", head: true })
            .in("job_id", jobIds)
            .eq("direction", "right")
            .gte("created_at", since7)
        : Promise.resolve({ count: 0 }),
      jobIds.length > 0
        ? supabase
            .from("job_swipes")
            .select("id", { count: "exact", head: true })
            .in("job_id", jobIds)
            .eq("direction", "right")
            .gte("created_at", since14)
            .lt("created_at", since7)
        : Promise.resolve({ count: 0 }),
      jobIds.length > 0
        ? supabase.from("job_views").select("job_id").in("job_id", jobIds)
        : Promise.resolve({ data: [] as JobViewRow[] }),
    ])

  const matches = matchesRes.count || 0
  const shortlisted = shortlistedRes.count || 0
  const activeJobs = jobs.filter((j) => j.is_active).length
  const applications = (applicationsRes.data || []).length
  const recentMatches = (recentMatchesRes.data || []) as MatchRow[]

  const applications30d = (appTimelineRes.data || []).length
  const inbLast7 = inbLast7Res.count ?? 0
  const inbPrev7 = inbPrev7Res.count ?? 0
  const wowInbound = weekOverWeekHint(inbLast7, inbPrev7)

  const perJobApps = new Map<string, number>()
  for (const row of (applicationsRes.data || []) as JobSwipeRow[]) {
    perJobApps.set(row.job_id, (perJobApps.get(row.job_id) || 0) + 1)
  }

  const perJobViews = new Map<string, number>()
  for (const row of (jobViewsRes.data || []) as JobViewRow[]) {
    perJobViews.set(row.job_id, (perJobViews.get(row.job_id) || 0) + 1)
  }

  const days = daysLastN(30)
  const appRows = (appTimelineRes.data || []) as CreatedRow[]
  const matchRows = (matchTimelineRes.data || []) as CreatedRow[]

  const timeline = days.map((day) => ({
    label: shortDayLabel(day),
    applications: appRows.filter((r) => r.created_at?.slice(0, 10) === day).length,
    matches: matchRows.filter((r) => r.created_at?.slice(0, 10) === day).length,
  }))

  const jobBars = [...jobs]
    .map((j) => ({
      name: j.title.length > 24 ? `${j.title.slice(0, 24)}…` : j.title,
      applications: perJobApps.get(j.id) || 0,
    }))
    .sort((a, b) => b.applications - a.applications)
    .slice(0, 8)

  const conversionRate = applications > 0 ? Math.round((matches / applications) * 100) : 0
  const sumInb30 = timeline.reduce((a, d) => a + d.applications, 0)
  const sumMatch30 = timeline.reduce((a, d) => a + d.matches, 0)
  const chartFootnote = `Last 30 days: ${sumInb30} inbound applications · ${sumMatch30} new matches.`

  const pipeline = (pipelineRes.data || []) as PipelineRow[]
  const stageCount = (status: string) =>
    pipeline.filter((m) => !m.is_archived && (m.pipeline_status || "chatting") === status).length

  const completeness = recruiterCompleteness({
    logo: companyRes.data?.logo_url,
    description: companyRes.data?.description,
    website: companyRes.data?.website_url,
    industry: companyRes.data?.industry,
    video: profileRes.data?.profile_video_url,
  })

  const maxInbound = Math.max(...jobs.map((j) => perJobApps.get(j.id) || 0), 1)
  const firstName = fullName?.split(" ")[0]
  const interviewCount = stageCount("interview")

  const focus =
    jobs.length === 0
      ? {
          kicker: "Next step",
          title: "Post a role to open Discover",
          description: "Shortlists are tied to a live job. Once a listing is up, candidates appear for that posting.",
          href: "/jobs/new",
          cta: "Post a job",
        }
      : completeness.percent < 80
        ? {
            kicker: "Company page",
            title: `Your company profile is ${completeness.percent}% complete`,
            description: "Students compare employers the way they do on Handshake — logo, about, and a live site.",
            href: "/onboarding",
            cta: "Complete page",
          }
        : interviewCount > 0
          ? {
              kicker: "Pipeline",
              title: `${interviewCount} candidate${interviewCount === 1 ? "" : "s"} in interview`,
              description: "Keep notes and next steps on the board so nothing sits in chatting.",
              href: "/matches",
              cta: "Open pipeline",
            }
          : matches > 0
            ? {
                kicker: "Your move",
                title: `${matches} mutual match${matches === 1 ? "" : "es"} to review`,
                description: "Shortlist, propose an interview, or pass — all from Pipeline.",
                href: "/matches",
                cta: "Review pipeline",
              }
            : {
                kicker: "Source",
                title: "Shortlist from Discover",
                description: "Inbound applications are in. Swipe candidates on a live role to start conversations.",
                href: "/discover",
                cta: "Review candidates",
              }

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        eyebrow="Insights"
        title={
          firstName ? (
            <>
              <span className="text-primary">{firstName}</span>
              , here’s hiring
            </>
          ) : (
            "Hiring overview"
          )
        }
        description="Inbound interest, pipeline stages, and role performance from your live postings."
        action={
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/jobs/new">
              New job
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        }
      />

      <DashboardFocusBanner {...focus} />

      <section aria-labelledby="rec-kpi-heading">
        <h2 id="rec-kpi-heading" className="sr-only">
          Key metrics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpiCard
            tone="blue"
            icon={Briefcase}
            label="Active roles"
            value={activeJobs}
            hint={`${jobs.length} posted · ${Math.max(0, jobs.length - activeJobs)} paused`}
          />
          <DashboardKpiCard
            tone="teal"
            icon={Inbox}
            label="Inbound (30d)"
            value={applications30d}
            trend={timeline.map((d) => d.applications)}
            hint={wowInbound ? `${wowInbound} · ${inbLast7} this week` : `${inbLast7} in the last 7 days`}
          />
          <DashboardKpiCard
            tone="violet"
            icon={Users}
            label="Mutual matches"
            value={matches}
            trend={timeline.map((d) => d.matches)}
            hint={applications > 0 ? `${conversionRate}% of inbound converted` : "Both sides opted in"}
          />
          <DashboardKpiCard tone="amber" icon={Star} label="Shortlisted" value={shortlisted} hint="Starred on Pipeline" />
        </div>
      </section>

      <DashboardFunnel
        title="Hiring pipeline"
        stages={[
          { label: "Chatting", value: stageCount("chatting") },
          { label: "Interview", value: stageCount("interview") },
          { label: "Offer", value: stageCount("offer") },
          { label: "Hired", value: stageCount("hired") },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecruiterDashboardCharts
            timeline={timeline}
            jobBars={jobBars}
            conversionRate={conversionRate}
            footnote={chartFootnote}
          />
        </div>
        <CompletenessCard percent={completeness.percent} items={completeness.items} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="Roles" description="Views and inbound per posting." badge={`${jobs.length} jobs`}>
          {jobs.length === 0 ? (
            <DashboardEmptyState
              icon={Briefcase}
              title="No roles yet"
              description="Create a posting to start receiving inbound applications."
              primaryAction={{ href: "/jobs/new", label: "Create a job" }}
            />
          ) : (
            <ul className="m-0 list-none divide-y divide-border p-0">
              {jobs.map((job) => {
                const inbound = perJobApps.get(job.id) || 0
                const views = perJobViews.get(job.id) || 0
                return (
                  <li key={job.id}>
                    <Link href={`/jobs/${job.id}`} className="block rounded-xl px-2 py-3 transition-colors hover:bg-muted/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-heading text-sm font-medium">{job.title}</p>
                          <p className="mt-0.5 font-body text-xs text-muted-foreground">
                            {views} views · {inbound} applied · {formatDate(job.created_at)}
                          </p>
                        </div>
                        {job.is_active ? (
                          <Badge variant="success" className="shrink-0 font-normal">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0 font-normal">
                            Paused
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/80"
                          style={{ width: `${Math.max(6, (inbound / maxInbound) * 100)}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </DashboardPanel>

        <DashboardPanel title="Recent matches" description="New mutual matches." badge={`${recentMatches.length}`}>
          {recentMatches.length === 0 ? (
            <DashboardEmptyState
              icon={Users}
              title="No matches yet"
              description="When a student applies and you both show interest, they appear here."
              primaryAction={{ href: "/discover", label: "Browse candidates" }}
              secondaryAction={{ href: "/matches", label: "Open pipeline" }}
            />
          ) : (
            <div className="divide-y divide-border">
              {recentMatches.map((m) => {
                const chat = conversationChatHref(m.conversations)
                const roleTitle = coalesceRelation(m.jobs)?.title || "Role"
                return (
                  <DashboardFeedRow
                    key={m.id}
                    href={chat || "/matches"}
                    image={m.profiles?.[0]?.avatar_url}
                    title={m.profiles?.[0]?.full_name || "Candidate"}
                    subtitle={roleTitle}
                    meta={formatDate(m.created_at)}
                    action={chat ? "Chat" : "Pipeline"}
                  />
                )
              })}
            </div>
          )}
        </DashboardPanel>
      </div>
    </div>
  )
}
