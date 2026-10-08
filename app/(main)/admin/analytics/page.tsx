import { requireAdmin } from "@/lib/admin/access"
import { loadAdminSnapshot } from "@/lib/admin/metrics"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { ExportCsvButton } from "@/components/campus/CampusActions"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function AdminAnalyticsPage() {
  const admin = await requireAdmin()
  const snap = await loadAdminSnapshot(admin.staffRole)
  const rows = [
    { metric: "DAU", value: snap.kpis.dau },
    { metric: "WAU", value: snap.kpis.wau },
    { metric: "MAU", value: snap.kpis.mau },
    { metric: "Swipes", value: snap.matching.swipes },
    { metric: "Right ratio", value: snap.matching.rightRatio },
  ]

  return (
    <AdminFrame
      title="Data, analytics, and reporting"
      description="Saved snapshots from live activity. Warehouse connectors (Looker / Metabase / Tableau) read replicas — not configured in-app."
      staffRole={admin.staffRole}
    >
      <DashboardPanel title="Export current snapshot">
        <ExportCsvButton filename="platform-snapshot.csv" rows={rows} />
      </DashboardPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList title="Swipe-driven industry demand" description="From right-swipes in the last dataset." rows={snap.traffic.geos} />
        <BreakdownList title="University mix" rows={snap.traffic.universities} />
      </div>
      <DashboardPanel title="Scheduled exports & BI">
        <p className="text-[14px] text-muted-foreground">
          Hook CSV/PDF to email or Slack with a cron hitting this snapshot. Cross-university benchmarks stay anonymized
          through the campus console. Raw event query needs platform_events — until then swipe rows are the event log.
        </p>
      </DashboardPanel>
    </AdminFrame>
  )
}
