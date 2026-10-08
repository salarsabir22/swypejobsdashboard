import { requireAdmin } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { UserModerationButtons } from "@/components/admin/AdminActions"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ReportStatusButton } from "../reports/ReportStatusButton"
import { inLastDays } from "@/lib/campus/helpers"

export default async function AdminSafetyPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const { data: reports } = await supabase
    .from("reports")
    .select("id, reason, details, status, created_at, reporter_id, reported_id")
    .order("created_at", { ascending: false })
    .limit(100)
  const rows = reports || []
  const ids = [...new Set(rows.flatMap((r) => [r.reporter_id, r.reported_id]))]
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, role").in("id", ids)
    : { data: [] }
  const byId = new Map((profiles || []).map((p) => [p.id, p]))
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.reported_id, (counts.get(r.reported_id) || 0) + 1)
  const spike = rows.filter((r) => inLastDays(r.created_at, 1)).length

  return (
    <AdminFrame
      title="Reports, flags, and safety"
      description="User reports with SLA, repeat offenders, and escalation. Chat phishing scans are heuristic — link-heavy DMs should be reviewed here."
      staffRole={admin.staffRole}
    >
      <DashboardPanel title="Queue" badge={`${spike} in last 24h`}>
        <div className="space-y-3">
          {rows.map((row) => {
            const target = byId.get(row.reported_id)
            const open = !row.status || row.status === "open" || row.status === "pending"
            const sla = open && !inLastDays(row.created_at, 1)
            return (
              <div key={row.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{row.reason}</Badge>
                  <Badge variant={sla ? "destructive" : "outline"}>{sla ? "SLA breach" : row.status || "open"}</Badge>
                  <span className="text-[13px] text-muted-foreground">{formatDate(row.created_at)}</span>
                </div>
                <p className="mt-2 text-[14px]">
                  {target?.full_name || row.reported_id} · {target?.role} · {counts.get(row.reported_id)} reports
                </p>
                {row.details ? <p className="mt-1 text-[13px] text-muted-foreground">{row.details}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <ReportStatusButton id={row.id} nextStatus="reviewed" label="Hide / warn logged" />
                  <ReportStatusButton id={row.id} nextStatus="dismissed" label="Dismiss" />
                  <UserModerationButtons userId={row.reported_id} />
                </div>
              </div>
            )
          })}
          {!rows.length ? <p className="text-[14px] text-muted-foreground">No reports in the inbox.</p> : null}
        </div>
      </DashboardPanel>
      <DashboardPanel title="Legal & law enforcement">
        <p className="text-[14px] text-muted-foreground">
          Log legal requests in incident_log. Escalation: moderator → trust lead → legal. Mass-report spikes and posting
          bursts surface on Home and Alerts.
        </p>
      </DashboardPanel>
    </AdminFrame>
  )
}
