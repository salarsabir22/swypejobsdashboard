import { requireAdmin } from "@/lib/admin/access"
import { loadAdminSnapshot } from "@/lib/admin/metrics"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { DashboardFunnel } from "@/components/dashboard/DashboardFunnel"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtNum, fmtPct } from "@/lib/campus/format"
import { Activity, AlertTriangle, Briefcase, Building2, HeartPulse, UserPlus, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdminHomePage() {
  const admin = await requireAdmin()
  const snap = await loadAdminSnapshot(admin.staffRole)

  return (
    <AdminFrame
      title="Platform control"
      description="Live traffic, queues, and system posture. Activity counts use swipes and account timestamps until a dedicated event pipeline is on."
      staffRole={snap.staffRole}
      missingTables={snap.missingTables}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard icon={Users} label="Live / DAU" value={fmtNum(snap.kpis.dau)} hint={`WAU ${fmtNum(snap.kpis.wau)} · MAU ${fmtNum(snap.kpis.mau)}`} />
        <DashboardKpiCard icon={Building2} label="Pending employer approvals" value={snap.kpis.pendingEmployers} tone="amber" />
        <DashboardKpiCard icon={Briefcase} label="Pending job moderation" value={snap.kpis.pendingJobs} tone="amber" />
        <DashboardKpiCard
          icon={AlertTriangle}
          label="Open reports"
          value={snap.kpis.openReports}
          hint={snap.kpis.slaBreaches ? `${snap.kpis.slaBreaches} older than 24h` : "No SLA breaches"}
          tone={snap.kpis.slaBreaches ? "amber" : "teal"}
        />
        <DashboardKpiCard
          icon={UserPlus}
          label="New signups (7d)"
          value={snap.kpis.newStudents + snap.kpis.newEmployers}
          hint={`${snap.kpis.newStudents} students · ${snap.kpis.newEmployers} employers · ${snap.kpis.newUniversities} universities pending`}
          tone="teal"
        />
        <DashboardKpiCard icon={HeartPulse} label="System health" value={snap.health.ok ? "Up" : "Down"} hint={snap.health.detail} />
        <DashboardKpiCard icon={Activity} label="Revenue snapshot" value={snap.kpis.mrr == null ? "—" : `PKR ${fmtNum(snap.kpis.mrr)}`} hint="MRR from employer_billing when present" />
        <DashboardKpiCard icon={Users} label="Churn proxy (30d quiet students)" value={fmtPct(snap.traffic.churnProxy)} tone="violet" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild className="rounded-full">
          <Link href="/admin/employers">Employer queue</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/admin/jobs">Job queue</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/admin/safety">Safety inbox</Link>
        </Button>
      </div>

      <DashboardFunnel title="Install → application" stages={snap.traffic.funnel} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList title="Peak hours (7d activity)" rows={snap.traffic.peakHours} />
        <BreakdownList title="Universities" rows={snap.traffic.universities} />
        <BreakdownList title="Job geos" rows={snap.traffic.geos} />
        <DashboardPanel title="Retention cohorts">
          <dl className="grid grid-cols-3 gap-3 text-[14px]">
            <div>
              <dt className="text-muted-foreground">D1</dt>
              <dd className="text-[1.6rem] font-semibold tabular-nums">{fmtPct(snap.traffic.retention.d1)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">D7</dt>
              <dd className="text-[1.6rem] font-semibold tabular-nums">{fmtPct(snap.traffic.retention.d7)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">D30</dt>
              <dd className="text-[1.6rem] font-semibold tabular-nums">{fmtPct(snap.traffic.retention.d30)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Returned to swipe {`N`} days after signup. Traffic source / device / app version need client event logging — currently unattributed web.
          </p>
        </DashboardPanel>
      </div>
    </AdminFrame>
  )
}
