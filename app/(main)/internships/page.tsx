import Link from "next/link"
import { redirect } from "next/navigation"
import { GraduationCap } from "lucide-react"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { InternshipRecordForm } from "@/components/portal/InternshipRecordForm"
import { Button } from "@/components/ui/button"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { jobVisibleOnCampus } from "@/lib/jobs/curation"
import { StatusBadge } from "@/components/ui/status-badge"

export default async function InternshipsPage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/internships")

  const { data: student } = await supabase.from("student_profiles").select("university").eq("id", user.id).maybeSingle()
  const university = student?.university || null
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, location, is_remote, application_deadline, distribution_scope, target_universities, recruiter_id, recruiter_profiles(company_name, is_approved)")
    .eq("is_active", true)
    .eq("job_type", "internship")
    .order("created_at", { ascending: false })
    .limit(40)
  const { data: reviews } = await supabase.from("campus_job_reviews").select("job_id, university, status")
  const reviewMap = new Map(
    (reviews || [])
      .filter((row) => row.job_id && row.university)
      .map((row) => [`${row.job_id}:${String(row.university).trim().toLowerCase()}`, row.status as string])
  )

  const openInternships = (jobs || []).filter((job) => {
    const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
    if (company && "is_approved" in company && company.is_approved === false) return false
    return jobVisibleOnCampus(job, university, reviewMap)
  })

  const { data: records, error } = await supabase
    .from("experiential_records")
    .select("id, employer_name, role_title, start_date, end_date, status, kind")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <DashboardPageHeader
        eyebrow="Campus"
        title="Internships"
        description={
          university
            ? `Internship listings visible to ${university}, plus roles you log for career-office verification.`
            : "Apply through Discover. After you accept an offer, log the experience so your career office can verify it."
        }
        action={
          <Button asChild>
            <Link href="/discover">Find internships</Link>
          </Button>
        }
      />

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Open internships</h2>
        {!openInternships.length ? (
          <DashboardEmptyState
            icon={GraduationCap}
            title="No live internships"
            description="When employers post internship roles, they appear here and in Discover."
            primaryAction={{ href: "/discover", label: "Open Discover" }}
          />
        ) : (
          <ul className="space-y-2">
            {openInternships.map((job) => {
              const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
              return (
                <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {[company?.company_name, job.is_remote ? "Remote" : job.location].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/jobs/${job.id}`}>View</Link>
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Your experience records</h2>
        {error ? (
          <DashboardEmptyState
            icon={GraduationCap}
            title="Records aren’t available yet"
            description="You can still apply to internships. Logging verified experience will unlock once your campus workspace is ready."
          />
        ) : records?.length ? (
          <ul className="space-y-2">
            {records.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                <div>
                  <p className="font-medium">
                    {row.role_title} · {row.employer_name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge value={row.kind} />
                  <StatusBadge value={row.status} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No experience logged yet. Add one below after you start a role.</p>
        )}
        {!error ? <InternshipRecordForm /> : null}
      </section>
    </div>
  )
}
