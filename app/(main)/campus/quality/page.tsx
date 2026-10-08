import { campusPageData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtSourced } from "@/lib/campus/format"
import { GitCompare, Sparkles, Target } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function CampusQualityPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus)

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Match quality"
      description="Whether student preferences line up with posted jobs, which skills employers ask for that students lack, and conversion after they apply."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard icon={Target} label="Preference match" value={fmtSourced(snapshot.matchQuality.preferenceMatchRate, "pct")} hint="Students with a preferred category that has open jobs" />
        <DashboardKpiCard icon={GitCompare} label="App → interview" value={fmtSourced(snapshot.matchQuality.appToInterview, "pct")} />
        <DashboardKpiCard icon={Sparkles} label="Interview → offer" value={fmtSourced(snapshot.matchQuality.interviewToOffer, "pct")} tone="teal" />
        <DashboardKpiCard icon={Target} label="Offer acceptance" value={fmtSourced(snapshot.matchQuality.offerAccept, "pct")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList title="Skills employers want" rows={snapshot.matchQuality.skillsEmployersWant} />
        <BreakdownList title="Skills students list" rows={snapshot.matchQuality.skillsStudentsHave} />
      </div>
      <DashboardPanel title="Skills gaps">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Skill</TableHead>
              <TableHead>Jobs asking</TableHead>
              <TableHead>Students listing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshot.matchQuality.skillsGaps.map((row) => (
              <TableRow key={row.skill}>
                <TableCell>{row.skill}</TableCell>
                <TableCell className="tabular-nums">{row.jobs}</TableCell>
                <TableCell className="tabular-nums">{row.students}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardPanel>
      <DashboardPanel title="In-demand roles by major" description="Top posted categories as a stand-in until majors map 1:1 to job families.">
        <ul className="space-y-2 text-[14px]">
          {snapshot.matchQuality.demandByMajor.map((row) => (
            <li key={row.major}>
              <span className="font-medium">{row.major}</span>
              <span className="text-muted-foreground"> · {row.roles.join(", ") || "No demand signal"}</span>
            </li>
          ))}
        </ul>
      </DashboardPanel>
      <DashboardPanel title="Reasons for declines">
        <p className="text-[14px] text-muted-foreground">
          Capture decline reasons on the offer step to populate this. Nothing structured is stored yet.
        </p>
      </DashboardPanel>
    </CampusFrame>
  )
}
