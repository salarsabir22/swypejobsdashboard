import { requireAdmin } from "@/lib/admin/access"
import { loadAdminSnapshot } from "@/lib/admin/metrics"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function AdminAlertsPage() {
  const admin = await requireAdmin()
  const snap = await loadAdminSnapshot(admin.staffRole)
  const supabase = await createClient()
  const { data: rules } = await supabase.from("automation_rules").select("*")

  const alerts = [
    snap.kpis.slaBreaches ? `${snap.kpis.slaBreaches} safety reports older than 24h` : null,
    snap.kpis.pendingEmployers ? `${snap.kpis.pendingEmployers} employers waiting` : null,
    snap.matching.coldStartUsers > 50 ? `${snap.matching.coldStartUsers} users never swiped (possible bot or drop-off)` : null,
    snap.kpis.dau === 0 ? "DAU is zero — traffic drop" : null,
  ].filter(Boolean)

  return (
    <AdminFrame
      title="Alerts and automation"
      description="Fraud surges, downtime, failed jobs, and auto-suspend rules. Slack/email digest is a webhook on automation_rules."
      staffRole={admin.staffRole}
    >
      <DashboardPanel title="Right now">
        {alerts.length ? (
          <ul className="list-disc space-y-1 pl-5 text-[14px]">
            {alerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">No active alerts on this snapshot.</p>
        )}
      </DashboardPanel>
      <DashboardPanel title="Auto-rules">
        {(rules || []).length ? (
          <ul className="space-y-2 text-[14px]">
            {rules!.map((r) => (
              <li key={r.id}>
                {r.name}: {r.trigger} → {r.action} ({r.is_active ? "on" : "off"})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">
            Example: insert a rule named “3 confirmed scam reports → suspend employer”. The safety queue already
            counts repeat reports; wire the action in a cron before it auto-fires.
          </p>
        )}
      </DashboardPanel>
    </AdminFrame>
  )
}
