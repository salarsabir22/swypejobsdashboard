import { campusPageData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { SourceBadge } from "@/components/campus/SourceBadge"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardFunnel } from "@/components/dashboard/DashboardFunnel"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtSourced } from "@/lib/campus/format"
import { AlertTriangle, Briefcase, Building2, Flag, GraduationCap, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function CampusHomePage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus)

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Career office"
      description="Placement, engagement, and swipe-level demand for your students. Headline numbers mix live platform activity with NACE-style survey records when those exist."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardKpiCard
          icon={GraduationCap}
          label="Placement rate (current class)"
          value={fmtSourced(snapshot.kpis.placementRate, "pct")}
          hint={snapshot.kpis.placementRate.note || "Employed + continuing education"}
          tone="blue"
        />
        <DashboardKpiCard
          icon={Users}
          label="Active students this month"
          value={fmtSourced(snapshot.kpis.activeStudentsMonth)}
          hint={`${snapshot.engagement.registered} registered · ${snapshot.engagement.inactive} inactive`}
          tone="teal"
        />
        <DashboardKpiCard
          icon={Briefcase}
          label="Open jobs matched to our students"
          value={fmtSourced(snapshot.kpis.openJobsMatched)}
          hint={`${snapshot.market.internships} internships on the board`}
          tone="violet"
        />
        <DashboardKpiCard
          icon={Building2}
          label="Employers engaged"
          value={fmtSourced(snapshot.kpis.employersEngaged)}
          hint={`${snapshot.market.newEmployers} new this month`}
          tone="blue"
        />
        <DashboardKpiCard
          icon={AlertTriangle}
          label="Students needing attention"
          value={fmtSourced(snapshot.kpis.needingAttention)}
          hint="Seniors with no apps, quiet, or zero activity"
          tone="amber"
        />
        <DashboardKpiCard
          icon={Flag}
          label="Equity gap flag"
          value={snapshot.kpis.equityGapFlag.flagged ? "On" : "Clear"}
          hint={snapshot.kpis.equityGapFlag.detail}
          tone={snapshot.kpis.equityGapFlag.flagged ? "amber" : "teal"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={snapshot.kpis.placementRate.source} />
        <Button asChild className="rounded-full">
          <Link href="/campus/actions">Open action queue</Link>
        </Button>
      </div>

      {snapshot.alerts.length ? (
        <DashboardPanel title="Alerts" description="Priority outreach, not vanity charts.">
          <ul className="space-y-3">
            {snapshot.alerts.map((alert) => (
              <li key={alert.id} className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/50 px-4 py-3">
                <div>
                  <p className="text-[14px] font-semibold">{alert.title}</p>
                  <p className="text-[13px] text-muted-foreground">{alert.detail}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link href={alert.href}>{alert.count}</Link>
                </Button>
              </li>
            ))}
          </ul>
        </DashboardPanel>
      ) : null}

      <DashboardFunnel title="Signup → offer funnel" stages={snapshot.engagement.funnel} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList
          title="What students swipe right"
          description="Intent Handshake cannot see."
          rows={snapshot.swipeSignals.rightByCategory}
        />
        <BreakdownList
          title="What they pass on"
          rows={snapshot.swipeSignals.leftByCategory}
        />
      </div>
      <BreakdownList
        title="Want vs. what’s posted"
        description="Student preferred categories against open jobs."
        rows={snapshot.swipeSignals.wantVsHave.map((row) => ({
          label: `${row.category} · ${row.openJobs} jobs`,
          value: row.studentInterest,
        }))}
      />
    </CampusFrame>
  )
}
