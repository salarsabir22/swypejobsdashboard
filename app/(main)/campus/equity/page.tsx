import { campusPageData } from "@/lib/campus/page-data"
import { writeCampusAudit } from "@/lib/campus/access"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function CampusEquityPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus)
  await writeCampusAudit(snapshot.access.userId, "view_equity", "campus_demographics", snapshot.access.university || "all")

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Equity and inclusion"
      description="FERPA-gated. Only consented demographic records are shown. Views of this page are written to the campus audit log."
    >
      {!snapshot.equity.available ? (
        <DashboardPanel title="Consent required">
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Gender, race/ethnicity, first-gen, international, disability, and Pell status stay dark until students
            (or the registrar) attach a consented file. Do not upload those fields without a lawful basis.
          </p>
        </DashboardPanel>
      ) : (
        <>
          <DashboardPanel title="Consented records" badge={`${snapshot.equity.consented} students`}>
            <p className="text-[14px] text-muted-foreground">Disparity flags stay conservative until cell sizes are safe to publish.</p>
          </DashboardPanel>
          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownList title="Gender" rows={snapshot.equity.byGender} />
            <BreakdownList title="Race / ethnicity" rows={snapshot.equity.byRace} />
          </div>
        </>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="International students">
          <p className="text-[14px] leading-relaxed">
            {snapshot.equity.international.n} consented international · {snapshot.equity.international.cptOpt} CPT/OPT
            recorded · {snapshot.equity.international.sponsorshipJobs} jobs mentioning sponsorship.
          </p>
        </DashboardPanel>
        <DashboardPanel title="Veteran and transfer">
          <p className="text-[14px]">
            {snapshot.equity.veteran} veterans · {snapshot.equity.transfer} transfer students in the consented file.
          </p>
        </DashboardPanel>
      </div>
      {snapshot.equity.gaps.length ? (
        <DashboardPanel title="Gap flags">
          <ul className="space-y-2 text-[14px]">
            {snapshot.equity.gaps.map((g) => (
              <li key={g.label}>
                {g.label}: {g.delta}
              </li>
            ))}
          </ul>
        </DashboardPanel>
      ) : null}
    </CampusFrame>
  )
}
