import { requireAdmin } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { employerRisk } from "@/lib/admin/flags"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { EmployerDecision } from "@/components/admin/AdminActions"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Badge } from "@/components/ui/badge"

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

export default async function AdminEmployersPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const linked = await supabase
    .from("recruiter_profiles")
    .select(`${RECRUITER_FIELDS}, company_id, companies(name)`)
    .order("created_at", { ascending: false })
    .limit(80)
  const recruitersResult = linked.error
    ? await supabase.from("recruiter_profiles").select(RECRUITER_FIELDS).order("created_at", { ascending: false }).limit(80)
    : linked
  const recruiters = (recruitersResult.data || []) as RecruiterRow[]

  const { data: reports } = await supabase.from("reports").select("reported_id")
  const reportCounts = new Map<string, number>()
  for (const r of reports || []) {
    reportCounts.set(r.reported_id, (reportCounts.get(r.reported_id) || 0) + 1)
  }

  const { data: jobs } = await supabase.from("jobs").select("recruiter_id, is_active")
  const { data: matches } = await supabase.from("matches").select("recruiter_id, pipeline_status, created_at")

  const groups = new Map<string, { name: string; recruiters: RecruiterRow[] }>()
  for (const row of recruiters) {
    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
    const key = row.company_id || row.id
    const group = groups.get(key) || { name: company?.name || row.company_name, recruiters: [] }
    group.recruiters.push(row)
    groups.set(key, group)
  }

  return (
    <AdminFrame
      title="Employer management"
      description="Approve, reject, suspend, and score risk. Reason codes are stored on every decision for appeals."
      staffRole={admin.staffRole}
    >
      <div className="space-y-4">
        {[...groups.values()].map((group) => (
          <DashboardPanel
            key={group.recruiters.map((row) => row.id).join("-")}
            title={group.name}
            description="Each recruiter has their own jobs, applications, and pipeline."
            badge={group.recruiters.length === 1 ? "1 recruiter" : `${group.recruiters.length} recruiters`}
          >
            <div className="space-y-5">
              {group.recruiters.map((row) => {
                const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
                const risk = employerRisk({
                  website: row.website_url,
                  description: row.description,
                  createdAt: row.created_at,
                  reportCount: reportCounts.get(row.id) || 0,
                })
                const posted = (jobs || []).filter((j) => j.recruiter_id === row.id).length
                const hires = (matches || []).filter((m) => m.recruiter_id === row.id && m.pipeline_status === "hired").length
                return (
                  <div key={row.id} className="border-b border-border pb-5 last:border-b-0 last:pb-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-medium">{profile?.full_name || "Recruiter"}</p>
                      <Badge variant={row.is_approved ? "secondary" : "outline"}>{row.is_approved ? "Approved" : "Pending"}</Badge>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
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
                    <p className="mb-3 text-[13px] text-muted-foreground">{row.website_url || "No website"} · {row.employee_count || "size unknown"}</p>
                    <EmployerDecision recruiterId={row.id} />
                  </div>
                )
              })}
            </div>
          </DashboardPanel>
        ))}
      </div>
      <DashboardPanel title="Tiers, seats, and ghosting">
        <p className="text-[14px] text-muted-foreground">
          Plans live in employer_billing (free / paid / enterprise). A company owner adds recruiters from the company
          page. Each recruiter posts jobs and reviews applications in their own portal. Ghosting rate is interviews
          with no message in 7 days once chat timestamps are joined here.
        </p>
      </DashboardPanel>
    </AdminFrame>
  )
}
