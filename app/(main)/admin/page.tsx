import { requireAdminModule } from "@/lib/admin/access"
import { loadAdminSnapshot } from "@/lib/admin/metrics"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { DashboardFunnel } from "@/components/dashboard/DashboardFunnel"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtNum, fmtPct } from "@/lib/campus/format"
import { Activity, AlertTriangle, Briefcase, Building2, GraduationCap, HeartPulse, UserPlus, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdminHomePage() {
  const admin = await requireAdminModule("home")
  const snap = await loadAdminSnapshot(admin.staffRole)

  const needs = [
    snap.kpis.pendingEmployers
      ? { href: "/admin/employers?status=pending", label: `${snap.kpis.pendingEmployers} employers waiting` }
      : null,
    snap.kpis.pendingJobs
      ? { href: "/admin/jobs?status=off", label: `${snap.kpis.pendingJobs} offline jobs to review` }
      : null,
    snap.kpis.openReports
      ? { href: "/admin/safety?status=open", label: `${snap.kpis.openReports} open safety reports` }
      : null,
    snap.kpis.slaBreaches
      ? { href: "/admin/safety?status=open", label: `${snap.kpis.slaBreaches} SLA breaches (>24h)` }
      : null,
  ].filter(Boolean) as { href: string; label: string }[]

  return (
    <AdminFrame
      title="Platform control"
      description="Live traffic, queues, and system posture. Clear the queues below first — analytics can wait."
      staffRole={snap.staffRole}
      missingTables={snap.missingTables}
    >
      <DashboardPanel title="Needs you now" badge={needs.length ? `${needs.length} open` : "Clear"}>
        {needs.length ? (
          <ul className="space-y-2">
            {needs.map((item) => (
              <li key={item.href + item.label}>
                <Button asChild variant="outline" className="h-auto w-full justify-start rounded-2xl px-4 py-3 text-left">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">No pending employer, job, or safety queues.</p>
        )}
      </DashboardPanel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/employers?status=pending" className="block">
          <DashboardKpiCard
            icon={Building2}
            label="Pending employer approvals"
            value={snap.kpis.pendingEmployers}
            tone="amber"
          />
        </Link>
        <Link href="/admin/jobs?status=off" className="block">
          <DashboardKpiCard icon={Briefcase} label="Offline jobs" value={snap.kpis.pendingJobs} tone="amber" />
        </Link>
        <Link href="/admin/safety?status=open" className="block">
          <DashboardKpiCard
            icon={AlertTriangle}
            label="Open reports"
            value={snap.kpis.openReports}
            hint={snap.kpis.slaBreaches ? `${snap.kpis.slaBreaches} older than 24h` : "No SLA breaches"}
            tone={snap.kpis.slaBreaches ? "amber" : "teal"}
          />
        </Link>
        <Link href="/admin/users" className="block">
          <DashboardKpiCard
            icon={UserPlus}
            label="New signups (7d)"
            value={snap.kpis.newStudents + snap.kpis.newEmployers}
            hint={`${snap.kpis.newStudents} students · ${snap.kpis.newEmployers} employers`}
            tone="teal"
          />
        </Link>
        <Link href="/admin/universities" className="block">
          <DashboardKpiCard
            icon={GraduationCap}
            label="Universities pending"
            value={snap.kpis.newUniversities}
            hint="Campus orgs awaiting onboard"
            tone="amber"
          />
        </Link>
        <DashboardKpiCard icon={Users} label="Live / DAU" value={fmtNum(snap.kpis.dau)} hint={`WAU ${fmtNum(snap.kpis.wau)} · MAU ${fmtNum(snap.kpis.mau)}`} />
        <DashboardKpiCard icon={HeartPulse} label="System health" value={snap.health.ok ? "Up" : "Down"} hint={snap.health.detail} />
        <DashboardKpiCard
          icon={Activity}
          label="Revenue snapshot"
          value={snap.kpis.mrr == null ? "—" : `PKR ${fmtNum(snap.kpis.mrr)}`}
          hint="MRR from employer_billing when present"
        />
        <DashboardKpiCard icon={Users} label="Churn proxy (30d quiet students)" value={fmtPct(snap.traffic.churnProxy)} tone="violet" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild className="rounded-full">
          <Link href="/admin/employers?status=pending">Employer queue</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/admin/jobs?status=off">Job queue</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/admin/safety?status=open">Safety inbox</Link>
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
            Returned to swipe N days after signup. Traffic source / device need client event logging.
          </p>
        </DashboardPanel>
      </div>
    </AdminFrame>
  )
}
