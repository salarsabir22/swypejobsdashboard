import Link from "next/link"
import { campusReportData } from "@/lib/campus/page-data"
import { campusQueryHref } from "@/lib/campus/reports"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { CampusTrendChart } from "@/components/campus/CampusTrendChart"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Badge } from "@/components/ui/badge"
import { fmtSourced } from "@/lib/campus/format"
import { Briefcase, Building2, Clock, Repeat } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function CampusMarketPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }>
}) {
  const snapshot = await campusReportData(searchParams)

  return (
    <CampusFrame
      snapshot={snapshot}
      showSources
      exportDataset="jobs"
      title="Employer and job market"
      description={`Job posts and employer activity for ${snapshot.period.label.toLowerCase()}. Who is hiring, what they post, and where student supply does not meet demand.`}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard
          icon={Building2}
          label="Employers recruiting"
          value={snapshot.market.activeEmployers}
          hint={`${snapshot.market.newEmployers} joined this period`}
          footer={
            <a href="#employers" className="text-[12px] font-medium text-primary hover:underline">
              See who they are
            </a>
          }
        />
        <DashboardKpiCard
          icon={Briefcase}
          label="Open full-time jobs"
          value={snapshot.market.openJobs}
          hint={`${snapshot.market.dailyJobPosts.at(-1)?.value ?? 0} posted today`}
          trend={snapshot.market.dailyJobPosts.map((row) => row.value)}
        />
        <DashboardKpiCard icon={Briefcase} label="Open internships" value={snapshot.market.internships} tone="teal" />
        <DashboardKpiCard icon={Repeat} label="Repeat employers" value={snapshot.market.repeatEmployers} hint="More than one hire" />
      </div>
      <CampusTrendChart
        title="Job posts"
        description="New listings posted to the board."
        periodLabel={snapshot.period.label}
        points={snapshot.market.dailyJobPosts.map((row) => ({ label: row.label, jobs: row.value }))}
        jobsKey="Job posts"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <DashboardKpiCard icon={Clock} label="Employer response rate" value={fmtSourced(snapshot.market.responseRate, "pct")} />
        <DashboardKpiCard icon={Clock} label="Hours to respond" value={fmtSourced(snapshot.market.timeToRespondHours)} tone="amber" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownList title="Jobs by category" rows={snapshot.market.byMajor} />
        <BreakdownList title="Location" rows={snapshot.market.byLocation} />
        <BreakdownList title="Remote / hybrid / on-site" rows={snapshot.market.byWorkMode} />
      </div>
      <DashboardPanel title="Supply vs. demand gaps" description="Majors with many students and few matching job posts.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Major / field</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Gap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshot.market.supplyGaps.map((row) => (
              <TableRow key={row.major}>
                <TableCell>{row.major}</TableCell>
                <TableCell className="tabular-nums">{row.students}</TableCell>
                <TableCell className="tabular-nums">{row.jobs}</TableCell>
                <TableCell className="tabular-nums">{row.gap}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardPanel>
      <div id="employers">
        <DashboardPanel
          title="Employers in this window"
          description={`Every employer behind the count: job posts and applications in ${snapshot.period.label.toLowerCase()}, hires from pipeline status. Open one to see its directory record.`}
          badge={`${snapshot.market.employers.length}${snapshot.market.employers.length >= 100 ? " (top 100)" : ""}`}
        >
          {snapshot.market.employers.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Job posts</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Hires</TableHead>
                  <TableHead>Relationship</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.market.employers.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={campusQueryHref(`/campus/employers?q=${encodeURIComponent(row.name)}`, snapshot)}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.industry || "—"}</TableCell>
                    <TableCell className="tabular-nums">{row.jobs}</TableCell>
                    <TableCell className="tabular-nums">{row.applications}</TableCell>
                    <TableCell className="tabular-nums">{row.hires}</TableCell>
                    <TableCell>
                      <Badge variant={row.relationship === "partner" ? "default" : "secondary"} className="text-[11px]">
                        {row.relationship === "partner" ? "Partner" : "Platform"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-[14px] text-muted-foreground">
              No employer has posted or received an application in this window yet. Change the date range to widen the search.
            </p>
          )}
        </DashboardPanel>
      </div>
      <DashboardPanel title="Top hiring employers">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employer</TableHead>
              <TableHead>Applications</TableHead>
              <TableHead>Hires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshot.market.topEmployers.map((row) => (
              <TableRow key={row.name}>
                <TableCell>{row.name}</TableCell>
                <TableCell className="tabular-nums">{row.apps}</TableCell>
                <TableCell className="tabular-nums">{row.hires}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardPanel>
      <DashboardPanel title="Partnership tiers" description="Relationship history lives on campus_employer_partners.">
        {snapshot.market.partners.length ? (
          <ul className="space-y-2 text-[14px]">
            {snapshot.market.partners.map((p) => (
              <li key={p.name}>
                {p.name} · {p.tier}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">No partnership tiers recorded yet. Tag strategic employers from Actions.</p>
        )}
      </DashboardPanel>
      <DashboardPanel title="Employer satisfaction" badge={fmtSourced(snapshot.market.employerNps)}>
        <p className="text-[14px] text-muted-foreground">
          NPS from campus surveys tagged employer. Office and platform NPS stay on Operations.
        </p>
      </DashboardPanel>
    </CampusFrame>
  )
}
