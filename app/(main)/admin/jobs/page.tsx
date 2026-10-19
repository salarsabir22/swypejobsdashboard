import { requireAdminModule } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { jobFlags, jobQualityScore } from "@/lib/admin/flags"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { BulkJobActions } from "@/components/admin/BulkJobActions"
import { JobModerationPanel } from "@/components/admin/JobModerationPanel"
import { AdminFilterTabs, AdminPagination } from "@/components/admin/AdminPagination"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Badge } from "@/components/ui/badge"
import { inLastDays } from "@/lib/campus/helpers"

const PAGE_SIZE = 10

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; status?: string }>
}) {
  const admin = await requireAdminModule("jobs")
  const supabase = await createClient()
  const params = (await searchParams) || {}
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1)
  const status = params.status === "live" || params.status === "off" ? params.status : "all"
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("jobs")
    .select(
      "id, title, description, location, is_active, job_type, salary_min, salary_max, required_skills, created_at, recruiter_id, recruiter_profiles(company_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  if (status === "live") query = query.eq("is_active", true)
  if (status === "off") query = query.eq("is_active", false)

  let jobsQuery = await query
  if (jobsQuery.error) {
    let fallback = supabase
      .from("jobs")
      .select(
        "id, title, description, location, is_active, job_type, required_skills, created_at, recruiter_id, recruiter_profiles(company_name)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to)
    if (status === "live") fallback = fallback.eq("is_active", true)
    if (status === "off") fallback = fallback.eq("is_active", false)
    jobsQuery = (await fallback) as typeof jobsQuery
  }

  const jobs = (jobsQuery.data || []) as Array<{
    id: string
    title: string
    description: string | null
    location: string | null
    is_active: boolean
    job_type: string | null
    salary_min?: number | null
    salary_max?: number | null
    required_skills?: string[] | null
    created_at: string
    recruiter_id: string
    recruiter_profiles: { company_name: string | null } | { company_name: string | null }[] | null
  }>
  const total = jobsQuery.count || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const titles = new Map<string, number>()
  for (const job of jobs) {
    const key = `${job.recruiter_id}:${(job.title || "").trim().toLowerCase()}`
    titles.set(key, (titles.get(key) || 0) + 1)
  }

  const hrefFor = (nextPage: number, nextStatus = status) => {
    const q = new URLSearchParams()
    if (nextStatus !== "all") q.set("status", nextStatus)
    if (nextPage > 1) q.set("page", String(nextPage))
    const qs = q.toString()
    return qs ? `/admin/jobs?${qs}` : "/admin/jobs"
  }

  return (
    <AdminFrame
      title="Job posting moderation"
      description="Queue for new and edited posts. Auto-flags cover scam language, discrimination, missing pay, duplicates, and stale listings."
      staffRole={admin.staffRole}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminFilterTabs
          current={status}
          tabs={[
            { value: "all", label: "All" },
            { value: "live", label: "Live" },
            { value: "off", label: "Offline" },
          ]}
          hrefFor={(value) => hrefFor(1, value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] text-muted-foreground">
            {total} listing{total === 1 ? "" : "s"}
          </p>
          {status === "off" ? (
            <BulkJobActions mode="approve" jobIds={jobs.filter((j) => !j.is_active).map((j) => j.id)} />
          ) : null}
          {status === "live" ? (
            <BulkJobActions mode="offline" jobIds={jobs.filter((j) => j.is_active).map((j) => j.id)} />
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {jobs.length === 0 ? (
          <DashboardPanel title="No jobs on this page">
            <p className="text-[14px] text-muted-foreground">Try another filter or page.</p>
          </DashboardPanel>
        ) : (
          jobs.map((job) => {
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
              <DashboardPanel
                key={job.id}
                title={job.title}
                description={company?.company_name || "Employer"}
                badge={job.is_active ? "Live" : "Off"}
              >
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
                <JobModerationPanel jobId={job.id} flags={flags} isActive={Boolean(job.is_active)} />
              </DashboardPanel>
            )
          })
        )}
      </div>

      <AdminPagination page={page} totalPages={totalPages} hrefFor={(p) => hrefFor(p)} />
    </AdminFrame>
  )
}
