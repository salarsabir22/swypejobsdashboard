import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { applicationStatus } from "@/lib/match/fit"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { StudentApplicationList } from "./StudentApplicationList"
import { PassedJobsList } from "@/components/matches/PassedJobsList"
import { jobHasMandatoryQuestions } from "@/lib/jobs/screening"

type JobJoin = {
  id?: string
  title?: string
  job_type?: string
  recruiter_id?: string
  screening_questions?: unknown
  recruiter_profiles?: { company_name?: string; logo_url?: string | null } | null
}

type MatchListItem = {
  id: string
  job_id: string
  created_at: string
  pipeline_status?: string | null
  is_archived?: boolean
  conversations?: { id: string }[] | { id: string } | null
  jobs?: JobJoin | null
}

type ApplicationRow = {
  id: string
  job_id: string
  created_at: string
  jobs?: JobJoin | null
}

function conversationId(match: MatchListItem | undefined) {
  if (!match) return null
  const c = match.conversations
  return Array.isArray(c) ? c[0]?.id ?? null : c?.id ?? null
}

export async function StudentMatchesView({ userId }: { userId: string }) {
  const supabase = await createClient()

  const [matchesRes, appliedRes, savedRes, swipeRes, passedRes, viewsRes] = await Promise.all([
    supabase
      .from("matches")
      .select("*, jobs(id, title, job_type, recruiter_id, recruiter_profiles(company_name, logo_url)), conversations(id)")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("job_swipes")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("direction", "right"),
    supabase
      .from("job_swipes")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("direction", "saved"),
    supabase
      .from("job_swipes")
      .select("id, job_id, created_at, jobs(id, title, job_type, recruiter_id, recruiter_profiles(company_name, logo_url))")
      .eq("student_id", userId)
      .eq("direction", "right")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("job_swipes")
      .select(
        "id, job_id, created_at, jobs(id, title, job_type, screening_questions, recruiter_id, recruiter_profiles(company_name, logo_url))"
      )
      .eq("student_id", userId)
      .eq("direction", "left")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("profile_views").select("viewer_id, created_at").eq("student_id", userId).limit(200),
  ])

  const matches = (matchesRes.data || []) as MatchListItem[]
  const applications = (swipeRes.data || []) as ApplicationRow[]
  const passed = (passedRes.data || []) as ApplicationRow[]
  const appliedCount = appliedRes.count || applications.length
  const savedCount = savedRes.count || 0
  const matchRate = appliedCount > 0 ? Math.round((matches.length / appliedCount) * 100) : 0
  const withChat = matches.filter((m) => conversationId(m)).length
  const viewedAtByRecruiter = new Map<string, string>()
  for (const row of viewsRes.data || []) {
    const viewerId = row.viewer_id as string
    const at = row.created_at as string
    if (!viewedAtByRecruiter.has(viewerId)) viewedAtByRecruiter.set(viewerId, at)
  }
  const matchByJob = new Map(matches.map((m) => [m.job_id, m]))

  const statusCounts = { Applied: 0, Viewed: 0, Chatting: 0, Shortlisted: 0, Interview: 0, Offer: 0, Hired: 0, Closed: 0 }
  const rows = applications.map((app) => {
    const match = matchByJob.get(app.job_id)
    const recruiterId = app.jobs?.recruiter_id
    const status = applicationStatus({
      hasMatch: Boolean(match),
      pipeline: match?.pipeline_status,
      viewed: Boolean(recruiterId && viewedAtByRecruiter.has(recruiterId)),
      archived: Boolean(match?.is_archived),
    })
    statusCounts[status as keyof typeof statusCounts] = (statusCounts[status as keyof typeof statusCounts] || 0) + 1
    return {
      app,
      match,
      status,
      viewedAt: recruiterId ? viewedAtByRecruiter.get(recruiterId) ?? null : null,
    }
  })

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        eyebrow="Hiring"
        title="Applications"
        description={
          applications.length === 0
            ? "Apply from Discover. Status moves from applied to chatting when a recruiter likes you back."
            : `${applications.length} application${applications.length !== 1 ? "s" : ""} · ${matches.length} mutual match${matches.length !== 1 ? "es" : ""}.`
        }
        action={
          withChat > 0 ? (
            <Button asChild>
              <Link href="/chat">Open inbox</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Applied", value: appliedCount },
          { label: "Matches", value: matches.length },
          { label: "Match rate", value: `${matchRate}%` },
          { label: "Active chats", value: withChat },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="p-4 pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {appliedCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your pipeline</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-x-6 gap-y-4">
            {(
              [
                { label: "Applied", value: appliedCount },
                { label: "Saved", value: savedCount, href: "/saved" },
                { label: "Viewed", value: statusCounts.Viewed },
                { label: "Chatting", value: statusCounts.Chatting },
                { label: "Shortlisted", value: statusCounts.Shortlisted },
                { label: "Interview", value: statusCounts.Interview },
                { label: "Offer", value: statusCounts.Offer },
                { label: "Hired", value: statusCounts.Hired },
              ] as Array<{ label: string; value: number; href?: string }>
            ).map(({ label, value, href }) => (
              <div key={label} className="min-w-[4.5rem]">
                <p className="font-heading text-lg font-semibold tabular-nums text-foreground">{value}</p>
                {href ? (
                  <Link href={href} className="font-body mt-0.5 text-[11px] text-primary hover:underline">
                    {label}
                  </Link>
                ) : (
                  <p className="font-body mt-0.5 text-[11px] text-muted-foreground">{label}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!applications.length ? (
        <Card className="px-6 py-14 text-center">
          <CardHeader>
            <CardTitle>No applications yet</CardTitle>
            <CardDescription className="mx-auto max-w-md">
              A match happens when you apply and the recruiter returns interest. Strong profiles get there faster.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="mx-auto max-w-md list-inside list-decimal space-y-2 text-left font-body text-sm text-muted-foreground">
              <li>Finish your profile - bio, skills, and education.</li>
              <li>Build a resume (or add a portfolio link) so recruiters can download your CV.</li>
              <li>Apply to roles that fit; quality beats volume.</li>
            </ol>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild variant="outline">
                <Link href="/resume">Build resume</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/onboarding">Complete profile</Link>
              </Button>
              <Button asChild>
                <Link href="/discover">Discover jobs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="font-body text-sm text-muted-foreground">Stage updates when a recruiter views you, matches, or moves you in their pipeline.</p>
          <StudentApplicationList
            items={rows.map(({ app, match, status, viewedAt }) => {
              const job = app.jobs
              const company = job?.recruiter_profiles
              const convId = conversationId(match)
              const href = convId ? `/chat/${convId}` : job?.id ? `/jobs/${job.id}` : null
              const meta = [
                `Applied ${formatDate(app.created_at)}`,
                viewedAt ? `Viewed ${formatDate(viewedAt)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")
              return {
                id: app.id,
                href,
                title: job?.title || "Role",
                company: company?.company_name || null,
                logoUrl: company?.logo_url || null,
                meta,
                status,
              }
            })}
          />
        </>
      )}

      {passed.length ? (
        <PassedJobsList
          items={passed.map((row) => {
            const job = row.jobs
            const company = job?.recruiter_profiles
            return {
              id: row.id,
              jobId: row.job_id,
              title: job?.title || "Role",
              company: company?.company_name || null,
              logoUrl: company?.logo_url || null,
              meta: `Passed ${formatDate(row.created_at)}`,
              hasMandatoryQuestions: jobHasMandatoryQuestions({ screening_questions: job?.screening_questions }),
            }
          })}
        />
      ) : null}
    </div>
  )
}
