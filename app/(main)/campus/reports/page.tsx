import { campusReportData } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { campusQueryHref, campusReportCards } from "@/lib/campus/reports"
import { createClient } from "@/lib/supabase/server"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { CampusExportButtons } from "@/components/campus/CampusExportButtons"
import { ExportCsvButton, SavedViewForm } from "@/components/campus/CampusActions"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Briefcase, Building2, Download, LineChart, Send, Users } from "lucide-react"
import Link from "next/link"

const ICONS = {
  jobs: Briefcase,
  engagement: Users,
  employers: Building2,
  applications: Send,
  placement: LineChart,
  departments: AlertTriangle,
} as const

const TONES = {
  jobs: "violet",
  engagement: "teal",
  employers: "blue",
  applications: "teal",
  placement: "blue",
  departments: "amber",
} as const

export default async function CampusReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; range?: string }>
}) {
  const snapshot = await campusReportData(searchParams, "view_reports")
  const supabase = await createClient()
  const [{ data: audits }, { data: views }] = await Promise.all([
    supabase.from("campus_audit_log").select("action, entity, created_at").order("created_at", { ascending: false }).limit(12),
    supabase.from("campus_saved_views").select("name, path").eq("user_id", snapshot.access.userId).order("created_at", { ascending: false }).limit(12),
  ])
  const year = new Date().getFullYear()
  const reportHref = (template: "hec" | "nbeac", format: "pdf" | "xls") =>
    `/api/reports/accreditation?template=${template}&format=${format}&year=${year}`
  const canExport = canCampus(snapshot.access, "export")
  const cards = campusReportCards(snapshot)
  const range = snapshot.period.id
  const uni = snapshot.access.university

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
      title="Reports"
      description={`Download every CDC report for ${snapshot.period.label.toLowerCase()}, or open one report and export just that file. Overview packages all six reports in one CSV, Excel, or PDF.`}
    >
      {canExport ? (
        <DashboardPanel
          title="Download all reports"
          description="One-click overview of job posts, engagement, employers, applications, placement, and at-risk departments."
        >
          <CampusExportButtons dataset="overview" campus={uni} range={range} />
        </DashboardPanel>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <DashboardKpiCard
            key={card.id}
            icon={ICONS[card.id]}
            label={card.title}
            value={card.value}
            hint={card.description}
            tone={TONES[card.id]}
            footer={
              <div className="space-y-3">
                <p className="text-[13px] text-muted-foreground">{card.hint}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button asChild size="sm" variant="ghost" className="h-8 rounded-full px-3 text-[12px]">
                    <Link href={campusQueryHref(card.href, snapshot)}>Open report</Link>
                  </Button>
                  {canExport ? <CampusExportButtons dataset={card.dataset} campus={uni} range={range} compact /> : null}
                </div>
              </div>
            }
          />
        ))}
      </div>

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
          labeled self-reported. Excel includes every respondent; the PDF is the summary.
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
