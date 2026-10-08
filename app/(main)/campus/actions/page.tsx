import { campusPageData } from "@/lib/campus/page-data"
import { createClient } from "@/lib/supabase/server"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { EventForm, JobReviewButtons, NudgeForm } from "@/components/campus/CampusActions"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function CampusActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; segment?: string }>
}) {
  const { campus, segment } = await searchParams
  const snapshot = await campusPageData(campus)
  const university = snapshot.access.university || snapshot.attention[0]?.university || "Campus"

  const seniors = snapshot.attention.filter((s) => s.reason.includes("Senior"))
  const quiet = snapshot.attention.filter((s) => s.reason.includes("Quiet"))
  const zero = snapshot.engagement.zeroActivity
  const list = segment === "quiet" ? quiet : segment === "zero" ? zero : segment === "seniors" ? seniors : snapshot.attention

  const supabase = await createClient()
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, location, job_type, is_active, recruiter_profiles(company_name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(12)
  const jobRows = (jobs || []) as {
    id: string
    title: string
    location: string | null
    job_type: string | null
    recruiter_profiles?: { company_name?: string } | { company_name?: string }[] | null
  }[]

  const demandEmployers = snapshot.market.supplyGaps
    .filter((g) => g.gap > 0)
    .slice(0, 8)

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Action tools"
      description="Alerts, nudges, job moderation, events, and employer outreach — what the office can do, not just see."
    >
      <DashboardPanel title="Students needing attention" description="Seniors with no applications, quiet accounts, zero activity.">
        <ul className="mb-4 max-h-64 space-y-2 overflow-auto text-[14px]">
          {list.length ? (
            list.map((row) => (
              <li key={row.id}>
                {row.name}
                <span className="text-muted-foreground"> · {row.reason}</span>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground">No one in this segment right now.</li>
          )}
        </ul>
        <NudgeForm university={university} students={list} defaultTitle="Your career office wants you back on swypejobs" />
      </DashboardPanel>

      <DashboardPanel title="Employer outreach from demand gaps">
        {demandEmployers.length ? (
          <ul className="space-y-2 text-[14px]">
            {demandEmployers.map((g) => (
              <li key={g.major}>
                {g.major}: {g.students} students vs {g.jobs} jobs (gap {g.gap})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">No major is oversupplied relative to posted jobs in this snapshot.</p>
        )}
      </DashboardPanel>

      <DashboardPanel title="Job posting moderation">
        <ul className="space-y-3">
          {jobRows.map((job) => {
            const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
            return (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/40 px-4 py-3">
                <div>
                  <p className="text-[14px] font-medium">{job.title}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {company?.company_name} · {job.job_type} · {job.location || "Location tbd"}
                  </p>
                </div>
                <JobReviewButtons jobId={job.id} university={university} />
              </li>
            )
          })}
        </ul>
      </DashboardPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="Create and promote an event">
          <EventForm university={university} />
        </DashboardPanel>
        <DashboardPanel title="Alumni and mentorship">
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            Mentorship matching uses employed alumni from first-destination outcomes (status = employed) who opted into
            being contacted. Import that cohort, then pair seniors in the same major. No cold outreach to graduates
            without consent.
          </p>
        </DashboardPanel>
      </div>
    </CampusFrame>
  )
}
