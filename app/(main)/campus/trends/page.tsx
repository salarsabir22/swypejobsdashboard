import { campusPageData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtSourced } from "@/lib/campus/format"

export default async function CampusTrendsPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus)
  const seniors = snapshot.engagement.byYear[0]
  const projected = snapshot.kpis.placementRate.value

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Comparisons and trends"
      description="Year-over-year and cohort views. Peer benchmarks stay anonymous and only unlock after enough partner campuses share NACE files."
    >
      <DashboardPanel title="This year’s seniors — projected placement">
        <p className="text-[2.4rem] font-semibold tabular-nums tracking-[-0.04em]">{fmtSourced(snapshot.kpis.placementRate, "pct")}</p>
        <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
          Forecast is the current employed + grad-school rate for the visible class ({seniors?.label || "current cohort"}).
          A proper projection needs two prior first-destination files; we will not invent a confidence interval without them.
        </p>
      </DashboardPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList title="Internal college / department mix" description="Share of registered students." rows={snapshot.engagement.byCollege} />
        <BreakdownList title="Cohort sizes by class year" rows={snapshot.engagement.byYear} />
      </div>
      <DashboardPanel title="Peer institution benchmarks">
        <p className="text-[14px] text-muted-foreground">
          Anonymized peer placement and engagement bands appear once three or more campuses contribute survey files.
          Until then this tile stays empty on purpose.
        </p>
      </DashboardPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList title="Trending industries (right swipes)" rows={snapshot.swipeSignals.trendingIndustries} />
        <BreakdownList
          title="Mismatch: intent vs. postings"
          rows={snapshot.swipeSignals.wantVsHave.map((row) => ({
            label: row.category,
            value: row.studentInterest - row.openJobs,
          }))}
        />
      </div>
      <DashboardPanel title="Year-over-year">
        <p className="text-[14px] text-muted-foreground">
          YoY placement requires stored campus_outcomes for the prior cohort. Platform activity (swipes, apps, interviews)
          can still be compared week-over-week from the engagement funnel.
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground">Current funnel peak: {projected == null ? "not enough outcome data" : `${projected}% placed or in school`}.</p>
      </DashboardPanel>
    </CampusFrame>
  )
}
