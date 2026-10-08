import { campusPageData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { SourceBadge } from "@/components/campus/SourceBadge"
import { fmtNum, fmtPct, fmtSourced } from "@/lib/campus/format"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function CampusOutcomesPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus)

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Student outcomes"
      description="NACE-style first-destination status at graduation, 3, 6, and 12 months. Until a survey file is imported, graduation uses a platform proxy from hired / seeking / inactive seniors."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {snapshot.outcomes.slices.map((slice) => (
          <DashboardPanel
            key={slice.checkpoint}
            title={slice.checkpoint === "graduation" ? "At graduation" : slice.checkpoint.replace("mo", " months")}
            badge={`${slice.n} records`}
          >
            <div className="mb-3">
              <SourceBadge source={slice.source} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-[14px]">
              <div>
                <dt className="text-muted-foreground">Employed</dt>
                <dd className="text-[1.4rem] font-semibold tabular-nums">{slice.employed}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Grad school</dt>
                <dd className="text-[1.4rem] font-semibold tabular-nums">{slice.gradSchool}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Still seeking</dt>
                <dd className="text-[1.4rem] font-semibold tabular-nums">{slice.stillSeeking}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Not seeking</dt>
                <dd className="text-[1.4rem] font-semibold tabular-nums">{slice.notSeeking}</dd>
              </div>
            </dl>
          </DashboardPanel>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardPanel title="Internship participation" badge={fmtSourced(snapshot.outcomes.internshipParticipation, "pct")}>
          <SourceBadge source={snapshot.outcomes.internshipParticipation.source} />
        </DashboardPanel>
        <DashboardPanel title="Intern → full-time" badge={fmtSourced(snapshot.outcomes.internshipConversion, "pct")}>
          <SourceBadge source={snapshot.outcomes.internshipConversion.source} />
        </DashboardPanel>
        <DashboardPanel title="Median days to first offer" badge={fmtSourced(snapshot.outcomes.timeToFirstOfferDays)}>
          <SourceBadge source={snapshot.outcomes.timeToFirstOfferDays.source} />
        </DashboardPanel>
      </div>

      <DashboardPanel title="Starting salary by major" description="Average and median from survey/verified records only.">
        {snapshot.outcomes.salariesByMajor.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Major</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Median</TableHead>
                <TableHead>n</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.outcomes.salariesByMajor.map((row) => (
                <TableRow key={row.group}>
                  <TableCell>{row.group}</TableCell>
                  <TableCell className="tabular-nums">{fmtNum(row.average)}</TableCell>
                  <TableCell className="tabular-nums">{fmtNum(row.median)}</TableCell>
                  <TableCell className="tabular-nums">{row.n}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-[14px] text-muted-foreground">No salary file yet. Import first-destination salaries to unlock averages by major, college, and degree level.</p>
        )}
      </DashboardPanel>

      {snapshot.outcomes.salariesByDegree.length ? (
        <DashboardPanel title="Salary by degree level">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Median</TableHead>
                <TableHead>n</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.outcomes.salariesByDegree.map((row) => (
                <TableRow key={row.group}>
                  <TableCell>{row.group}</TableCell>
                  <TableCell className="tabular-nums">{fmtNum(row.average)}</TableCell>
                  <TableCell className="tabular-nums">{fmtNum(row.median)}</TableCell>
                  <TableCell className="tabular-nums">{row.n}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DashboardPanel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList title="Industry" rows={snapshot.outcomes.industries} />
        <BreakdownList title="Role" rows={snapshot.outcomes.roles} />
        <BreakdownList title="Geography" rows={snapshot.outcomes.geos} />
        <BreakdownList title="Employer type" description="Startup, mid-size, enterprise, government, nonprofit." rows={snapshot.outcomes.employerTypes} />
      </div>
      <DashboardPanel title="Underemployment" description="Employed graduates in roles that do not require a degree.">
        <p className="text-[2rem] font-semibold tabular-nums">{fmtPct(snapshot.outcomes.underemployed.value)}</p>
        <SourceBadge source={snapshot.outcomes.underemployed.source} />
      </DashboardPanel>
    </CampusFrame>
  )
}
