import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"
import { DiscoverStatStrip } from "@/components/discover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/utils"
import { formatSalary } from "@/lib/jobs/salary"
import type { Job, RecruiterProfile } from "@/types"
import { JobToggleButton } from "./JobToggleButton"
import { InterestedCandidatesPanel } from "./InterestedCandidatesPanel"
import { ShareButton } from "@/components/share/ShareButton"

function formatJobType(raw: string) {
  return raw.replace(/_/g, " ")
}

type JobRow = Omit<Job, "recruiter_profiles"> & { recruiter_profiles: RecruiterProfile | null }

export async function RecruiterJobDetail({
  job,
  jobId,
  userId,
}: {
  job: JobRow
  jobId: string
  userId: string
}) {
  const supabase = await createClient()

  const { count: swipeCount } = await supabase
    .from("job_swipes")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("direction", "right")

  const { count: matchCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobId)

  const { data: recruiter } = await supabase
    .from("recruiter_profiles")
    .select("company_name, calendly_url")
    .eq("id", userId)
    .maybeSingle()
  const { data: me } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle()

  const pay = formatSalary({
    min: job.salary_min,
    max: job.salary_max,
    currency: job.salary_currency,
    note: job.compensation_note,
  })
  const metaParts = [formatJobType(job.job_type), job.is_remote ? "Remote" : job.location || null, pay].filter(Boolean)

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="outline" size="icon" className="mt-0.5 h-10 w-10 shrink-0 rounded-full" asChild>
          <Link href="/jobs" aria-label="Back to jobs">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{job.title}</h1>
          <p className="font-body text-sm text-muted-foreground">{metaParts.join(" · ")}</p>
        </div>
        <ShareButton path={`/jobs/${jobId}`} title={job.title} label="Share job" />
        <Button asChild variant="outline" className="rounded-full">
          <Link href={`/jobs/${jobId}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      <DiscoverStatStrip
        columns={2}
        caption="This listing"
        items={[
          { label: "Applications", value: swipeCount || 0 },
          { label: "Matches", value: matchCount || 0 },
        ]}
      />

      <InterestedCandidatesPanel
        recruiterId={userId}
        jobId={jobId}
        jobTitle={job.title}
        screeningQuestions={job.screening_questions}
        recruiterName={me?.full_name || "A recruiter"}
        companyName={recruiter?.company_name || "their company"}
        calendlyUrl={recruiter?.calendly_url}
      />

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0 pb-4">
          {job.is_active ? (
            <Badge variant="success" className="font-normal">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              Paused
            </Badge>
          )}
          <Badge variant="secondary" className="font-normal capitalize">
            {formatJobType(job.job_type)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {job.description ? (
            <div>
              <h2 className="mb-2 font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </h2>
              <p className="whitespace-pre-line font-body text-sm leading-relaxed text-foreground">{job.description}</p>
            </div>
          ) : null}

          {job.required_skills && job.required_skills.length > 0 ? (
            <div>
              <h2 className="mb-2 font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Required skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.required_skills.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          {job.nice_to_have_skills && job.nice_to_have_skills.length > 0 ? (
            <div>
              <h2 className="mb-2 font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nice to have
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.nice_to_have_skills.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          <Separator />

          <p className="font-body text-xs text-muted-foreground">Posted {formatDate(job.created_at)}</p>
        </CardContent>
      </Card>

      <JobToggleButton jobId={job.id} isActive={job.is_active} />
    </div>
  )
}
