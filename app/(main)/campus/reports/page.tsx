import { campusPageData } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { createClient } from "@/lib/supabase/server"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { ExportCsvButton, SavedViewForm } from "@/components/campus/CampusActions"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default async function CampusReportsPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus, "view_reports")
  const supabase = await createClient()
  const [{ data: audits }, { data: views }] = await Promise.all([
    supabase.from("campus_audit_log").select("action, entity, created_at").order("created_at", { ascending: false }).limit(12),
    supabase.from("campus_saved_views").select("name, path").eq("user_id", snapshot.access.userId).order("created_at", { ascending: false }).limit(12),
  ])
  const year = new Date().getFullYear()
  const reportHref = (template: "hec" | "nbeac", format: "pdf" | "xls") =>
    `/api/reports/accreditation?template=${template}&format=${format}&year=${year}`

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
      showSources
      exportDataset="overview"
      title="Reporting and compliance"
      description="Exportable NACE-style first-destination tables for the provost, deans, and trustees. Every column is labeled platform, survey, self-reported, or verified."
    >
      <DashboardPanel title="NACE first-destination export">
        <p className="mb-4 text-[14px] text-muted-foreground">
          Standard checkpoints: graduation, 3 / 6 / 12 months. Statuses: employed, continuing education, still seeking, not seeking.
        </p>
        <ExportCsvButton filename="nace-first-destination.csv" rows={nace} />
      </DashboardPanel>
      <DashboardPanel title={`HEC placement and NBEAC outcomes · class of ${year}`}>
        <p className="mb-4 text-[14px] text-muted-foreground">
          Cohort is everyone with graduation year {year}
          {snapshot.access.university ? ` at ${snapshot.access.university}` : ""}. Placement rates use the alumni career survey and are
          labeled self-reported. Verified hires come from the platform pipeline. Excel includes every respondent; the PDF is the summary.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <a href={reportHref("hec", "xls")}>
              <Download className="h-3.5 w-3.5" />
              HEC Excel
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <a href={reportHref("hec", "pdf")}>
              <Download className="h-3.5 w-3.5" />
              HEC PDF
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <a href={reportHref("nbeac", "xls")}>
              <Download className="h-3.5 w-3.5" />
              NBEAC Excel
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <a href={reportHref("nbeac", "pdf")}>
              <Download className="h-3.5 w-3.5" />
              NBEAC PDF
            </a>
          </Button>
        </div>
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
          <p className="mb-3 text-[14px] text-muted-foreground">Directors, advisors, and deans keep their own views.</p>
          {(views || []).length ? (
            <ul className="mb-3 space-y-1 text-[14px]">
              {views!.map((view) => (
                <li key={`${view.name}-${view.path}`}>
                  {view.name} · {view.path}
                </li>
              ))}
            </ul>
          ) : null}
          {canCampus(snapshot.access, "mutate") ? <SavedViewForm path="/campus/reports" /> : null}
        </DashboardPanel>
        <DashboardPanel title="Audit log">
          {(audits || []).length ? (
            <ul className="space-y-1 text-[14px]">
              {audits!.map((row, i) => (
                <li key={`${row.created_at}-${i}`}>
                  {row.action} · {row.entity || "record"} · {new Date(row.created_at).toLocaleString()}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-muted-foreground">Equity views and staff actions show up here once the audit table is live.</p>
          )}
        </DashboardPanel>
      </div>
    </CampusFrame>
  )
}
