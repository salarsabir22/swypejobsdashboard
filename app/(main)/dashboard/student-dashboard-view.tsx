import Link from "next/link"
import { AlertTriangle, Bookmark, Briefcase, Building2, Calendar, FileText, Globe, Handshake, Send, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { EventRsvpButton } from "@/components/portal/EventRsvpButton"
import { StudentHomeDeck, type StudentHomeJob } from "@/components/student/StudentHomeDeck"
import { loadStudentCampus } from "@/lib/campus/student-campus"
import { inCampusRange, parseCampusRange } from "@/lib/campus/range"
import { coalesceRelation } from "@/lib/dashboard/relations"
import { fetchFeedPosts } from "@/lib/feed/queries"
import { studentCompleteness } from "@/lib/profile/completeness"
import { formatRelativeTime, getInitials } from "@/lib/utils"
import { one } from "@/components/feed/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type JobJoin = {
  id: string
  title: string
  description?: string | null
  job_type?: string | null
  category?: string | null
  location?: string | null
  is_remote?: boolean | null
  created_at?: string
  recruiter_profiles?: { company_name?: string | null; logo_url?: string | null } | { company_name?: string | null; logo_url?: string | null }[] | null
}

type SwipeJobRow = { id: string; created_at: string; direction: string; jobs: JobJoin | JobJoin[] | null }

function toHomeJob(job: JobJoin | undefined, fallbackDate?: string): StudentHomeJob | null {
  if (!job?.id) return null
  const company = coalesceRelation(job.recruiter_profiles)
  return {
    id: job.id,
    title: job.title,
    description: job.description || null,
    job_type: job.job_type || null,
    category: job.category || null,
    location: job.location || null,
    is_remote: job.is_remote ?? null,
    created_at: job.created_at || fallbackDate || new Date().toISOString(),
    company: company?.company_name || null,
    logo: company?.logo_url || null,
  }
}

function greeting(name?: string | null) {
  const hour = new Date().getHours()
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  return name ? `${hello}, ${name}!` : hello
}

