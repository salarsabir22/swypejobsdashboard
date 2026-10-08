import { campusPageData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtSourced } from "@/lib/campus/format"
import { Briefcase, Building2, Clock, Repeat } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function CampusMarketPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus)

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Employer and job market"
      description="Who is hiring, what they post, and where student supply does not meet demand."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard icon={Building2} label="Employers recruiting" value={snapshot.market.activeEmployers} hint={`${snapshot.market.newEmployers} joined this month`} />
        <DashboardKpiCard icon={Briefcase} label="Open full-time jobs" value={snapshot.market.openJobs} />
        <DashboardKpiCard icon={Briefcase} label="Open internships" value={snapshot.market.internships} tone="teal" />
        <DashboardKpiCard icon={Repeat} label="Repeat employers" value={snapshot.market.repeatEmployers} hint="More than one hire" />
      </div>
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
      <DashboardPanel title="Employer satisfaction">
        <p className="text-[14px] text-muted-foreground">
          Collect NPS on the career office vs. the platform from the operations tab. Employer feedback from product_feedback still rolls to platform admin.
        </p>
      </DashboardPanel>
    </CampusFrame>
  )
}
