import { campusReportData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { CampusTrendChart } from "@/components/campus/CampusTrendChart"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Send, UserCheck, Users } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function CampusApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; range?: string }>
}) {
  const snapshot = await campusReportData(searchParams)

  return (
    <CampusFrame
      snapshot={snapshot}
      showSources
      exportDataset="applications"
      title="Student applications"
      description={`Right-swipes from your students, by programme and employer · ${snapshot.period.label.toLowerCase()}. This is the live application stream the career office can act on.`}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard
          icon={Send}
          label="Applications this week"
          value={snapshot.engagement.applicationsWeek}
          trend={snapshot.engagement.dailyApplications.map((row) => row.value)}
        />
        <DashboardKpiCard icon={Send} label="Applications this month" value={snapshot.engagement.applicationsMonth} tone="teal" />
        <DashboardKpiCard icon={UserCheck} label="Unique applicants" value={snapshot.engagement.applicants} />
        <DashboardKpiCard
          icon={Users}
          label="Apps per student"
          value={snapshot.engagement.appsPerStudent}
          hint={`${snapshot.engagement.funnel.find((s) => s.label === "Application")?.value ?? 0} students applied`}
          tone="violet"
        />
      </div>
      <CampusTrendChart
        title="Student applications"
        description="Right-swipes counted as applications."
        periodLabel={snapshot.period.label}
        points={snapshot.engagement.dailyApplications.map((row) => ({ label: row.label, applications: row.value }))}
        appsKey="Applications"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList title="Applications by programme" rows={snapshot.engagement.applicationsByMajor} />
        <BreakdownList title="Applications by employer" rows={snapshot.engagement.applicationsByEmployer} />
      </div>
      <DashboardPanel title="At-risk programmes" description="Departments with no applications or low monthly activity.">
        {snapshot.engagement.atRiskDepartments.length ? (
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
              {snapshot.engagement.atRiskDepartments.map((row) => (
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
          <p className="text-[14px] text-muted-foreground">No programme is flagged. Activity and applications are spread across departments.</p>
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
