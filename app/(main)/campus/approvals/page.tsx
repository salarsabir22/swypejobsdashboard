import { ClipboardCheck } from "lucide-react"
import { loadCampusPage } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { createClient } from "@/lib/supabase/server"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { JobReviewButtons } from "@/components/campus/CampusActions"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { StatusBadge } from "@/components/ui/status-badge"

export default async function CampusApprovalsPage({ searchParams }: { searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }> }) {
  const { snapshot, params } = await loadCampusPage(searchParams, "view_actions")
  const university = snapshot.access.university
  const supabase = await createClient()
  const { data: reviews, error } = await supabase
    .from("campus_job_reviews")
    .select("job_id, university, status, reason, jobs(title, job_type, location, recruiter_profiles(company_name))")
    .order("created_at", { ascending: false })
    .limit(80)
  const rows = (reviews || []).filter((row) => !university || row.university === university)

  return (
    <CampusFrame snapshot={snapshot} showRange={false} title="Approvals" description="Verify employer-facing listings and internships. Individual and bulk review: approve or hold. Job approval is optional in the IoBM source — a hold only affects this campus.">
      <DashboardPanel title="Queue">
        {error ? (
          <DashboardEmptyState
            icon={ClipboardCheck}
            title="Approvals aren’t available yet"
            description="Once this campus workspace is live, new employer listings that need a decision will land here."
          />
        ) : !rows.length ? (
          <DashboardEmptyState
            icon={ClipboardCheck}
            title="No jobs waiting"
            description="When an employer posts a role for this campus, you’ll approve or hold it from this queue."
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs
              const company =
                job && !Array.isArray(job.recruiter_profiles)
                  ? job.recruiter_profiles
                  : Array.isArray(job?.recruiter_profiles)
                    ? job?.recruiter_profiles[0]
                    : null
              return (
                <li
                  key={`${row.job_id}-${row.university}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/40 px-4 py-3"
                >
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">{job?.title || row.job_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {[company?.company_name, row.university].filter(Boolean).join(" · ")}
                    </p>
                    <StatusBadge value={row.status} />
                  </div>
                  {university && canCampus(snapshot.access, "mutate") ? (
                    <JobReviewButtons jobId={row.job_id} university={university} />
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
