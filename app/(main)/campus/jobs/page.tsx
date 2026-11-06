import Link from "next/link"
import { Briefcase } from "lucide-react"
import { loadCampusPage } from "@/lib/campus/page-data"
import { createClient } from "@/lib/supabase/server"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { StatusBadge } from "@/components/ui/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

const STAGES = ["chatting", "interview", "offer", "hired"] as const

export default async function CampusJobsPage({ searchParams }: { searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }> }) {
  const { snapshot, params } = await loadCampusPage(searchParams, "view_actions")
  const university = snapshot.access.university
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, job_type, is_active, created_at, location, recruiter_profiles(company_name)")
    .order("created_at", { ascending: false })
    .limit(80)
  const { data: reviews } = await supabase.from("campus_job_reviews").select("job_id, university, status")
  const { data: matches } = await supabase.from("matches").select("job_id, pipeline_status, is_shortlisted").limit(800)

  const reviewMap = new Map(
    (reviews || [])
      .filter((row) => !university || row.university === university)
      .map((row) => [row.job_id, row.status as string])
  )
  const byJob = new Map<string, { applied: number; shortlisted: number; interview: number; hired: number }>()
  for (const match of matches || []) {
    const bucket = byJob.get(match.job_id) || { applied: 0, shortlisted: 0, interview: 0, hired: 0 }
    bucket.applied += 1
    if (match.is_shortlisted) bucket.shortlisted += 1
    if (match.pipeline_status === "interview" || match.pipeline_status === "offer") bucket.interview += 1
    if (match.pipeline_status === "hired") bucket.hired += 1
    byJob.set(match.job_id, bucket)
  }

  const rows = (jobs || []).map((job) => {
    const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
    const listing = job.is_active ? "active" : "archived"
    const pipeline = byJob.get(job.id) || { applied: 0, shortlisted: 0, interview: 0, hired: 0 }
    return {
      id: job.id,
      title: job.title,
      company: company?.company_name || "Employer",
      type: job.job_type || "role",
      listing,
      review: reviewMap.get(job.id) || "unreviewed",
      ...pipeline,
    }
  })

  const stageCounts = STAGES.map((stage) => ({
    label: stage === "chatting" ? "Applied" : stage === "offer" ? "Interview+" : stage[0].toUpperCase() + stage.slice(1),
    value: (matches || []).filter((m) =>
      stage === "chatting"
        ? !m.pipeline_status || m.pipeline_status === "chatting"
        : stage === "interview"
          ? m.pipeline_status === "interview" || m.pipeline_status === "offer"
          : m.pipeline_status === stage
    ).length,
  }))

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Jobs & applications"
      description="Active, expired, and archived jobs and internships. Hiring stages: Applied, Shortlisted, Interview, Hired."
    >
      <DashboardPanel title="Hiring stages this cycle" description="Campus-visible matches on the platform pipeline.">
        <div className="flex flex-wrap gap-3 text-sm">
          {stageCounts.map((row) => (
            <span key={row.label} className="rounded-full bg-secondary px-3 py-1.5">
              {row.label} · {row.value}
            </span>
          ))}
          <span className="rounded-full bg-secondary px-3 py-1.5">Shortlisted · {(matches || []).filter((m) => m.is_shortlisted).length}</span>
        </div>
      </DashboardPanel>
      <DashboardPanel title="Listings">
        <div className="mb-4">
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href="/campus/approvals">Moderation</Link>
          </Button>
        </div>
        {!rows.length ? (
          <DashboardEmptyState
            icon={Briefcase}
            title="No jobs yet"
            description="When employers post roles for this campus, they appear here with application counts."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Shortlisted</TableHead>
                <TableHead>Interview</TableHead>
                <TableHead>Hired</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} id={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.title}</p>
                    <p className="text-muted-foreground">
                      {row.company} · {row.type}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge value={row.listing} />
                      <StatusBadge value={row.review} />
                    </div>
                  </TableCell>
                  <TableCell>{row.applied}</TableCell>
                  <TableCell>{row.shortlisted}</TableCell>
                  <TableCell>{row.interview}</TableCell>
                  <TableCell>{row.hired}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
