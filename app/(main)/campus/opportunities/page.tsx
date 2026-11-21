import { loadCampusPage } from "@/lib/campus/page-data"
import { createAdminClient } from "@/lib/supabase/admin"
import { canCampus } from "@/lib/campus/rbac"
import { OPPORTUNITY_FIELDS, type CampusOpportunity } from "@/lib/campus/opportunities"
import { sameCampus } from "@/lib/jobs/curation"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { OpportunityManager } from "@/components/campus/OpportunityManager"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { Eye, Globe, Radio } from "lucide-react"

export default async function CampusOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }>
}) {
  const { snapshot } = await loadCampusPage(searchParams, "view_international")
  const access = snapshot.access
  const canMutate = canCampus(access, "view_international")
  const admin = createAdminClient()

  const withMeta = await admin
    .from("international_opportunities")
    .select(`${OPPORTUNITY_FIELDS}, university, updated_at`)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(200)
  const listed = withMeta.error
    ? await admin
        .from("international_opportunities")
        .select(OPPORTUNITY_FIELDS)
        .order("deadline", { ascending: true, nullsFirst: false })
        .limit(200)
    : withMeta

  const opportunities = ((listed.error ? [] : listed.data) || []) as CampusOpportunity[]
  const rows = opportunities
    .filter((row) => {
      if (access.role === "admin" && !access.university) return true
      if (!row.university) return true
      return sameCampus(row.university, access.university)
    })
    .sort((a, b) => {
      const liveDelta = Number(a.is_active === false) - Number(b.is_active === false)
      if (liveDelta !== 0) return liveDelta
      const aDeadline = a.deadline ? Date.parse(a.deadline) : Number.MAX_SAFE_INTEGER
      const bDeadline = b.deadline ? Date.parse(b.deadline) : Number.MAX_SAFE_INTEGER
      return aDeadline - bDeadline
    })

  const ids = rows.map((row) => row.id)
  const viewCounts: Record<string, number> = {}
  if (ids.length) {
    const { data: views } = await admin
      .from("international_opportunity_views")
      .select("opportunity_id")
      .in("opportunity_id", ids)
      .limit(20000)
    for (const view of (views || []) as { opportunity_id: string }[]) {
      viewCounts[view.opportunity_id] = (viewCounts[view.opportunity_id] || 0) + 1
    }
  }

  const liveCount = rows.filter((row) => row.is_active !== false).length
  const totalViews = Object.values(viewCounts).reduce((sum, value) => sum + value, 0)

  return (
    <CampusFrame
      snapshot={snapshot}
      showRange={false}
      title="International opportunities"
      description="Every study abroad, exchange, dual degree, and scholarship listing for this campus — what is live, what is hidden, how many students opened each, and edits after publishing."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardKpiCard icon={Globe} label="Listings" value={rows.length.toLocaleString()} hint="Created for this campus" />
        <DashboardKpiCard icon={Radio} label="Live for students" value={liveCount.toLocaleString()} hint="Visible on /opportunities" />
        <DashboardKpiCard icon={Eye} label="Student opens" value={totalViews.toLocaleString()} hint="Distinct students per listing" />
      </div>

      <DashboardPanel
        title="All listings"
        badge={`${liveCount} live`}
        description="Edit any listing after it goes live, hide it from students, or publish it again."
      >
        <OpportunityManager opportunities={rows} viewCounts={viewCounts} canMutate={canMutate} />
      </DashboardPanel>
    </CampusFrame>
  )
}