export async function StudentDashboardView({
  userId,
  fullName,
  isAlumni = false,
}: {
  userId: string
  fullName: string | null
  isAlumni?: boolean
}) {
  const supabase = await createClient()
  const period = parseCampusRange("month")
  const firstName = fullName?.split(" ")[0]

  // One parallel round-trip: drop duplicate swipe/match scans; load feed alongside.
  const [
    swipeStatsRes,
    swipeJobsRes,
    featuredRes,
    profileViewsRes,
    profileRes,
    studentRes,
    matchesRes,
    campusRsvps,
    feed,
  ] = await Promise.all([
    supabase
      .from("job_swipes")
      .select("direction, created_at")
      .eq("student_id", userId)
      .in("direction", ["right", "saved"])
      .limit(200),
    supabase
      .from("job_swipes")
      .select("id, created_at, direction, jobs(id, title, description, job_type, category, location, is_remote, created_at, recruiter_profiles(company_name, logo_url))")
      .eq("student_id", userId)
      .in("direction", ["right", "saved"])
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("jobs")
      .select("id, title, description, job_type, category, location, is_remote, created_at, recruiter_profiles(company_name, logo_url)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("profile_views").select("created_at").eq("student_id", userId).limit(200),
    supabase.from("profiles").select("avatar_url, bio, profile_video_url").eq("id", userId).maybeSingle(),
    supabase
      .from("student_profiles")
      .select("university, skills, preferred_job_categories, resume_url, linkedin_url")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("matches").select("created_at, pipeline_status, is_archived").eq("student_id", userId).limit(200),
    supabase.from("campus_event_rsvps").select("event_id").eq("student_id", userId).limit(80),
    fetchFeedPosts(supabase, { limit: 3 }),
  ])

  const swipeStats = swipeStatsRes.data || []
  const appliedRows = swipeStats.filter((row) => row.direction === "right")
  const savedRows = swipeStats.filter((row) => row.direction === "saved")
  const matchRows = matchesRes.data || []
  const viewRows = profileViewsRes.data || []
  const applied = appliedRows.filter((row) => inCampusRange(row.created_at, period)).length
  const saved = savedRows.filter((row) => inCampusRange(row.created_at, period)).length
  const matches = matchRows.filter((row) => inCampusRange(row.created_at, period)).length
  const profileViews = viewRows.filter((row) => inCampusRange(row.created_at, period)).length
  const jobPosts = (featuredRes.data || []).filter((job) => inCampusRange(job.created_at, period)).length

  const swipeJobs = (swipeJobsRes.data || []) as SwipeJobRow[]
  const savedJobs = swipeJobs
    .filter((row) => row.direction === "saved")
    .map((row) => toHomeJob(coalesceRelation(row.jobs), row.created_at))
    .filter(Boolean) as StudentHomeJob[]
  const appliedJobs = swipeJobs
    .filter((row) => row.direction === "right")
    .map((row) => toHomeJob(coalesceRelation(row.jobs), row.created_at))
    .filter(Boolean) as StudentHomeJob[]
  const seen = new Set([...savedJobs, ...appliedJobs].map((job) => job.id))
  const discoverJobs = ((featuredRes.data || []) as JobJoin[])
    .map((job) => toHomeJob(job))
    .filter((job): job is StudentHomeJob => Boolean(job && !seen.has(job.id)))
  const preferred = new Set(studentRes.data?.preferred_job_categories || [])
  const recommendedJobs = discoverJobs.filter((job) => (job.category && preferred.has(job.category)) || preferred.size === 0).slice(0, 8)

  const completeness = studentCompleteness({
    avatar: profileRes.data?.avatar_url,
    bio: profileRes.data?.bio,
    university: studentRes.data?.university,
    skills: studentRes.data?.skills,
    resume: studentRes.data?.resume_url,
    video: profileRes.data?.profile_video_url,
    linkedin: studentRes.data?.linkedin_url,
  })
  const interviews = matchRows.filter((row) =>
    ["interview", "offer", "hired"].includes(row.pipeline_status || "")
  ).length
  const matchRate = appliedRows.length ? Math.round((matchRows.length / appliedRows.length) * 100) : 0
  const remaining = completeness.items.filter((item) => !item.done)
  const alerts = [
    !studentRes.data?.resume_url ? "Resume missing" : null,
    appliedRows.length === 0 ? "No applications yet" : null,
    completeness.percent < 80 ? `Profile ${completeness.percent}% complete` : null,
  ].filter(Boolean) as string[]

  const campus = await loadStudentCampus(supabase, {
    userId,
    university: studentRes.data?.university || null,
    isAlumni,
  })
  const going = new Set((campusRsvps.data || []).map((row) => row.event_id))
  const event = campus.events[0]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.4rem]">
            {greeting(firstName)}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Discover opportunities, grow your skills, and kickstart your career.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-11 items-center rounded-full bg-primary/10 px-3.5 text-[13px] font-medium text-primary">
            Your profile is {completeness.percent}% complete
          </span>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/discover">Open Discover</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <StudentHomeDeck
          discover={discoverJobs.slice(0, 8)}
          saved={savedJobs.slice(0, 8)}
          applied={appliedJobs.slice(0, 8)}
          recommended={recommendedJobs}
        />

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-semibold">Your feed</h2>
                <Link href="/feed" className="text-sm font-medium text-primary hover:underline">
                  See all
                </Link>
              </div>
              {feed.posts.length ? (
                <ul className="space-y-4">
                  {feed.posts.slice(0, 2).map((post) => {
                    const author = one(post.profiles)
                    return (
                      <li key={post.id} className="border-b border-border/70 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold">
                            {getInitials(author?.full_name || "Member")}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{author?.full_name || "Member"}</p>
                            <p className="text-[12px] text-muted-foreground">{formatRelativeTime(post.created_at)}</p>
                            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.body}</p>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No posts yet. The campus feed will land here.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-semibold">Upcoming events</h2>
                <Link href="/events" className="text-sm font-medium text-primary hover:underline">
                  See all
                </Link>
              </div>
              {event ? (
                <div className="rounded-2xl bg-secondary/60 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Calendar className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.starts_at
                          ? new Date(event.starts_at).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "Date to be announced"}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <EventRsvpButton eventId={event.id} going={going.has(event.id)} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming campus events yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-6 p-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <h2 className="font-heading text-lg font-semibold">Track your progress</h2>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="grid size-24 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#2251FF ${completeness.percent * 3.6}deg, #e8eef5 0deg)`,
                }}
                aria-hidden
              >
                <div className="grid size-[4.6rem] place-items-center rounded-full bg-card">
                  <span className="text-xl font-semibold tabular-nums">{completeness.percent}%</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Profile complete</p>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {completeness.items.slice(0, 3).map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <span className={item.done ? "text-primary" : "text-muted-foreground"}>{item.done ? "●" : "○"}</span>
                  <Link href={item.href} className="hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DashboardKpiCard icon={Briefcase} label="Job posts" value={jobPosts} hint={`New roles · ${period.shortLabel.toLowerCase()}`} tone="violet" />
            <DashboardKpiCard icon={Users} label="Engagement" value={applied + saved} hint="Your applications and saves" tone="teal" />
            <DashboardKpiCard icon={Building2} label="Employer activity" value={profileViews} hint="Recruiters who viewed you" />
            <DashboardKpiCard icon={Send} label="Applications" value={applied} hint={`${appliedRows.length} all time`} tone="teal" />
            <DashboardKpiCard
              icon={Handshake}
              label="Placement insights"
              value={interviews || matches}
              hint={appliedRows.length ? `${matchRate}% match rate · ${interviews} interviews` : "Apply to see your pipeline"}
            />
            <DashboardKpiCard
              icon={AlertTriangle}
              label="Alerts"
              value={alerts.length}
              hint={alerts[0] || "You’re on track"}
              tone={alerts.length ? "amber" : "teal"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="font-heading text-lg font-semibold">Quick links</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { href: "/resume", label: "My resume", icon: FileText },
              { href: "/appointments", label: "Book a session", icon: Handshake },
              { href: "/career-office", label: "Career resources", icon: Bookmark },
              { href: "/opportunities", label: "International programs", icon: Globe },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm font-medium hover:bg-secondary"
              >
                <item.icon className="h-4 w-4 text-primary" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
          {remaining.length ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Next: <Link href={remaining[0].href} className="font-medium text-primary hover:underline">{remaining[0].label}</Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
