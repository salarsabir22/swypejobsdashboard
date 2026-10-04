import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { DiscoverHeader, DiscoverStatStrip } from "@/components/discover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/utils"
import { formatSalary } from "@/lib/jobs/salary"
import { ShareButton } from "@/components/share/ShareButton"
import type { Job } from "@/types"

type JobIdRow = { job_id: string }

function formatJobType(raw: string) {
  return raw.replace(/_/g, " ")
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  if (tab === "pipeline") redirect("/matches")
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "recruiter") redirect("/discover")

  const { data: recruiterProfile } = await supabase.from("recruiter_profiles").select("*").eq("id", user.id).maybeSingle()

  const { data: jobs } = await supabase.from("jobs").select("*").eq("recruiter_id", user.id).order("created_at", { ascending: false })

  const jobIds = (jobs || []).map((j: Job) => j.id)

  const [appResult, matchResult, viewResult] = await Promise.all([
    jobIds.length > 0
      ? supabase.from("job_swipes").select("job_id").in("job_id", jobIds).eq("direction", "right")
      : Promise.resolve({ data: [] }),
    jobIds.length > 0
      ? supabase.from("matches").select("job_id").eq("recruiter_id", user.id)
      : Promise.resolve({ data: [] }),
    jobIds.length > 0
      ? supabase.from("candidate_swipes").select("job_id").eq("recruiter_id", user.id)
      : Promise.resolve({ data: [] }),
  ])

  const perJobStats: Record<string, { applications: number; matches: number; views: number }> = {}
  for (const s of (appResult.data || []) as JobIdRow[]) {
    if (!perJobStats[s.job_id]) perJobStats[s.job_id] = { applications: 0, matches: 0, views: 0 }
    perJobStats[s.job_id].applications++
  }
  for (const m of (matchResult.data || []) as JobIdRow[]) {
    if (!perJobStats[m.job_id]) perJobStats[m.job_id] = { applications: 0, matches: 0, views: 0 }
    perJobStats[m.job_id].matches++
  }
  for (const v of (viewResult.data || []) as JobIdRow[]) {
    if (!perJobStats[v.job_id]) perJobStats[v.job_id] = { applications: 0, matches: 0, views: 0 }
    perJobStats[v.job_id].views++
  }

  const totalApplications = (appResult.data || []).length
  const totalMatches = (matchResult.data || []).length
  const totalCandidatesViewed = (viewResult.data || []).length
  const activeJobs = (jobs || []).filter((j: Job) => j.is_active).length
  const isApproved =
    recruiterProfile && "is_approved" in recruiterProfile
      ? (recruiterProfile as { is_approved?: boolean }).is_approved
      : false

  const overallMatchRate = totalApplications > 0 ? Math.round((totalMatches / totalApplications) * 100) : 0
  const funnelMax = Math.max(totalCandidatesViewed, totalApplications, totalMatches, 1)

  return (
    <div className="space-y-10">
      <DiscoverHeader
        eyebrow="Listings"
        title="Jobs"
        description={`${activeJobs} active · ${jobs?.length || 0} total listing${(jobs?.length || 0) === 1 ? "" : "s"}`}
        action={
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/matches">Pipeline</Link>
            </Button>
            <ShareButton path={`/company/${user.id}`} title="Company profile" label="Share company" />
            <Button asChild className="rounded-full">
              <Link href="/jobs/new">Post a job</Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-10">

      {!isApproved ? (
        <Card className="border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="font-data text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-100">
              Pending admin approval
            </CardTitle>
            <CardDescription className="text-foreground/80">
              You can create and manage jobs now. Candidates won&apos;t see listings until your recruiter account is
              approved.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {(jobs?.length || 0) > 0 ? (
        <>
          <DiscoverStatStrip
            columns={4}
            caption="Across all roles"
            items={[
              { label: "Active listings", value: activeJobs },
              { label: "Applications", value: totalApplications },
              {
                label: "Matches",
                value: totalMatches,
                sub: totalApplications > 0 ? `${overallMatchRate}% of applications` : undefined,
              },
              { label: "Profiles reviewed", value: totalCandidatesViewed },
            ]}
          />

          {totalApplications > 0 ? (
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-baseline justify-between gap-4 space-y-0 pb-4">
                <CardTitle className="font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Funnel (all roles)
                </CardTitle>
                <span className="font-body text-xs text-muted-foreground">All time</span>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {[
                  { label: "Profiles reviewed", value: totalCandidatesViewed },
                  { label: "Applications received", value: totalApplications },
                  { label: "Mutual matches", value: totalMatches },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <p className="w-24 shrink-0 font-body text-xs text-muted-foreground sm:w-36">{label}</p>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.round((value / funnelMax) * 100))}%` }}
                      />
                    </div>
                    <p className="w-8 text-right font-heading text-sm font-semibold tabular-nums text-foreground">
                      {value}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {!jobs?.length ? (
        <Card className="border-dashed bg-muted/15 py-12 text-center shadow-none sm:py-14">
          <CardHeader className="space-y-2">
            <CardTitle className="font-heading text-lg">No jobs yet</CardTitle>
            <CardDescription className="mx-auto max-w-md text-base">
              Create a listing to appear in student discovery and start receiving applications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <Button asChild className="rounded-full">
              <Link href="/jobs/new">Post your first job</Link>
            </Button>
            <Card className="mx-auto max-w-md text-left shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="list-inside list-decimal space-y-2 font-body text-sm leading-relaxed text-muted-foreground">
                  <li>List must-have skills so the right students self-select.</li>
                  <li>Describe impact and learning - not only requirements.</li>
                  <li>Remote-friendly roles reach more qualified applicants.</li>
                  <li>Keep requirements realistic to avoid empty pipelines.</li>
                </ol>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="font-body text-sm text-muted-foreground">Open a job to edit details and review applicants.</p>
          <ul className="m-0 list-none space-y-3 p-0">
            {(jobs || []).map((job: Job) => {
              const stats = perJobStats[job.id] || { applications: 0, matches: 0, views: 0 }
              const matchRate = stats.applications > 0 ? Math.round((stats.matches / stats.applications) * 100) : 0
              const pay = formatSalary({
                min: job.salary_min,
                max: job.salary_max,
                currency: job.salary_currency,
                note: job.compensation_note,
              })
              const metaParts = [
                formatJobType(job.job_type),
                job.is_remote ? "Remote" : job.location || null,
                pay,
                `Posted ${formatDate(job.created_at)}`,
              ].filter(Boolean)

              return (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Card className="transition-colors hover:border-primary/25 hover:bg-muted/20">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-heading text-base font-semibold leading-snug text-foreground">{job.title}</h3>
                            <p className="mt-1.5 font-body text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
                          </div>
                          {job.is_active ? (
                            <Badge variant="success" className="shrink-0 font-normal">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
                              Paused
                            </Badge>
                          )}
                        </div>

                        {job.required_skills && job.required_skills.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {job.required_skills.slice(0, 5).map((s: string) => (
                              <Badge key={s} variant="secondary" className="text-[11px] font-normal">
                                {s}
                              </Badge>
                            ))}
                            {job.required_skills.length > 5 ? (
                              <Badge variant="outline" className="border-transparent text-[11px] font-normal text-muted-foreground">
                                +{job.required_skills.length - 5}
                              </Badge>
                            ) : null}
                          </div>
                        ) : null}

                        <Separator className="my-4" />

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="font-heading text-lg font-semibold tabular-nums text-foreground">{stats.applications}</p>
                            <p className="mt-0.5 font-body text-[11px] text-muted-foreground">Applications</p>
                          </div>
                          <div>
                            <p className="font-heading text-lg font-semibold tabular-nums text-foreground">{stats.matches}</p>
                            <p className="mt-0.5 font-body text-[11px] text-muted-foreground">Matches</p>
                          </div>
                          <div>
                            <p className="font-heading text-lg font-semibold tabular-nums text-foreground">{matchRate}%</p>
                            <p className="mt-0.5 font-body text-[11px] text-muted-foreground">Match rate</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      </div>
    </div>
  )
}
