import { campusReportData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { AlertTriangle, Send, Users } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function CampusDepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; range?: string }>
}) {
  const snapshot = await campusReportData(searchParams, "view_reports")
  const rows = snapshot.engagement.atRiskDepartments
  const quiet = snapshot.engagement.zeroActivity.length
  const noApps = rows.filter((row) => row.applications === 0).length

  return (
    <CampusFrame
      snapshot={snapshot}
      showSources
      exportDataset="departments"
      title="At-risk departments"
      description={`Programmes with no applications or low student activity for ${snapshot.period.label.toLowerCase()}. Use this list for outreach, not as a ranking.`}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardKpiCard icon={AlertTriangle} label="Flagged programmes" value={rows.length} tone="amber" />
        <DashboardKpiCard icon={Send} label="No applications" value={noApps} hint={snapshot.period.shortLabel} />
        <DashboardKpiCard icon={Users} label="Students with zero activity" value={quiet} tone="teal" />
      </div>
      <DashboardPanel title="Low-activity alerts" description="Departments with at least two students and either no applications or a low activity rate.">
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department / programme</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Alert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.department}>
                  <TableCell>{row.department}</TableCell>
                  <TableCell className="tabular-nums">{row.students}</TableCell>
                  <TableCell className="tabular-nums">{row.activeMonth}</TableCell>
                  <TableCell className="tabular-nums">{row.applications}</TableCell>
                  <TableCell>{row.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-[14px] text-muted-foreground">
            No programme is flagged for {snapshot.period.label.toLowerCase()}. Activity and applications are spread across departments.
          </p>
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
