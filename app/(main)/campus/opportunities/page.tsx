import { campusPageData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { OpportunityForm } from "@/components/campus/OpportunityForm"

export default async function CampusOpportunitiesPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus)
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
