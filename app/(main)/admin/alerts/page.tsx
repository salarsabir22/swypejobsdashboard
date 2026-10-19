import { requireAdminModule } from "@/lib/admin/access"
import { loadAdminSnapshot } from "@/lib/admin/metrics"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { AlertMuteBar, RuleCreateForm, RuleToggle } from "@/components/admin/AlertControls"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function AdminAlertsPage() {
  const admin = await requireAdminModule("alerts")
  const snap = await loadAdminSnapshot(admin.staffRole)
  const supabase = await createClient()
  const { data: rules } = await supabase.from("automation_rules").select("*")

  const alerts = [
    snap.kpis.slaBreaches ? `${snap.kpis.slaBreaches} safety reports older than 24h` : null,
    snap.kpis.pendingEmployers ? `${snap.kpis.pendingEmployers} employers waiting` : null,
    snap.matching.coldStartUsers > 50
      ? `${snap.matching.coldStartUsers} users never swiped (possible bot or drop-off)`
      : null,
    snap.kpis.dau === 0 ? "DAU is zero — traffic drop" : null,
  ].filter(Boolean) as string[]

  return (
    <AdminFrame
      title="Alerts and automation"
      description="Acknowledge or mute alerts, and create/edit automation rules. Cron still has to execute the actions."
      staffRole={admin.staffRole}
      mode="settings"
    >
      <DashboardPanel title="Right now">
        <AlertMuteBar alerts={alerts} />
      </DashboardPanel>
      <DashboardPanel title="Add rule">
        <RuleCreateForm />
      </DashboardPanel>
      <DashboardPanel title="Auto-rules">
        {(rules || []).length ? (
          <ul className="space-y-2">
            {rules!.map((r) => (
              <RuleToggle
                key={r.id}
                ruleId={r.id}
                name={r.name}
                trigger={r.trigger}
                action={r.action}
                initialActive={Boolean(r.is_active)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">No rules yet. Add one above (e.g. 3 scam reports → suspend employer).</p>
        )}
      </DashboardPanel>
    </AdminFrame>
  )
}
