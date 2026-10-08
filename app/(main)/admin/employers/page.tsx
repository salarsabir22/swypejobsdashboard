import { requireAdmin } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { employerRisk } from "@/lib/admin/flags"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { EmployerDecision } from "@/components/admin/AdminActions"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Badge } from "@/components/ui/badge"

export default async function AdminEmployersPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const { data: recruiters } = await supabase
    .from("recruiter_profiles")
    .select("id, company_name, website_url, description, is_approved, created_at, industry, employee_count, profiles(full_name, created_at)")
    .order("created_at", { ascending: false })
    .limit(80)

  const { data: reports } = await supabase.from("reports").select("reported_id")
  const reportCounts = new Map<string, number>()
  for (const r of reports || []) {
    reportCounts.set(r.reported_id, (reportCounts.get(r.reported_id) || 0) + 1)
  }

  const { data: jobs } = await supabase.from("jobs").select("recruiter_id, is_active")
  const { data: matches } = await supabase.from("matches").select("recruiter_id, pipeline_status, created_at")

  return (
    <AdminFrame
      title="Employer management"
      description="Approve, reject, suspend, and score risk. Reason codes are stored on every decision for appeals."
      staffRole={admin.staffRole}
    >
      <div className="space-y-4">
        {(recruiters || []).map((row) => {
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
            <DashboardPanel
              key={row.id}
              title={row.company_name}
              description={profile?.full_name || "Recruiter"}
              badge={row.is_approved ? "Approved" : "Pending"}
            >
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
            </DashboardPanel>
          )
        })}
      </div>
      <DashboardPanel title="Tiers, seats, and ghosting">
        <p className="text-[14px] text-muted-foreground">
          Plans live in employer_billing (free / paid / enterprise). Multiple recruiters per company need a company_id
          on recruiter_profiles — not wired yet. Ghosting rate is interviews with no message in 7 days once chat timestamps
          are joined here.
        </p>
      </DashboardPanel>
    </AdminFrame>
  )
}
