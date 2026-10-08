import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { applicationStatus } from "@/lib/match/fit"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StudentApplicationList } from "./StudentApplicationList"

type JobJoin = {
  id?: string
  title?: string
  job_type?: string
  recruiter_id?: string
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

  const [matchesRes, appliedRes, savedRes, swipeRes, viewsRes] = await Promise.all([
    supabase
      .from("matches")
      .select("*, jobs(id, title, job_type, recruiter_id, recruiter_profiles(company_name, logo_url)), conversations(id)")
      .eq("student_id", userId)
      .order("created_at", { ascending: false }),
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
      .order("created_at", { ascending: false }),
    supabase.from("profile_views").select("viewer_id, created_at").eq("student_id", userId),
  ])

  const matches = (matchesRes.data || []) as MatchListItem[]
  const applications = (swipeRes.data || []) as ApplicationRow[]
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

  const statusCounts = { Applied: 0, Viewed: 0, Chatting: 0, Interview: 0, Offer: 0, Hired: 0, Closed: 0 }
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
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-[2.25rem]">Applications</h1>
          <p className="font-body text-sm text-muted-foreground">
            {applications.length === 0
              ? "Apply from Discover. Status moves from applied to chatting when a recruiter likes you back."
              : `${applications.length} application${applications.length !== 1 ? "s" : ""} · ${matches.length} mutual match${matches.length !== 1 ? "es" : ""}.`}
          </p>
        </div>
        {withChat > 0 ? (
          <Button asChild>
            <Link href="/chat">Open inbox</Link>
          </Button>
        ) : null}
      </header>

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
            {[
              { label: "Applied", value: appliedCount },
              { label: "Saved", value: savedCount },
              { label: "Viewed", value: statusCounts.Viewed },
              { label: "Chatting", value: statusCounts.Chatting },
              { label: "Interview", value: statusCounts.Interview },
              { label: "Offer", value: statusCounts.Offer },
            ].map(({ label, value }) => (
              <div key={label} className="min-w-[4.5rem]">
                <p className="font-heading text-lg font-semibold tabular-nums text-foreground">{value}</p>
                <p className="font-body mt-0.5 text-[11px] text-muted-foreground">{label}</p>
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
              <li>Add a resume or portfolio link if you have one.</li>
              <li>Apply to roles that fit; quality beats volume.</li>
            </ol>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
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
    </div>
  )
}
