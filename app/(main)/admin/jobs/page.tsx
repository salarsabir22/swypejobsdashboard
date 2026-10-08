import { requireAdmin } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { jobFlags, jobQualityScore } from "@/lib/admin/flags"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { JobModerationButtons } from "@/components/admin/AdminActions"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Badge } from "@/components/ui/badge"
import { inLastDays } from "@/lib/campus/helpers"

export default async function AdminJobsPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const jobsQuery = await supabase
    .from("jobs")
    .select("id, title, description, location, is_active, job_type, salary_min, salary_max, required_skills, created_at, recruiter_id, recruiter_profiles(company_name)")
    .order("created_at", { ascending: false })
    .limit(80)
  const jobs = jobsQuery.error
    ? (
        await supabase
          .from("jobs")
          .select("id, title, description, location, is_active, job_type, required_skills, created_at, recruiter_id, recruiter_profiles(company_name)")
          .order("created_at", { ascending: false })
          .limit(80)
      ).data
    : jobsQuery.data

  const titles = new Map<string, number>()
  for (const job of jobs || []) {
    const key = `${job.recruiter_id}:${(job.title || "").trim().toLowerCase()}`
    titles.set(key, (titles.get(key) || 0) + 1)
  }

  return (
    <AdminFrame
      title="Job posting moderation"
      description="Queue for new and edited posts. Auto-flags cover scam language, discrimination, missing pay, duplicates, and stale listings."
      staffRole={admin.staffRole}
    >
      <div className="space-y-4">
        {(jobs || []).map((job) => {
          const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
          const text = `${job.title || ""} ${job.description || ""}`
          const flags = jobFlags(text)
          if (!(job as { salary_min?: number | null }).salary_min && !(job as { salary_max?: number | null }).salary_max) {
            flags.push("missing_salary")
          }
          const key = `${job.recruiter_id}:${(job.title || "").trim().toLowerCase()}`
          if ((titles.get(key) || 0) > 1) flags.push("duplicate")
          if (job.is_active && !inLastDays(job.created_at, 60)) flags.push("stale")
          const quality = jobQualityScore(job)
          return (
            <DashboardPanel key={job.id} title={job.title} description={company?.company_name || "Employer"} badge={job.is_active ? "Live" : "Off"}>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="secondary">Quality {quality}</Badge>
                {flags.map((f) => (
                  <Badge key={f} variant="outline">
                    {f}
                  </Badge>
                ))}
                <Badge variant="outline">{job.job_type}</Badge>
                <Badge variant="outline">{job.location || "No location"}</Badge>
              </div>
              <p className="mb-3 line-clamp-3 text-[13px] text-muted-foreground">{job.description || "No description"}</p>
              <JobModerationButtons jobId={job.id} flags={flags} />
            </DashboardPanel>
          )
        })}
      </div>
    </AdminFrame>
  )
}
