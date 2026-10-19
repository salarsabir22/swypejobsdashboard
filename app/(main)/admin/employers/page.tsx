import Link from "next/link"
import { requireAdminModule } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { employerRisk } from "@/lib/admin/flags"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { BulkEmployerApprove } from "@/components/admin/BulkEmployerApprove"
import { EmployerDecision } from "@/components/admin/EmployerDecision"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const PAGE_SIZE = 8
const RECRUITER_FIELDS =
  "id, company_name, website_url, description, is_approved, created_at, industry, employee_count, profiles(full_name, created_at)"

type RecruiterRow = {
  id: string
  company_id?: string | null
  company_name: string
  website_url: string | null
  description: string | null
  is_approved: boolean
  created_at: string
  industry: string | null
  employee_count: string | null
  profiles: { full_name: string | null; created_at?: string } | { full_name: string | null; created_at?: string }[] | null
  companies?: { name: string } | { name: string }[] | null
}

export default async function AdminEmployersPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; status?: string }>
}) {
  const admin = await requireAdminModule("employers")
  const supabase = await createClient()
  const params = (await searchParams) || {}
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1)
  const status = params.status === "pending" || params.status === "approved" ? params.status : "all"
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("recruiter_profiles")
    .select(`${RECRUITER_FIELDS}, company_id, companies(name)`, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (status === "pending") query = query.eq("is_approved", false)
  if (status === "approved") query = query.eq("is_approved", true)

  let recruitersResult = await query
  if (recruitersResult.error) {
    let fallback = supabase
      .from("recruiter_profiles")
      .select(RECRUITER_FIELDS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)
    if (status === "pending") fallback = fallback.eq("is_approved", false)
    if (status === "approved") fallback = fallback.eq("is_approved", true)
    recruitersResult = (await fallback) as typeof recruitersResult
  }

  const recruiters = (recruitersResult.data || []) as RecruiterRow[]
  const total = recruitersResult.count || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const recruiterIds = recruiters.map((row) => row.id)
  const [reportsRes, jobsRes, matchesRes, reviewsRes] = await Promise.all([
    recruiterIds.length
      ? supabase.from("reports").select("reported_id").in("reported_id", recruiterIds)
      : Promise.resolve({ data: [] as { reported_id: string }[] }),
    recruiterIds.length
      ? supabase.from("jobs").select("recruiter_id, is_active").in("recruiter_id", recruiterIds)
      : Promise.resolve({ data: [] as { recruiter_id: string; is_active: boolean }[] }),
    recruiterIds.length
      ? supabase.from("matches").select("recruiter_id, pipeline_status").in("recruiter_id", recruiterIds)
      : Promise.resolve({ data: [] as { recruiter_id: string; pipeline_status: string | null }[] }),
    recruiterIds.length
      ? supabase
          .from("employer_reviews")
          .select("recruiter_id, action, created_at")
          .in("recruiter_id", recruiterIds)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] as { recruiter_id: string; action: string; created_at: string }[] }),
  ])

  const reportCounts = new Map<string, number>()
  for (const r of reportsRes.data || []) {
    reportCounts.set(r.reported_id, (reportCounts.get(r.reported_id) || 0) + 1)
  }

  const jobs = jobsRes.data || []
  const matches = matchesRes.data || []
  const lastActionById = new Map<string, string>()
  for (const review of reviewsRes.data || []) {
    if (!lastActionById.has(review.recruiter_id)) lastActionById.set(review.recruiter_id, review.action)
  }
  const pendingCount = recruiters.filter((row) => !row.is_approved && !lastActionById.get(row.id)).length

  const hrefFor = (nextPage: number, nextStatus = status) => {
    const q = new URLSearchParams()
    if (nextStatus !== "all") q.set("status", nextStatus)
    if (nextPage > 1) q.set("page", String(nextPage))
    const qs = q.toString()
    return qs ? `/admin/employers?${qs}` : "/admin/employers"
  }

  return (
    <AdminFrame
      title="Employer management"
      description="Approve, reject, suspend, and score risk. Reason codes are stored on every decision for appeals."
      staffRole={admin.staffRole}
    >
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "All"],
            ["pending", "Pending"],
            ["approved", "Approved"],
          ] as const
        ).map(([value, label]) => (
          <Button key={value} asChild size="sm" variant={status === value ? "default" : "outline"} className="rounded-full">
            <Link href={hrefFor(1, value)}>{label}</Link>
          </Button>
        ))}
        <p className="ml-auto text-[13px] text-muted-foreground">
          {total} employer{total === 1 ? "" : "s"}
          {status === "all" ? ` · ${pendingCount} pending on this page` : null}
        </p>
        <BulkEmployerApprove pendingIds={recruiters.filter((row) => !row.is_approved).map((row) => row.id)} />
      </div>

      <div className="space-y-4">
        {recruiters.length === 0 ? (
          <DashboardPanel title="No employers on this page">
            <p className="text-[14px] text-muted-foreground">
              {status === "pending" ? "Nothing left to review." : "Try another filter or page."}
            </p>
          </DashboardPanel>
        ) : (
          recruiters.map((row) => {
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
            const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
            const risk = employerRisk({
              website: row.website_url,
              description: row.description,
              createdAt: row.created_at,
              reportCount: reportCounts.get(row.id) || 0,
            })
            const posted = jobs.filter((j) => j.recruiter_id === row.id).length
            const hires = matches.filter((m) => m.recruiter_id === row.id && m.pipeline_status === "hired").length
            return (
              <DashboardPanel
                key={row.id}
                title={company?.name || row.company_name || "Employer"}
                description={profile?.full_name || "Recruiter account"}
                badge={
                  row.is_approved
                    ? "Approved"
                    : lastActionById.get(row.id) === "reject"
                      ? "Rejected"
                      : lastActionById.get(row.id) === "suspend"
                        ? "Suspended"
                        : "Pending"
                }
              >
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge variant={row.is_approved ? "secondary" : "outline"}>
                    {row.is_approved
                      ? "Approved"
                      : lastActionById.get(row.id) === "reject"
                        ? "Rejected"
                        : lastActionById.get(row.id) === "suspend"
                          ? "Suspended"
                          : "Pending review"}
                  </Badge>
                  <Badge variant="secondary">Risk {risk.score}</Badge>
                  {risk.reasons.map((r) => (
                    <Badge key={r} variant="outline">
                      {r}
                    </Badge>
                  ))}
                  <Badge variant="outline">{posted} jobs</Badge>
                  <Badge variant="outline">{hires} hires</Badge>
                  <Badge variant="outline">{row.industry || "No industry"}</Badge>
                </div>
                <p className="mb-4 text-[13px] text-muted-foreground">
                  {row.website_url || "No website"} · {row.employee_count || "size unknown"}
                </p>
                <EmployerDecision
                  recruiterId={row.id}
                  isApproved={row.is_approved}
                  lastAction={lastActionById.get(row.id)}
                />
              </DashboardPanel>
            )
          })
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <p className="text-[13px] text-muted-foreground">
          Page {safePage} of {totalPages}
        </p>
        <div className="flex flex-wrap gap-2">
          {safePage <= 1 ? (
            <Button size="sm" variant="outline" className="rounded-full" disabled>
              Previous
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={hrefFor(safePage - 1)}>Previous</Link>
            </Button>
          )}
          {safePage >= totalPages ? (
            <Button size="sm" variant="outline" className="rounded-full" disabled>
              Next
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={hrefFor(safePage + 1)}>Next</Link>
            </Button>
          )}
        </div>
      </div>

      <DashboardPanel title="Tiers, seats, and ghosting">
        <p className="text-[14px] text-muted-foreground">
          Plans live in employer_billing (free / paid / enterprise). A company owner adds recruiters from the company
          page. Each recruiter posts jobs and reviews applications in their own portal.
        </p>
      </DashboardPanel>
    </AdminFrame>
  )
}
