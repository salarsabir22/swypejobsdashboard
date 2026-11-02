import { requireAdminModule } from "@/lib/admin/access"
import { loadAdminSnapshot } from "@/lib/admin/metrics"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { ExportCsvButton } from "@/components/campus/CampusActions"
import { ReportExportPanel } from "@/components/admin/ExportButton"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function AdminAnalyticsPage() {
  const admin = await requireAdminModule("analytics")
  const snap = await loadAdminSnapshot(admin.staffRole)
  const generatedAt = new Date().toISOString()
  const rows = [
    { metric: "generated_at", value: generatedAt },
    { metric: "DAU", value: snap.kpis.dau },
    { metric: "WAU", value: snap.kpis.wau },
    { metric: "MAU", value: snap.kpis.mau },
    { metric: "pending_employers", value: snap.kpis.pendingEmployers },
    { metric: "sla_breaches", value: snap.kpis.slaBreaches },
    { metric: "swipes", value: snap.matching.swipes },
    { metric: "right_ratio", value: snap.matching.rightRatio },
    { metric: "interview_rate", value: snap.matching.interviewRate },
    { metric: "cold_start_users", value: snap.matching.coldStartUsers },
  ]
  const geoRows = (snap.traffic.geos || []).map((r) => ({ segment: "geo", label: r.label, value: r.value }))
  const uniRows = (snap.traffic.universities || []).map((r) => ({
    segment: "university",
    label: r.label,
    value: r.value,
  }))

  return (
    <AdminFrame
      title="Data, analytics, and reporting"
      description="Live snapshot exports for ops. Warehouse connectors (Looker / Metabase / Tableau) read replicas — not configured in-app."
      staffRole={admin.staffRole}
      mode="observability"
    >
      <DashboardPanel
        title="Reports"
        description="Monthly, quarterly, or annual CSVs of employers, job postings, students, applications, and placements for NBEAC / HEC / internal audits."
      >
        <ReportExportPanel />
      </DashboardPanel>
      <DashboardPanel title="Export current snapshot">
        <div className="flex flex-wrap gap-2">
          <ExportCsvButton filename={`platform-snapshot-${generatedAt.slice(0, 10)}.csv`} rows={rows} />
          <ExportCsvButton filename={`platform-geos-${generatedAt.slice(0, 10)}.csv`} rows={geoRows} />
          <ExportCsvButton filename={`platform-universities-${generatedAt.slice(0, 10)}.csv`} rows={uniRows} />
        </div>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Includes generated_at plus queue KPIs. Schedule via cron emailing these CSVs — not an in-app scheduler yet.
        </p>
      </DashboardPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList
          title="Swipe-driven industry demand"
          description="From right-swipes in the last dataset."
          rows={snap.traffic.geos}
        />
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
