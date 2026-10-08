import { campusPageData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { ExportCsvButton, SavedViewForm } from "@/components/campus/CampusActions"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function CampusReportsPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus)
  const nace = snapshot.outcomes.slices.map((s) => ({
    checkpoint: s.checkpoint,
    employed: s.employed,
    grad_school: s.gradSchool,
    still_seeking: s.stillSeeking,
    not_seeking: s.notSeeking,
    unknown: s.unknown,
    n: s.n,
    source: s.source,
  }))

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Reporting and compliance"
      description="Exportable NACE-style first-destination tables for the provost, deans, and trustees. Every column is labeled platform, survey, self-reported, or verified."
    >
      <DashboardPanel title="NACE first-destination export">
        <p className="mb-4 text-[14px] text-muted-foreground">
          Standard checkpoints: graduation, 3 / 6 / 12 months. Statuses: employed, continuing education, still seeking, not seeking.
        </p>
        <ExportCsvButton filename="nace-first-destination.csv" rows={nace} />
      </DashboardPanel>
      <DashboardPanel title="Accreditation and rankings">
        <p className="text-[14px] text-muted-foreground">
          US News / Princeton Review / state-federal templates need a locked survey cohort. Use the NACE export as the
          source file; do not mix unlabeled platform proxies into ranking submissions.
        </p>
      </DashboardPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="Privacy">
          <ul className="list-disc space-y-1 pl-5 text-[14px] text-muted-foreground">
            <li>FERPA: equity views require consent_at and are audit-logged.</li>
            <li>GDPR: students can request export/delete via existing account flows; campus staff cannot download demographics without consent.</li>
            <li>Role-based access: director, advisor, dean, or platform admin.</li>
            <li>Data source labeling is required on every KPI.</li>
          </ul>
        </DashboardPanel>
        <DashboardPanel title="Saved views">
          <p className="mb-3 text-[14px] text-muted-foreground">Directors, advisors, and deans can keep their own home filters.</p>
          <SavedViewForm path="/campus/reports" />
        </DashboardPanel>
      </div>
    </CampusFrame>
  )
}
