import { loadCampusPage } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { OpportunityForm } from "@/components/campus/OpportunityForm"

export default async function CampusOpportunitiesPage({ searchParams }: { searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }> }) {
  const { snapshot, params } = await loadCampusPage(searchParams, "view_actions")
  return (
    <CampusFrame
      snapshot={snapshot}
      title="International opportunities"
      description="Publish study abroad, exchange, dual degree, and scholarship listings. Students browse them with the visa link attached."
    >
      <OpportunityForm />
    </CampusFrame>
  )
}
