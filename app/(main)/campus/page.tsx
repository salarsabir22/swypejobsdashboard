import { campusPageData } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { CampusTrendChart } from "@/components/campus/CampusTrendChart"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { SourceBadge } from "@/components/campus/SourceBadge"
import { CampusExportButtons } from "@/components/campus/CampusExportButtons"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardFunnel } from "@/components/dashboard/DashboardFunnel"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtSourced } from "@/lib/campus/format"
import type { CampusExportDataset } from "@/lib/campus/export"
import { AlertTriangle, Briefcase, Building2, Flag, GraduationCap, Send, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function CampusHomePage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus, "view_home")
  const canExport = canCampus(snapshot.access, "export")
  const uni = snapshot.access.university
  const report = (dataset: CampusExportDataset) =>
    canExport ? <CampusExportButtons dataset={dataset} campus={uni} compact /> : null

  return (
    <CampusFrame
      snapshot={snapshot}
      showSources
      exportDataset="overview"
      title="CDC dashboard"
      description="Daily job posts, student applications, employer activity, placement trends, and low-activity department alerts. Figures come from live platform and survey records — not mockup placeholders."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardKpiCard
          icon={GraduationCap}
          label="Placement rate (current class)"
          value={fmtSourced(snapshot.kpis.placementRate, "pct")}
          hint={snapshot.kpis.placementRate.note || "Employed + continuing education"}
          tone="blue"
          footer={report("placement")}
        />
        <DashboardKpiCard
          icon={Users}
          label="Active students this month"
          value={fmtSourced(snapshot.kpis.activeStudentsMonth)}
          hint={`${snapshot.engagement.registered} registered · ${snapshot.engagement.inactive} inactive`}
          tone="teal"
          footer={report("active_students")}
        />
        <DashboardKpiCard
          icon={Briefcase}
          label="Open jobs matched to our students"
          value={fmtSourced(snapshot.kpis.openJobsMatched)}
          hint={`${snapshot.market.dailyJobPosts.at(-1)?.value ?? 0} posted today · ${snapshot.market.internships} internships`}
          trend={snapshot.market.dailyJobPosts.map((row) => row.value)}
          tone="violet"
          footer={report("open_jobs")}
        />
        <DashboardKpiCard
          icon={Send}
          label="Student applications"
          value={snapshot.engagement.applicationsWeek}
          hint={`${snapshot.engagement.applicationsMonth} this month · ${snapshot.engagement.applicants} applicants`}
          trend={snapshot.engagement.dailyApplications.map((row) => row.value)}
          tone="teal"
          footer={report("applications")}
        />
        <DashboardKpiCard
          icon={Building2}
          label="Employers engaged"
          value={fmtSourced(snapshot.kpis.employersEngaged)}
          hint={`${snapshot.market.newEmployers} new this month`}
          tone="blue"
          footer={report("employers")}
        />
        <DashboardKpiCard
          icon={AlertTriangle}
          label="Students needing attention"
          value={fmtSourced(snapshot.kpis.needingAttention)}
          hint="Seniors with no apps, quiet, or zero activity"
          tone="amber"
          footer={report("attention")}
        />
        <DashboardKpiCard
          icon={Flag}
          label="Equity gap flag"
          value={snapshot.kpis.equityGapFlag.flagged ? "On" : "Clear"}
          hint={snapshot.kpis.equityGapFlag.detail}
          tone={snapshot.kpis.equityGapFlag.flagged ? "amber" : "teal"}
          footer={report("equity")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={snapshot.kpis.placementRate.source} />
        {canCampus(snapshot.access, "view_actions") ? (
          <Button asChild className="rounded-full">
            <Link href="/campus/pending">Pending items</Link>
          </Button>
        ) : null}
        {canCampus(snapshot.access, "view_reports") ? (
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/campus/reports">Reports</Link>
          </Button>
        ) : null}
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

      <CampusTrendChart
        title="Daily job posts and student applications"
        description="New listings on the board vs right-swipes from your students."
        points={snapshot.market.dailyJobPosts.map((row, i) => ({
          label: row.label,
          jobs: row.value,
          applications: snapshot.engagement.dailyApplications[i]?.value ?? 0,
        }))}
      />

      <DashboardFunnel title="Signup → offer funnel" stages={snapshot.engagement.funnel} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList
          title="What students swipe right"
          description="Right-swipes on Discover, grouped by category."
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
